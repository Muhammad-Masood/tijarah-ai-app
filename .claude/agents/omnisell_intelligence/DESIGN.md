---
name: OmniSell Intelligence
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#3d4947'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#6d7a77'
  outline-variant: '#bcc9c6'
  surface-tint: '#006a61'
  primary: '#00685f'
  on-primary: '#ffffff'
  primary-container: '#008378'
  on-primary-container: '#f4fffc'
  inverse-primary: '#6bd8cb'
  secondary: '#575e70'
  on-secondary: '#ffffff'
  secondary-container: '#d9dff5'
  on-secondary-container: '#5c6274'
  tertiary: '#4648d4'
  on-tertiary: '#ffffff'
  tertiary-container: '#6063ee'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#89f5e7'
  primary-fixed-dim: '#6bd8cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#005049'
  secondary-fixed: '#dce2f7'
  secondary-fixed-dim: '#c0c6db'
  on-secondary-fixed: '#141b2b'
  on-secondary-fixed-variant: '#404758'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  display-lg-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 20px
  gutter: 16px
---

## Brand & Style

The design system is rooted in **Corporate Modernism** with a focus on high-density information clarity. The brand personality is calm, efficient, and intelligent, designed to reduce cognitive load for merchants managing complex data. 

The aesthetic prioritizes precision through a 1px border system and generous whitespace, avoiding any decorative elements that do not serve a functional purpose. The emotional response should be one of complete control and professional reliability.

## Colors

The palette is anchored by a deep teal emerald, signifying growth and stability. This primary color is used for key actions and progress indicators. 

- **Primary**: #0D9488 (Deep Teal) – Used for primary buttons, active states, and success indicators.
- **Surface**: #F9FAFB (Soft Grey) – Used for background regions to separate content modules without harsh lines.
- **Neutral**: #111827 (Ink) – Used for primary text and iconography to ensure maximum contrast.
- **Marketplace Accents**: Specific brand colors for Amazon, Shopify, eBay, and Walmart are used exclusively for status badges and channel-specific metrics to provide instant visual recognition.

## Typography

Manrope was selected for its modern, geometric construction that maintains excellent legibility in data-heavy environments. 

- **Scale**: A modular scale is used to differentiate between analytical data (Body SM/MD) and high-level summaries (Display LG).
- **Weights**: Use Bold (700) and SemiBold (600) sparingly for headers and labels. Regular (400) is the default for all tabular data and descriptions.
- **Letter Spacing**: Negative tracking is applied to larger headlines to maintain a tight, professional appearance. Labels use slightly increased tracking for clarity at small sizes.

## Layout & Spacing

The design system utilizes an **8px linear grid** to ensure consistency across all components.

- **Desktop**: A 12-column fluid grid with 24px gutters. Content is primarily housed in white cards to create a "modular dashboard" feel.
- **Mobile**: A single-column layout with 20px side margins. 
- **Rhythm**: Vertical rhythm is strictly enforced in 8px increments. Components like metric cards use 16px internal padding (MD) while large page headers use 32px (XL) bottom margins.

## Elevation & Depth

This system uses **Tonal Layering** and **Low-Contrast Outlines** rather than heavy shadows to signify depth.

- **Level 0**: Background surface (#F9FAFB).
- **Level 1**: Content cards and containers. White (#FFFFFF) with a 1px border (#E5E7EB).
- **Interactive**: Elements like dropdowns or active modals use a very soft, diffused shadow (0px 4px 12px, 5% opacity) to float above the interface without breaking the clean aesthetic.
- **State Changes**: Hover states on interactive cards are indicated by a slight border color shift to the primary teal rather than an increase in shadow.

## Shapes

The shape language balances approachability with professional structure.

- **Cards/Containers**: Use `rounded-xl` (16px) or `rounded-lg` (12px) to soften the analytical nature of the data.
- **Buttons/Inputs**: Use a standard 8px radius for a more precise, tool-like feel.
- **Badges/Chips**: Use a fully rounded pill shape to distinguish them from interactive buttons.

## Components

### Bottom Navigation
The navigation bar uses a blur background (Glassmorphism Lite) with a 1px top stroke. Icons are 24px, accompanied by Label-SM text. The active state is indicated by the primary teal color for both icon and text.

### Metric Cards
White background, 1px border, 16px padding. Large Display-LG font for the primary value. Sparklines (mini charts) should use the primary color with a subtle 5% fill underneath the stroke.

### Status Badges
Small, pill-shaped indicators. They use a 10% opacity version of the marketplace color as the background, with the full-strength color for the text to ensure WCAG AA accessibility.

### Multi-step Steppers
Horizontal for desktop, vertical for mobile. Use a "Completed" checkmark in primary teal, an "Active" state with a teal border and bold text, and "Inactive" states in soft grey.

### Input Fields
8px radius, 1px border (#D1D5DB). On focus, the border transitions to Primary Teal with a 2px outer "glow" (soft shadow) of the same color at 10% opacity.