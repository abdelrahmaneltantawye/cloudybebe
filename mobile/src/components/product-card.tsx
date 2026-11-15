import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Copy, IconButton } from '@/components/ui';
import { type Product, money, plainText, prefetchProduct } from '@/lib/store';
import { useShop } from '@/state/shop';
import { useTheme } from '@/design-system';
import { haptic } from '@/lib/haptics';

export function ProductCard({ product }: { product: Product }) {
  const t = useTheme();
  const shop = useShop();
  const saved = shop.saved.some(item => item.id === product.id);
  const productName = plainText(product.name);
  const priceDisplay = `${product.has_options ? 'From ' : ''}${money(product.prices)}`;
  const targetId = product.parent || product.id;
  const imageSource = product.images[0]?.thumbnail || product.images[0]?.src;

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    haptic.light();
    router.push(`/product/${targetId}`);
  };

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 14, stiffness: 300 });
    prefetchProduct(targetId);
    if (product.images[0]?.src) {
      void Image.prefetch(product.images[0].src);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 300 });
  };

  return (
    <Animated.View style={[{ flex: 1, gap: t.space.sm, minWidth: 0, maxWidth: '50%' }, animatedStyle]}>
      <View style={{ borderRadius: t.radius.md, overflow: 'hidden', backgroundColor: t.colors.photo }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${productName}`}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          {imageSource ? (
            <Image
              source={imageSource}
              cachePolicy="memory-disk"
              transition={200}
              recyclingKey={String(product.id)}
              style={{ width: '100%', aspectRatio: 1, backgroundColor: t.colors.photo }}
              contentFit="contain"
              accessibilityLabel={plainText(product.images[0]?.alt || product.name)}
            />
          ) : (
            <View style={{ aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Copy style={{ color: t.colors.muted, fontSize: t.type.caption }}>Image unavailable</Copy>
            </View>
          )}
        </Pressable>
        <IconButton
          icon={saved ? 'heart' : 'heart-outline'}
          label={`${saved ? 'Unsave' : 'Save'} ${productName}`}
          selected={saved}
          disabled={!shop.ready}
          onPress={() => {
            haptic.medium();
            shop.toggleSaved(product);
          }}
          style={{ position: 'absolute', right: 0, top: 0, backgroundColor: t.colors.surface }}
        />
        {!product.is_in_stock ? (
          <View
            style={{
              position: 'absolute',
              left: t.space.sm,
              bottom: t.space.sm,
              backgroundColor: t.colors.cream,
              paddingHorizontal: t.space.sm,
              borderRadius: t.radius.sm,
            }}
          >
            <Copy style={{ fontSize: t.type.caption, color: t.colors.muted }}>Out of stock</Copy>
          </View>
        ) : product.on_sale ? (
          <View
            style={{
              position: 'absolute',
              left: t.space.sm,
              bottom: t.space.sm,
              backgroundColor: t.colors.sage,
              paddingHorizontal: t.space.sm,
              borderRadius: t.radius.sm,
            }}
          >
            <Copy style={{ fontSize: t.type.caption }}>Sale</Copy>
          </View>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${productName}, ${priceDisplay}`}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ minHeight: 70 }}
      >
        <Copy numberOfLines={2} style={{ fontSize: t.type.small, lineHeight: 21 }}>
          {productName}
        </Copy>
        <Copy numberOfLines={1} style={{ fontSize: t.type.caption, color: t.colors.muted, lineHeight: 20 }}>
          {plainText(product.brands?.[0]?.name || product.categories[0]?.name || '')}
        </Copy>
        <Copy
          style={{
            fontFamily: t.font.strong,
            marginTop: t.space.xs,
            fontSize: t.type.small,
            fontVariant: ['tabular-nums'],
          }}
        >
          {priceDisplay}
        </Copy>
      </Pressable>
    </Animated.View>
  );
}
