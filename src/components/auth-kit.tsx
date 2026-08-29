import { Image } from 'expo-image';
import { type ReactNode, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ManropeFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Pressable that springs to a slightly smaller scale on press-in — the
 * shared "feels alive" tap feedback for every primary/secondary CTA across
 * the `(auth)` flow (welcome, login, signup), on top of the plain opacity
 * dimming those buttons already had.
 */
export function PressableScale({
  children,
  style,
  onPress,
  disabled,
  ...props
}: PressableProps & { style?: StyleProp<ViewStyle> }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 16, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 320 });
      }}
      style={[style, animatedStyle, disabled && styles.pressableDisabled]}>
      {children}
    </AnimatedPressable>
  );
}

export function AuthFormScaffold({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets>
          <View style={[styles.card, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.border }]}>
            {children}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'sm' ? 56 : size === 'md' ? 88 : 120;
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <Image
      source={isDark ? require('@/assets/images/tijarah_logo_dark.png') : require('@/assets/images/tijarah_logo_light.png')}
      style={{ width: box, height: box }}
      contentFit="contain"
    />
  );
}

type AuthFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'words';
  autoComplete?: 'name' | 'email' | 'new-password' | 'current-password';
  error?: string;
  rightAdornment?: ReactNode;
  /** Multi-line text area (e.g. a product description) instead of a single input row. */
  multiline?: boolean;
  numberOfLines?: number;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
  rightAdornment,
  multiline = false,
  numberOfLines,
  helperText,
  required = false,
  disabled = false,
  accessibilityLabel,
}: AuthFieldProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const focusProgress = useSharedValue(0);

  useEffect(() => {
    focusProgress.value = withTiming(isFocused ? 1 : 0, { duration: 150 });
  }, [isFocused, focusProgress]);

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: error ? theme.danger : interpolateColor(focusProgress.value, [0, 1], [theme.border, theme.primary]),
  }));

  return (
    <View style={styles.fieldGroup}>
      <ThemedText type="bodyMd" themeColor="textSecondary">
        {label}{required ? ' *' : ''}
      </ThemedText>
      <Animated.View
        collapsable={false}
        style={[
          styles.inputRow,
          { backgroundColor: theme.surfaceContainerLowest },
          multiline && styles.inputRowMultiline,
          animatedBorderStyle,
        ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          textContentType="none"
          importantForAutofill="noExcludeDescendants"
          underlineColorAndroid="transparent"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[styles.input, multiline && styles.inputMultiline, { color: theme.text }]}
          editable={!disabled}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={{ disabled }}
        />
        {rightAdornment}
      </Animated.View>
      {error && (
        <Animated.View entering={FadeIn.duration(150)}>
          <ThemedText type="bodySm" themeColor="danger">
            {error}
          </ThemedText>
        </Animated.View>
      )}
      {!error && helperText && (
        <ThemedText type="bodySm" themeColor="textSecondary">{helperText}</ThemedText>
      )}
    </View>
  );
}

export function PasswordVisibilityToggle({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle} hitSlop={8}>
      <ThemedText type="bodySm" themeColor="primary">
        {visible ? 'Hide' : 'Show'}
      </ThemedText>
    </Pressable>
  );
}

export function OrDivider({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.dividerRow}>
      <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
      <ThemedText type="bodySm" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
    </View>
  );
}

// Official Google "G" mark (brand-guideline colors) as an inline SVG data
// URI — `expo-image` renders SVG sources natively, so this needs no new
// dependency and stays pixel-accurate at any size.
const GOOGLE_G_LOGO_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7955 2.7164v2.2582h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.6151z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2582c-.8059.54-1.8368.8618-3.0477.8618-2.344 0-4.3282-1.5831-5.036-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2822-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.964 10.71z"/>
      <path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"/>
    </svg>`,
  );

export function GoogleButton({ label, onPress }: { label: string; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      style={[styles.googleButton, { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest }]}>
      <Image source={{ uri: GOOGLE_G_LOGO_URI }} style={styles.googleMark} contentFit="contain" />
      <ThemedText type="bodyLg" style={styles.emphasisText}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.six,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  fieldGroup: {
    gap: Spacing.one,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
    paddingHorizontal: Spacing.three,
  },
  inputRowMultiline: {
    alignItems: 'flex-start',
    paddingVertical: Spacing.two,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.three,
    fontFamily: ManropeFamily[400],
    fontSize: 16,
  },
  inputMultiline: {
    paddingVertical: Spacing.one,
    minHeight: 88,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
    paddingVertical: Spacing.three,
  },
  googleMark: {
    width: 18,
    height: 18,
  },
  emphasisText: {
    fontFamily: ManropeFamily[600],
    fontWeight: '600',
  },
  pressableDisabled: {
    opacity: 0.6,
  },
});
