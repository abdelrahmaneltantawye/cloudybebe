import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Button, Copy, Title } from '@/components/ui';
import { useSession } from '@/state/session';
import { useResource } from '@/hooks/use-resource';
import { formatAmount, type OrderPage } from '@/lib/mobile-api';
import { AccountGate, Card, Feedback, Loading, Page, RouteButton } from '@/screens/account/shared';
import { theme as t } from '@/theme';

export function orderDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }); }
export default function OrdersScreen() { return <AccountGate title="My orders" returnTo="/orders"><OrdersList /></AccountGate>; }
function OrdersList() {
  const session = useSession();
  const [page, setPage] = useState(1);
  const result = useResource(signal => session.request<OrderPage>(`orders?page=${page}`, { signal }), [session.token, page]);
  return <Page title="My orders" subtitle="The little things you’ve chosen, and where they’re headed.">
    {result.loading ? <Loading label="Loading your orders…" /> : null}<Feedback error={result.error} />{result.error ? <Button label="Try again" secondary onPress={result.retry} /> : null}
    {result.data?.orders.length === 0 ? <Card><Title>No orders yet</Title><Copy>Your website and app orders will appear here once placed.</Copy><RouteButton label="Explore the shop" path="/shop" /></Card> : null}
    {result.data?.orders.map(order => <Card key={order.id}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Copy style={{ fontFamily: t.font.strong }}>Order #{order.number}</Copy><Copy style={{ color: t.colors.primary, fontSize: 13, backgroundColor: t.colors.primarySoft, paddingHorizontal: 9, borderRadius: 7 }}>{order.status_label}</Copy></View><Copy style={{ color: t.colors.muted, fontSize: 14 }}>{orderDate(order.date_created)}</Copy><View style={{ flexDirection: 'row', gap: 10 }}>{order.items.slice(0, 3).map(item => item.image ? <Image key={item.id} source={{ uri: item.image }} contentFit="contain" style={{ width: 62, height: 72, backgroundColor: t.colors.white }} accessibilityLabel={item.name} /> : null)}</View><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Copy>{order.item_count} {order.item_count === 1 ? 'item' : 'items'}</Copy><Copy style={{ fontFamily: t.font.strong }}>{formatAmount(order.total, order.currency)}</Copy></View><Button label="View order" secondary onPress={() => router.push({ pathname: '/orders/[id]', params: { id: order.id } })} /></Card>)}
    {result.data && result.data.total_pages > 1 ? <View style={{ gap: 12 }}><Copy style={{ textAlign: 'center', color: t.colors.muted }}>Page {page} of {result.data.total_pages}</Copy><View style={{ flexDirection: 'row', gap: 12 }}><Button label="Previous" secondary disabled={page <= 1} onPress={() => setPage(page - 1)} style={{ flex: 1 }} /><Button label="Next" secondary disabled={page >= result.data.total_pages} onPress={() => setPage(page + 1)} style={{ flex: 1 }} /></View></View> : null}
    {result.data ? <Button label="Refresh orders" secondary onPress={result.retry} /> : null}
  </Page>;
}
