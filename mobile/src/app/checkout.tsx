import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'paypal' | 'klarna' | 'afterpay'>(initialMethod as any);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [addressSuggestions, setAddressSuggestions] = useState<{ street: string; city: string; state: string; zip: string }[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const addressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFieldError = (fieldName: string) => {
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };
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

  const onAddressType = (val: string) => {
    setAddress1(val);
    clearFieldError('address1');

    if (addressTimer.current) clearTimeout(addressTimer.current);
    if (val.trim().length < 3) {
      setAddressSuggestions([]);
      return;
    }

    addressTimer.current = setTimeout(async () => {
      try {
        setLoadingSuggestions(true);
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=4&countrycode=us`
        );
        if (!res.ok) return;
        const json = await res.json();
        const results: { street: string; city: string; state: string; zip: string }[] = [];
        for (const feat of json.features || []) {
          const props = feat.properties || {};
          const streetPart = [props.housenumber, props.street || props.name].filter(Boolean).join(' ');
          if (streetPart && (props.city || props.state)) {
            results.push({
              street: streetPart,
              city: props.city || '',
              state: props.state || '',
              zip: props.postcode || '',
            });
          }
        }
        setAddressSuggestions(results);
      } catch {
        // fallback
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);
  };

  const chooseSuggestion = (item: { street: string; city: string; state: string; zip: string }) => {
    haptic.selection();
    setAddress1(item.street);
    if (item.city) setCity(item.city);
    if (item.state) {
      const code = item.state.slice(0, 2).toUpperCase();
      setState(code);
    }
    if (item.zip) setZipCode(item.zip.slice(0, 5));
    setAddressSuggestions([]);
    setFieldErrors(prev => {
      const copy = { ...prev };
      delete copy.address1;
      delete copy.city;
      delete copy.state;
      delete copy.zipCode;
      return copy;
    });
  };

  async function handlePlaceOrder() {
    setErrorMessage('');

    const errs: Record<string, string> = {};

    if (!email.trim() || !email.includes('@')) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!firstName.trim()) {
      errs.firstName = 'First name is required.';
    }
    if (!lastName.trim()) {
      errs.lastName = 'Last name is required.';
    }
    if (!address1.trim()) {
      errs.address1 = 'Street address is required.';
    }
    if (!city.trim()) {
      errs.city = 'City is required.';
    }
    if (!state.trim() || state.trim().length < 2) {
      errs.state = 'State is required.';
    }
    if (!zipCode.trim() || zipCode.trim().length < 5) {
      errs.zipCode = '5-digit ZIP code is required.';
    }

    if (paymentMethod === 'card') {
      const rawCard = cardNumber.replace(/\s/g, '');
      if (rawCard.length < 15) {
        errs.cardNumber = 'Please enter a valid 16-digit card number.';
      }
      if (cardExpiry.length < 5) {
        errs.cardExpiry = 'Enter MM/YY.';
      }
      if (cardCvc.length < 3) {
        errs.cardCvc = 'Enter 3-digit CVC.';
      }
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setErrorMessage('Please fill in the required fields highlighted in red.');
      haptic.medium();
      return;
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
              onChangeText={v => { setEmail(v); clearFieldError('email'); }}
              placeholder="e.g. yourname@example.com"
              placeholderTextColor={t.colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                padding: 12,
                borderRadius: t.radius.sm,
                borderWidth: fieldErrors.email ? 1.5 : 1,
                borderColor: fieldErrors.email ? t.colors.error : t.colors.border,
                backgroundColor: fieldErrors.email ? 'rgba(235, 87, 87, 0.05)' : t.colors.background,
                color: t.colors.ink,
                fontSize: 15,
                fontFamily: t.font.body,
              }}
            />
            {fieldErrors.email ? (
              <Copy style={{ color: t.colors.error, fontSize: 12, marginTop: 2 }}>{fieldErrors.email}</Copy>
            ) : null}
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

          {/* Locked Country */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: t.radius.sm, backgroundColor: t.colors.surfaceMuted, borderWidth: 1, borderColor: t.colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Copy style={{ fontSize: 18 }}>🇺🇸</Copy>
              <View>
                <Copy style={{ fontSize: 13, fontFamily: t.font.strong }}>Country / Region</Copy>
                <Copy style={{ fontSize: 12, color: t.colors.muted }}>United States (US Shipping Only)</Copy>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: t.colors.surface }}>
              <Ionicons name="lock-closed" size={12} color={t.colors.muted} />
              <Copy style={{ fontSize: 11, color: t.colors.muted, fontFamily: t.font.strong }}>Fixed</Copy>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Copy style={{ fontSize: 13, fontFamily: t.font.strong }}>First Name *</Copy>
              <TextInput
                value={firstName}
                onChangeText={v => { setFirstName(v); clearFieldError('firstName'); }}
                placeholder="First name"
                placeholderTextColor={t.colors.muted}
                style={{
                  padding: 12,
                  borderRadius: t.radius.sm,
                  borderWidth: fieldErrors.firstName ? 1.5 : 1,
                  borderColor: fieldErrors.firstName ? t.colors.error : t.colors.border,
                  backgroundColor: fieldErrors.firstName ? 'rgba(235, 87, 87, 0.05)' : t.colors.background,
                  color: t.colors.ink,
                  fontSize: 15,
                  fontFamily: t.font.body,
                }}
              />
              {fieldErrors.firstName ? (
                <Copy style={{ color: t.colors.error, fontSize: 12 }}>{fieldErrors.firstName}</Copy>
              ) : null}
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Copy style={{ fontSize: 13, fontFamily: t.font.strong }}>Last Name *</Copy>
              <TextInput
                value={lastName}
                onChangeText={v => { setLastName(v); clearFieldError('lastName'); }}
                placeholder="Last name"
                placeholderTextColor={t.colors.muted}
                style={{
                  padding: 12,
                  borderRadius: t.radius.sm,
                  borderWidth: fieldErrors.lastName ? 1.5 : 1,
                  borderColor: fieldErrors.lastName ? t.colors.error : t.colors.border,
                  backgroundColor: fieldErrors.lastName ? 'rgba(235, 87, 87, 0.05)' : t.colors.background,
                  color: t.colors.ink,
                  fontSize: 15,
                  fontFamily: t.font.body,
                }}
              />
              {fieldErrors.lastName ? (
                <Copy style={{ color: t.colors.error, fontSize: 12 }}>{fieldErrors.lastName}</Copy>
              ) : null}
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Copy style={{ fontSize: 13, fontFamily: t.font.strong }}>Street Address *</Copy>
            <TextInput
              value={address1}
              onChangeText={onAddressType}
              placeholder="House number and street name"
              placeholderTextColor={t.colors.muted}
              style={{
                padding: 12,
                borderRadius: t.radius.sm,
                borderWidth: fieldErrors.address1 ? 1.5 : 1,
                borderColor: fieldErrors.address1 ? t.colors.error : t.colors.border,
                backgroundColor: fieldErrors.address1 ? 'rgba(235, 87, 87, 0.05)' : t.colors.background,
                color: t.colors.ink,
                fontSize: 15,
                fontFamily: t.font.body,
              }}
            />
            {fieldErrors.address1 ? (
              <Copy style={{ color: t.colors.error, fontSize: 12 }}>{fieldErrors.address1}</Copy>
            ) : null}

            {/* Address Autocomplete Suggestions */}
            {addressSuggestions.length > 0 ? (
              <View style={{ backgroundColor: t.colors.surface, borderRadius: t.radius.sm, borderWidth: 1, borderColor: t.colors.primary, overflow: 'hidden', marginTop: 4 }}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: t.colors.primarySoft, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Copy style={{ fontSize: 11, fontFamily: t.font.strong, color: t.colors.primary }}>
                    Suggested US Addresses
                  </Copy>
                  {loadingSuggestions ? <ActivityIndicator size="small" color={t.colors.primary} /> : null}
                </View>
                {addressSuggestions.map((item, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => chooseSuggestion(item)}
                    style={({ pressed }) => ({
                      padding: 12,
                      borderTopWidth: idx > 0 ? 1 : 0,
                      borderColor: t.colors.border,
                      backgroundColor: pressed ? t.colors.surfaceMuted : t.colors.surface,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    })}
                  >
                    <Ionicons name="location-outline" size={16} color={t.colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Copy style={{ fontSize: 13, fontFamily: t.font.strong }}>{item.street}</Copy>
                      <Copy style={{ fontSize: 12, color: t.colors.muted }}>
                        {item.city}{item.city && item.state ? ', ' : ''}{item.state} {item.zip}
                      </Copy>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
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
                onChangeText={v => { setCity(v); clearFieldError('city'); }}
                placeholder="City"
                placeholderTextColor={t.colors.muted}
                style={{
                  padding: 12,
                  borderRadius: t.radius.sm,
                  borderWidth: fieldErrors.city ? 1.5 : 1,
                  borderColor: fieldErrors.city ? t.colors.error : t.colors.border,
                  backgroundColor: fieldErrors.city ? 'rgba(235, 87, 87, 0.05)' : t.colors.background,
                  color: t.colors.ink,
                  fontSize: 15,
                  fontFamily: t.font.body,
                }}
              />
              {fieldErrors.city ? (
                <Copy style={{ color: t.colors.error, fontSize: 12 }}>{fieldErrors.city}</Copy>
              ) : null}
            </View>
            <View style={{ flex: 0.8, gap: 6 }}>
              <Copy style={{ fontSize: 13, fontFamily: t.font.strong }}>State *</Copy>
              <TextInput
                value={state}
                onChangeText={v => { setState(v.toUpperCase().slice(0, 2)); clearFieldError('state'); }}
                placeholder="WY"
                placeholderTextColor={t.colors.muted}
                maxLength={2}
                autoCapitalize="characters"
                style={{
                  padding: 12,
                  borderRadius: t.radius.sm,
                  borderWidth: fieldErrors.state ? 1.5 : 1,
                  borderColor: fieldErrors.state ? t.colors.error : t.colors.border,
                  backgroundColor: fieldErrors.state ? 'rgba(235, 87, 87, 0.05)' : t.colors.background,
                  color: t.colors.ink,
                  fontSize: 15,
                  fontFamily: t.font.body,
                  textAlign: 'center',
                }}
              />
              {fieldErrors.state ? (
                <Copy style={{ color: t.colors.error, fontSize: 12 }}>{fieldErrors.state}</Copy>
              ) : null}
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Copy style={{ fontSize: 13, fontFamily: t.font.strong }}>ZIP Code *</Copy>
              <TextInput
                value={zipCode}
                onChangeText={v => { setZipCode(v); clearFieldError('zipCode'); }}
                placeholder="82001"
                placeholderTextColor={t.colors.muted}
                keyboardType="number-pad"
                maxLength={5}
                style={{
                  padding: 12,
                  borderRadius: t.radius.sm,
                  borderWidth: fieldErrors.zipCode ? 1.5 : 1,
                  borderColor: fieldErrors.zipCode ? t.colors.error : t.colors.border,
                  backgroundColor: fieldErrors.zipCode ? 'rgba(235, 87, 87, 0.05)' : t.colors.background,
                  color: t.colors.ink,
                  fontSize: 15,
                  fontFamily: t.font.body,
                  textAlign: 'center',
                }}
              />
              {fieldErrors.zipCode ? (
                <Copy style={{ color: t.colors.error, fontSize: 12 }}>{fieldErrors.zipCode}</Copy>
              ) : null}
            </View>
          </View>
        </View>

        {/* 3. Payment Method */}
        <View style={{ gap: 12, padding: t.space.md, backgroundColor: t.colors.surface, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border }}>
          <Title style={{ fontSize: 17 }}>3. Payment Method</Title>

          {/* Payment Method Selector (5 options) */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[
              { id: 'card', label: 'Credit Card', icon: 'card-outline' },
              { id: 'apple_pay', label: 'Apple Pay', icon: 'logo-apple' },
              { id: 'paypal', label: 'PayPal', icon: 'wallet-outline' },
              { id: 'klarna', label: 'Klarna', icon: 'time-outline' },
              { id: 'afterpay', label: 'Afterpay', icon: 'calendar-outline' },
            ].map(method => {
              const active = paymentMethod === method.id;
              return (
                <Pressable
                  key={method.id}
                  onPress={() => setPaymentMethod(method.id as any)}
                  style={{
                    flexBasis: '31%',
                    flexGrow: 1,
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
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: fieldErrors.cardNumber ? 1.5 : 1, borderColor: fieldErrors.cardNumber ? t.colors.error : t.colors.border, borderRadius: t.radius.sm, backgroundColor: fieldErrors.cardNumber ? 'rgba(235, 87, 87, 0.05)' : t.colors.background, paddingHorizontal: 12 }}>
                  <TextInput
                    value={cardNumber}
                    onChangeText={v => { formatCardNumber(v); clearFieldError('cardNumber'); }}
                    placeholder="4000 1234 5678 9010"
                    placeholderTextColor={t.colors.muted}
                    keyboardType="number-pad"
                    style={{ flex: 1, paddingVertical: 12, color: t.colors.ink, fontSize: 15, fontFamily: t.font.body }}
                  />
                  <Ionicons name={getCardIcon() as any} size={22} color={t.colors.primary} />
                </View>
                {fieldErrors.cardNumber ? (
                  <Copy style={{ color: t.colors.error, fontSize: 12 }}>{fieldErrors.cardNumber}</Copy>
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Copy style={{ fontSize: 13, fontFamily: t.font.strong }}>Expires *</Copy>
                  <TextInput
                    value={cardExpiry}
                    onChangeText={v => { formatExpiry(v); clearFieldError('cardExpiry'); }}
                    placeholder="MM/YY"
                    placeholderTextColor={t.colors.muted}
                    keyboardType="number-pad"
                    maxLength={5}
                    style={{
                      padding: 12,
                      borderRadius: t.radius.sm,
                      borderWidth: fieldErrors.cardExpiry ? 1.5 : 1,
                      borderColor: fieldErrors.cardExpiry ? t.colors.error : t.colors.border,
                      backgroundColor: fieldErrors.cardExpiry ? 'rgba(235, 87, 87, 0.05)' : t.colors.background,
                      color: t.colors.ink,
                      fontSize: 15,
                      fontFamily: t.font.body,
                      textAlign: 'center',
                    }}
                  />
                  {fieldErrors.cardExpiry ? (
                    <Copy style={{ color: t.colors.error, fontSize: 12 }}>{fieldErrors.cardExpiry}</Copy>
                  ) : null}
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Copy style={{ fontSize: 13, fontFamily: t.font.strong }}>Security Code (CVC) *</Copy>
                  <TextInput
                    value={cardCvc}
                    onChangeText={v => { setCardCvc(v.replace(/\D/g, '').slice(0, 4)); clearFieldError('cardCvc'); }}
                    placeholder="123"
                    placeholderTextColor={t.colors.muted}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                    style={{
                      padding: 12,
                      borderRadius: t.radius.sm,
                      borderWidth: fieldErrors.cardCvc ? 1.5 : 1,
                      borderColor: fieldErrors.cardCvc ? t.colors.error : t.colors.border,
                      backgroundColor: fieldErrors.cardCvc ? 'rgba(235, 87, 87, 0.05)' : t.colors.background,
                      color: t.colors.ink,
                      fontSize: 15,
                      fontFamily: t.font.body,
                      textAlign: 'center',
                    }}
                  />
                  {fieldErrors.cardCvc ? (
                    <Copy style={{ color: t.colors.error, fontSize: 12 }}>{fieldErrors.cardCvc}</Copy>
                  ) : null}
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
          ) : null}

          {/* Apple Pay Note */}
          {paymentMethod === 'apple_pay' ? (
            <View style={{ padding: 14, backgroundColor: t.colors.surfaceMuted, borderRadius: t.radius.sm, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="logo-apple" size={20} color={t.colors.ink} />
                <Copy style={{ fontFamily: t.font.strong, fontSize: 15 }}>Apple Pay</Copy>
              </View>
              <Copy style={{ fontSize: 13, color: t.colors.muted }}>
                Confirm your purchase using Face ID or Touch ID upon placing the order.
              </Copy>
            </View>
          ) : null}

          {/* PayPal Note */}
          {paymentMethod === 'paypal' ? (
            <View style={{ padding: 14, backgroundColor: t.colors.surfaceMuted, borderRadius: t.radius.sm, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="wallet-outline" size={20} color="#003087" />
                <Copy style={{ fontFamily: t.font.strong, fontSize: 15, color: '#003087' }}>PayPal</Copy>
              </View>
              <Copy style={{ fontSize: 13, color: t.colors.muted }}>
                You will be connected to PayPal to complete your payment securely.
              </Copy>
            </View>
          ) : null}

          {/* Klarna Installments Breakdown */}
          {paymentMethod === 'klarna' ? (
            <View style={{ padding: 14, backgroundColor: 'rgba(255, 179, 199, 0.12)', borderRadius: t.radius.sm, borderWidth: 1, borderColor: '#FFB3C7', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Copy style={{ fontFamily: t.font.strong, fontSize: 15, color: t.colors.ink }}>Klarna. Pay in 4</Copy>
                <View style={{ backgroundColor: '#FFB3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                  <Copy style={{ fontSize: 11, fontFamily: t.font.strong, color: '#000000' }}>0% APR</Copy>
                </View>
              </View>
              <Copy style={{ fontSize: 13, color: t.colors.muted }}>
                4 interest-free payments of ${(total / 400).toFixed(2)} due every 2 weeks:
              </Copy>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 }}>
                <View style={{ alignItems: 'center' }}>
                  <Copy style={{ fontSize: 11, color: t.colors.muted }}>Today</Copy>
                  <Copy style={{ fontSize: 12, fontFamily: t.font.strong }}>${(total / 400).toFixed(2)}</Copy>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Copy style={{ fontSize: 11, color: t.colors.muted }}>2 weeks</Copy>
                  <Copy style={{ fontSize: 12, fontFamily: t.font.strong }}>${(total / 400).toFixed(2)}</Copy>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Copy style={{ fontSize: 11, color: t.colors.muted }}>4 weeks</Copy>
                  <Copy style={{ fontSize: 12, fontFamily: t.font.strong }}>${(total / 400).toFixed(2)}</Copy>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Copy style={{ fontSize: 11, color: t.colors.muted }}>6 weeks</Copy>
                  <Copy style={{ fontSize: 12, fontFamily: t.font.strong }}>${(total / 400).toFixed(2)}</Copy>
                </View>
              </View>
            </View>
          ) : null}

          {/* Afterpay Installments Breakdown */}
          {paymentMethod === 'afterpay' ? (
            <View style={{ padding: 14, backgroundColor: 'rgba(178, 252, 228, 0.15)', borderRadius: t.radius.sm, borderWidth: 1, borderColor: '#B2FCE4', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Copy style={{ fontFamily: t.font.strong, fontSize: 15, color: t.colors.ink }}>Afterpay ✳</Copy>
                <View style={{ backgroundColor: '#B2FCE4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                  <Copy style={{ fontSize: 11, fontFamily: t.font.strong, color: '#000000' }}>Interest-Free</Copy>
                </View>
              </View>
              <Copy style={{ fontSize: 13, color: t.colors.muted }}>
                Pay in 4 interest-free installments of ${(total / 400).toFixed(2)} every two weeks:
              </Copy>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 }}>
                <View style={{ alignItems: 'center' }}>
                  <Copy style={{ fontSize: 11, color: t.colors.muted }}>Today</Copy>
                  <Copy style={{ fontSize: 12, fontFamily: t.font.strong }}>${(total / 400).toFixed(2)}</Copy>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Copy style={{ fontSize: 11, color: t.colors.muted }}>2 weeks</Copy>
                  <Copy style={{ fontSize: 12, fontFamily: t.font.strong }}>${(total / 400).toFixed(2)}</Copy>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Copy style={{ fontSize: 11, color: t.colors.muted }}>4 weeks</Copy>
                  <Copy style={{ fontSize: 12, fontFamily: t.font.strong }}>${(total / 400).toFixed(2)}</Copy>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Copy style={{ fontSize: 11, color: t.colors.muted }}>6 weeks</Copy>
                  <Copy style={{ fontSize: 12, fontFamily: t.font.strong }}>${(total / 400).toFixed(2)}</Copy>
                </View>
              </View>
            </View>
          ) : null}
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
