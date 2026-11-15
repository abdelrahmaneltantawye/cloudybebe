import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/design-system';

export function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}) {
  const t = useTheme();
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.85, { duration: 850, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: t.colors.surfaceMuted || '#F0F2F5',
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function ProductCardSkeleton() {
  const t = useTheme();

  return (
    <View
      style={{
        flex: 1,
        borderRadius: t.radius.md,
        backgroundColor: t.colors.surface,
        borderWidth: 1,
        borderColor: t.colors.border,
        overflow: 'hidden',
        padding: t.space.sm,
        gap: t.space.sm,
      }}
    >
      <SkeletonBox
        style={{ width: '100%', aspectRatio: 1, borderRadius: t.radius.sm }}
      />
      <View style={{ gap: 6, paddingHorizontal: 4, paddingBottom: 4 }}>
        <SkeletonBox width="50%" height={10} borderRadius={5} />
        <SkeletonBox width="90%" height={14} borderRadius={6} />
        <SkeletonBox width="35%" height={16} borderRadius={6} />
      </View>
    </View>
  );
}

export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  const t = useTheme();

  return (
    <View style={{ gap: t.space.md, width: '100%' }}>
      {Array.from({ length: Math.ceil(count / 2) }, (_, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: 'row', gap: t.space.md }}>
          <ProductCardSkeleton key={`left-${rowIndex}`} />
          {rowIndex * 2 + 1 < count ? (
            <ProductCardSkeleton key={`right-${rowIndex}`} />
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>
      ))}
    </View>
  );
}
