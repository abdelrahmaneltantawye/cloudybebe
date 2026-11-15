import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { Button, Copy } from '@/components/ui';
import { Field } from '@/screens/account/shared';
import { useSession } from '@/state/session';
import { errorMessage, type Registry, type RegistryItem, type RegistryVisibility } from '@/lib/mobile-api';
import { theme as t } from '@/theme';
import { plainText } from '@/lib/store';

export const privacyChoices: { value: RegistryVisibility; label: string; detail: string }[] = [
  { value: 'unlisted', label: 'Link only', detail: 'Only people with your link can open the registry.' },
  { value: 'searchable', label: 'Searchable', detail: 'People can find your registry by its title.' },
  { value: 'password', label: 'Password protected', detail: 'Guests need your link and password.' },
  { value: 'private', label: 'Private', detail: 'Only you can view the registry.' },
];
export function useOwnerRegistry(id: string) {
  const session = useSession();
  const request = session.request;
  const [result, setResult] = useState<{ id: string; request: typeof request; registry?: Registry; error: string; loading: boolean }>();
  const [version, setVersion] = useState(0);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setResult(old => ({ id, request, registry: old?.id === id && old.request === request ? old.registry : undefined, error: '', loading: true }));
    request<Registry>(`registries/${encodeURIComponent(id)}`, { signal: controller.signal }).then(registry => { if (!controller.signal.aborted) setResult({ id, request, registry, error: '', loading: false }); }).catch(failure => { if (!controller.signal.aborted) setResult(old => ({ id, request, registry: old?.id === id && old.request === request ? old.registry : undefined, error: errorMessage(failure), loading: false })); });
    return () => controller.abort();
  // Changing the revision deliberately reloads the same registry.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, request, version]));
  const current = result?.id === id && result.request === request;
  const setRegistry = (registry: Registry) => setResult({ id, request, registry, error: '', loading: false });
  return { registry: current ? result.registry : undefined, setRegistry, loading: !current || result.loading, error: current ? result.error : '', retry: () => setVersion(value => value + 1) };
}
export function RegistrySummary({ registry }: { registry: Registry }) {
  const requested = registry.items.reduce((total, item) => total + item.quantity, 0);
  const purchased = registry.items.reduce((total, item) => total + item.purchased, 0);
  const needed = registry.items.reduce((total, item) => total + item.needed, 0);
  return <View style={{ flexDirection: 'row', gap: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: t.colors.border, paddingVertical: 16 }}>{[[requested, 'Requested'], [purchased, 'Purchased'], [needed, 'Still needed']].map(([value, label]) => <View key={label} style={{ flex: 1, gap: 5 }}><Copy style={{ fontFamily: t.font.display, fontSize: 24 }}>{value}</Copy><Copy style={{ color: t.colors.muted, fontSize: 13 }}>{label}</Copy></View>)}</View>;
}
export function GiftInfo({ item }: { item: RegistryItem }) {
  return <View style={{ flexDirection: 'row', gap: 12 }}>{item.image ? <Image source={{ uri: item.image }} contentFit="contain" style={{ width: 74, height: 92, backgroundColor: t.colors.white }} accessibilityLabel={item.name} /> : null}<View style={{ flex: 1, gap: 5 }}><Copy style={{ fontFamily: t.font.strong }}>{item.name}</Copy><Copy style={{ color: t.colors.muted, fontSize: 14 }}>{plainText(item.price_html)}</Copy><Copy style={{ color: t.colors.muted, fontSize: 13 }}>{item.purchased} purchased · {item.needed} still needed</Copy>{item.priority ? <Copy style={{ color: t.colors.primary, fontSize: 13 }}>Most wanted</Copy> : null}{!item.available ? <Copy style={{ color: t.colors.error, fontSize: 13 }}>Currently unavailable</Copy> : null}</View></View>;
}
export function QuantityField({ value, onChange, label = 'Requested quantity', max }: { value: string; onChange: (text: string) => void; label?: string; max?: number }) {
  const number = Number(value);
  return <View style={{ gap: 10 }}><Field label={label} value={value} onChangeText={text => onChange(text.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={4} /><View style={{ flexDirection: 'row', gap: 8 }}><Button label="−" secondary disabled={number <= 1} onPress={() => onChange(String(Math.max(1, number - 1)))} style={{ flex: 1 }} /><Button label="+" secondary disabled={max !== undefined && number >= max} onPress={() => onChange(String(Math.min(max ?? 9999, Math.max(1, number + 1))))} style={{ flex: 1 }} /></View></View>;
}
