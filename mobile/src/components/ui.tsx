import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type TextProps,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme, useThemeContext } from '@/design-system';
import { haptic } from '@/lib/haptics';

export function Copy({ style, ...props }: TextProps) {
  const t = useTheme();
  return <Text {...props} style={[{ fontFamily: t.font.body, fontSize: t.type.body, lineHeight: 24, color: t.colors.ink }, style]} />;
}

export function Title({ children, large = false, style, ...props }: TextProps & { large?: boolean }) {
  const t = useTheme();
  return (
    <Copy
      accessibilityRole="header"
      {...props}
      style={[
        {
          fontFamily: t.font.display,
          fontSize: large ? t.type.hero : t.type.title,
          lineHeight: large ? 40 : 32,
          letterSpacing: -0.6,
        },
        style,
      ]}
    >
      {children}
    </Copy>
  );
}

export function Button({
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
  secondary = false,
  style,
}: {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  style?: ViewStyle;
}) {
  const t = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.96, { damping: 14, stiffness: 320 });
    haptic.light();
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 320 });
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={({ pressed }) => [
          {
            minHeight: 50,
            borderRadius: t.radius.sm,
            paddingHorizontal: t.space.lg,
            paddingVertical: t.space.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: secondary ? t.colors.primarySoft : t.colors.primary,
            opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
          },
          style,
        ]}
      >
        <Copy
          style={{
            fontFamily: t.font.strong,
            color: secondary ? t.colors.primary : t.colors.white,
            textAlign: 'center',
            fontSize: t.type.small,
          }}
        >
          {label}
        </Copy>
      </Pressable>
    </Animated.View>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  selected,
  disabled = false,
  style,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const t = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.85, { damping: 12, stiffness: 350 });
    haptic.selection();
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 350 });
  };

  const handlePress = () => {
    if (icon.includes('heart')) {
      haptic.medium();
    }
    onPress();
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={({ pressed }) => [
          {
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: t.radius.pill,
            opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
          },
          style,
        ]}
      >
        <Ionicons name={icon} size={23} color={selected ? t.colors.primary : t.colors.ink} />
      </Pressable>
    </Animated.View>
  );
}

export function BrandHeader() {
  const t = useTheme();
  const { colorScheme } = useThemeContext();
  const isDark = colorScheme === 'dark';

  const logoSource = isDark
    ? require('../../assets/images/cloudybebe-wordmark-white.png')
    : require('../../assets/images/cloudybebe-wordmark.png');

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: t.space.sm,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="CloudyBebe home"
        onPress={() => router.push('/')}
        style={{ minHeight: 48, justifyContent: 'center', alignItems: 'center' }}
      >
        <Image
          source={logoSource}
          style={{ width: 195, maxWidth: '100%', height: 49 }}
          contentFit="contain"
          accessibilityLabel="CloudyBebe"
        />
      </Pressable>
    </View>
  );
}

export function SearchField(props: TextInputProps) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space.sm,
        borderWidth: 1,
        borderColor: t.colors.border,
        borderRadius: t.radius.sm,
        paddingHorizontal: t.space.md,
        backgroundColor: t.colors.surface,
      }}
    >
      <Ionicons name="search-outline" size={20} color={t.colors.muted} />
      <TextInput
        accessibilityLabel="Search products"
        placeholder="Search products…"
        placeholderTextColor={t.colors.muted}
        returnKeyType="search"
        clearButtonMode="while-editing"
        {...props}
        style={[
          {
            flex: 1,
            minHeight: 50,
            color: t.colors.ink,
            fontFamily: t.font.body,
            fontSize: t.type.body,
            paddingVertical: t.space.md,
          },
          props.style,
        ]}
      />
    </View>
  );
}

export function QuantityStepper({
  value,
  minimum = 1,
  maximum = 9999,
  step = 1,
  onChange,
  label = 'Quantity',
}: {
  value: number;
  minimum?: number;
  maximum?: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
}) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={`${label}: ${value}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: t.colors.border,
        borderRadius: t.radius.sm,
        backgroundColor: t.colors.surface,
      }}
    >
      <IconButton
        icon="remove"
        label={`Decrease ${label}`}
        disabled={value <= minimum}
        onPress={() => {
          haptic.selection();
          onChange(Math.max(minimum, value - step));
        }}
      />
      <Copy
        accessibilityLabel={`${label}: ${value}`}
        style={{ minWidth: 23, textAlign: 'center', fontSize: t.type.small, fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Copy>
      <IconButton
        icon="add"
        label={`Increase ${label}`}
        disabled={value >= maximum}
        onPress={() => {
          haptic.selection();
          onChange(Math.min(maximum, value + step));
        }}
      />
    </View>
  );
}

export function Accordion({
  title,
  children,
  initialOpen = false,
}: {
  title: string;
  children: ReactNode;
  initialOpen?: boolean;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(initialOpen);

  const toggle = () => {
    haptic.light();
    setOpen(v => !v);
  };

  return (
    <View style={{ borderTopWidth: 1, borderColor: t.colors.border }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}, ${open ? 'expanded' : 'collapsed'}`}
        accessibilityHint="Double tap to toggle section"
        onPress={toggle}
        style={{
          minHeight: 54,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: t.space.md,
        }}
      >
        <Copy style={{ fontFamily: t.font.strong, fontSize: t.type.small }}>{title}</Copy>
        <Ionicons name={open ? 'remove' : 'add'} size={20} color={t.colors.muted} />
      </Pressable>
      {open ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={{ paddingBottom: t.space.lg }}>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

export function Status({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading?: boolean;
  error?: string;
  empty?: string;
  onRetry?: () => void;
}) {
  const t = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ paddingVertical: t.space.xl, gap: t.space.md, alignItems: 'center' }}
    >
      {loading ? (
        <>
          <ActivityIndicator color={t.colors.primary} />
          <Copy style={{ color: t.colors.muted, textAlign: 'center' }}>Loading lovely little things…</Copy>
        </>
      ) : (
        <>
          <Copy style={{ color: error ? t.colors.error : t.colors.muted, textAlign: 'center' }}>
            {error || empty}
          </Copy>
          {onRetry ? <Button label="Try again" secondary onPress={onRetry} /> : null}
        </>
      )}
    </View>
  );
}
