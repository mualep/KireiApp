# Design Token Specification

## 1. Overview
Dokumen ini adalah sumber kebenaran tunggal (Single Source of Truth) untuk semua token visual dalam proyek **Kireiku App**. 

Spesifikasi ini mencakup:
- **Base Theme**: tweakcn theme template menggunakan `oklch` color space.
- **Font Override**: Plus Jakarta Sans (Admin/UI/Body), Orbitron (Hero Headline/Display), JetBrains Mono (Monospace/Timer/ID).
- **Extended Tokens**: Status colors, SP system visual, effects (glassmorphism, glow), dan custom animation timing.
- **File Structure**: Lokasi spesifik setiap token yang dikonfigurasi.

---

## 2. Installation
Sebelum mengaplikasikan token-token di bawah, pastikan dua langkah instalasi ini dijalankan.

### 2.1. Install tweakcn theme base
Jalankan perintah ini di terminal proyek:
```bash
npx shadcn@latest add https://tweakcn.com/r/themes/cmmhf5f5t000604l10lbj1ml0
```

### 2.2. Install Google Fonts
Buka `src/app/layout.tsx` dan tambahkan font configuration berikut untuk inject font variables ke Tailwind:

```tsx
import { Plus_Jakarta_Sans, Orbitron, JetBrains_Mono } from 'next/font/google'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
})

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  variable: '--font-display',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html 
      lang="en" 
      className={`${plusJakartaSans.variable} ${orbitron.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
```

---

## 3. `globals.css` — Complete File
Gunakan kode di bawah ini secara utuh sebagai isi dari `src/app/globals.css`. File ini menggabungkan tweakcn base dengan semua override dan extension Kireiku.

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  /* =========================================
     1. TWEAKCN BASE
     ========================================= */
  --background: oklch(0.9911 0 0);
  --foreground: oklch(0.1763 0.0140 258.3572);
  --card: oklch(1.0000 0 0);
  --card-foreground: oklch(0.1763 0.0140 258.3572);
  --popover: oklch(1.0000 0 0);
  --popover-foreground: oklch(0.1763 0.0140 258.3572);
  --primary: oklch(0.5882 0.2309 28.2936);
  --primary-foreground: oklch(1.0000 0 0);
  --secondary: oklch(0.3303 0.0753 267.1046);
  --secondary-foreground: oklch(1.0000 0 0);
  --muted: oklch(0.9674 0.0013 286.3752);
  --muted-foreground: oklch(0.5517 0.0138 285.9385);
  --accent: oklch(0.8342 0.0950 7.8239);
  --accent-foreground: oklch(0.3155 0.1064 18.1157);
  --destructive: oklch(0.3999 0.1641 29.2339);
  --destructive-foreground: oklch(1.0000 0 0);
  --border: oklch(0.9197 0.0040 286.3202);
  --input: oklch(0.9197 0.0040 286.3202);
  --ring: oklch(0.5882 0.2309 28.2936);
  --chart-1: oklch(0.5882 0.2309 28.2936);
  --chart-2: oklch(0.3303 0.0753 267.1046);
  --chart-3: oklch(0.8342 0.0950 7.8239);
  --chart-4: oklch(0.8948 0.0509 64.2066);
  --chart-5: oklch(0.7118 0.0129 286.0665);
  --sidebar: oklch(1.0000 0 0);
  --sidebar-foreground: oklch(0.3703 0.0119 285.8054);
  --sidebar-primary: oklch(0.5882 0.2309 28.2936);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.9674 0.0013 286.3752);
  --sidebar-accent-foreground: oklch(0.1763 0.0140 258.3572);
  --sidebar-border: oklch(0.9674 0.0013 286.3752);
  --sidebar-ring: oklch(0.5882 0.2309 28.2936);
  
  --radius: 0.75rem;
  
  --shadow-2xs: 0px 4px 10px -2px hsl(0 0% 0% / 0.05);
  --shadow-xs: 0px 4px 10px -2px hsl(0 0% 0% / 0.05);
  --shadow-sm: 0px 4px 10px -2px hsl(0 0% 0% / 0.10), 0px 1px 2px -3px hsl(0 0% 0% / 0.10);
  --shadow: 0px 4px 10px -2px hsl(0 0% 0% / 0.10), 0px 1px 2px -3px hsl(0 0% 0% / 0.10);
  --shadow-md: 0px 4px 10px -2px hsl(0 0% 0% / 0.10), 0px 2px 4px -3px hsl(0 0% 0% / 0.10);
  --shadow-lg: 0px 4px 10px -2px hsl(0 0% 0% / 0.10), 0px 4px 6px -3px hsl(0 0% 0% / 0.10);
  --shadow-xl: 0px 4px 10px -2px hsl(0 0% 0% / 0.10), 0px 8px 10px -3px hsl(0 0% 0% / 0.10);
  --shadow-2xl: 0px 4px 10px -2px hsl(0 0% 0% / 0.25);
  
  --tracking-normal: -0.02em;
  --spacing: 0.25rem;

  /* =========================================
     2. FONT OVERRIDES
     ========================================= */
  --font-sans: 'Plus Jakarta Sans', sans-serif;
  --font-display: 'Orbitron', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* =========================================
     3. STATUS COLORS
     ========================================= */
  --status-on: #22c55e;
  --status-break: #eab308;
  --status-late: #ea580c;
  --status-alpha: #ef4444;
  --status-off: #6b7280;
  --status-cuti: #3b82f6;
  --status-sakit: #f97316;
  --status-pending: #a855f7;
  --status-lembur: #f59e0b;

  --status-on-bg: color-mix(in oklch, var(--status-on) 15%, transparent);
  --status-break-bg: color-mix(in oklch, var(--status-break) 15%, transparent);
  --status-late-bg: color-mix(in oklch, var(--status-late) 15%, transparent);
  --status-alpha-bg: color-mix(in oklch, var(--status-alpha) 15%, transparent);
  --status-off-bg: color-mix(in oklch, var(--status-off) 15%, transparent);
  --status-cuti-bg: color-mix(in oklch, var(--status-cuti) 15%, transparent);
  --status-sakit-bg: color-mix(in oklch, var(--status-sakit) 15%, transparent);
  --status-pending-bg: color-mix(in oklch, var(--status-pending) 15%, transparent);
  --status-lembur-bg: color-mix(in oklch, var(--status-lembur) 15%, transparent);

  /* =========================================
     4. SP LEVEL TOKENS
     ========================================= */
  --sp-0-border: var(--border);
  --sp-1-border: #eab308;
  --sp-2-border: #f97316;
  --sp-3-border: #ef4444;
  --sp-3-glow: 0 0 16px rgba(239, 68, 68, 0.3);
  --sp-3-name-glow: 0 0 8px rgba(239, 68, 68, 0.5);
  --sp-3-name-color: #ef4444;

  /* =========================================
     5. SPACING SCALE
     ========================================= */
  --page-padding-x: 1.5rem;
  --page-padding-x-lg: 2rem;
  --section-gap: 3rem;
  --card-padding: 1.25rem;
  --card-gap: 1rem;

  /* =========================================
     6. EFFECTS TOKENS
     ========================================= */
  --glass-bg-light: rgba(255, 255, 255, 0.08);
  --glass-bg-dark: rgba(255, 255, 255, 0.05);
  --glass-border-light: rgba(255, 255, 255, 0.15);
  --glass-border-dark: rgba(255, 255, 255, 0.08);
  --glass-blur: blur(12px);
  --glass-saturate: saturate(180%);
  --glow-primary: 0 0 80px oklch(0.5882 0.2309 28.2936 / 0.25);
  --glow-primary-lg: 0 0 160px oklch(0.5882 0.2309 28.2936 / 0.15);

  /* =========================================
     7. ANIMATION TOKENS
     ========================================= */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);
}

.dark {
  /* =========================================
     1. TWEAKCN BASE (DARK)
     ========================================= */
  --background: oklch(0.1645 0.0086 274.3354);
  --foreground: oklch(0.9911 0 0);
  --card: oklch(0.2145 0.0184 270.4182);
  --card-foreground: oklch(0.9911 0 0);
  --popover: oklch(0.2145 0.0184 270.4182);
  --popover-foreground: oklch(0.9911 0 0);
  --primary: oklch(0.6453 0.2404 27.3106);
  --primary-foreground: oklch(1.0000 0 0);
  --secondary: oklch(0.2604 0.0471 267.4902);
  --secondary-foreground: oklch(1.0000 0 0);
  --muted: oklch(0.2739 0.0055 286.0326);
  --muted-foreground: oklch(0.7118 0.0129 286.0665);
  --accent: oklch(0.6986 0.1954 14.1660);
  --accent-foreground: oklch(1.0000 0 0);
  --destructive: oklch(0.3958 0.1331 25.7230);
  --destructive-foreground: oklch(1.0000 0 0);
  --border: oklch(0.2739 0.0055 286.0326);
  --input: oklch(0.2739 0.0055 286.0326);
  --ring: oklch(0.6453 0.2404 27.3106);
  --chart-1: oklch(0.6453 0.2404 27.3106);
  --chart-2: oklch(0.3986 0.0946 266.8132);
  --chart-3: oklch(0.7570 0.1485 11.9623);
  --chart-4: oklch(0.7824 0.0829 60.0948);
  --chart-5: oklch(0.4419 0.0146 285.7864);
  --sidebar: oklch(0.1645 0.0086 274.3354);
  --sidebar-foreground: oklch(0.7118 0.0129 286.0665);
  --sidebar-primary: oklch(0.6453 0.2404 27.3106);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.2145 0.0184 270.4182);
  --sidebar-accent-foreground: oklch(0.9911 0 0);
  --sidebar-border: oklch(0.2739 0.0055 286.0326);
  --sidebar-ring: oklch(0.6453 0.2404 27.3106);
  
  --shadow-2xs: 0px 8px 15px -3px hsl(0 0% 0% / 0.20);
  --shadow-xs: 0px 8px 15px -3px hsl(0 0% 0% / 0.20);
  --shadow-sm: 0px 8px 15px -3px hsl(0 0% 0% / 0.40), 0px 1px 2px -4px hsl(0 0% 0% / 0.40);
  --shadow: 0px 8px 15px -3px hsl(0 0% 0% / 0.40), 0px 1px 2px -4px hsl(0 0% 0% / 0.40);
  --shadow-md: 0px 8px 15px -3px hsl(0 0% 0% / 0.40), 0px 2px 4px -4px hsl(0 0% 0% / 0.40);
  --shadow-lg: 0px 8px 15px -3px hsl(0 0% 0% / 0.40), 0px 4px 6px -4px hsl(0 0% 0% / 0.40);
  --shadow-xl: 0px 8px 15px -3px hsl(0 0% 0% / 0.40), 0px 8px 10px -4px hsl(0 0% 0% / 0.40);
  --shadow-2xl: 0px 8px 15px -3px hsl(0 0% 0% / 1.00);

  /* =========================================
     2. FONT OVERRIDES
     ========================================= */
  --font-sans: 'Plus Jakarta Sans', sans-serif;
  --font-display: 'Orbitron', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* =========================================
     3. STATUS COLORS (Identik dengan Light Mode)
     ========================================= */
  --status-on: #22c55e;
  --status-break: #eab308;
  --status-late: #ea580c;
  --status-alpha: #ef4444;
  --status-off: #6b7280;
  --status-cuti: #3b82f6;
  --status-sakit: #f97316;
  --status-pending: #a855f7;
  --status-lembur: #f59e0b;

  --status-on-bg: color-mix(in oklch, var(--status-on) 15%, transparent);
  --status-break-bg: color-mix(in oklch, var(--status-break) 15%, transparent);
  --status-late-bg: color-mix(in oklch, var(--status-late) 15%, transparent);
  --status-alpha-bg: color-mix(in oklch, var(--status-alpha) 15%, transparent);
  --status-off-bg: color-mix(in oklch, var(--status-off) 15%, transparent);
  --status-cuti-bg: color-mix(in oklch, var(--status-cuti) 15%, transparent);
  --status-sakit-bg: color-mix(in oklch, var(--status-sakit) 15%, transparent);
  --status-pending-bg: color-mix(in oklch, var(--status-pending) 15%, transparent);
  --status-lembur-bg: color-mix(in oklch, var(--status-lembur) 15%, transparent);

  /* =========================================
     4. SP LEVEL TOKENS (Identik dengan Light Mode)
     ========================================= */
  --sp-0-border: var(--border);
  --sp-1-border: #eab308;
  --sp-2-border: #f97316;
  --sp-3-border: #ef4444;
  --sp-3-glow: 0 0 16px rgba(239, 68, 68, 0.3);
  --sp-3-name-glow: 0 0 8px rgba(239, 68, 68, 0.5);
  --sp-3-name-color: #ef4444;

  /* =========================================
     5. SPACING SCALE (Identik dengan Light Mode)
     ========================================= */
  --page-padding-x: 1.5rem;
  --page-padding-x-lg: 2rem;
  --section-gap: 3rem;
  --card-padding: 1.25rem;
  --card-gap: 1rem;

  /* =========================================
     6. EFFECTS TOKENS (Identik dengan Light Mode)
     ========================================= */
  --glass-bg-light: rgba(255, 255, 255, 0.08);
  --glass-bg-dark: rgba(255, 255, 255, 0.05);
  --glass-border-light: rgba(255, 255, 255, 0.15);
  --glass-border-dark: rgba(255, 255, 255, 0.08);
  --glass-blur: blur(12px);
  --glass-saturate: saturate(180%);
  --glow-primary: 0 0 80px oklch(0.6453 0.2404 27.3106 / 0.25); /* Adjusted to match dark mode primary oklch */
  --glow-primary-lg: 0 0 160px oklch(0.6453 0.2404 27.3106 / 0.15); /* Adjusted to match dark mode primary oklch */

  /* =========================================
     7. ANIMATION TOKENS (Identik dengan Light Mode)
     ========================================= */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);
  --font-display: var(--font-display);

  --color-status-on: var(--status-on);
  --color-status-break: var(--status-break);
  --color-status-late: var(--status-late);
  --color-status-alpha: var(--status-alpha);
  --color-status-off: var(--status-off);
  --color-status-cuti: var(--status-cuti);
  --color-status-sakit: var(--status-sakit);
  --color-status-pending: var(--status-pending);
  --color-status-lembur: var(--status-lembur);

  --color-status-on-bg: var(--status-on-bg);
  --color-status-break-bg: var(--status-break-bg);
  --color-status-late-bg: var(--status-late-bg);
  --color-status-alpha-bg: var(--status-alpha-bg);
  --color-status-off-bg: var(--status-off-bg);
  --color-status-cuti-bg: var(--status-cuti-bg);
  --color-status-sakit-bg: var(--status-sakit-bg);
  --color-status-pending-bg: var(--status-pending-bg);
  --color-status-lembur-bg: var(--status-lembur-bg);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
  --radius-full: 9999px;

  --shadow-2xs: var(--shadow-2xs);
  --shadow-xs: var(--shadow-xs);
  --shadow-sm: var(--shadow-sm);
  --shadow: var(--shadow);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-xl: var(--shadow-xl);
  --shadow-2xl: var(--shadow-2xl);

  --tracking-tighter: calc(var(--tracking-normal) - 0.05em);
  --tracking-tight: calc(var(--tracking-normal) - 0.025em);
  --tracking-normal: var(--tracking-normal);
  --tracking-wide: calc(var(--tracking-normal) + 0.025em);
  --tracking-wider: calc(var(--tracking-normal) + 0.05em);
  --tracking-widest: calc(var(--tracking-normal) + 0.1em);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    letter-spacing: var(--tracking-normal);
  }
}
```

---

## 4. `tokens.css`
File ini diletakkan di `src/styles/tokens.css`. Ini mendefinisikan utility classes semantik untuk badge, badge background, dan border SP level, agar developer tidak perlu repot mengetik background dan text color untuk status yang sama berulang kali. File ini diload (di-import) dari `globals.css`.

```css
/* src/styles/tokens.css */

/* Status badge utility classes */
.badge-status-on {
  background-color: var(--status-on-bg);
  color: var(--status-on);
  border: 1px solid color-mix(in oklch, var(--status-on) 30%, transparent);
}

.badge-status-break {
  background-color: var(--status-break-bg);
  color: var(--status-break);
  border: 1px solid color-mix(in oklch, var(--status-break) 30%, transparent);
}

.badge-status-late {
  background-color: var(--status-late-bg);
  color: var(--status-late);
  border: 1px solid color-mix(in oklch, var(--status-late) 30%, transparent);
}

.badge-status-alpha {
  background-color: var(--status-alpha-bg);
  color: var(--status-alpha);
  border: 1px solid color-mix(in oklch, var(--status-alpha) 30%, transparent);
}

.badge-status-off {
  background-color: var(--status-off-bg);
  color: var(--status-off);
  border: 1px solid color-mix(in oklch, var(--status-off) 30%, transparent);
}

.badge-status-cuti {
  background-color: var(--status-cuti-bg);
  color: var(--status-cuti);
  border: 1px solid color-mix(in oklch, var(--status-cuti) 30%, transparent);
}

.badge-status-sakit {
  background-color: var(--status-sakit-bg);
  color: var(--status-sakit);
  border: 1px solid color-mix(in oklch, var(--status-sakit) 30%, transparent);
}

.badge-status-pending {
  background-color: var(--status-pending-bg);
  color: var(--status-pending);
  border: 1px solid color-mix(in oklch, var(--status-pending) 30%, transparent);
}

.badge-status-lembur {
  background-color: var(--status-lembur-bg);
  color: var(--status-lembur);
  border: 1px solid color-mix(in oklch, var(--status-lembur) 30%, transparent);
}

/* SP border utility classes */
.sp-border-0 { border-color: var(--sp-0-border); }
.sp-border-1 { border-color: var(--sp-1-border); }
.sp-border-2 { border-color: var(--sp-2-border); }
.sp-border-3 { 
  border-color: var(--sp-3-border); 
  box-shadow: var(--sp-3-glow); 
}
```

---

## 5. `effects.css`
File ini diletakkan di `src/styles/effects.css`. Menggabungkan glassmorphism, glow effect, dan ambient blob utility classes.

```css
/* src/styles/effects.css */

/* Glassmorphism */
.glass {
  background: var(--glass-bg-dark);
  border: 1px solid var(--glass-border-dark);
  backdrop-filter: var(--glass-blur) var(--glass-saturate);
}

/* Light mode override for glass */
.light .glass, [data-theme="light"] .glass {
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border-light);
}

/* Glow effects */
.glow-primary {
  box-shadow: var(--glow-primary);
}

.glow-primary-lg {
  box-shadow: var(--glow-primary-lg);
}

/* SP3 name glow */
.sp3-name {
  color: var(--sp-3-name-color);
  text-shadow: var(--sp-3-name-glow);
}

/* Ambient background blob for Landing Page Hero */
.ambient-blob {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100vw;
  height: 100vh;
  max-width: 1200px;
  background: radial-gradient(
    circle at center,
    oklch(0.5882 0.2309 28.2936 / 0.15) 0%,
    transparent 70%
  );
  filter: blur(80px);
  pointer-events: none;
  z-index: -1;
}

/* Update ambient-blob color in dark mode if needed */
.dark .ambient-blob {
  background: radial-gradient(
    circle at center,
    oklch(0.6453 0.2404 27.3106 / 0.15) 0%,
    transparent 70%
  );
}
```

---

## 6. Typography Scale
Tabel ini menjabarkan seluruh varian tipografi yang dipakai di Kireiku.

| Token | Tailwind Class | Size | Weight | Font | Usage |
|---|---|---|---|---|---|
| `display-2xl` | `text-6xl font-black` | 3.75rem | 900 | Orbitron | Hero headline utama |
| `display-xl` | `text-5xl font-extrabold` | 3rem | 800 | Orbitron | Hero headline sekunder |
| `display-lg` | `text-4xl font-bold` | 2.25rem | 700 | Orbitron | Section heading landing |
| `heading-xl` | `text-3xl font-bold` | 1.875rem | 700 | Plus Jakarta Sans | Page title admin |
| `heading-lg` | `text-2xl font-semibold` | 1.5rem | 600 | Plus Jakarta Sans | Card title, section admin |
| `heading-md` | `text-xl font-semibold` | 1.25rem | 600 | Plus Jakarta Sans | Sub-heading |
| `body-lg` | `text-base font-normal` | 1rem | 400 | Plus Jakarta Sans | Body text utama |
| `body-md` | `text-sm font-normal` | 0.875rem | 400 | Plus Jakarta Sans | UI label, table cell |
| `body-sm` | `text-xs font-normal` | 0.75rem | 400 | Plus Jakarta Sans | Caption, badge label |
| `mono-md` | `text-sm font-mono` | 0.875rem | 400 | JetBrains Mono | Timer, ID, code |
| `mono-sm` | `text-xs font-mono` | 0.75rem | 400 | JetBrains Mono | Timestamp kecil |

> **Catatan Penting**: Font **Orbitron** (`font-display`) HANYA diizinkan untuk landing page (Public Surface). Admin Panel sepenuhnya mengandalkan **Plus Jakarta Sans** (`font-sans`) untuk menjaga readibility tabel dan data, serta **JetBrains Mono** (`font-mono`) untuk angka, ID, dan timer.

---

## 7. Color Palette Reference

### A. ShadCN Semantic Colors (Tweakcn Base)
| Token Name | CSS Variable | Light `oklch` | Dark `oklch` | Usage |
|---|---|---|---|---|
| Background | `--background` | `0.9911 0 0` | `0.1645 0.0086 274.3354` | Main page background |
| Foreground | `--foreground` | `0.1763 0.0140 258.3572` | `0.9911 0 0` | Default text |
| Primary | `--primary` | `0.5882 0.2309 28.2936` | `0.6453 0.2404 27.3106` | Primary CTAs, active states |
| Card | `--card` | `1.0000 0 0` | `0.2145 0.0184 270.4182` | Dashboard/Tracker Cards |
| Border | `--border` | `0.9197 0.0040 286.3202` | `0.2739 0.0055 286.0326` | Card/Table borders |
| Destructive | `--destructive` | `0.3999 0.1641 29.2339` | `0.3958 0.1331 25.7230` | Danger actions, errors |

### B. Status Colors (Kireiku Custom)
| Status | CSS Variable | Hex | Tone | Usage |
|---|---|---|---|---|
| ON | `--status-on` | `#22c55e` | Success | Shift actively running |
| BREAK | `--status-break` | `#eab308` | Attention | Worker on break |
| LATE | `--status-late` | `#ea580c` | Urgent | Late for shift |
| ALPHA | `--status-alpha` | `#ef4444` | Danger | Skipped shift / Alpha |
| OFF | `--status-off` | `#6b7280` | Neutral | Not in shift / Default |
| CUTI | `--status-cuti` | `#3b82f6` | Info | Scheduled leave |
| SAKIT | `--status-sakit` | `#f97316` | Info | Sick leave |
| PENDING | `--status-pending` | `#a855f7` | Info | Pending status |
| LEMBUR | `--status-lembur` | `#f59e0b` | Premium | Overtime status |

### C. SP System Colors
| Level | Border CSS Variable | Hex | Glow | Usage |
|---|---|---|---|---|
| SP0 | `--sp-0-border` | (varies by theme) | None | Default state |
| SP1 | `--sp-1-border` | `#eab308` | None | Warning border |
| SP2 | `--sp-2-border` | `#f97316` | None | Elevated warning |
| SP3 | `--sp-3-border` | `#ef4444` | `--sp-3-glow` | Critical state, applies glow to card |

### D. Chart Colors (Tweakcn Base)
| Chart | CSS Variable | Light `oklch` | Dark `oklch` |
|---|---|---|---|
| Chart 1 | `--chart-1` | `0.5882 0.2309 28.2936` | `0.6453 0.2404 27.3106` |
| Chart 2 | `--chart-2` | `0.3303 0.0753 267.1046` | `0.3986 0.0946 266.8132` |
| Chart 3 | `--chart-3` | `0.8342 0.0950 7.8239` | `0.7570 0.1485 11.9623` |
| Chart 4 | `--chart-4` | `0.8948 0.0509 64.2066` | `0.7824 0.0829 60.0948` |
| Chart 5 | `--chart-5` | `0.7118 0.0129 286.0665` | `0.4419 0.0146 285.7864` |

---

## 8. Animation & Motion Reference

### CSS Transitions
Digunakan dengan Tailwind classes (cth: `transition-all duration-[var(--transition-fast)]`).

| Token | Value | Usage |
|---|---|---|
| `--transition-fast` | `150ms ease` | Hover state, toggle button, minor interactions |
| `--transition-normal` | `250ms ease` | Modal open/close, sidebar expand/collapse |
| `--transition-slow` | `400ms ease` | Page-level transitions, reveal effects |

### Framer Motion Constants (`src/constants/theme.ts`)
Buat file TypeScript untuk mengontrol timing Framer Motion secara tersentralisasi. Gunakan konstanta ini alih-alih hardcoding `duration` di komponen React.

```ts
// src/constants/theme.ts
export const MOTION = {
  // Duration
  duration: {
    fast:   0.15,   // hover, toggle
    normal: 0.25,   // modal open, tab switch
    slow:   0.4,    // page transition, section reveal
    slower: 0.6,    // hero entrance
  },
  // Easing
  ease: {
    default:    [0.4, 0, 0.2, 1],      // material standard
    decelerate: [0, 0, 0.2, 1],        // enter screen
    accelerate: [0.4, 0, 1, 1],        // exit screen
    spring:     { type: 'spring', stiffness: 300, damping: 30 },
    springSnap:  { type: 'spring', stiffness: 500, damping: 40 },
  },
  // Stagger untuk list items
  stagger: {
    fast:   0.05,
    normal: 0.08,
    slow:   0.12,
  },
} as const
```

**Panduan Penggunaan Preset `MOTION`:**
- `duration.fast`: Tombol hover, badge state change, micro-interactions.
- `duration.normal`: Modal open/close, tab content switch, accordion.
- `duration.slow`: Section scroll reveal (landing page), card grid entrance.
- `duration.slower`: Hero entrance sequence (landing page).
- `ease.spring`: Interactive element yang butuh feel "snappy" atau "bouncy".
- `stagger.normal`: List item yang masuk secara bergantian (contoh: barisan `WorkerCard` di Tracker, item `FAQ`).

---

## 9. Component Token Usage Guide
Tabel ini memetakan komponen utama ke token desain yang sesuai, untuk menjaga konsistensi.

| Component | Background | Border | Text | Shadow | Special |
|---|---|---|---|---|---|
| `WorkerCard` | `--card` | `--sp-N-border` | `--card-foreground` | `--shadow-md` | `--sp-3-glow` jika level SP3 |
| `StatusBadge` | `--status-*-bg` | `--status-*` (30% mix) | `--status-*` | — | Harus selalu ada icon status |
| `AdminSidebar` | `--sidebar` | `--sidebar-border` | `--sidebar-foreground` | — | — |
| `AdminSidebar` active item | `--sidebar-accent` | — | `--sidebar-accent-foreground` | — | — |
| `HeroSection` | `transparent` | — | `--foreground` | `--glow-primary` | `ambient-blob` background |
| `RealtimeConnectionBanner` | `--destructive` | — | `--destructive-foreground` | — | Sticky top |
| `BreakCountdown` | — | — | `--status-break` | — | Menggunakan `font-mono` |
| `SPIndicator` (SP3) | — | `--sp-3-border` | `--sp-3-name-color` | `--sp-3-glow` | `--sp-3-name-glow` di teks nama |

---

## 10. Tailwind Config Notes (v4)
Proyek ini berjalan menggunakan **Tailwind CSS v4**.
Sistem ini TIDAK BANYAK bergantung pada `tailwind.config.js` (atau `.ts`). Seluruh registrasi token ditangani melalui CSS `@theme inline` dan CSS Custom Properties (`var(--...)`).

### Cara Mengkonsumsi Custom Token
Karena token sudah didaftarkan di `@theme inline`, utilitas CSS dihasilkan secara otomatis. Anda tidak perlu menggunakan arbitrary bracket (`[]`) kecuali terpaksa.

```html
<!-- BENAR: Menggunakan utility classes hasil @theme inline (disarankan) -->
<span class="text-status-on bg-status-on-bg">ON</span>

<!-- BENAR: Menggunakan utility dari tokens.css (Paling disarankan) -->
<span class="badge-status-on">ON</span>

<!-- KURANG DISARANKAN: Menggunakan arbitrary value (sulit di-maintain jika berulang) -->
<span class="text-[var(--status-on)] bg-[var(--status-on-bg)]">ON</span>
```

Gunakan arbitrary value `[var(--token)]` HANYA jika Anda ingin memanipulasi property yang tidak memiliki relasi warna secara eksplisit di `@theme inline`, atau jika property belum ter-map sempurna oleh update versi Tailwind.

---

## 11. Dark Mode Strategy
Kireiku menerapkan spesifikasi mode gelap via atribut `class` (class-based mode), BUKAN media query sistem operasi bawaan.

### Prinsip Utama:
1. **Class Trigger**: Menggunakan `class="dark"` pada tag `<html>`.
2. **Override Mechanism**: `@custom-variant dark (&:is(.dark *));` pada Tailwind v4 otomatis mengizinkan `dark:` modifier class.
3. **Status Color Consistency**: Token `status-*` dan `sp-*` (kuning, oranye, merah, hijau, dsb.) TIDAK BERUBAH antar mode. Identitas darurat/sukses tetap konsisten di latar gelap maupun terang.
4. **Theme Provider**: Next Themes (`next-themes`) men-toggle class tersebut dan melakukan sinkronisasi dengan localStorage.

### Konfigurasi Provider (`src/app/providers.tsx`)
```tsx
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
```

---

## 12. File Summary
Ringkasan file untuk memastikan di mana setiap bagian disematkan:

| File | Location | Contains |
|---|---|---|
| `globals.css` | `src/app/` | Tweakcn base + font override + status tokens + all custom custom vars |
| `tokens.css` | `src/styles/` | Utility classes untuk mempercepat styling status badge, SP borders |
| `effects.css` | `src/styles/` | Utility class terfokus pada Glassmorphism, glow effect, ambient background |
| `animations.css` | `src/styles/` | Reusable CSS keyframe animations (jika tidak menggunakan framer-motion) |
| `theme.ts` | `src/constants/` | `MOTION` constants configuration untuk sinkronisasi Framer Motion parameters |
| `status.ts` | `src/constants/` | `STATUS_CONFIG` dan `SP_CONFIG` (TypeScript object lookup logic) |
