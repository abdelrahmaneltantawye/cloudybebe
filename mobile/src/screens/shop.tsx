import { useEffect, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BrandHeader, Button, Copy, SearchField, Status, Title } from '@/components/ui';
import { ProductCard } from '@/components/product-card';
import { ProductGridSkeleton } from '@/components/skeleton';
import { useResource } from '@/hooks/use-resource';
import { type Category, getProducts, plainText, storeGet } from '@/lib/store';
import { useTheme } from '@/design-system';
import { haptic } from '@/lib/haptics';

const sorts = [
  { id: 'date', name: 'Newest', order: 'desc' },
  { id: 'popularity', name: 'Popular', order: 'desc' },
  { id: 'price-asc', name: 'Price: low to high', order: 'asc' },
  { id: 'price-desc', name: 'Price: high to low', order: 'desc' },
];

const priceRanges = [
  { id: '', name: 'Any price', min: '', max: '' },
  { id: 'under25', name: 'Under $25', min: '', max: '2500' },
  { id: '25to50', name: '$25–$50', min: '2500', max: '5000' },
  { id: '50plus', name: '$50+', min: '5000', max: '' },
];

export default function Shop() {
  const params = useLocalSearchParams<{ category?: string; search?: string }>();
  return <ShopCollection key={params.search || ''} category={params.category || ''} initialSearch={params.search || ''} />;
}

function ShopCollection({ category, initialSearch }: { category: string; initialSearch: string }) {
  const t = useTheme();
  const [search, setSearch] = useState(initialSearch);
  const [query, setQuery] = useState(initialSearch);
  const [sort, setSort] = useState('date');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [price, setPrice] = useState('');
  const [saleOnly, setSaleOnly] = useState(false);
  const [availability, setAvailability] = useState('instock');

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const sortOption = sorts.find(s => s.id === sort)!;
  const range = priceRanges.find(r => r.id === price)!;

  const categories = useResource(s => storeGet<Category[]>('products/categories?per_page=100', s), []);

  const products = useResource(
    s =>
      getProducts(
        {
          search: query,
          stock_status: availability,
          ...(category ? { category } : {}),
          orderby: sort.startsWith('price') ? 'price' : sort,
          order: sortOption.order,
          page: String(page),
          ...(range.min ? { min_price: range.min } : {}),
          ...(range.max ? { max_price: range.max } : {}),
          ...(saleOnly ? { on_sale: 'true' } : {}),
        },
        s
      ),
    [category, query, sort, page, price, saleOnly, availability]
  );

  const insets = useSafeAreaInsets();
  const selectedCategory = categories.data?.find(c => String(c.id) === category);
  const filterCount = Number(!!price) + Number(saleOnly) + Number(availability !== 'instock');

  const chip = (label: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptic.selection();
        onPress();
      }}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: t.space.md,
        paddingVertical: t.space.sm,
        borderRadius: t.radius.sm,
        borderWidth: 1,
        borderColor: selected ? t.colors.primary : t.colors.border,
        backgroundColor: selected ? t.colors.primarySoft : t.colors.surface,
        justifyContent: 'center',
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Copy style={{ fontSize: t.type.small, color: selected ? t.colors.primary : t.colors.ink }}>{label}</Copy>
    </Pressable>
  );

  return (
    <FlatList
      data={products.data || []}
      keyExtractor={p => String(p.id)}
      numColumns={2}
      columnWrapperStyle={{ gap: t.space.md }}
      initialNumToRender={8}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={Platform.OS !== 'web'}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{
        paddingTop: insets.top + (Platform.OS === 'ios' ? 4 : t.space.sm),
        paddingHorizontal: t.space.lg,
        paddingBottom: 96,
        gap: t.space.lg,
        maxWidth: 800,
        width: '100%',
        alignSelf: 'center',
      }}
      onRefresh={products.retry}
      refreshing={products.loading && !!products.data}
      renderItem={({ item }) => <ProductCard product={item} />}
      ListHeaderComponent={
        <View style={{ gap: t.space.lg }}>
          <BrandHeader />
          <Title>{selectedCategory ? plainText(selectedCategory.name) : 'Shop the collection'}</Title>
          <SearchField
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => {
              setQuery(search.trim());
              setPage(1);
            }}
          />
          {categories.error ? (
            <Status error="Categories could not load. You can still search the store." onRetry={categories.retry} />
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: t.space.sm }}>
            {[{ id: 0, name: 'All', count: 1 }, ...(categories.data || []).filter(c => c.count > 0)].map(c =>
              chip(plainText(c.name), category === (c.id ? String(c.id) : ''), () => {
                router.setParams({ category: c.id ? String(c.id) : '' });
                setPage(1);
              })
            )}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: filtersOpen }}
            onPress={() => {
              haptic.light();
              setFiltersOpen(v => !v);
            }}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              minHeight: 48,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: t.colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', gap: t.space.sm, alignItems: 'center' }}>
              <Ionicons name="options-outline" size={20} color={t.colors.ink} />
              <Copy style={{ fontSize: t.type.small }}>Filter & sort{filterCount ? ` (${filterCount})` : ''}</Copy>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
              <Copy style={{ color: t.colors.muted, fontSize: t.type.small }}>{sortOption.name}</Copy>
              <Ionicons name={filtersOpen ? 'chevron-up' : 'chevron-down'} size={18} color={t.colors.muted} />
            </View>
          </Pressable>
          {filtersOpen ? (
            <View style={{ gap: t.space.md, backgroundColor: t.colors.cream, borderRadius: t.radius.md, padding: t.space.md }}>
              <Copy style={{ fontFamily: t.font.strong, fontSize: t.type.small }}>Sort by</Copy>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm }}>
                {sorts.map(s =>
                  chip(s.name, sort === s.id, () => {
                    setSort(s.id);
                    setPage(1);
                  })
                )}
              </View>
              <Copy style={{ fontFamily: t.font.strong, fontSize: t.type.small }}>Price (USD)</Copy>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm }}>
                {priceRanges.map(r =>
                  chip(r.name, price === r.id, () => {
                    setPrice(r.id);
                    setPage(1);
                  })
                )}
              </View>
              <Copy style={{ fontFamily: t.font.strong, fontSize: t.type.small }}>Availability</Copy>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm }}>
                {[
                  { id: 'instock', name: 'In stock' },
                  { id: 'instock,outofstock,onbackorder', name: 'All products' },
                  { id: 'outofstock', name: 'Out of stock' },
                ].map(option =>
                  chip(option.name, availability === option.id, () => {
                    setAvailability(option.id);
                    setPage(1);
                  })
                )}
              </View>
              {chip('On sale', saleOnly, () => {
                setSaleOnly(v => !v);
                setPage(1);
              })}
              {filterCount ? (
                <Button
                  label="Clear filters"
                  secondary
                  onPress={() => {
                    setPrice('');
                    setSaleOnly(false);
                    setAvailability('instock');
                    setPage(1);
                  }}
                />
              ) : null}
            </View>
          ) : null}
          <Copy accessibilityLiveRegion="polite" style={{ fontSize: t.type.small, color: t.colors.muted }}>
            {query
              ? `Results for “${query}”`
              : availability === 'outofstock'
              ? 'Currently out of stock'
              : availability === 'instock'
              ? 'Available now · Thoughtfully chosen for little ones'
              : 'All products'}
            {price || saleOnly ? ' · Filters applied' : ''}
          </Copy>
        </View>
      }
      ListEmptyComponent={
        products.loading ? (
          <ProductGridSkeleton count={6} />
        ) : (
          <View>
            <Status
              error={products.error}
              empty="No products match your selection. Try another search or clear the filters."
              onRetry={products.error ? products.retry : undefined}
            />
          {!products.loading && !products.error && (query || category || filterCount) ? (
            <Button
              label="Reset search & filters"
              secondary
              onPress={() => {
                setSearch('');
                setQuery('');
                setPrice('');
                setSaleOnly(false);
                setAvailability('instock');
                setPage(1);
                router.setParams({ category: '', search: '' });
              }}
            />
          ) : null}
        </View>
        )
      }
      ListFooterComponent={
        !products.loading && !products.error && (products.data?.length || page > 1) ? (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: t.space.lg,
              gap: t.space.sm,
            }}
          >
            <Button label="← Previous" secondary disabled={page === 1} onPress={() => setPage(p => p - 1)} />
            <Copy style={{ fontSize: t.type.small }}>Page {page}</Copy>
            <Button
              label="Next →"
              secondary
              disabled={(products.data?.length || 0) < 20}
              onPress={() => setPage(p => p + 1)}
            />
          </View>
        ) : undefined
      }
    />
  );
}
