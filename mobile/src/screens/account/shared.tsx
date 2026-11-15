import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View, type TextInputProps } from 'react-native';
import { Image } from 'expo-image';
import { router, Stack, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Copy, Button, Title } from '@/components/ui';
import { useTheme, useThemeContext } from '@/design-system';
import { useSession } from '@/state/session';
import type { Country } from '@/lib/mobile-api';
import { STORE_URL } from '@/lib/store';

export function websiteRoute(path: string, title: string) { return `/website?${new URLSearchParams({ url: new URL(path, STORE_URL).href, title })}`; }

export function Page({ title, subtitle, children, tab = false }: { title: string; subtitle?: string; children: ReactNode; tab?: boolean }) {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const { colorScheme } = useThemeContext();
  const isDark = colorScheme === 'dark';
  const logoSource = isDark
    ? require('../../../assets/images/cloudybebe-wordmark-white.png')
    : require('../../../assets/images/cloudybebe-wordmark.png');

  return <ScrollView style={{ flex: 1, backgroundColor: t.colors.surface }} contentContainerStyle={{ paddingHorizontal: t.space.lg, paddingTop: t.space.lg + (tab ? insets.top : 0), paddingBottom: tab ? 96 + insets.bottom : 50, gap: 20 }} contentInsetAdjustmentBehavior={tab ? 'never' : 'automatic'} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
    <Stack.Screen options={{ title, headerShown: !tab }} />
    {tab ? <Image source={logoSource} contentFit="contain" style={{ width: 175, height: 44, alignSelf: 'center' }} accessibilityLabel="CloudyBebe" /> : null}
    <View style={{ gap: 8 }}><Title>{title}</Title>{subtitle ? <Copy style={{ color: t.colors.muted }}>{subtitle}</Copy> : null}</View>
    {children}
  </ScrollView>;
}
export function Card({ children, tint = false }: { children: ReactNode; tint?: boolean }) {
  const t = useTheme();
  return <View style={{ padding: 18, borderRadius: 13, borderWidth: tint ? 0 : 1, borderColor: t.colors.border, backgroundColor: tint ? t.colors.primarySoft : t.colors.surface, gap: 14 }}>{children}</View>;
}
export function Field({ label, help, ...props }: TextInputProps & { label: string; help?: string }) {
  const t = useTheme();
  const [visible, setVisible] = useState(false);
  const secret = !!props.secureTextEntry;
  return <View style={{ gap: 7 }}>
    <Copy style={{ fontFamily: t.font.strong, fontSize: 14 }}>{label}</Copy>
    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: t.colors.border, borderRadius: 10, backgroundColor: t.colors.surface }}>
      <TextInput {...props} accessibilityLabel={label} placeholderTextColor={t.colors.muted} secureTextEntry={secret && !visible} style={[{ flex: 1, minWidth: 0, minHeight: 50, padding: 13, color: t.colors.ink, fontFamily: t.font.body, fontSize: 16 }, props.style]} />
      {secret ? <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'} onPress={() => setVisible(!visible)} style={{ padding: 13 }}><Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} color={t.colors.muted} size={21} /></Pressable> : null}
    </View>
    {help ? <Copy style={{ fontSize: 13, color: t.colors.muted, lineHeight: 19 }}>{help}</Copy> : null}
  </View>;
}
export function Feedback({ error, message }: { error?: string; message?: string }) {
  const t = useTheme();
  if (!error && !message) return null;
  return <Copy accessibilityRole="alert" selectable style={{ color: error ? t.colors.error : t.colors.primary, fontSize: 14 }}>{error || message}</Copy>;
}
export function Loading({ label = 'Loading your details…' }: { label?: string }) {
  const t = useTheme();
  return <View style={{ paddingVertical: 24, alignItems: 'center', gap: 12 }}><ActivityIndicator color={t.colors.primary} /><Copy style={{ color: t.colors.muted }}>{label}</Copy></View>;
}
export function Row({ label, detail, icon, onPress, danger = false }: { label: string; detail?: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; danger?: boolean }) {
  const t = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ minHeight: 66, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: 1, borderBottomColor: t.colors.border, opacity: pressed ? .7 : 1 })}>
    <Ionicons name={icon} size={22} color={danger ? t.colors.error : t.colors.primary} /><View style={{ flex: 1 }}><Copy style={{ color: danger ? t.colors.error : t.colors.ink, fontFamily: t.font.strong }}>{label}</Copy>{detail ? <Copy style={{ fontSize: 13, color: t.colors.muted }}>{detail}</Copy> : null}</View><Ionicons name="chevron-forward" size={17} color={t.colors.muted} />
  </Pressable>;
}
export function RouteButton({ label, path, secondary = false }: { label: string; path: string; secondary?: boolean }) { return <Button label={label} secondary={secondary} onPress={() => router.push(path as Href)} />; }
export function AccountGate({ children, title, returnTo, tab = false }: { children: ReactNode; title: string; returnTo: string; tab?: boolean }) {
  const t = useTheme();
  const session = useSession();
  if (!session.ready) return <Page title={title} tab={tab}><Loading label="Restoring your sign-in…" /></Page>;
  if (session.token) return children;
  return <Page title={title} tab={tab} subtitle="A little space for your growing family.">
    <Card tint><Ionicons name="person-outline" size={30} color={t.colors.primary} /><Title>Welcome to CloudyBebe</Title><Copy>Sign in with the same account you use on our website to see your orders and Baby Registry.</Copy><Feedback error={session.error} /><RouteButton label="Sign in" path={`/account/sign-in?returnTo=${encodeURIComponent(returnTo)}`} /><RouteButton label="Create an account" path={`/account/register?returnTo=${encodeURIComponent(returnTo)}`} secondary /></Card>
    <RouteButton label="Continue shopping" path="/shop" secondary />
  </Page>;
}
export function Choice({ label, detail, selected, onPress, checkbox = false }: { label: string; detail?: string; selected: boolean; onPress: () => void; checkbox?: boolean }) {
  const t = useTheme();
  return <Pressable accessibilityRole={checkbox ? 'checkbox' : 'radio'} accessibilityState={{ checked: selected }} accessibilityLabel={label} onPress={onPress} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, minHeight: 52, borderWidth: 1, borderColor: selected ? t.colors.primary : t.colors.border, borderRadius: 10, backgroundColor: selected ? t.colors.primarySoft : t.colors.surface }}><Ionicons name={checkbox ? selected ? 'checkbox-outline' : 'square-outline' : selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? t.colors.primary : t.colors.muted} /><View style={{ flex: 1 }}><Copy style={{ fontFamily: t.font.strong }}>{label}</Copy>{detail ? <Copy style={{ fontSize: 13, color: t.colors.muted, lineHeight: 20 }}>{detail}</Copy> : null}</View></Pressable>;
}
export function CountryField({ label, value, countries, onChange }: { label: string; value: string; countries: Country[]; onChange: (code: string) => void }) {
  const t = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const current = countries.find(country => country.code === value);
  return <View style={{ gap: 8 }}><Copy style={{ fontFamily: t.font.strong, fontSize: 14 }}>{label}</Copy><Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${current?.name ?? value ?? 'Choose'}`} accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={{ borderWidth: 1, borderColor: t.colors.border, borderRadius: 10, padding: 14, minHeight: 50, flexDirection: 'row', justifyContent: 'space-between' }}><Copy>{current?.name || value || 'Choose a country'}</Copy><Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={19} color={t.colors.muted} /></Pressable>{expanded ? <View style={{ gap: 8 }}><Field label="Search countries" value={search} onChangeText={setSearch} autoCapitalize="none" />{countries.filter(country => `${country.name} ${country.code}`.toLowerCase().includes(search.toLowerCase())).map(country => <Choice key={country.code} label={country.name} selected={country.code === value} onPress={() => { onChange(country.code); setExpanded(false); setSearch(''); }} />)}</View> : null}</View>;
}
