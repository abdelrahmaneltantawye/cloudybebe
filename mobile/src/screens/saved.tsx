import { FlatList, Platform, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShop } from '@/state/shop';
import { Button, Copy, Status, Title } from '@/components/ui';
import { ProductCard } from '@/components/product-card';
import { useTheme } from '@/design-system';

export default function Saved() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { saved, ready, storageError } = useShop();

  return (
    <FlatList
      data={saved}
      numColumns={2}
      keyExtractor={p => String(p.id)}
      columnWrapperStyle={{ gap: t.space.md }}
      initialNumToRender={8}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={Platform.OS !== 'web'}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{
        paddingTop: insets.top + (Platform.OS === 'ios' ? 12 : t.space.md),
        paddingHorizontal: t.space.lg,
        paddingBottom: 90,
        gap: t.space.lg,
        maxWidth: 800,
        width: '100%',
        alignSelf: 'center',
      }}
      renderItem={({ item }) => <ProductCard product={item} />}
      ListHeaderComponent={
        <View style={{ gap: t.space.sm, paddingBottom: t.space.lg, borderBottomWidth: 1, borderColor: t.colors.border }}>
          <View style={{ flexDirection: 'row', gap: t.space.md, justifyContent: 'space-between', alignItems: 'center' }}>
            <Title>Your wishlist</Title>
            <Copy style={{ fontSize: t.type.small, color: t.colors.muted }}>
              {saved.length} {saved.length === 1 ? 'find' : 'finds'}
            </Copy>
          </View>
          <Copy style={{ color: t.colors.muted, fontSize: t.type.small }}>Your favourite little things, saved for later.</Copy>
          {storageError ? <Copy style={{ color: t.colors.error, fontSize: t.type.small }}>{storageError}</Copy> : null}
        </View>
      }
      ListEmptyComponent={
        ready ? (
          <View style={{ gap: t.space.lg, paddingVertical: t.space.xxl, alignItems: 'center' }}>
            <Ionicons name="heart-outline" size={44} color={t.colors.primary} />
            <Title style={{ fontSize: 22, textAlign: 'center' }}>Save a little something special.</Title>
            <Copy style={{ color: t.colors.muted, textAlign: 'center' }}>
              Tap the heart on the products you love. Your wishlist stays on this device.
            </Copy>
            <Button label="Explore the collection" onPress={() => router.push('/shop')} />
          </View>
        ) : (
          <Status loading />
        )
      }
    />
  );
}
