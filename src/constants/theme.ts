/**
 * Tijarah AI design system.
 *
 * A light, business-grade palette for a multi-marketplace commerce hub:
 * calm ink-on-paper neutrals, a single deliberate teal for action/brand,
 * and slate + amber accents held in reserve for secondary/highlight use.
 * Tonal layering (surface containers) and hairline borders carry depth
 * instead of heavy shadows — see DESIGN.md for the full rationale.
 * Colors.dark is a hand-tuned tonal inversion of the same palette so the
 * app keeps working in dark mode without a second design pass.
 */

import '@/global.css';

import { Platform } from 'react-native';

const lightBase = {
  surface: '#f6f7f8',
  surfaceDim: '#dadde1',
  surfaceBright: '#f6f7f8',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f1f2f4',
  surfaceContainer: '#ebedef',
  surfaceContainerHigh: '#e4e7ea',
  surfaceContainerHighest: '#dde0e4',
  onSurface: '#14181c',
  onSurfaceVariant: '#5b6570',
  inverseSurface: '#20262b',
  inverseOnSurface: '#f2f3f4',
  outline: '#8a94a0',
  outlineVariant: '#dde1e6',
  surfaceTint: '#0e6b5e',
  primary: '#0e6b5e',
  onPrimary: '#ffffff',
  primaryContainer: '#e1f2ee',
  onPrimaryContainer: '#0a4a40',
  inversePrimary: '#6fd9c4',
  secondary: '#3e5c76',
  onSecondary: '#ffffff',
  secondaryContainer: '#e2eaf1',
  onSecondaryContainer: '#27394a',
  tertiary: '#b45309',
  onTertiary: '#ffffff',
  tertiaryContainer: '#fdecd1',
  onTertiaryContainer: '#7c3a0a',
  error: '#dc2626',
  onError: '#ffffff',
  errorContainer: '#fee2e2',
  onErrorContainer: '#7f1d1d',
  primaryFixed: '#beeae0',
  primaryFixedDim: '#6fd9c4',
  onPrimaryFixed: '#04211c',
  onPrimaryFixedVariant: '#0a4a40',
  secondaryFixed: '#dce6ef',
  secondaryFixedDim: '#afc2d3',
  onSecondaryFixed: '#16232e',
  onSecondaryFixedVariant: '#27394a',
  tertiaryFixed: '#fbe0b8',
  tertiaryFixedDim: '#e8b577',
  onTertiaryFixed: '#3a2200',
  onTertiaryFixedVariant: '#7c3a0a',
  background: '#f6f7f8',
  onBackground: '#14181c',
  surfaceVariant: '#dde0e4',
} as const;

const darkBase = {
  surface: '#1a1f23',
  surfaceDim: '#101315',
  surfaceBright: '#262c31',
  surfaceContainerLowest: '#0c0f11',
  surfaceContainerLow: '#171c20',
  surfaceContainer: '#1c2226',
  surfaceContainerHigh: '#252b30',
  surfaceContainerHighest: '#2f363c',
  onSurface: '#edeff1',
  onSurfaceVariant: '#aeb7c0',
  inverseSurface: lightBase.surface,
  inverseOnSurface: lightBase.onSurface,
  outline: '#7c8590',
  outlineVariant: '#3a4147',
  surfaceTint: lightBase.inversePrimary,
  primary: lightBase.inversePrimary,
  onPrimary: lightBase.onPrimaryFixed,
  primaryContainer: lightBase.onPrimaryFixedVariant,
  onPrimaryContainer: lightBase.primaryFixed,
  inversePrimary: lightBase.primary,
  secondary: lightBase.secondaryFixedDim,
  onSecondary: lightBase.onSecondaryFixed,
  secondaryContainer: lightBase.onSecondaryFixedVariant,
  onSecondaryContainer: lightBase.secondaryFixed,
  tertiary: lightBase.tertiaryFixedDim,
  onTertiary: lightBase.onTertiaryFixed,
  tertiaryContainer: lightBase.onTertiaryFixedVariant,
  onTertiaryContainer: lightBase.tertiaryFixed,
  error: '#f87171',
  onError: '#450a0a',
  errorContainer: lightBase.onErrorContainer,
  onErrorContainer: lightBase.errorContainer,
  primaryFixed: lightBase.primaryFixed,
  primaryFixedDim: lightBase.primaryFixedDim,
  onPrimaryFixed: lightBase.onPrimaryFixed,
  onPrimaryFixedVariant: lightBase.onPrimaryFixedVariant,
  secondaryFixed: lightBase.secondaryFixed,
  secondaryFixedDim: lightBase.secondaryFixedDim,
  onSecondaryFixed: lightBase.onSecondaryFixed,
  onSecondaryFixedVariant: lightBase.onSecondaryFixedVariant,
  tertiaryFixed: lightBase.tertiaryFixed,
  tertiaryFixedDim: lightBase.tertiaryFixedDim,
  onTertiaryFixed: lightBase.onTertiaryFixed,
  onTertiaryFixedVariant: lightBase.onTertiaryFixedVariant,
  background: '#1a1f23',
  onBackground: '#edeff1',
  surfaceVariant: '#2f363c',
} as const;

export const Colors = {
  light: {
    ...lightBase,
    // Legacy short aliases consumed by existing components
    // (ThemedText/ThemedView/app-tabs/hint-row) — each resolves to one of
    // the tokens above, not a separate value.
    text: lightBase.onSurface,
    backgroundElement: lightBase.surfaceContainer,
    backgroundSelected: lightBase.surfaceContainerHigh,
    textSecondary: lightBase.onSurfaceVariant,
    border: lightBase.outlineVariant,
    danger: lightBase.error,
    success: '#15803d',
  },
  dark: {
    ...darkBase,
    text: darkBase.onSurface,
    backgroundElement: darkBase.surfaceContainer,
    backgroundSelected: darkBase.surfaceContainerHigh,
    textSecondary: darkBase.onSurfaceVariant,
    border: darkBase.outlineVariant,
    danger: darkBase.error,
    success: '#4ade80',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** Manrope family name per weight, as registered by useFonts() in the root layout. */
export const ManropeFamily = {
  400: 'Manrope_400Regular',
  600: 'Manrope_600SemiBold',
  700: 'Manrope_700Bold',
} as const;

/**
 * Typography scale from the design doc. `fontWeight` is included alongside
 * `fontFamily` for platforms/fallback fonts that respect it, but the
 * Manrope family name is what actually selects the weight-specific font
 * file.
 */
export const Typography = {
  displayLg: {
    fontFamily: ManropeFamily[700],
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.64,
  },
  displayLgMobile: {
    fontFamily: ManropeFamily[700],
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
  },
  headlineMd: {
    fontFamily: ManropeFamily[600],
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    letterSpacing: -0.24,
  },
  headlineSm: {
    fontFamily: ManropeFamily[600],
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  bodyLg: {
    fontFamily: ManropeFamily[400],
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodyMd: {
    fontFamily: ManropeFamily[400],
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  bodySm: {
    fontFamily: ManropeFamily[400],
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  labelMd: {
    fontFamily: ManropeFamily[600],
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: 0.6,
  },
} as const;

/** 8px radius scale from the design doc. */
export const Radius = {
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
  /** Design-doc mobile side margin (20px) — not on the half/one/two/... scale. */
  containerMargin: 20,
  /** Design-doc default gutter (16px), same value as `three`, named for parity with the doc. */
  gutter: 16,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
