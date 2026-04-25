---
version: "alpha"
name: Kireiku
description: >
  A premium futuristic glassmorphism gaming aesthetic for a game boosting
  storefront and workforce management platform. Supports light, dark, and
  system-preference modes. The palette is warm-red primary with deep navy
  secondaries, designed for high contrast and an immersive gaming feel.

colors:
  # ── Light Mode ──
  background:          "#fafafa"
  foreground:          "#1a1d2b"
  card:                "#ffffff"
  card-foreground:     "#1a1d2b"
  popover:             "#ffffff"
  popover-foreground:  "#1a1d2b"
  primary:             "#d63a2a"
  primary-foreground:  "#ffffff"
  secondary:           "#2e3451"
  secondary-foreground: "#ffffff"
  muted:               "#f3f3f5"
  muted-foreground:    "#6e7185"
  accent:              "#f0868a"
  accent-foreground:   "#4a1f1f"
  destructive:         "#7a2a1d"
  destructive-foreground: "#ffffff"
  border:              "#e3e3e8"
  input:               "#e3e3e8"
  ring:                "#d63a2a"

  # ── Dark Mode ──
  background-dark:          "#181a24"
  foreground-dark:          "#fafafa"
  card-dark:                "#222538"
  card-foreground-dark:     "#fafafa"
  popover-dark:             "#222538"
  popover-foreground-dark:  "#fafafa"
  primary-dark:             "#e84e3a"
  primary-foreground-dark:  "#ffffff"
  secondary-dark:           "#27294a"
  secondary-foreground-dark: "#ffffff"
  muted-dark:               "#2b2d3a"
  muted-foreground-dark:    "#a0a3b0"
  accent-dark:              "#cc5a60"
  accent-foreground-dark:   "#ffffff"
  destructive-dark:         "#6e2a1f"
  destructive-foreground-dark: "#ffffff"
  border-dark:              "#2b2d3a"
  input-dark:               "#2b2d3a"
  ring-dark:                "#e84e3a"

  # ── Chart Colors (shared) ──
  chart-1:   "#d63a2a"
  chart-2:   "#2e3451"
  chart-3:   "#f0868a"
  chart-4:   "#d4a84a"
  chart-5:   "#8a8ca0"

  # ── Sidebar ──
  sidebar:                     "#ffffff"
  sidebar-foreground:          "#4a4d60"
  sidebar-primary:             "#d63a2a"
  sidebar-primary-foreground:  "#ffffff"
  sidebar-accent:              "#f3f3f5"
  sidebar-accent-foreground:   "#1a1d2b"
  sidebar-border:              "#f3f3f5"
  sidebar-ring:                "#d63a2a"

  sidebar-dark:                     "#181a24"
  sidebar-foreground-dark:          "#a0a3b0"
  sidebar-primary-dark:             "#e84e3a"
  sidebar-primary-foreground-dark:  "#ffffff"
  sidebar-accent-dark:              "#222538"
  sidebar-accent-foreground-dark:   "#fafafa"
  sidebar-border-dark:              "#2b2d3a"
  sidebar-ring-dark:                "#e84e3a"

  # ── Status / Semantic (always used as-is) ──
  status-on:      "#22c55e"
  status-break:   "#ffcc00ff"
  status-late:    "#ef4444"
  status-alpha:   "#dc2626"
  status-off:     "#6b7280"
  status-cuti:    "#3b82f6"
  status-sakit:   "#f97316"
  status-pending: "#8b5cf6"
  status-lembur:  "#ffe226ff"

typography:
  h1:
    fontFamily: Plus Jakarta Sans
    fontSize: 3rem
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: -0.02em
  h2:
    fontFamily: Plus Jakarta Sans
    fontSize: 2.25rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  h3:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.3
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.025em
  mono:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: 400

rounded:
  none: 0px
  sm: 8px
  md: 10px
  lg: 12px
  xl: 16px
  full: 9999px

spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  section: 96px

components:
  # ── Buttons ──
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    padding: 12px 20px
    typography: "{typography.body-sm}"
  button-primary-hover:
    backgroundColor: "{colors.primary}/90%"
  button-outline:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: 12px 20px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.muted-foreground}"

  # ── Cards ──
  card-glass:
    backgroundColor: "{colors.card}/40%"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
  card-glass-strong:
    backgroundColor: "{colors.secondary}/50%"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"

  # ── Navigation ──
  navbar:
    backgroundColor: "{colors.background}/80%"
    height: 64px
  navbar-scrolled:
    backgroundColor: "{colors.background}/80%"
  sidebar:
    backgroundColor: "{colors.sidebar}"
    width: 240px
  sidebar-collapsed:
    width: 60px

  # ── Status Badge ──
  status-badge:
    rounded: "{rounded.full}"
    padding: 4px 12px
    typography: "{typography.label}"

  # ── Admin Header ──
  admin-header:
    backgroundColor: "{colors.background}"
    height: 56px
---

## 1. Overview

Kireiku's visual identity merges **futuristic glassmorphism** with a **premium gaming aesthetic**. The UI features layered translucent surfaces with subtle blurs, vibrant warm-red accents against deep navy backgrounds, and animated gradient orbs that give the interface a sense of depth and motion.

The system supports three appearance modes: **light**, **dark**, and **system preference**. Dark mode is the default presentation for the public landing page, while the admin panel honours the user's setting.

Key visual signatures:
- **Glassmorphism** — Card and panel surfaces use `backdrop-filter: blur()` with alpha-transparent backgrounds and faint borders.
- **Warm-red primary** — All interactive elements, CTAs, and active states use the primary red (`#d63a2a` light / `#e84e3a` dark).
- **Deep navy depth** — Background and card colors sit in a desaturated navy spectrum, avoiding pure black for a more refined look.
- **Gradient orbs** — Hero and login backgrounds feature large, blurred radial gradients of the primary and chart-5 colors for an immersive effect.

## 2. Colors

The palette is built on OKLCH for perceptual uniformity across modes.

- **Primary (`#d63a2a` / `#e84e3a`):** The signature warm red. Drives all CTAs, active navigation indicators, focus rings, and brand marks.
- **Secondary (`#2e3451` / `#27294a`):** Deep navy. Used for secondary buttons, hover backgrounds, and sidebar surfaces in light mode.
- **Accent (`#f0868a` / `#cc5a60`):** A softer coral-pink. Applied to highlight backgrounds, testimonial stars, and subtle emphasis.
- **Muted (`#f3f3f5` / `#2b2d3a`):** Neutral surface for disabled states, subtle backgrounds, and dividers.
- **Destructive (`#7a2a1d` / `#6e2a1f`):** Reserved exclusively for delete confirmations and critical error states.
- **Status palette (9 colours):** Fixed semantic colours for workforce statuses — green (on), blue (break), yellow (late), red (alpha), grey (off), violet (cuti), orange (sakit), red (pending), teal (lembur). These do not change between light and dark modes.

## 3. Typography

The type system uses **Plus Jakarta Sans** — a geometric sans-serif with a modern, approachable character. Monospace contexts (code, timestamps, live clocks) use **JetBrains Mono**.

- **Headings (h1–h3):** Bold to extrabold with tight letter-spacing (`-0.02em`) for impact.
- **Body (lg, md, sm):** Regular weight with comfortable line-height for readability.
- **Labels:** Small, medium-weight text with positive tracking (`0.025em`) for uppercase-style UI labels and badges.

Font fallback stack: `Plus Jakarta Sans, ui-sans-serif, sans-serif, system-ui`.

## 4. Layout

The layout is built on a **4px base unit** (`--spacing: 0.25rem`).

- **Landing page:** Single-column, full-bleed sections. Max content width `1280px`, horizontal padding `16px` → `32px` responsive.
- **Admin panel:** Classic sidebar + header + scrollable content. Sidebar `240px` (collapses to `60px`), header `56px`, content area fills remaining space with `16px` → `24px` padding.
- **Section rhythm:** Each landing section uses `96px` top/bottom padding (`--spacing-section`), reduced to `64px` on mobile.
- **Card grid:** 3-column on desktop (`lg:`), 2-column on tablet (`sm:`), single column on mobile. Gap `24px`.

## 5. Elevation & Depth

Elevation is achieved primarily through **glassmorphism** rather than traditional box-shadows.

- **Glass (light):** `background: color-mix(in oklab, var(--card) 40%, transparent)` with `backdrop-filter: blur(16px)` and a faint `border`.
- **Glass strong:** Higher opacity (`50%`) with `blur(24px)` and a subtle primary-tinted inner glow: `inset 0 0 0 1px color-mix(in oklab, var(--primary) 10%, transparent)`.
- **Glow effect:** Interactive elements like CTAs gain a `box-shadow: 0 0 40px color-mix(in oklab, var(--primary) 30%, transparent)` on hover.
- **Shadows:** Follow the `--shadow-*` scale from `2xs` to `2xl`, using `hsl(0 0% 0%)` at increasing opacities. Dark mode doubles the blur radius and opacity for stronger perceived depth.
- **Hero orbs:** `filter: blur(80px)` gradient circles in primary, chart-5, and chart-4 colours positioned absolutely behind content to create ambient depth.

## 6. Shapes

Radius follows a compact scale rooted at `12px` (`--radius: 0.75rem`):

- **None (`0px`):** Table cells, inline code.
- **Small (`8px`):** Input fields, badges, tags.
- **Medium (`10px`):** Dropdown menus, tooltips.
- **Large (`12px`):** Cards, dialogs, buttons.
- **Extra-large (`16px`):** Modal overlays, hero cards, glass-strong panels.
- **Full (`9999px`):** Status badge pills, avatar circles, dot indicators.

## 7. Components

- **Button Primary:** Solid primary background, white text, `rounded-lg`. On hover, background shifts to `primary/90%` with a glow shadow.
- **Button Outline:** Transparent fill, foreground text, 1px border. On hover, gains a subtle `white/5%` background.
- **Card Glass:** 40% opacity card background, `blur(16px)`, 1px semi-transparent border, `shadow-lg`. On hover, opacity increases to 6% and border brightens.
- **Card Glass Strong:** 50% opacity secondary background, `blur(24px)`, primary-tinted inner border. Used for login forms and hero badges.
- **Navbar:** Fixed top, transparent at scroll=0, gains `background/80%` + `blur` + border after 50px scroll. Includes scroll-spy with active link highlighted in `white/10%`.
- **Sidebar:** `240px` wide desktop sidebar with icon + label links. Active link uses `primary/10%` background with primary text and a `2px` left border accent. Collapses to `60px` icon-only on toggle.
- **Status Badge:** Pill shape (`rounded-full`), 15% opacity background of the status colour, matching text colour, 30% opacity border. Tiny `label` typography.
- **Admin Header:** `56px` tall, contains hamburger toggle, brand text, live WIB clock (monospace), and user avatar dropdown.

## 8. Do's and Don'ts

- **Do** use glassmorphism surfaces for all card-style containers rather than solid backgrounds.
- **Do** use the primary red exclusively for interactive or active states — never for decorative backgrounds.
- **Do** ensure all text meets WCAG AA contrast against its surface.
- **Do** use `color-mix(in oklab, ...)` for alpha blending to stay consistent with the OKLCH palette.
- **Do** add the `glow-primary` hover effect on primary CTA buttons.
- **Don't** use pure black (`#000`) or pure white (`#fff`) as backgrounds — always use the theme's `background` and `foreground` tokens.
- **Don't** mix hardcoded hex colours in components — always reference CSS custom properties or Tailwind semantic classes.
- **Don't** use the status colours for anything other than workforce status indicators.
- **Don't** use shadows alone for depth — combine with backdrop blur for the glassmorphism effect.
- **Don't** apply light/dark mode colours manually — rely on the `.dark` class variant and CSS custom properties to handle mode switching.
