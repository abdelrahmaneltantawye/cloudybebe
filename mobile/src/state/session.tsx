import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { mobileRequest, MobileApiError, errorMessage, readStoredSession, type ApiOptions, type AuthResult, type Customer, type StoredSession } from '@/lib/mobile-api';

const STORAGE_KEY = 'cloudybebe-customer-v1';
let storageWrites = Promise.resolve();
type Credentials = { email: string; password: string; first_name?: string; last_name?: string };
type Session = {
  ready: boolean; token: string | null; user: Customer | null; error: string;
  signIn: (input: Credentials, register?: boolean) => Promise<void>;
  signOut: () => Promise<void>; refresh: () => Promise<void>; setUser: (user: Customer) => void;
  request: <T>(path: string, options?: Omit<ApiOptions, 'token'>) => Promise<T>;
};
const Context = createContext<Session | null>(null);

async function persist(value: StoredSession | null) {
  if (Platform.OS === 'web') return; // Browser previews keep credentials in memory only.
  const write = storageWrites.catch(() => undefined).then(() => value
    ? SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(value), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY })
    : SecureStore.deleteItemAsync(STORAGE_KEY));
  storageWrites = write;
  await write;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<Customer | null>(null);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const clear = useCallback(async () => {
    generation.current += 1;
    setToken(null); setUser(null);
    await persist(null);
  }, []);
  useEffect(() => {
    let alive = true;
    const restoringGeneration = generation.current;
    const active = () => alive && generation.current === restoringGeneration;
    async function restore() {
      if (Platform.OS === 'web') { setReady(true); return; }
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        if (!raw) return;
        const saved = readStoredSession(raw);
        if (!saved) { await persist(null); return; }
        if (!active()) return;
        setToken(saved.token);
        try {
          const customer = await mobileRequest<Customer>('me', { token: saved.token });
          if (active()) setUser(customer);
        } catch (failure) {
          if (!active()) return;
          if (failure instanceof MobileApiError && failure.status === 401) { setToken(null); await persist(null); }
          setError(errorMessage(failure));
        }
      } catch { if (active()) setError('Your sign-in could not be restored. Please sign in again.'); }
      finally { if (alive) setReady(true); }
    }
    void restore();
    return () => { alive = false; };
  }, []);
  const request = useCallback(async <T,>(path: string, options: Omit<ApiOptions, 'token'> = {}) => {
    if (!token) throw new MobileApiError('Please sign in to continue.', 401);
    const current = generation.current;
    try {
      const result = await mobileRequest<T>(path, { ...options, token });
      if (current !== generation.current) throw new MobileApiError('Your account session changed. Please try again.', 409);
      return result;
    }
    catch (failure) {
      if (failure instanceof MobileApiError && failure.status === 401 && current === generation.current) {
        await clear().catch(() => undefined);
        setError('Your session has expired. Please sign in again.');
      }
      throw failure;
    }
  }, [token, clear]);
  const signIn = useCallback(async (input: Credentials, register = false) => {
    const result = await mobileRequest<AuthResult>(register ? 'auth/register' : 'auth/login', { method: 'POST', body: input });
    if (!readStoredSession(JSON.stringify(result)) || !result.user || !Number.isSafeInteger(result.user.id) || result.user.id <= 0) throw new Error('The store returned an invalid sign-in response. Please try again.');
    try { await persist({ token: result.token, expires_at: result.expires_at }); }
    catch {
      await mobileRequest('auth/logout', { method: 'POST', token: result.token }).catch(() => undefined);
      throw new Error('We couldn’t securely save your sign-in on this device. Please try again.');
    }
    generation.current += 1;
    setToken(result.token); setUser(result.user); setError('');
  }, []);
  const signOut = useCallback(async () => {
    const active = token;
    generation.current += 1; setToken(null); setUser(null); setError('');
    const signingOutGeneration = generation.current;
    const results = await Promise.allSettled([persist(null), active ? mobileRequest('auth/logout', { method: 'POST', token: active }) : Promise.resolve()]);
    if (results[0].status === 'rejected' && results[1].status === 'rejected' && generation.current === signingOutGeneration) {
      setToken(active); setUser(user); setError('We couldn’t finish signing you out. Check your connection and try again.');
      throw new Error('We couldn’t finish signing you out. Check your connection and try again.');
    }
  }, [token, user]);
  const refresh = useCallback(async () => {
    try { const customer = await request<Customer>('me'); setUser(customer); setError(''); }
    catch (failure) { setError(errorMessage(failure)); throw failure; }
  }, [request]);
  const value = useMemo(() => ({ ready, token, user, error, signIn, signOut, refresh, setUser, request }), [ready, token, user, error, signIn, signOut, refresh, request]);
  return <Context value={value}>{children}</Context>;
}
export function useSession() { const session = use(Context); if (!session) throw new Error('Missing SessionProvider'); return session; }
