/**
 * OmniSell Intelligence design system.
 *
 * Colors, typography, and radii below are lifted from the design doc (a
 * Material 3 / Material Theme Builder token export). The doc only specifies
 * one (light) palette; Colors.dark is derived from the doc's own inverse
 * and fixed tokens using standard M3 light-to-dark tonal-swap rules (fixed
 * tokens stay constant across themes by definition; inverse tokens and the
 * fixed-dim / fixed-variant pairs are the values M3 itself designates for
 * the opposite theme). The dark surface-container ladder has no M3 source
 * and is interpolated by hand — treat those five values as an
 * approximation, not spec.
 */

import '@/global.css';

import { Platform } from 'react-native';

const lightBase = {
  surface: '#f8f9fa',
  surfaceDim: '#d9dadb',
  surfaceBright: '#f8f9fa',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f3f4f5',
  surfaceContainer: '#edeeef',
  surfaceContainerHigh: '#e7e8e9',
  surfaceContainerHighest: '#e1e3e4',
  onSurface: '#191c1d',
  onSurfaceVariant: '#3d4947',
  inverseSurface: '#2e3132',
  inverseOnSurface: '#f0f1f2',
  outline: '#6d7a77',
  outlineVariant: '#bcc9c6',
  surfaceTint: '#006a61',
  primary: '#00685f',
  onPrimary: '#ffffff',
  primaryContainer: '#008378',
  onPrimaryContainer: '#f4fffc',
  inversePrimary: '#6bd8cb',
  secondary: '#575e70',
  onSecondary: '#ffffff',
  secondaryContainer: '#d9dff5',
  onSecondaryContainer: '#5c6274',
  tertiary: '#4648d4',
  onTertiary: '#ffffff',
  tertiaryContainer: '#6063ee',
  onTertiaryContainer: '#fffbff',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  primaryFixed: '#89f5e7',
  primaryFixedDim: '#6bd8cb',
  onPrimaryFixed: '#00201d',
  onPrimaryFixedVariant: '#005049',
  secondaryFixed: '#dce2f7',
  secondaryFixedDim: '#c0c6db',
  onSecondaryFixed: '#141b2b',
  onSecondaryFixedVariant: '#404758',
  tertiaryFixed: '#e1e0ff',
  tertiaryFixedDim: '#c0c1ff',
  onTertiaryFixed: '#07006c',
  onTertiaryFixedVariant: '#2f2ebe',
  background: '#f8f9fa',
  onBackground: '#191c1d',
  surfaceVariant: '#e1e3e4',
} as const;

const darkBase = {
  // Anchored directly on the doc's inverse-surface/inverse-on-surface pair.
  surface: '#2e3132',
  surfaceDim: '#111413',
  surfaceBright: '#3a3d3e',
  // No M3 source for the dark container ladder — hand-interpolated between
  // surfaceDim and surfaceBright.
  surfaceContainerLowest: '#0c0f0e',
  surfaceContainerLow: '#191c1d',
  surfaceContainer: '#1d2021',
  surfaceContainerHigh: '#282b2c',
  surfaceContainerHighest: '#333637',
  onSurface: '#f0f1f2',
  onSurfaceVariant: '#bcc9c6',
  inverseSurface: lightBase.surface,
  inverseOnSurface: lightBase.onSurface,
  outline: '#889390',
  outlineVariant: '#3d4947',
  surfaceTint: '#6bd8cb',
  // Primary/secondary/tertiary dark tones reuse the doc's own fixed/inverse
  // tokens: *Fixed = tone90, *FixedDim = tone80, onFixed = tone10 (~tone20),
  // onFixedVariant = tone30 — exactly the tones M3 assigns to a dark theme.
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
  // Standard M3 baseline dark error ramp — the doc's light error/onError-
  // Container values match the baseline M3 error ramp exactly, confirming
  // this palette is a Material Theme Builder export, so the baseline dark
  // counterparts apply directly rather than being invented.
  error: '#ffb4ab',
  onError: '#690005',
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
  background: '#2e3132',
  onBackground: '#f0f1f2',
  surfaceVariant: '#333637',
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
    success: lightBase.primary,
  },
  dark: {
    ...darkBase,
    text: darkBase.onSurface,
    backgroundElement: darkBase.surfaceContainer,
    backgroundSelected: darkBase.surfaceContainerHigh,
    textSecondary: darkBase.onSurfaceVariant,
    border: darkBase.outlineVariant,
    danger: darkBase.error,
    success: darkBase.primary,
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
