---
name: Tijarah-AI
colors:
  surface: '#f6f7f8'
  surface-dim: '#dadde1'
  surface-bright: '#f6f7f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f2f4'
  surface-container: '#ebedef'
  surface-container-high: '#e4e7ea'
  surface-container-highest: '#dde0e4'
  on-surface: '#14181c'
  on-surface-variant: '#5b6570'
  inverse-surface: '#20262b'
  inverse-on-surface: '#f2f3f4'
  outline: '#8a94a0'
  outline-variant: '#dde1e6'
  surface-tint: '#0e6b5e'
  primary: '#0e6b5e'
  on-primary: '#ffffff'
  primary-container: '#e1f2ee'
  on-primary-container: '#0a4a40'
  inverse-primary: '#6fd9c4'
  secondary: '#3e5c76'
  on-secondary: '#ffffff'
  secondary-container: '#e2eaf1'
  on-secondary-container: '#27394a'
  tertiary: '#b45309'
  on-tertiary: '#ffffff'
  tertiary-container: '#fdecd1'
  on-tertiary-container: '#7c3a0a'
  error: '#dc2626'
  on-error: '#ffffff'
  error-container: '#fee2e2'
  on-error-container: '#7f1d1d'
  success: '#15803d'
  primary-fixed: '#beeae0'
  primary-fixed-dim: '#6fd9c4'
  on-primary-fixed: '#04211c'
  on-primary-fixed-variant: '#0a4a40'
  secondary-fixed: '#dce6ef'
  secondary-fixed-dim: '#afc2d3'
  on-secondary-fixed: '#16232e'
  on-secondary-fixed-variant: '#27394a'
  tertiary-fixed: '#fbe0b8'
  tertiary-fixed-dim: '#e8b577'
  on-tertiary-fixed: '#3a2200'
  on-tertiary-fixed-variant: '#7c3a0a'
  background: '#f6f7f8'
  on-background: '#14181c'
  surface-variant: '#dde0e4'
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

The aesthetic prioritizes precision through a 1px border system and generous whitespace, avoiding any decorative elements that do not serve a functional purpose. The emotional response should be one of complete control and professional reliability. This is a light-only-first system: dark mode exists as a tonal inversion for the rare user who wants it, but every screen is designed against the light palette first.

## Colors

The palette is anchored by a deep, slightly muted teal rather than a bright/saturated one — bright teal reads as a generic Material default; a deeper tone reads as a deliberate financial/business choice. Secondary and tertiary hues are held in reserve for status and channel context, not decoration.

- **Primary**: #0E6B5E (Deep Teal) – Primary buttons, active nav state, links, focus rings.
- **Secondary**: #3E5C76 (Slate Blue) – Informational accents, secondary emphasis; not yet wired into any screen.
- **Tertiary**: #B45309 (Bronze/Amber) – Reserved for premium or attention-worthy highlights; used sparingly, never for primary actions.
- **Success**: #15803D — deliberately distinct from Primary so a positive metric (e.g. "Strong" password, revenue up) never gets mistaken for a brand action.
- **Danger**: #DC2626 — a clear, saturated red. Errors should never be ambiguous.
- **Surface**: #F6F7F8 (Soft Grey) – App canvas background, separates content modules without harsh lines.
- **Surface Container Lowest**: #FFFFFF – Cards, inputs, anything meant to read as "raised paper" above the canvas.
- **Ink**: #14181C (on-surface) – Primary text and iconography. A soft near-black, not pure #000, to reduce contrast fatigue in data-dense screens.
- **Ink Secondary**: #5B6570 (on-surface-variant) – A true neutral grey for secondary text/labels — deliberately not green- or blue-tinted, so it doesn't read as an auto-generated Material palette.
- **Marketplace Accents**: Specific brand colors for Amazon, Shopify, eBay, and Walmart are used exclusively for status badges and channel-specific metrics to provide instant visual recognition. These are the one place saturated, non-palette color is allowed.

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

- **Level 0**: Background surface (surface, #F6F7F8).
- **Level 1**: Content cards and containers. White (surface-container-lowest) with a 1px border (outline-variant). No drop shadow — a shadowed content card is the most common tell of a templated/AI-generated screen in this system; use the border instead.
- **Interactive**: Elements like dropdowns or active modals use a very soft, diffused shadow (0px 4px 12px, 5% opacity) to float above the interface without breaking the clean aesthetic. Reserve shadow for things that are genuinely floating above the layout (menus, modals, toasts) — never for a screen's main content card.
- **State Changes**: Hover states on interactive cards are indicated by a slight border color shift to the primary teal rather than an increase in shadow.

## Shapes

The shape language balances approachability with professional structure.

- **Cards/Containers**: Use `rounded-md` (12px) as the default for content cards — precise and tool-like without feeling sharp. `rounded-lg`/`rounded-xl` (16–24px) are reserved for large hero/marketing surfaces (e.g. the welcome screen), not dashboard cards.
- **Buttons/Inputs**: Use a standard 8px radius for a more precise, tool-like feel.
- **Badges/Chips**: Use a fully rounded pill shape to distinguish them from interactive buttons.

## Components

### Bottom Navigation
The navigation bar uses a blur background (Glassmorphism Lite) with a 1px top stroke. Icons are 24px, accompanied by Label-SM text. The active state is indicated by the primary teal color for both icon and text.

### Metric Cards
White background, 1px border, 16px padding, `rounded-md` corners. Large Display-LG font for the primary value. Sparklines (mini charts) should use the primary color with a subtle 5% fill underneath the stroke.

### Status Badges
Small, pill-shaped indicators. They use a 10% opacity version of the marketplace color as the background, with the full-strength color for the text to ensure WCAG AA accessibility.

### Multi-step Steppers
Horizontal for desktop, vertical for mobile. Use a "Completed" checkmark in primary teal, an "Active" state with a teal border and bold text, and "Inactive" states in soft grey.

### Input Fields
8px radius, 1px border (outline-variant). On focus, the border transitions to Primary Teal with a 2px outer "glow" (soft shadow) of the same color at 10% opacity.

### Brand Mark
A `rounded-md` square in Primary Teal containing a single bold "T" set in Manrope 700, white-on-teal. No emoji or illustrated iconography in the brand mark — emoji render inconsistently across platforms and read as a consumer-app choice, not a business one.
