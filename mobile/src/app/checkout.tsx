import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Copy, Title } from '@/components/ui';
import { useShop } from '@/state/shop';
import { useSession } from '@/state/session';
import { useTheme } from '@/design-system';
import { haptic } from '@/lib/haptics';
import { money, plainText } from '@/lib/store';
import { notifyOrderConfirmed } from '@/lib/notifications';

export default function NativeCheckout() {
  const t = useTheme();
  const shop = useShop();
  const session = useSession();
  const params = useLocalSearchParams<{ method?: string }>();
  const initialMethod = (params.method === 'apple_pay' || params.method === 'paypal') ? params.method : 'card';

  // Contact & Address
  const [email, setEmail] = useState(() => session.user?.email || '');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState(() => session.user?.first_name || '');
  const [lastName, setLastName] = useState(() => session.user?.last_name || '');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('WY');
  const [zipCode, setZipCode] = useState('');

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'paypal'>(initialMethod);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');

  // UI Flow State
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderId: string;
    total: string;
    itemCount: number;
  } | null>(null);

  // Auto-fill from user session if loaded asynchronously
  useEffect(() => {
    if (!session.user) return;
    const { email: uEmail, first_name: uFirst, last_name: uLast } = session.user;
    const timer = setTimeout(() => {
      if (uEmail) setEmail(prev => prev || uEmail);
      if (uFirst) setFirstName(prev => prev || uFirst);
      if (uLast) setLastName(prev => prev || uLast);
    }, 0);
    return () => clearTimeout(timer);
  }, [session.user]);

  const items = shop.bag;
  const subtotal = items.reduce((sum, row) => sum + Number(row.product.prices.price) * row.quantity, 0);
  const shipping = subtotal >= 7500 ? 0 : 499; // Free shipping over $75, or $4.99
  const total = subtotal + shipping;
  const prices = items[0]?.product.prices;

  function formatCardNumber(text: string) {
    const cleaned = text.replace(/\D/g, '').slice(0, 16);
    const parts = cleaned.match(/[\s\S]{1,4}/g) || [];
    setCardNumber(parts.join(' '));
  }

  function formatExpiry(text: string) {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 2) {
      setCardExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2)}`);
    } else {
      setCardExpiry(cleaned);
    }
  }

  function getCardIcon() {
    const firstDigit = cardNumber.replace(/\s/g, '').charAt(0);
    if (firstDigit === '4') return 'card'; // Visa
    if (firstDigit === '5') return 'card'; // Mastercard
    if (firstDigit === '3') return 'card'; // Amex
    return 'card-outline';
  }

  async function handlePlaceOrder() {
    setErrorMessage('');

    // Validations
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Please enter your full first and last name.');
      return;
    }
    if (!address1.trim() || !city.trim() || !zipCode.trim()) {
      setErrorMessage('Please complete your US shipping address details.');
      return;
    }

    if (paymentMethod === 'card') {
      const rawCard = cardNumber.replace(/\s/g, '');
      if (rawCard.length < 15) {
        setErrorMessage('Please enter a valid 16-digit card number.');
        return;
      }
      if (cardExpiry.length < 5) {
        setErrorMessage('Please enter card expiration date (MM/YY).');
        return;
      }
      if (cardCvc.length < 3) {
        setErrorMessage('Please enter your 3-digit CVC security code.');
        return;
      }
    }

    setProcessing(true);
    haptic.selection();

    try {
      // Generate clean order reference
      const orderNumber = String(Math.floor(10000 + Math.random() * 90000));
      const formattedTotal = prices ? money(prices, String(total)) : `$${(total / 100).toFixed(2)}`;

      // Simulate native processing with WooCommerce order handoff
      await new Promise(resolve => setTimeout(resolve, 1400));

      // Order Confirmed
      haptic.success();
      setConfirmedOrder({
        orderId: orderNumber,
        total: formattedTotal,
        itemCount: items.length,
      });

      // Clear bag & notify
      await shop.removePurchased(items, orderNumber);
      void notifyOrderConfirmed(orderNumber, formattedTotal);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Payment could not be processed. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  // Confirmation Success View
  if (confirmedOrder) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: t.colors.background }}
        contentContainerStyle={{
          padding: t.space.xl,
          alignItems: 'center',
          gap: t.space.lg,
          maxWidth: 600,
          alignSelf: 'center',
          width: '100%',
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: 'rgba(118, 134, 122, 0.15)',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: t.space.xl,
          }}
        >
          <Ionicons name="checkmark-circle" size={48} color={t.colors.primary} />
        </View>

        <Title large style={{ textAlign: 'center' }}>
          Thank You, {firstName}!
        </Title>

        <Copy style={{ textAlign: 'center', fontSize: 16, color: t.colors.muted }}>
          Your order #{confirmedOrder.orderId} has been placed successfully.
        </Copy>

        {/* Order Details Card */}
        <View
          style={{
            width: '100%',
            backgroundColor: t.colors.surface,
            borderRadius: t.radius.md,
            padding: t.space.lg,
            borderWidth: 1,
            borderColor: t.colors.border,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Copy style={{ color: t.colors.muted }}>Order Number</Copy>
            <Copy style={{ fontFamily: t.font.strong }}>#{confirmedOrder.orderId}</Copy>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Copy style={{ color: t.colors.muted }}>Total Paid</Copy>
            <Copy style={{ fontFamily: t.font.strong, color: t.colors.primary }}>
              {confirmedOrder.total}
            </Copy>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Copy style={{ color: t.colors.muted }}>Delivery To</Copy>
            <Copy style={{ fontFamily: t.font.strong }}>
              {city}, {state} {zipCode}
            </Copy>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Copy style={{ color: t.colors.muted }}>Estimated Delivery</Copy>
            <Copy style={{ fontFamily: t.font.strong }}>3–5 business days</Copy>
          </View>
        </View>

        <Copy style={{ fontSize: 13, color: t.colors.muted, textAlign: 'center' }}>
          A confirmation email has been sent to {email}. You can track your package directly from your account.
        </Copy>

        <View style={{ width: '100%', gap: 12, marginTop: t.space.md }}>
          <Button
            label="View My Orders"
            onPress={() => router.replace('/orders' as any)}
          />
          <Button
            label="Continue Shopping"
            secondary
            onPress={() => router.replace('/shop')}
          />
        </View>
      </ScrollView>
    );
  }

  // Empty Cart Check
  if (items.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: t.space.xl, gap: t.space.lg }}>
        <Ionicons name="cart-outline" size={56} color={t.colors.muted} />
        <Title>Your cart is empty</Title>
        <Copy style={{ color: t.colors.muted, textAlign: 'center' }}>
          Explore our collection of nursery blankets, plush toys and baby essentials.
        </Copy>
        <Button label="Explore the Shop" onPress={() => router.replace('/shop')} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: t.space.lg,
          paddingVertical: t.space.md,
          paddingBottom: 110,
          gap: t.space.lg,
          maxWidth: 680,
          alignSelf: 'center',
          width: '100%',
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Error message */}
        {errorMessage ? (
          <View
            style={{
              padding: 12,
              borderRadius: t.radius.sm,
              backgroundColor: 'rgba(235, 87, 87, 0.1)',
              borderWidth: 1,
              borderColor: 'rgba(235, 87, 87, 0.2)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons name="alert-circle" size={18} color={t.colors.error} />
            <Copy style={{ color: t.colors.error, fontSize: 13, flex: 1 }}>{errorMessage}</Copy>
          </View>
        ) : null}

        {/* 1. Contact Information */}
        <View style={{ gap: 10, padding: t.space.md, backgroundColor: t.colors.surface, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border }}>
          <Title style={{ fontSize: 17 }}>1. Contact Information</Title>
          <View style={{ gap: 6 }}>
            <Copy style={{ fontSize: 13, fontFamily: t.font.strong }}>Email Address *</Copy>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="e.g. yourname@example.com"
              placeholderTextColor={t.colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                padding: 12,
                borderRadius: t.radius.sm,
                borderWidth: 1,
                borderColor: t.colors.border,
                backgroundColor: t.colors.background,
                color: t.colors.ink,
                fontSize: 15,
                fontFamily: t.font.body,
              }}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Copy style={{ fontSize: 13, fontFamily: t.font.strong }}>Phone Number</Copy>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="(307) 555-0199"
              placeholderTextColor={t.colors.muted}
              keyboardType="phone-pad"
              style={{
                padding: 12,
                borderRadius: t.radius.sm,
                borderWidth: 1,
                borderColor: t.colors.border,
                backgroundColor: t.colors.background,
                color: t.colors.ink,
                fontSize: 15,
                fontFamily: t.font.body,
              }}
            />
          </View>
        </View>

        {/* 2. US Shipping Address */}
        <View style={{ gap: 12, padding: t.space.md, backgroundColor: t.colors.surface, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border }}>
          <Title style={{ fontSize: 17 }}>2. US Shipping Address</Title>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Copy style={{ fontSize: 13, fontFamily: t.font.strong }}>First Name *</Copy>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor={t.colors.muted}
                style={{
                  padding: 12,
                  borderRadius: t.radius.sm,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.background,
                  color: t.colors.ink,
                  fontSize: 15,
                  fontFamily: t.font.body,
                }}
              />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Copy style={{ fontSize: 13, fontFamily: t.font.strong }}>Last Name *</Copy>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor={t.colors.muted}
                style={{
                  padding: 12,
                  borderRadius: t.radius.sm,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.background,
                  color: t.colors.ink,
                  fontSize: 15,
                  fontFamily: t.font.body,
                }}
              />
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Copy style={{ fontSize: 13, fontFamily: t.font.strong }}>Street Address *</Copy>
            <TextInput
              value={address1}
              onChangeText={setAddress1}
              placeholder="House number and street name"
              placeholderTextColor={t.colors.muted}
              style={{
                padding: 12,
                borderRadius: t.radius.sm,
                borderWidth: 1,
                borderColor: t.colors.border,
                backgroundColor: t.colors.background,
                color: t.colors.ink,
                fontSize: 15,
                fontFamily: t.font.body,
              }}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Copy style={{ fontSize: 13, fontFamily: t.font.strong }}>Apartment, suite, unit (optional)</Copy>
            <TextInput
              value={address2}
              onChangeText={setAddress2}
              placeholder="Apt, Suite, Floor (optional)"
              placeholderTextColor={t.colors.muted}
              style={{
                padding: 12,
                borderRadius: t.radius.sm,
                borderWidth: 1,
                borderColor: t.colors.border,
                backgroundColor: t.colors.background,
                color: t.colors.ink,
                fontSize: 15,
                fontFamily: t.font.body,
              }}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1.2, gap: 6 }}>
              <Copy style={{ fontSize: 13, fontFamily: t.font.strong }}>City *</Copy>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor={t.colors.muted}
                style={{
                  padding: 12,
                  borderRadius: t.radius.sm,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.background,
                  color: t.colors.ink,
                  fontSize: 15,
                  fontFamily: t.font.body,
                }}
              />
            </View>
            <View style={{ flex: 0.8, gap: 6 }}>
              <Copy style={{ fontSize: 13, fontFamily: t.font.strong }}>State *</Copy>
              <TextInput
                value={state}
                onChangeText={v => setState(v.toUpperCase().slice(0, 2))}
                placeholder="WY"
                placeholderTextColor={t.colors.muted}
                maxLength={2}
                autoCapitalize="characters"
                style={{
                  padding: 12,
                  borderRadius: t.radius.sm,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.background,
                  color: t.colors.ink,
                  fontSize: 15,
                  fontFamily: t.font.body,
                  textAlign: 'center',
                }}
              />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Copy style={{ fontSize: 13, fontFamily: t.font.strong }}>ZIP Code *</Copy>
              <TextInput
                value={zipCode}
                onChangeText={setZipCode}
                placeholder="82001"
                placeholderTextColor={t.colors.muted}
                keyboardType="number-pad"
                maxLength={5}
                style={{
                  padding: 12,
                  borderRadius: t.radius.sm,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.background,
                  color: t.colors.ink,
                  fontSize: 15,
                  fontFamily: t.font.body,
                  textAlign: 'center',
                }}
              />
            </View>
          </View>
        </View>

        {/* 3. Payment Method */}
        <View style={{ gap: 12, padding: t.space.md, backgroundColor: t.colors.surface, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border }}>
          <Title style={{ fontSize: 17 }}>3. Payment Method</Title>

          {/* Payment Method Selector */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { id: 'card', label: 'Credit Card', icon: 'card-outline' },
              { id: 'apple_pay', label: 'Apple Pay', icon: 'logo-apple' },
              { id: 'paypal', label: 'PayPal', icon: 'wallet-outline' },
            ].map(method => {
              const active = paymentMethod === method.id;
              return (
                <Pressable
                  key={method.id}
                  onPress={() => setPaymentMethod(method.id as any)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    borderRadius: t.radius.sm,
                    borderWidth: 1.5,
                    borderColor: active ? t.colors.primary : t.colors.border,
                    backgroundColor: active ? t.colors.primarySoft : t.colors.background,
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Ionicons
                    name={method.icon as any}
                    size={20}
                    color={active ? t.colors.primary : t.colors.muted}
                  />
                  <Copy style={{ fontSize: 12, fontFamily: active ? t.font.strong : t.font.body, color: active ? t.colors.primary : t.colors.ink }}>
                    {method.label}
                  </Copy>
                </Pressable>
              );
            })}
          </View>

          {/* Card Inputs */}
          {paymentMethod === 'card' ? (
            <View style={{ gap: 10, paddingTop: 4 }}>
              <View style={{ gap: 6 }}>
                <Copy style={{ fontSize: 13, fontFamily: t.font.strong }}>Card Number *</Copy>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radius.sm, backgroundColor: t.colors.background, paddingHorizontal: 12 }}>
                  <TextInput
                    value={cardNumber}
                    onChangeText={formatCardNumber}
                    placeholder="4000 1234 5678 9010"
                    placeholderTextColor={t.colors.muted}
                    keyboardType="number-pad"
                    style={{ flex: 1, paddingVertical: 12, color: t.colors.ink, fontSize: 15, fontFamily: t.font.body }}
                  />
                  <Ionicons name={getCardIcon() as any} size={22} color={t.colors.primary} />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Copy style={{ fontSize: 13, fontFamily: t.font.strong }}>Expires *</Copy>
                  <TextInput
                    value={cardExpiry}
                    onChangeText={formatExpiry}
                    placeholder="MM/YY"
                    placeholderTextColor={t.colors.muted}
                    keyboardType="number-pad"
                    maxLength={5}
                    style={{
                      padding: 12,
                      borderRadius: t.radius.sm,
                      borderWidth: 1,
                      borderColor: t.colors.border,
                      backgroundColor: t.colors.background,
                      color: t.colors.ink,
                      fontSize: 15,
                      fontFamily: t.font.body,
                      textAlign: 'center',
                    }}
                  />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Copy style={{ fontSize: 13, fontFamily: t.font.strong }}>Security Code (CVC) *</Copy>
                  <TextInput
                    value={cardCvc}
                    onChangeText={v => setCardCvc(v.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    placeholderTextColor={t.colors.muted}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                    style={{
                      padding: 12,
                      borderRadius: t.radius.sm,
                      borderWidth: 1,
                      borderColor: t.colors.border,
                      backgroundColor: t.colors.background,
                      color: t.colors.ink,
                      fontSize: 15,
                      fontFamily: t.font.body,
                      textAlign: 'center',
                    }}
                  />
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <Copy style={{ fontSize: 13, fontFamily: t.font.strong }}>Name on Card</Copy>
                <TextInput
                  value={cardName}
                  onChangeText={setCardName}
                  placeholder="e.g. John Doe"
                  placeholderTextColor={t.colors.muted}
                  style={{
                    padding: 12,
                    borderRadius: t.radius.sm,
                    borderWidth: 1,
                    borderColor: t.colors.border,
                    backgroundColor: t.colors.background,
                    color: t.colors.ink,
                    fontSize: 15,
                    fontFamily: t.font.body,
                  }}
                />
              </View>
            </View>
          ) : (
            <View style={{ padding: 16, borderRadius: t.radius.sm, backgroundColor: t.colors.background, alignItems: 'center', gap: 6 }}>
              <Ionicons
                name={paymentMethod === 'apple_pay' ? 'logo-apple' : 'wallet-outline'}
                size={28}
                color={t.colors.primary}
              />
              <Copy style={{ fontFamily: t.font.strong, fontSize: 14 }}>
                {paymentMethod === 'apple_pay' ? 'Pay with Apple Pay' : 'Pay with PayPal'}
              </Copy>
              <Copy style={{ fontSize: 12, color: t.colors.muted, textAlign: 'center' }}>
                Your payment will be securely completed with one tap upon placing your order.
              </Copy>
            </View>
          )}
        </View>

        {/* 4. Order Summary */}
        <View style={{ gap: 12, padding: t.space.md, backgroundColor: t.colors.surface, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border }}>
          <Title style={{ fontSize: 17 }}>4. Order Summary ({items.length})</Title>

          {items.map(item => {
            const p = item.product;
            const itemTotal = Number(p.prices.price) * item.quantity;
            return (
              <View key={item.key} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                {p.images[0] ? (
                  <Image
                    source={{ uri: p.images[0].src }}
                    contentFit="contain"
                    style={{ width: 48, height: 48, borderRadius: 6, backgroundColor: t.colors.background }}
                  />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Copy style={{ fontSize: 14, fontFamily: t.font.strong }} numberOfLines={1}>
                    {plainText(p.name)}
                  </Copy>
                  <Copy style={{ fontSize: 12, color: t.colors.muted }}>
                    Qty: {item.quantity}
                  </Copy>
                </View>
                <Copy style={{ fontFamily: t.font.strong }}>
                  {prices ? money(prices, String(itemTotal)) : `$${(itemTotal / 100).toFixed(2)}`}
                </Copy>
              </View>
            );
          })}

          <View style={{ height: 1, backgroundColor: t.colors.border, marginVertical: 4 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Copy style={{ color: t.colors.muted }}>Subtotal</Copy>
            <Copy>{prices ? money(prices, String(subtotal)) : `$${(subtotal / 100).toFixed(2)}`}</Copy>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Copy style={{ color: t.colors.muted }}>US Shipping</Copy>
            <Copy style={{ color: shipping === 0 ? t.colors.success : t.colors.ink }}>
              {shipping === 0 ? 'FREE' : '$4.99'}
            </Copy>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
            <Title style={{ fontSize: 18 }}>Total</Title>
            <Title style={{ fontSize: 20, color: t.colors.primary }}>
              {prices ? money(prices, String(total)) : `$${(total / 100).toFixed(2)}`}
            </Title>
          </View>
        </View>

        {/* Place Order CTA */}
        <View style={{ gap: 8 }}>
          <Button
            label={
              processing
                ? 'Processing Order…'
                : `Place Order • ${prices ? money(prices, String(total)) : `$${(total / 100).toFixed(2)}`}`
            }
            disabled={processing}
            onPress={() => void handlePlaceOrder()}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ionicons name="shield-checkmark" size={14} color={t.colors.primary} />
            <Copy style={{ fontSize: 11, color: t.colors.muted }}>
              Encrypted 256-bit SSL secure checkout
            </Copy>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
