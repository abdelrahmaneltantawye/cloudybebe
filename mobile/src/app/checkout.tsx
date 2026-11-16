import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, View } from 'react-native';
import { router, Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StoreBrowser } from '@/components/store-browser';
import { Button, Copy, Status, Title } from '@/components/ui';
import { validateTicket, receiptConfirmed, isCheckoutReturn, type CheckoutTicket, type CheckoutReceipt, type PendingCheckout } from '@/lib/checkout';
import { checkoutItems } from '@/lib/bag';
import { mobileRequest, errorMessage, formatAmount } from '@/lib/mobile-api';
import { readCheckout, saveCheckout, clearCheckout } from '@/lib/pending-checkout';
import { notifyOrderConfirmed } from '@/lib/notifications';
import { useShop } from '@/state/shop';
import { useSession } from '@/state/session';
import { theme as t } from '@/theme';

const HIDE_CHROME_SCRIPT = `
(function() {
  function inject() {
    if (document.getElementById('cloudybebe-native-style')) return;
    var style = document.createElement('style');
    style.id = 'cloudybebe-native-style';
    style.innerHTML = 'header, footer, #masthead, #colophon, .whb-header, .whb-main-header, .whb-sticky-header, .woodmart-header, .header-mobile, .footer-container, .main-footer, .woodmart-footer, .footer-sidebar, .woodmart-toolbar, .whb-toolbar, .site-header, .site-footer, .elementor-location-header, .elementor-location-footer, .top-bar, .announcement-bar, #wpadminbar, .mobile-nav, .storefront-handheld-footer-bar, .woocommerce-store-notice { display: none !important; visibility: hidden !important; height: 0 !important; overflow: hidden !important; } body, html, #page, #content, .main-page-wrapper { padding-top: 0 !important; margin-top: 0 !important; padding-bottom: 24px !important; } .woocommerce-checkout { padding: 8px 12px !important; }';
    document.head.appendChild(style);
  }
  inject();
  document.addEventListener('DOMContentLoaded', inject);
  setTimeout(inject, 400);
  setTimeout(inject, 1200);
})();
true;
`;

export default function Checkout() {
  const { bag, ready, removePurchased } = useShop();
  const session = useSession();
  const [pending, setPending] = useState<PendingCheckout | null>(null);
  const [receipt, setReceipt] = useState<CheckoutReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [showStore, setShowStore] = useState(false);
  const initialized = useRef(false);
  const busy = useRef(false);
  const confirmed = useRef(false);

  const verify = useCallback(async (value: PendingCheckout) => {
    if (busy.current || confirmed.current) return null;
    busy.current = true;
    setChecking(true);
    try {
      const result = await mobileRequest<CheckoutReceipt>(`checkout/${value.ticket.checkout_id}/status`, {
        token: session.token,
        checkoutToken: value.ticket.checkout_token,
      });
      setReceipt(result);
      setError('');
      if (receiptConfirmed(result)) {
        confirmed.current = true;
        await removePurchased(value.snapshot, value.ticket.checkout_id);
        setShowStore(false);
        await clearCheckout();
        void notifyOrderConfirmed(
          result.order_number || String(result.order_id),
          formatAmount(result.total || '', result.currency || 'USD')
        );
      }
      return result;
    } catch (failure) {
      setError(errorMessage(failure));
      return null;
    } finally {
      busy.current = false;
      setChecking(false);
    }
  }, [session.token, removePurchased]);

  const start = useCallback(async () => {
    setLoading(true);
    setError('');
    setShowStore(false);
    try {
      const snapshot = bag.map(row => ({ ...row }));
      const ticket = validateTicket(
        await mobileRequest<CheckoutTicket>('checkout', {
          method: 'POST',
          token: session.token,
          body: { items: checkoutItems(snapshot) },
        })
      );
      const value = { ticket, snapshot, userId: session.user?.id ?? null };
      await saveCheckout(value);
      confirmed.current = false;
      setReceipt(null);
      setPending(value);
      setShowStore(true);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setLoading(false);
    }
  }, [bag, session.token, session.user]);

  const restart = async () => {
    if (!pending) return;
    const result = await verify(pending);
    if (!result || receiptConfirmed(result)) return;
    if (result.order_id && !['failed', 'cancelled'].includes(result.status)) {
      setError('This order is still awaiting payment confirmation. Check its status again before starting another checkout.');
      return;
    }
    await clearCheckout().catch(() => undefined);
    setPending(null);
    await start();
  };

  useEffect(() => {
    if (!ready || !session.ready || initialized.current) return;
    initialized.current = true;
    void readCheckout().then(async previous => {
      if (previous) {
        if (previous.userId !== (session.user?.id ?? null)) {
          setError('Sign in to the same account to check your previous checkout.');
          setLoading(false);
          return;
        }
        setPending(previous);
        setLoading(false);
        await verify(previous);
      } else {
        await start();
      }
    }).catch(failure => {
      setError(errorMessage(failure));
      setLoading(false);
    });
  }, [ready, session.ready, session.user?.id, start, verify]);

  useEffect(() => {
    if (!pending || confirmed.current) return;
    const timer = setInterval(() => { void verify(pending); }, 15000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void verify(pending);
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [pending, verify]);

  if (loading) return <Status loading />;

  if (receipt && receiptConfirmed(receipt)) {
    return (
      <View style={{ padding: t.space.xl, gap: t.space.lg }}>
        <Title large>Thank you.</Title>
        <Copy>Your order #{receipt.order_number || receipt.order_id} has been received.</Copy>
        <Copy>{receipt.paid ? 'Your payment is confirmed.' : 'Payment is awaiting confirmation. Follow the instructions from checkout.'}</Copy>
        {session.user ? (
          <Button label="View my order" onPress={() => router.replace({ pathname: '/orders/[id]', params: { id: String(receipt.order_id) } })} />
        ) : (
          <Copy>Check your email for your order details.</Copy>
        )}
        <Button label="Continue shopping" secondary onPress={() => router.replace('/shop')} />
      </View>
    );
  }

  const ended = receipt && ['failed', 'cancelled', 'expired'].includes(receipt.status);
  const showHeaderNotice = error || ended || !showStore;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Stack.Screen
        options={{
          title: 'Secure Checkout',
          presentation: 'modal',
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close checkout"
              onPress={() => router.back()}
              style={{ paddingHorizontal: 8, paddingVertical: 4, minHeight: 44, justifyContent: 'center' }}
            >
              <Ionicons name="close" size={24} color={t.colors.ink} />
            </Pressable>
          ),
        }}
      />
      {showHeaderNotice ? (
        <View style={{ paddingHorizontal: t.space.lg, paddingVertical: t.space.md, gap: t.space.sm, borderBottomWidth: 1, borderColor: t.colors.border }}>
          {error ? <Copy accessibilityRole="alert" style={{ color: t.colors.error }}>{error}</Copy> : null}
          {pending ? (
            <>
              <Copy style={{ fontSize: t.type.small, color: t.colors.muted }}>
                {ended ? 'This checkout has ended. Your bag is saved.' : 'Checkout is in progress. Return here after completing your order.'}
              </Copy>
              <Button label={checking ? 'Checking order…' : 'Check order status'} disabled={checking} secondary onPress={() => void verify(pending)} />
              {receipt && !ended ? <Copy style={{ fontSize: t.type.small, color: t.colors.muted }}>The store has not confirmed a completed order yet.</Copy> : null}
            </>
          ) : (
            <Copy>Your bag is saved. Please try again when you’re ready.</Copy>
          )}
          {!pending || ended ? <Button label="Prepare secure checkout" onPress={() => void start()} /> : null}
          {pending && !showStore && !ended ? <Button label="Restart checkout" disabled={checking} secondary onPress={() => void restart()} /> : null}
          {Platform.OS !== 'web' && pending && !showStore && !ended ? (
            <Copy style={{ color: t.colors.muted, fontSize: t.type.small }}>If you left checkout, check your order status before trying again.</Copy>
          ) : null}
        </View>
      ) : null}
      {pending && showStore && !ended ? (
        <StoreBrowser
          key={pending.ticket.checkout_id}
          privateSession
          script={HIDE_CHROME_SCRIPT}
          url={pending.ticket.url}
          onNavigation={url => {
            if (isCheckoutReturn(url, pending.ticket.checkout_id)) void verify(pending);
          }}
        />
      ) : null}
    </View>
  );
}
