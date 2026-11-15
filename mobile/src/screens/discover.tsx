import { useEffect, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BrandHeader, Button, Copy, SearchField, Status, Title } from '@/components/ui';
import { ProductCard } from '@/components/product-card';
import { ProductGridSkeleton } from '@/components/skeleton';
import { useResource } from '@/hooks/use-resource';
import { type Category, getProducts, plainText, storeGet } from '@/lib/store';
import { useTheme } from '@/design-system';
import { haptic } from '@/lib/haptics';

const fallbackCollections = [
  { id: 58, name: 'Baby Clothing', count: 87, image: { src: 'https://i0.wp.com/cloudybebe.com/wp-content/uploads/2025/02/clothing.jpg?fit=1600%2C1600&ssl=1' } },
  { id: 60, name: 'Plush Toys', count: 149, image: { src: 'https://i0.wp.com/cloudybebe.com/wp-content/uploads/2025/02/plish.jpg?fit=375%2C375&ssl=1' } },
  { id: 69, name: 'Blankets', count: 124, image: { src: 'https://i0.wp.com/cloudybebe.com/wp-content/uploads/2025/02/blankets.jpg?fit=375%2C375&ssl=1' } },
  { id: 51, name: 'Bamboo Bibs', count: 45, image: { src: 'https://i0.wp.com/cloudybebe.com/wp-content/uploads/2025/02/bibs.jpg?fit=375%2C375&ssl=1' } },
  { id: 66, name: 'Bath', count: 31, image: { src: 'https://i0.wp.com/cloudybebe.com/wp-content/uploads/2025/02/bath.jpg?fit=375%2C375&ssl=1' } },
  { id: 56, name: 'Bedtime', count: 56, image: { src: 'https://i0.wp.com/cloudybebe.com/wp-content/uploads/2025/12/bedtime.webp?fit=375%2C375&ssl=1' } },
  { id: 73, name: 'Gift Sets', count: 5, image: { src: 'https://i0.wp.com/cloudybebe.com/wp-content/uploads/2025/05/NC_GiftBaskets-62_websize.jpg?fit=1049%2C1049&ssl=1' } },
  { id: 63, name: 'Swaddles', count: 46, image: { src: 'https://i0.wp.com/cloudybebe.com/wp-content/uploads/2025/02/swaddles.jpg?fit=959%2C959&ssl=1' } },
  { id: 1803, name: 'Teddy Bears', count: 5, image: { src: 'https://i0.wp.com/cloudybebe.com/wp-content/uploads/2026/10/SKU_11061_01.jpg?fit=1200%2C1200&ssl=1' } },
  { id: 1826, name: 'Teethers', count: 43, image: { src: 'https://i0.wp.com/cloudybebe.com/wp-content/uploads/2025/02/plish.jpg?fit=375%2C375&ssl=1' } },
];

const fallbackImages: Record<string, any> = {
  '60': require('../../assets/images/site-plush.jpg'),
  '73': require('../../assets/images/site-gifts.jpg'),
  '69': require('../../assets/images/site-blankets.jpg'),
  '58': require('../../assets/images/site-hero.webp'),
};

export default function Discover() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const { data, loading, error, retry } = useResource(
    signal => getProducts({ category: '60', orderby: 'popularity', per_page: '4' }, signal),
    []
  );
  const categoriesResource = useResource(
    signal => storeGet<Category[]>('products/categories', signal),
    []
  );
  const categories = (categoriesResource.data || []).filter(c => c.count > 0);
  const displayCategories = categories.length > 0 ? categories : (fallbackCollections as any);

  return (
    <FlatList
      data={data || []}
      numColumns={2}
      keyExtractor={p => String(p.id)}
      initialNumToRender={4}
      maxToRenderPerBatch={6}
      windowSize={5}
      removeClippedSubviews={Platform.OS !== 'web'}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingTop: insets.top,
        paddingHorizontal: t.space.lg,
        paddingBottom: 96,
        gap: t.space.lg,
        maxWidth: 800,
        width: '100%',
        alignSelf: 'center',
      }}
      columnWrapperStyle={{ gap: t.space.md }}
      onRefresh={retry}
      refreshing={loading && !!data}
      renderItem={({ item }) => <ProductCard product={item} />}
      ListHeaderComponent={
        <View style={{ gap: t.space.lg }}>
          <BrandHeader />
          <SearchField
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => router.push({ pathname: '/shop', params: { search: search.trim() } })}
          />
          <HeroCarousel />
          <View style={{ gap: t.space.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title style={{ fontSize: 20, lineHeight: 28 }}>Shop by category</Title>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/shop')}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Copy style={{ color: t.colors.primary, fontSize: t.type.small, fontFamily: t.font.strong }}>
                  View all ({categories.length || 10}) →
                </Copy>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: t.space.md, paddingVertical: 4 }}
            >
              {displayCategories.map((c: any) => {
                const imageSource = c.image?.src
                  ? { uri: c.image.src }
                  : fallbackImages[String(c.id)] || require('../../assets/images/site-plush.jpg');
                const categoryName = plainText(c.name);
                return (
                  <Pressable
                    key={c.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Shop ${categoryName}`}
                    onPress={() => {
                      haptic.selection();
                      router.push({ pathname: '/shop', params: { category: String(c.id) } });
                    }}
                    style={({ pressed }) => ({
                      width: 100,
                      alignItems: 'center',
                      gap: t.space.xs,
                      opacity: pressed ? 0.75 : 1,
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    })}
                  >
                    <View
                      style={{
                        width: 86,
                        height: 86,
                        borderRadius: 43,
                        overflow: 'hidden',
                        backgroundColor: t.colors.photo,
                        borderWidth: 1.5,
                        borderColor: t.colors.border,
                      }}
                    >
                      <Image
                        source={imageSource}
                        cachePolicy="memory-disk"
                        transition={200}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    </View>
                    <Copy
                      numberOfLines={2}
                      style={{
                        fontSize: 12,
                        fontFamily: t.font.strong,
                        textAlign: 'center',
                        color: t.colors.ink,
                        lineHeight: 16,
                      }}
                    >
                      {categoryName}
                    </Copy>
                    {c.count ? (
                      <Copy style={{ fontSize: 10.5, color: t.colors.muted, textAlign: 'center' }}>
                        {c.count} items
                      </Copy>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.space.md }}>
            <View style={{ flex: 1 }}>
              <Copy style={{ color: t.colors.primary, fontSize: t.type.caption }}>Made for little moments</Copy>
              <Title style={{ fontSize: 20, lineHeight: 28 }}>Soft little favourites</Title>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/shop', params: { category: '60' } })}
              style={{ paddingVertical: t.space.md, minHeight: 44, justifyContent: 'center' }}
            >
              <Copy style={{ color: t.colors.primary, fontSize: t.type.small }}>View all →</Copy>
            </Pressable>
          </View>
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <ProductGridSkeleton count={4} />
        ) : (
          <Status
            loading={loading}
            error={error}
            empty="There are no products to show right now."
            onRetry={error ? retry : undefined}
          />
        )
      }
      ListFooterComponent={
        <View style={{ gap: t.space.xl, marginTop: t.space.sm }}>
          <View
            style={{
              padding: t.space.md,
              backgroundColor: t.colors.cream,
              borderRadius: t.radius.md,
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.space.md,
            }}
          >
            <Image
              source={require('../../assets/images/site-gifts.jpg')}
              cachePolicy="memory-disk"
              transition={200}
              style={{ width: 112, height: 142, borderRadius: t.radius.sm }}
              contentFit="cover"
              accessibilityLabel="Newborn gift basket"
            />
            <View style={{ flex: 1, gap: t.space.xs }}>
              <Copy style={{ color: t.colors.primary, fontSize: t.type.caption }}>Gifts for a new beginning</Copy>
              <Title style={{ fontSize: 18, lineHeight: 25 }}>A little bundle of love.</Title>
              <Copy style={{ fontSize: t.type.small, lineHeight: 21, color: t.colors.muted }}>
                Thoughtfully chosen, ready to make their day.
              </Copy>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/shop', params: { category: '73' } })}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Copy style={{ color: t.colors.primary, fontFamily: t.font.strong, fontSize: t.type.small }}>
                  Explore gift sets →
                </Copy>
              </Pressable>
            </View>
          </View>
          <View
            style={{
              backgroundColor: t.colors.sage,
              padding: t.space.lg,
              gap: t.space.md,
              borderRadius: t.radius.md,
            }}
          >
            <Ionicons name="gift-outline" size={26} color={t.colors.primary} />
            <Title style={{ fontSize: 20, lineHeight: 28 }}>Their first wish list.</Title>
            <Copy style={{ fontSize: t.type.small, color: t.colors.muted }}>
              Create a Baby Registry and share the little things you love with family and friends.
            </Copy>
            <Button label="Explore Baby Registry" secondary onPress={() => router.push('/registry')} />
          </View>
        </View>
      }
    />
  );
}

const HERO_SLIDES = [
  {
    id: 'hero-1',
    eyebrow: 'LITTLE THINGS. BIG LOVE.',
    title: 'Thoughtful finds for their little world.',
    buttonText: 'Shop the collection  →',
    image: require('../../assets/images/site-hero.webp'),
    position: { left: '54%', top: '50%' } as const,
    accessibilityLabel: 'Baby resting on a soft cherry print blanket',
    route: '/shop',
  },
  {
    id: 'hero-2',
    eyebrow: 'ORGANIC BAMBOO & MUSLIN',
    title: 'Pure bamboo blankets for sweetest dreams.',
    buttonText: 'Explore blankets  →',
    image: require('../../assets/images/site-blankets.jpg'),
    position: { left: '50%', top: '50%' } as const,
    accessibilityLabel: 'Baby sleeping comfortably under a bamboo blanket',
    route: { pathname: '/shop', params: { category: '69' } },
  },
  {
    id: 'hero-3',
    eyebrow: 'NEWBORN ESSENTIALS',
    title: 'Curated gift sets ready to welcome baby.',
    buttonText: 'Discover gift sets  →',
    image: require('../../assets/images/site-gifts.jpg'),
    position: { left: '50%', top: '50%' } as const,
    accessibilityLabel: 'Newborn gift basket filled with lovely baby essentials',
    route: { pathname: '/shop', params: { category: '73' } },
  },
];

function HeroSlideItem({
  item,
  isActive,
  t,
}: {
  item: typeof HERO_SLIDES[number];
  isActive: boolean;
  t: ReturnType<typeof useTheme>;
}) {
  const anim = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    anim.value = withTiming(isActive ? 1 : 0, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [isActive, anim]);

  const slideStyle = useAnimatedStyle(() => ({
    opacity: anim.value,
    zIndex: isActive ? 2 : 1,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [{ translateY: (1 - anim.value) * 36 }],
  }));

  return (
    <Animated.View
      pointerEvents={isActive ? 'auto' : 'none'}
      style={[StyleSheet.absoluteFill, slideStyle]}
    >
      <Image
        source={item.image}
        cachePolicy="memory-disk"
        transition={350}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
        contentFit="cover"
        contentPosition={item.position}
        accessibilityLabel={item.accessibilityLabel}
      />
      <LinearGradient
        colors={[t.colors.transparent, t.colors.heroOverlay]}
        locations={[0.2, 1]}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          padding: t.space.lg,
          justifyContent: 'flex-end',
        }}
      >
        <Animated.View style={[{ gap: t.space.md }, textStyle]}>
          <Copy
            style={{
              fontSize: t.type.caption,
              color: t.colors.white,
              letterSpacing: 1.5,
              fontFamily: t.font.strong,
            }}
          >
            {item.eyebrow}
          </Copy>
          <Title style={{ color: t.colors.white, fontSize: 29, lineHeight: 36, maxWidth: 310 }}>
            {item.title}
          </Title>
          <Button
            label={item.buttonText}
            onPress={() => router.push(item.route as any)}
            style={{ alignSelf: 'flex-start' }}
          />
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

function CarouselDot({
  isActive,
  onPress,
  label,
}: {
  isActive: boolean;
  onPress: () => void;
  label: string;
}) {
  const t = useTheme();
  const widthAnim = useSharedValue(isActive ? 22 : 6);

  useEffect(() => {
    widthAnim.value = withTiming(isActive ? 22 : 6, {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
  }, [isActive, widthAnim]);

  const dotStyle = useAnimatedStyle(() => ({
    width: widthAnim.value,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ minHeight: 28, minWidth: 16, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View
        style={[
          {
            height: 6,
            borderRadius: 3,
            backgroundColor: isActive ? t.colors.white : 'rgba(255, 255, 255, 0.45)',
          },
          dotStyle,
        ]}
      />
    </Pressable>
  );
}

function HeroCarousel() {
  const t = useTheme();
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={{ height: 360, borderRadius: t.radius.lg, overflow: 'hidden', backgroundColor: t.colors.cream }}>
      {HERO_SLIDES.map((item, index) => (
        <HeroSlideItem
          key={item.id}
          item={item}
          isActive={index === activeSlide}
          t={t}
        />
      ))}

      <View
        style={{
          position: 'absolute',
          bottom: 14,
          right: 18,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          zIndex: 10,
        }}
      >
        {HERO_SLIDES.map((_, i) => (
          <CarouselDot
            key={i}
            isActive={i === activeSlide}
            label={`Go to slide ${i + 1}`}
            onPress={() => {
              haptic.selection();
              setActiveSlide(i);
            }}
          />
        ))}
      </View>
    </View>
  );
}

