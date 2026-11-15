import { FlatList, Platform, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandHeader, Button, Copy, QuantityStepper, Status, Title } from '@/components/ui';
import { money, plainText } from '@/lib/store';
import { useShop } from '@/state/shop';
import { useTheme } from '@/design-system';
import { haptic } from '@/lib/haptics';

export default function Bag() {
  const t = useTheme();
  const shop = useShop();
  const insets = useSafeAreaInsets();
  const subtotal = shop.bag.reduce((sum, item) => sum + Number(item.product.prices.price) * item.quantity, 0);
  const prices = shop.bag[0]?.product.prices;

  return (
    <FlatList
      data={shop.bag}
      keyExtractor={item => item.key}
      initialNumToRender={6}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={Platform.OS !== 'web'}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{
        paddingTop: insets.top + (Platform.OS === 'ios' ? 4 : t.space.sm),
        paddingHorizontal: t.space.lg,
        paddingBottom: 96,
        maxWidth: 800,
        width: '100%',
        alignSelf: 'center',
      }}
      ListHeaderComponent={
        <View>
          <BrandHeader />
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: t.space.md,
              alignItems: 'center',
              paddingVertical: t.space.lg,
              borderBottomWidth: 1,
              borderColor: t.colors.border,
            }}
          >
            <Title style={{ fontSize: 25 }}>Your shopping bag</Title>
            <Copy style={{ color: t.colors.muted, fontSize: t.type.small }}>
              {shop.count} {shop.count === 1 ? 'item' : 'items'}
            </Copy>
          </View>
          {shop.storageError ? (
            <Copy style={{ color: t.colors.error, fontSize: t.type.small, paddingVertical: t.space.md }}>
              {shop.storageError}
            </Copy>
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <View
          style={{
            flexDirection: 'row',
            gap: t.space.md,
            paddingVertical: t.space.lg,
            borderBottomWidth: 1,
            borderColor: t.colors.border,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${plainText(item.product.name)}`}
            onPress={() => router.push(`/product/${item.product.parent || item.product.id}`)}
          >
            {item.product.images[0] ? (
              <Image
                source={item.product.images[0].thumbnail || item.product.images[0].src}
                cachePolicy="memory-disk"
                transition={200}
                accessibilityLabel={plainText(item.product.name)}
                style={{ width: 85, height: 110, borderRadius: t.radius.sm, backgroundColor: t.colors.photo }}
                contentFit="contain"
              />
            ) : (
              <View style={{ width: 85, height: 110, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="image-outline" size={26} color={t.colors.muted} />
              </View>
            )}
          </Pressable>
          <View style={{ flex: 1, gap: t.space.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.space.sm }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/product/${item.product.parent || item.product.id}`)}
                style={{ flex: 1 }}
              >
                <Copy style={{ fontSize: t.type.small, lineHeight: 21 }}>{plainText(item.product.name)}</Copy>
              </Pressable>
              <Copy style={{ fontFamily: t.font.strong, fontSize: t.type.small, fontVariant: ['tabular-nums'] }}>
                {money(item.product.prices, String(Number(item.product.prices.price) * item.quantity))}
              </Copy>
            </View>
            {item.registry ? (
              <View
                style={{
                  backgroundColor: t.colors.sage,
                  borderRadius: t.radius.sm,
                  paddingHorizontal: t.space.sm,
                  paddingVertical: t.space.xs,
                  marginTop: t.space.xs,
                }}
              >
                <Copy style={{ color: t.colors.success, fontSize: t.type.caption, lineHeight: 19 }}>
                  Gift for {item.registry.registry_title || 'Baby Registry'}
                </Copy>
              </View>
            ) : null}
            {item.product.variation ? (
              <Copy style={{ color: t.colors.muted, fontSize: t.type.caption, lineHeight: 19 }}>
                {plainText(item.product.variation)}
              </Copy>
            ) : null}
            <Copy style={{ color: t.colors.muted, fontSize: t.type.caption }}>{money(item.product.prices)} each</Copy>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.space.sm,
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                marginTop: t.space.sm,
              }}
            >
              <QuantityStepper
                label={`quantity of ${plainText(item.product.name)}`}
                value={item.quantity}
                minimum={item.product.add_to_cart.minimum || 1}
                maximum={Math.min(99, item.product.add_to_cart.maximum || 9999)}
                step={item.product.add_to_cart.multiple_of || 1}
                onChange={value => shop.quantity(item.key, value)}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${plainText(item.product.name)} from bag`}
                onPress={() => {
                  haptic.medium();
                  shop.quantity(item.key, 0);
                }}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Copy style={{ fontSize: t.type.caption, color: t.colors.muted, textDecorationLine: 'underline' }}>
                  Remove
                </Copy>
              </Pressable>
            </View>
          </View>
        </View>
      )}
      ListEmptyComponent={
        shop.ready ? (
          <View style={{ gap: t.space.lg, paddingVertical: t.space.xxl, alignItems: 'center' }}>
            <Ionicons name="bag-outline" size={44} color={t.colors.primary} />
            <Title style={{ fontSize: 22, textAlign: 'center' }}>A little room for lovely things.</Title>
            <Copy style={{ color: t.colors.muted, textAlign: 'center' }}>
              Your bag is empty. Find a soft companion, a thoughtful gift or an everyday favourite.
            </Copy>
            <Button label="Explore the collection" onPress={() => router.push('/shop')} />
          </View>
        ) : (
          <Status loading />
        )
      }
      ListFooterComponent={
        prices ? (
          <View style={{ gap: t.space.lg, paddingTop: t.space.xl }}>
            <View style={{ gap: t.space.md }}>
              <Title style={{ fontSize: 20, lineHeight: 28 }}>Order summary</Title>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: t.space.md }}>
                <Copy style={{ fontSize: t.type.small }}>Subtotal</Copy>
                <Copy selectable style={{ fontFamily: t.font.strong, fontVariant: ['tabular-nums'] }}>
                  {money(prices, String(subtotal))}
                </Copy>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: t.space.md }}>
                <Copy style={{ fontSize: t.type.small, color: t.colors.muted }}>Shipping & taxes</Copy>
                <Copy style={{ fontSize: t.type.small, color: t.colors.muted }}>At checkout</Copy>
              </View>
              <Copy style={{ fontSize: t.type.caption, color: t.colors.muted, lineHeight: 20 }}>
                Discount codes and delivery options can be added during checkout. The store confirms current prices and
                availability.
              </Copy>
            </View>
            <Button label="Continue to checkout  →" onPress={() => router.push('/checkout')} />
            <View style={{ flexDirection: 'row', gap: t.space.sm, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="lock-closed-outline" size={15} color={t.colors.muted} />
              <Copy style={{ fontSize: t.type.caption, color: t.colors.muted }}>Secure checkout with CloudyBebe</Copy>
            </View>
            <View
              style={{
                padding: t.space.lg,
                borderRadius: t.radius.sm,
                backgroundColor: t.colors.sage,
                flexDirection: 'row',
                gap: t.space.md,
              }}
            >
              <Ionicons name="gift-outline" size={24} color={t.colors.primary} />
              <View style={{ flex: 1, gap: t.space.xs }}>
                <Copy style={{ fontFamily: t.font.strong, fontSize: t.type.small }}>Little things, thoughtfully chosen.</Copy>
                <Copy style={{ fontSize: t.type.caption, color: t.colors.muted, lineHeight: 20 }}>
                  Review your delivery details and payment on our website, right inside the app.
                </Copy>
              </View>
            </View>
            <Button label="Continue shopping" secondary onPress={() => router.push('/shop')} />
          </View>
        ) : undefined
      }
    />
  );
}
