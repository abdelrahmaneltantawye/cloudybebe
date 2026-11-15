import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { Button, Copy, Title } from '@/components/ui';
import { useSession } from '@/state/session';
import { useResource } from '@/hooks/use-resource';
import { errorMessage, formatAmount, type Order } from '@/lib/mobile-api';
import { AccountGate, Card, Feedback, Loading, Page } from '@/screens/account/shared';
import { orderDate } from '@/screens/orders/list';
import { theme as t } from '@/theme';

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AccountGate title="Order details" returnTo={`/orders/${id}`}><OrderDetails id={id} /></AccountGate>;
}
function OrderDetails({ id }: { id: string }) {
  const session = useSession();
  const result = useResource(signal => session.request<Order>(`orders/${encodeURIComponent(id)}`, { signal }), [id, session.token]);
  const [error, setError] = useState('');
  const order = result.data;
  async function tracking(url: string) { try { if (!/^https:\/\//i.test(url)) throw new Error('The carrier link is unavailable. Please contact CloudyBebe for help.'); await WebBrowser.openBrowserAsync(url); } catch (failure) { setError(errorMessage(failure)); } }
  return <Page title={order ? `Order #${order.number}` : 'Order details'} subtitle={order ? `Placed ${orderDate(order.date_created)}` : undefined}>
    {result.loading ? <Loading label="Loading your order…" /> : null}<Feedback error={result.error || error} />{result.error ? <Button label="Try again" secondary onPress={result.retry} /> : null}
    {order ? <><Card tint><Title>{order.status_label}</Title>{order.tracking.length === 0 ? <Copy>Tracking details haven’t been provided for this order yet.</Copy> : order.tracking.map((item, index) => <View key={index} style={{ gap: 8 }}><Copy>{item.provider || item.label || 'Delivery tracking'}</Copy>{item.number ? <Copy selectable>{item.number}</Copy> : null}{item.url ? <Button label="Track delivery" secondary onPress={() => void tracking(item.url!)} /> : <Copy>A tracking link hasn’t been provided yet.</Copy>}</View>)}</Card>
      <Title>Your items</Title>{order.items.map(item => <View key={item.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: t.colors.border, paddingBottom: 16 }}>{item.image ? <Image source={{ uri: item.image }} contentFit="contain" style={{ width: 65, height: 80, backgroundColor: t.colors.white }} accessibilityLabel={item.name} /> : null}<View style={{ flex: 1, gap: 4 }}><Copy style={{ fontFamily: t.font.strong }}>{item.name}</Copy><Copy style={{ color: t.colors.muted, fontSize: 14 }}>Quantity: {item.quantity}</Copy><Copy>{formatAmount(item.total, order.currency)}</Copy></View></View>)}
      <Card><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Copy style={{ fontFamily: t.font.strong }}>Order total</Copy><Copy style={{ fontFamily: t.font.strong }}>{formatAmount(order.total, order.currency)}</Copy></View><Copy style={{ color: t.colors.muted, fontSize: 13 }}>Includes any shipping, tax and discounts applied to your order.</Copy></Card>
      <Card><Title>Delivery address</Title><Copy selectable>{[`${order.shipping.first_name} ${order.shipping.last_name}`.trim(), order.shipping.company, order.shipping.address_1, order.shipping.address_2, [order.shipping.city, order.shipping.state, order.shipping.postcode].filter(Boolean).join(', '), order.shipping.country].filter(Boolean).join('\n') || 'No delivery address was supplied for this order.'}</Copy></Card><Button label="Refresh order" secondary onPress={result.retry} /></> : null}
  </Page>;
}
