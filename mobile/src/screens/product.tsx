import { useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Accordion, Button, Copy, IconButton, QuantityStepper, Status, Title } from '@/components/ui';
import { useResource } from '@/hooks/use-resource';
import { type Product, money, plainText, storeGet } from '@/lib/store';
import { useShop } from '@/state/shop';
import { clampQuantity } from '@/lib/bag';
import { useTheme } from '@/design-system';
import { useSession } from '@/state/session';
import { haptic } from '@/lib/haptics';

const normalized = (value: string) => plainText(value).trim().toLowerCase();

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const resource = useResource(signal => storeGet<Product>(`products/${encodeURIComponent(id)}`, signal), [id]);
  if (!resource.data) return <Status loading={resource.loading} error={resource.error} onRetry={resource.retry} />;
  return <ProductDetails key={resource.data.id} product={resource.data} />;
}

function ProductDetails({ product: p }: { product: Product }) {
  const t = useTheme();
  const shop = useShop();
  const session = useSession();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [requestedQuantity, setQuantity] = useState(p.add_to_cart.minimum || 1);
  const [added, setAdded] = useState(false);
  const [bagError, setBagError] = useState('');
  const [imageWidth, setImageWidth] = useState(320);
  const [imageIndex, setImageIndex] = useState(0);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const gallery = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    setShowStickyCta(y > 380);
  };
  const attributes = p.attributes?.filter(a => a.has_variations) || [];
  const allSelected = attributes.length > 0 && attributes.every(a => !!selected[a.name]);

  const matchesTerm = (attributeName: string, variationValue: string, selectedName: string) => {
    if (!variationValue) return true;
    const attribute = attributes.find(
      a => normalized(a.name) === normalized(attributeName) || normalized(a.taxonomy || '') === normalized(attributeName)
    );
    const term = attribute?.terms.find(value => value.name === selectedName);
    return !!term && [term.name, term.slug].some(value => normalized(value) === normalized(variationValue));
  };

  const variation = allSelected
    ? p.variations?.find(v =>
        v.attributes.every(a => {
          const attribute = attributes.find(
            value => normalized(value.name) === normalized(a.name) || normalized(value.taxonomy || '') === normalized(a.name)
          );
          return matchesTerm(a.name, a.value, selected[attribute?.name || a.name] || '');
        })
      )
    : undefined;

  const variationResource = useResource(
    signal => (variation ? storeGet<Product>(`products/${variation.id}`, signal) : Promise.resolve(null)),
    [variation?.id]
  );

  const chosen = p.has_options ? variationResource.data : p;
  const displayProduct = chosen || p;
  const quantity = clampQuantity(displayProduct, requestedQuantity);
  const minimum = displayProduct.add_to_cart.minimum || 1;
  const step = displayProduct.add_to_cart.multiple_of || 1;
  const limit = Math.min(99, displayProduct.add_to_cart.maximum || 9999);
  const maximum = Math.min(99, Math.max(minimum, minimum + Math.floor((limit - minimum) / step) * step));
  const purchaseQuantity = Math.min(maximum, Math.max(minimum, minimum + Math.floor((quantity - minimum) / step) * step));
  const wildcardVariation = !!variation?.attributes.some(a => !a.value);

  const selectedAttributes = Object.fromEntries(
    attributes.map(attribute => {
      const term = attribute.terms.find(value => value.name === selected[attribute.name]);
      return [attribute.taxonomy || attribute.name, attribute.taxonomy ? term?.slug || '' : term?.name || ''];
    })
  );

  const purchaseProduct =
    chosen && attributes.length
      ? {
          ...chosen,
          selected_attributes: selectedAttributes,
          variation: attributes.map(attribute => `${plainText(attribute.name)}: ${plainText(selected[attribute.name] || '')}`).join(', '),
        }
      : chosen;

  const saved = shop.saved.some(item => item.id === p.id);
  const isReady = !!chosen && chosen.is_purchasable && chosen.is_in_stock && !chosen.has_options && minimum <= maximum;
  const specs = (p.attributes || [])
    .filter(a => !a.has_variations)
    .map(a => ({ name: plainText(a.name), value: a.terms.map(term => plainText(term.name)).join(', ') }));

  if (p.formatted_dimensions && p.formatted_dimensions !== 'N/A') {
    specs.push({ name: 'Dimensions', value: plainText(p.formatted_dimensions) });
  }

  const available = p.is_in_stock && p.is_purchasable;
  const choose = (name: string, value: string) => {
    haptic.selection();
    setSelected(old => ({ ...old, [name]: value }));
    setAdded(false);
    setBagError('');
    setQuantity(p.add_to_cart.minimum || 1);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <ScrollView
        ref={scrollRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingTop: t.space.sm,
          paddingHorizontal: t.space.lg,
          paddingBottom: showStickyCta ? 120 : Math.max(insets.bottom, 96),
          maxWidth: 800,
          width: '100%',
          alignSelf: 'center',
        }}
      >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.xs, paddingBottom: t.space.sm }}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/shop')} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Copy style={{ color: t.colors.muted, fontSize: t.type.caption }}>Shop</Copy>
        </Pressable>
        <Ionicons name="chevron-forward" size={12} color={t.colors.muted} />
        {p.categories[0] ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/shop', params: { category: String(p.categories[0].id) } })}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Copy style={{ color: t.colors.muted, fontSize: t.type.caption }}>{plainText(p.categories[0].name)}</Copy>
          </Pressable>
        ) : null}
      </View>
      <View onLayout={event => setImageWidth(event.nativeEvent.layout.width)} style={{ backgroundColor: t.colors.photo, position: 'relative' }}>
        <ScrollView
          ref={gallery}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={event => setImageIndex(Math.round(event.nativeEvent.contentOffset.x / imageWidth))}
        >
          {displayProduct.images.length ? (
            displayProduct.images.map((image, i) => (
              <Image
                key={`${displayProduct.id}-${image.src}`}
                source={image.src}
                cachePolicy="memory-disk"
                transition={200}
                accessibilityLabel={plainText(image.alt || `${p.name}, image ${i + 1}`)}
                style={{ width: imageWidth, height: 320, backgroundColor: t.colors.photo }}
                contentFit="contain"
              />
            ))
          ) : (
            <View style={{ width: imageWidth, height: 240, alignItems: 'center', justifyContent: 'center' }}>
              <Copy style={{ color: t.colors.muted }}>Image unavailable</Copy>
            </View>
          )}
        </ScrollView>
        <IconButton
          icon={saved ? 'heart' : 'heart-outline'}
          label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
          selected={saved}
          disabled={!shop.ready}
          onPress={() => shop.toggleSaved(p)}
          style={{ position: 'absolute', right: 0, top: 0, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border }}
        />
      </View>
      {displayProduct.images.length > 1 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', paddingVertical: t.space.sm }}>
          {displayProduct.images.map((image, i) => (
            <Pressable
              key={image.src}
              accessibilityRole="button"
              accessibilityLabel={`Show product image ${i + 1}`}
              accessibilityState={{ selected: imageIndex === i }}
              onPress={() => {
                gallery.current?.scrollTo({ x: i * imageWidth, animated: true });
                setImageIndex(i);
              }}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <View
                style={{
                  width: imageIndex === i ? 18 : 7,
                  height: 7,
                  borderRadius: t.radius.pill,
                  backgroundColor: imageIndex === i ? t.colors.primary : t.colors.border,
                }}
              />
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={{ height: t.space.lg }} />
      )}
      <View style={{ borderTopWidth: 1, borderColor: t.colors.border, paddingTop: t.space.lg, gap: t.space.sm }}>
        <Copy style={{ color: t.colors.primary, fontFamily: t.font.strong, fontSize: t.type.caption, letterSpacing: 1.2 }}>
          {plainText(p.categories[0]?.name || 'CLOUDYBEBE').toUpperCase()}
        </Copy>
        <Title style={{ fontSize: 25, lineHeight: 33 }}>{plainText(p.name)}</Title>
        {p.brands?.[0] ? <Copy style={{ color: t.colors.muted, fontSize: t.type.small }}>By {plainText(p.brands[0].name)}</Copy> : null}
        <View style={{ flexDirection: 'row', gap: t.space.md, alignItems: 'center' }}>
          <Copy selectable style={{ fontFamily: t.font.strong, fontSize: 27, lineHeight: 36, color: t.colors.primary, fontVariant: ['tabular-nums'] }}>
            {p.has_options && !chosen ? 'From ' : ''}
            {money(displayProduct.prices)}
          </Copy>
          {displayProduct.on_sale && Number(displayProduct.prices.regular_price) > Number(displayProduct.prices.price) ? (
            <Copy style={{ color: t.colors.muted, textDecorationLine: 'line-through', fontSize: t.type.small }}>
              {money(displayProduct.prices, displayProduct.prices.regular_price)}
            </Copy>
          ) : null}
        </View>
        <Copy style={{ fontSize: 13.5, color: t.colors.muted, lineHeight: 19 }}>{plainText(p.short_description)}</Copy>
      </View>
      {attributes.length ? (
        <View style={{ gap: t.space.lg, paddingTop: t.space.lg }}>
          {attributes.map(attribute => (
            <View key={attribute.name} style={{ gap: t.space.sm }}>
              <Copy style={{ fontSize: t.type.small, fontFamily: t.font.strong }}>
                {plainText(attribute.name)}
                {selected[attribute.name] ? `: ${plainText(selected[attribute.name])}` : ' · Choose an option'}
              </Copy>
              <View style={{ flexDirection: 'row', gap: t.space.sm, flexWrap: 'wrap' }}>
                {attribute.terms.map(term => {
                  const value = term.name;
                  const active = selected[attribute.name] === value;
                  const possible = p.variations?.some(
                    v =>
                      v.attributes.some(
                        a =>
                          (normalized(a.name) === normalized(attribute.name) || normalized(a.name) === normalized(attribute.taxonomy || '')) &&
                          matchesTerm(a.name, a.value, value)
                      )
                  );
                  return (
                    <Pressable
                      key={term.slug}
                      accessibilityRole="radio"
                      accessibilityLabel={`${plainText(attribute.name)} ${plainText(value)}`}
                      accessibilityState={{ checked: active, disabled: !possible }}
                      disabled={!possible}
                      onPress={() => choose(attribute.name, value)}
                      style={({ pressed }) => ({
                        minHeight: 48,
                        paddingHorizontal: t.space.lg,
                        paddingVertical: t.space.md,
                        borderRadius: t.radius.sm,
                        borderWidth: 1,
                        borderColor: active ? t.colors.primary : t.colors.border,
                        backgroundColor: active ? t.colors.primarySoft : t.colors.surface,
                        opacity: !possible ? 0.4 : pressed ? 0.65 : 1,
                      })}
                    >
                      <Copy style={{ fontSize: t.type.small, color: active ? t.colors.primary : t.colors.ink }}>{plainText(value)}</Copy>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {p.has_options && !attributes.length ? <Status error="The store has not provided selectable options for this item." /> : null}
      {variation && variationResource.loading ? (
        <View style={{ flexDirection: 'row', gap: t.space.sm, paddingTop: t.space.md, alignItems: 'center' }}>
          <ActivityIndicator color={t.colors.primary} />
          <Copy style={{ fontSize: t.type.small, color: t.colors.muted }}>Checking availability…</Copy>
        </View>
      ) : null}
      {variationResource.error ? <Status error={variationResource.error} onRetry={variationResource.retry} /> : null}
      <Copy
        accessibilityLiveRegion="polite"
        style={{ color: chosen && !chosen.is_in_stock ? t.colors.error : t.colors.success, fontSize: t.type.caption, paddingTop: t.space.md }}
      >
        {chosen
          ? chosen.is_in_stock
            ? chosen.is_on_backorder
              ? 'Available to order on backorder'
              : 'In stock'
            : 'This option is out of stock'
          : !available
          ? 'Currently unavailable'
          : allSelected && !variation
          ? 'This combination is unavailable. Try another option.'
          : 'Select your options to check availability.'}
      </Copy>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.space.md, paddingVertical: t.space.md }}>
        <QuantityStepper
          value={purchaseQuantity}
          minimum={minimum}
          maximum={maximum}
          step={step}
          onChange={value => {
            setQuantity(value);
            setAdded(false);
          }}
        />
        <Button
          label={
            added
              ? 'View bag  →'
              : chosen && !chosen.is_in_stock
              ? 'Out of stock'
              : !chosen && p.has_options
              ? 'Choose options above'
              : 'Add to bag'
          }
          disabled={!shop.ready || !isReady}
          onPress={() => {
            if (added) router.push('/bag');
            else if (purchaseProduct) {
              const message = shop.add(purchaseProduct, purchaseQuantity);
              setBagError(message);
              setAdded(!message);
              if (!message) {
                haptic.success();
              } else {
                haptic.medium();
              }
            }
          }}
          style={{ flex: 1, minWidth: 145 }}
        />
      </View>
      {bagError ? (
        <Copy accessibilityLiveRegion="polite" style={{ color: t.colors.error, fontSize: t.type.small, paddingBottom: t.space.sm }}>
          {bagError}
        </Copy>
      ) : null}
      {added ? (
        <Copy accessibilityLiveRegion="polite" style={{ color: t.colors.primary, fontSize: t.type.small, paddingBottom: t.space.sm }}>
          {purchaseQuantity} {purchaseQuantity === 1 ? 'item' : 'items'} added to your bag.
        </Copy>
      ) : null}

      {/* Buy Now Express Button */}
      <View style={{ gap: 6, paddingBottom: t.space.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buy Now"
          disabled={!shop.ready || !isReady}
          onPress={() => {
            if (purchaseProduct) {
              const message = shop.add(purchaseProduct, purchaseQuantity);
              if (!message) {
                haptic.selection();
                router.push('/checkout');
              } else {
                setBagError(message);
              }
            }
          }}
          style={({ pressed }) => ({
            backgroundColor: '#1E1E22',
            paddingVertical: 14,
            paddingHorizontal: t.space.lg,
            borderRadius: t.radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            opacity: !shop.ready || !isReady ? 0.45 : pressed ? 0.8 : 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
          })}
        >
          <Ionicons name="flash" size={17} color="#F5C518" />
          <Copy style={{ color: '#FFFFFF', fontFamily: t.font.strong, fontSize: 16 }}>
            Buy Now
          </Copy>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Ionicons name="lock-closed" size={12} color={t.colors.muted} />
          <Copy style={{ fontSize: 11, color: t.colors.muted }}>
            Express checkout with Apple Pay, PayPal & Cards
          </Copy>
        </View>
      </View>

      {/* Baby Registry Action */}
      <View style={{ gap: t.space.sm, paddingBottom: t.space.md }}>
        {session.token ? (
          <Pressable
            accessibilityRole="button"
            disabled={!shop.ready || !isReady || wildcardVariation}
            onPress={() =>
              router.push({
                pathname: '/registry/add',
                params: {
                  productId: String(p.parent || p.id),
                  ...(chosen?.parent ? { variationId: String(chosen.id) } : {}),
                  quantity: String(purchaseQuantity),
                },
              })
            }
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: t.space.lg,
              paddingVertical: 14,
              borderRadius: t.radius.sm,
              borderWidth: 1.5,
              borderColor: t.colors.primary,
              backgroundColor: t.colors.primarySoft,
              opacity: !shop.ready || !isReady || wildcardVariation ? 0.45 : pressed ? 0.8 : 1,
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="gift" size={20} color={t.colors.primary} />
              <Copy style={{ fontFamily: t.font.strong, color: t.colors.primary, fontSize: 15 }}>
                Add to Baby Registry
              </Copy>
            </View>
            <Ionicons name="chevron-forward" size={16} color={t.colors.primary} />
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/account/sign-in?returnTo=${encodeURIComponent(`/product/${p.id}`)}` as any)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              gap: 6,
            }}
          >
            <Ionicons name="gift-outline" size={16} color={t.colors.muted} />
            <Copy style={{ fontSize: 13, color: t.colors.muted, textDecorationLine: 'underline' }}>
              Sign in to add this gift to your Baby Registry
            </Copy>
          </Pressable>
        )}
        {wildcardVariation ? (
          <Copy style={{ color: t.colors.muted, fontSize: t.type.caption, lineHeight: 20 }}>
            These product options cannot be saved to a registry yet. You can still add this item to your bag.
          </Copy>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: saved, disabled: !shop.ready }}
          disabled={!shop.ready}
          onPress={() => shop.toggleSaved(p)}
          style={{ minHeight: 48, flexDirection: 'row', gap: t.space.sm, alignItems: 'center' }}
        >
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={19} color={t.colors.primary} />
          <Copy style={{ fontSize: t.type.small }}>{saved ? 'Saved to your wishlist' : 'Add to wishlist'}</Copy>
        </Pressable>
      </View>
      {specs.length && !p.description?.includes('<table') ? (
        <View style={{ borderTopWidth: 1, borderColor: t.colors.border, paddingVertical: t.space.sm }}>
          {specs.map(spec => (
            <View key={spec.name} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: t.space.lg, paddingVertical: t.space.sm }}>
              <Copy style={{ fontSize: t.type.small, color: t.colors.muted, flex: 1 }}>{spec.name}</Copy>
              <Copy selectable style={{ fontSize: t.type.small, textAlign: 'right', flex: 2 }}>
                {spec.value}
              </Copy>
            </View>
          ))}
        </View>
      ) : null}
      <Accordion title="Description & product details" initialOpen>
        <FormattedDescription html={p.description || p.short_description} />
      </Accordion>
      <Accordion title="Delivery & returns">
        <Copy style={{ color: t.colors.muted, fontSize: t.type.small }}>Delivery options, costs and taxes are calculated by CloudyBebe at checkout.</Copy>
        <Button
          label="Shipping information"
          secondary
          onPress={() =>
            router.push({
              pathname: '/website',
              params: { url: 'https://cloudybebe.com/shipping-details/', title: 'Shipping information' },
            })
          }
          style={{ marginTop: t.space.md }}
        />
        <Button
          label="Returns policy"
          secondary
          onPress={() =>
            router.push({
              pathname: '/website',
              params: { url: 'https://cloudybebe.com/refund_returns/', title: 'Returns policy' },
            })
          }
          style={{ marginTop: t.space.sm }}
        />
      </Accordion>
      <View
        style={{
          backgroundColor: t.colors.sage,
          padding: t.space.lg,
          borderRadius: t.radius.sm,
          flexDirection: 'row',
          gap: t.space.md,
          marginTop: t.space.lg,
        }}
      >
        <Ionicons name="gift-outline" size={24} color={t.colors.primary} />
        <View style={{ flex: 1, gap: t.space.xs }}>
          <Copy style={{ fontFamily: t.font.strong, fontSize: t.type.small }}>A thoughtful little gift.</Copy>
          <Copy style={{ fontSize: t.type.caption, lineHeight: 20, color: t.colors.muted }}>
            Save your favourites or share them through your Baby Registry.
          </Copy>
        </View>
      </View>
    </ScrollView>

    {showStickyCta ? (
      <Animated.View
        entering={FadeInDown.duration(220)}
        exiting={FadeOutDown.duration(180)}
        style={{
          position: 'absolute',
          bottom: Math.max(insets.bottom, 16),
          left: 16,
          right: 16,
          maxWidth: 520,
          marginHorizontal: 'auto',
          alignSelf: 'center',
          backgroundColor: t.colors.surface,
          borderRadius: 24,
          paddingVertical: 10,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: t.colors.border,
          shadowColor: '#2F3A32',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.16,
          shadowRadius: 18,
          elevation: 12,
          ...({
            boxShadow: '0 12px 28px rgba(47, 58, 50, 0.16)',
          } as object),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 12 }}>
          {displayProduct.images[0]?.src ? (
            <Image
              source={displayProduct.images[0].src}
              cachePolicy="memory-disk"
              transition={150}
              style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: t.colors.photo }}
              contentFit="cover"
            />
          ) : null}
          <View style={{ flex: 1, gap: 2 }}>
            <Copy numberOfLines={1} style={{ fontFamily: t.font.strong, fontSize: 13, lineHeight: 18 }}>
              {plainText(p.name)}
            </Copy>
            <Copy style={{ fontFamily: t.font.strong, fontSize: 14, color: t.colors.primary, lineHeight: 18 }}>
              {money(displayProduct.prices)}
            </Copy>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (added) {
              router.push('/bag');
            } else if (!isReady) {
              haptic.medium();
              scrollRef.current?.scrollTo({ y: 320, animated: true });
            } else if (purchaseProduct) {
              const message = shop.add(purchaseProduct, purchaseQuantity);
              setBagError(message);
              setAdded(!message);
              if (!message) {
                haptic.success();
              } else {
                haptic.medium();
              }
            }
          }}
          disabled={!shop.ready}
          style={({ pressed }) => ({
            backgroundColor: added
              ? t.colors.primarySoft
              : !isReady
              ? t.colors.surfaceMuted
              : t.colors.primary,
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 16,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Copy
            style={{
              fontFamily: t.font.strong,
              fontSize: 12,
              fontWeight: '700',
              color: added
                ? t.colors.primary
                : !isReady
                ? t.colors.ink
                : t.colors.white,
            }}
          >
            {added
              ? 'View bag →'
              : !chosen && p.has_options
              ? 'Select options'
              : chosen && !chosen.is_in_stock
              ? 'Out of stock'
              : 'Add to bag'}
          </Copy>
        </Pressable>
      </Animated.View>
    ) : null}
  </View>
  );
}

type DescriptionBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string; boldPrefix?: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; rows: { key: string; value: string }[] };

function decodeHtml(s: string = '') {
  return s
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n: string) => {
      const code = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n);
      return code <= 0x10ffff ? String.fromCodePoint(code) : '';
    })
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&(apos|#39|#x27);/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&(ndash|mdash);/g, '–')
    .replace(/&(rsquo|lsquo);/g, "'")
    .replace(/&(rdquo|ldquo);/g, '"');
}

function parseDescriptionHtml(raw: string = ''): DescriptionBlock[] {
  if (!raw || !raw.trim()) return [];

  const blocks: DescriptionBlock[] = [];
  const regex = /<(h[1-6]|p|ul|ol|table)(?:[^>]*)>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    const tag = match[1].toLowerCase();
    const content = match[2].trim();

    if (tag.startsWith('h')) {
      const text = decodeHtml(content.replace(/<[^>]+>/g, '').trim());
      if (text) blocks.push({ type: 'heading', text });
    } else if (tag === 'ul' || tag === 'ol') {
      const items: string[] = [];
      const liRegex = /<li(?:[^>]*)>([\s\S]*?)<\/li>/gi;
      let liMatch: RegExpExecArray | null;
      while ((liMatch = liRegex.exec(content)) !== null) {
        const itemText = decodeHtml(liMatch[1].replace(/<[^>]+>/g, '').trim());
        if (itemText) items.push(itemText);
      }
      if (items.length) blocks.push({ type: 'list', items });
    } else if (tag === 'table') {
      const rows: { key: string; value: string }[] = [];
      const trRegex = /<tr(?:[^>]*)>([\s\S]*?)<\/tr>/gi;
      let trMatch: RegExpExecArray | null;
      while ((trMatch = trRegex.exec(content)) !== null) {
        const rowContent = trMatch[1];
        const thMatch = /<th(?:[^>]*)>([\s\S]*?)<\/th>/i.exec(rowContent);
        const tdMatch = /<td(?:[^>]*)>([\s\S]*?)<\/td>/i.exec(rowContent);
        if (thMatch && tdMatch) {
          rows.push({
            key: decodeHtml(thMatch[1].replace(/<[^>]+>/g, '').trim()),
            value: decodeHtml(tdMatch[1].replace(/<[^>]+>/g, '').trim()),
          });
        }
      }
      if (rows.length) blocks.push({ type: 'table', rows });
    } else if (tag === 'p') {
      const strongMatch = /^<strong(?:[^>]*)>([\s\S]*?)<\/strong>([\s\S]*)$/i.exec(content);
      if (strongMatch) {
        const boldPrefix = decodeHtml(strongMatch[1].replace(/<[^>]+>/g, '').trim());
        const text = decodeHtml(strongMatch[2].replace(/<[^>]+>/g, '').trim());
        if (boldPrefix || text) {
          blocks.push({ type: 'paragraph', boldPrefix, text });
        }
      } else {
        const text = decodeHtml(content.replace(/<[^>]+>/g, '').trim());
        if (text) blocks.push({ type: 'paragraph', text });
      }
    }
  }

  if (blocks.length === 0) {
    const lines = raw
      .replace(/<[^>]*>/g, '')
      .split('\n')
      .map(l => decodeHtml(l.trim()))
      .filter(Boolean);
    return lines.map(line => ({ type: 'paragraph', text: line }));
  }

  return blocks;
}

function FormattedDescription({ html }: { html: string }) {
  const t = useTheme();
  const blocks = parseDescriptionHtml(html);

  if (!blocks.length) {
    return <Copy style={{ color: t.colors.muted, fontSize: 13.5 }}>Product details are not available from the store.</Copy>;
  }

  return (
    <View style={{ gap: 8 }}>
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          return (
            <Title
              key={i}
              style={{
                fontSize: 16.5,
                lineHeight: 23,
                fontFamily: t.font.strong,
                color: t.colors.ink,
                marginTop: i === 0 ? 2 : 14,
                marginBottom: 2,
              }}
            >
              {block.text}
            </Title>
          );
        }

        if (block.type === 'list') {
          return (
            <View key={i} style={{ gap: 4, paddingLeft: 2, marginVertical: 2 }}>
              {block.items.map((item, liIdx) => (
                <View key={liIdx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Copy style={{ fontSize: 14, lineHeight: 20, color: t.colors.primary }}>•</Copy>
                  <Copy
                    selectable
                    style={{
                      flex: 1,
                      fontSize: 13.5,
                      lineHeight: 20,
                      color: t.colors.muted,
                    }}
                  >
                    {item}
                  </Copy>
                </View>
              ))}
            </View>
          );
        }

        if (block.type === 'table') {
          return (
            <View
              key={i}
              style={{
                borderTopWidth: 1,
                borderColor: t.colors.border,
                marginVertical: 4,
              }}
            >
              {block.rows.map((row, rowIdx) => (
                <View
                  key={rowIdx}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 9,
                    borderBottomWidth: 1,
                    borderColor: t.colors.border,
                  }}
                >
                  <Copy
                    style={{
                      fontFamily: t.font.strong,
                      fontSize: 13.5,
                      color: t.colors.ink,
                      fontWeight: '700',
                      minWidth: 90,
                    }}
                  >
                    {row.key}
                  </Copy>
                  <Copy
                    selectable
                    style={{
                      fontSize: 13.5,
                      color: t.colors.muted,
                      textAlign: 'right',
                      flex: 1,
                    }}
                  >
                    {row.value}
                  </Copy>
                </View>
              ))}
            </View>
          );
        }

        return (
          <Copy
            key={i}
            selectable
            style={{
              color: t.colors.muted,
              fontSize: 13.5,
              lineHeight: 20,
            }}
          >
            {block.boldPrefix ? (
              <Copy style={{ fontFamily: t.font.strong, fontWeight: '700', color: t.colors.ink, fontSize: 13.5, lineHeight: 20 }}>
                {block.boldPrefix}{' '}
              </Copy>
            ) : null}
            {block.text}
          </Copy>
        );
      })}
    </View>
  );
}
