import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import * as Clipboard from 'expo-clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Copy, Title } from '@/components/ui';
import { useSession } from '@/state/session';
import { useResource } from '@/hooks/use-resource';
import { errorMessage, formatAmount, type Order } from '@/lib/mobile-api';
import { AccountGate, Card, Feedback, Loading, Page } from '@/screens/account/shared';
import { orderDate } from '@/screens/orders/list';
import { useTheme } from '@/design-system';
import { haptic } from '@/lib/haptics';

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <AccountGate title="Order details" returnTo={`/orders/${id}`}>
      <OrderDetails id={id} />
    </AccountGate>
  );
}

function getTrackingStep(status: string, hasTracking: boolean): number {
  const normalized = status.toLowerCase();
  if (['cancelled', 'refunded', 'failed'].includes(normalized)) return -1;
  if (normalized === 'delivered') return 4;
  if (normalized === 'completed' || hasTracking) return 3;
  if (['processing', 'on-hold'].includes(normalized)) return 2;
  return 1;
}

function OrderTimeline({ status, hasTracking }: { status: string; hasTracking: boolean }) {
  const t = useTheme();
  const currentStep = getTrackingStep(status, hasTracking);
  const isCancelled = currentStep === -1;

  if (isCancelled) {
    return (
      <View style={{ padding: t.space.md, borderRadius: t.radius.md, backgroundColor: 'rgba(235, 87, 87, 0.1)', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name="alert-circle" size={24} color={t.colors.error} />
        <View style={{ flex: 1 }}>
          <Copy style={{ fontFamily: t.font.strong, color: t.colors.error }}>Order Cancelled</Copy>
          <Copy style={{ fontSize: 13, color: t.colors.muted }}>This order has been cancelled or refunded.</Copy>
        </View>
      </View>
    );
  }

  const steps = [
    { title: 'Order Placed', desc: 'Received and confirmed', icon: 'checkmark-circle' },
    { title: 'Preparing Order', desc: 'Packing in warehouse', icon: 'cube' },
    { title: 'Shipped & On the Way', desc: 'Handed to carrier', icon: 'airplane' },
    { title: 'Delivered', desc: 'At your doorstep', icon: 'home' },
  ] as const;

  return (
    <View style={{ padding: t.space.md, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface, gap: 16 }}>
      <Title style={{ fontSize: 18 }}>Delivery Status</Title>
      <View style={{ gap: 0 }}>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isDone = currentStep >= stepNumber;
          const isCurrent = currentStep === stepNumber;
          const isLast = index === steps.length - 1;

          return (
            <View key={step.title} style={{ flexDirection: 'row', gap: 14 }}>
              {/* Timeline indicator column */}
              <View style={{ alignItems: 'center', width: 28 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isDone ? t.colors.primary : t.colors.border,
                    shadowColor: isCurrent ? t.colors.primary : 'transparent',
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                  }}
                >
                  <Ionicons
                    name={step.icon}
                    size={14}
                    color={isDone ? t.colors.white : t.colors.muted}
                  />
                </View>
                {!isLast && (
                  <View
                    style={{
                      width: 2,
                      flex: 1,
                      minHeight: 28,
                      backgroundColor: currentStep > stepNumber ? t.colors.primary : t.colors.border,
                      marginVertical: 4,
                    }}
                  />
                )}
              </View>

              {/* Step info */}
              <View style={{ flex: 1, paddingBottom: isLast ? 0 : 20, paddingTop: 2 }}>
                <Copy
                  style={{
                    fontFamily: isDone ? t.font.strong : t.font.body,
                    fontSize: 15,
                    color: isDone ? t.colors.ink : t.colors.muted,
                  }}
                >
                  {step.title}
                </Copy>
                <Copy style={{ fontSize: 12, color: t.colors.muted, marginTop: 2 }}>
                  {step.desc}
                </Copy>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function OrderDetails({ id }: { id: string }) {
  const t = useTheme();
  const session = useSession();
  const result = useResource(signal => session.request<Order>(`orders/${encodeURIComponent(id)}`, { signal }), [id, session.token]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const order = result.data;

  async function tracking(url: string) {
    try {
      if (!/^https?:\/\//i.test(url)) throw new Error('Carrier link is unavailable. Please contact CloudyBebe for support.');
      await WebBrowser.openBrowserAsync(url);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }

  async function copyTrackingNumber(num: string) {
    await Clipboard.setStringAsync(num);
    haptic.success();
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const hasTracking = !!order?.tracking && order.tracking.length > 0 && !!order.tracking.some(t => !!t.number || !!t.url);

  return (
    <Page
      title={order ? `Order #${order.number}` : 'Order details'}
      subtitle={order ? `Placed on ${orderDate(order.date_created)}` : undefined}
    >
      {result.loading ? <Loading label="Loading order details…" /> : null}
      <Feedback error={result.error || error} />
      {result.error ? <Button label="Try again" secondary onPress={result.retry} /> : null}

      {order ? (
        <>
          {/* Visual Order Progress Stepper */}
          <OrderTimeline status={order.status} hasTracking={hasTracking} />

          {/* Carrier Tracking Card */}
          {order.tracking && order.tracking.length > 0 ? (
            <Card tint>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="navigate-outline" size={20} color={t.colors.primary} />
                <Title style={{ fontSize: 17 }}>Carrier Tracking</Title>
              </View>
              {order.tracking.map((item, index) => (
                <View key={index} style={{ gap: 10, paddingTop: 6 }}>
                  <Copy style={{ fontFamily: t.font.strong, fontSize: 14 }}>
                    {item.provider || item.label || 'Standard Shipping'}
                  </Copy>
                  {item.number ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 8, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border }}>
                      <Copy selectable style={{ fontFamily: t.font.strong, fontSize: 15, letterSpacing: 0.5 }}>
                        {item.number}
                      </Copy>
                      <Pressable
                        onPress={() => void copyTrackingNumber(item.number!)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}
                      >
                        <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? t.colors.primary : t.colors.muted} />
                        <Copy style={{ fontSize: 12, color: copied ? t.colors.primary : t.colors.muted, fontFamily: t.font.strong }}>
                          {copied ? 'Copied!' : 'Copy'}
                        </Copy>
                      </Pressable>
                    </View>
                  ) : null}
                  {item.url ? (
                    <Button label="Track Package Live  →" secondary onPress={() => void tracking(item.url!)} />
                  ) : null}
                </View>
              ))}
            </Card>
          ) : null}

          {/* Items Summary */}
          <View style={{ gap: 12 }}>
            <Title style={{ fontSize: 18 }}>Items in this order ({order.items.length})</Title>
            {order.items.map(item => (
              <View
                key={item.id}
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  alignItems: 'center',
                  borderBottomWidth: 1,
                  borderBottomColor: t.colors.border,
                  paddingBottom: 14,
                }}
              >
                {item.image ? (
                  <Image
                    source={{ uri: item.image }}
                    contentFit="contain"
                    style={{ width: 68, height: 78, borderRadius: 8, backgroundColor: t.colors.surface }}
                    accessibilityLabel={item.name}
                  />
                ) : null}
                <View style={{ flex: 1, gap: 4 }}>
                  <Copy style={{ fontFamily: t.font.strong, fontSize: 15 }}>{item.name}</Copy>
                  <Copy style={{ color: t.colors.muted, fontSize: 13 }}>Qty: {item.quantity}</Copy>
                  <Copy style={{ fontFamily: t.font.strong, color: t.colors.primary }}>
                    {formatAmount(item.total, order.currency)}
                  </Copy>
                </View>
              </View>
            ))}
          </View>

          {/* Order Total Breakdown */}
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Copy style={{ fontFamily: t.font.strong, fontSize: 16 }}>Total Paid</Copy>
              <Copy style={{ fontFamily: t.font.strong, fontSize: 18, color: t.colors.primary }}>
                {formatAmount(order.total, order.currency)}
              </Copy>
            </View>
            <Copy style={{ color: t.colors.muted, fontSize: 12 }}>
              Includes shipping, taxes, and applied discounts for US delivery.
            </Copy>
          </Card>

          {/* Delivery Address */}
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="location-outline" size={18} color={t.colors.primary} />
              <Title style={{ fontSize: 16 }}>Shipping Address</Title>
            </View>
            <Copy selectable style={{ lineHeight: 22 }}>
              {[
                `${order.shipping.first_name} ${order.shipping.last_name}`.trim(),
                order.shipping.company,
                order.shipping.address_1,
                order.shipping.address_2,
                [order.shipping.city, order.shipping.state, order.shipping.postcode].filter(Boolean).join(', '),
                order.shipping.country,
              ]
                .filter(Boolean)
                .join('\n') || 'No delivery address was supplied.'}
            </Copy>
          </Card>

          <Button label="Refresh order status" secondary onPress={result.retry} />
        </>
      ) : null}
    </Page>
  );
}
