# Frontend Folder Structure Specification

## 1. Goal

This document defines the exact baseline folder structure for rebuilding Kireiku with Next.js App Router. The goal is to prevent file sprawl, unclear ownership, and mixed concerns between public pages, admin pages, shared UI, and data logic.

This structure is optimized for:

- dual-surface UI
- App Router route groups
- permission-aware admin pages
- reusable shared components
- predictable data and state organization

## 2. Root Structure

```text
kireiku-app/
├── public/
├── src/
├── docs/
├── tests/
│   └── e2e/
├── .env.local
├── middleware.ts
├── next.config.ts
├── package.json
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
├── components.json
└── vercel.json
```

## 3. `src/` Structure

```text
src/
├── app/
├── components/
├── hooks/
├── lib/
├── stores/
├── types/
├── constants/
└── styles/
```

## 4. App Router Structure

```text
src/app/
├── layout.tsx
├── globals.css
├── providers.tsx
├── not-found.tsx
├── (public)/
│   ├── layout.tsx
│   └── page.tsx
├── admin/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   └── login/
│   │       └── page.tsx
│   └── (panel)/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── dashboard/
│       │   └── page.tsx
│       ├── tracker/
│       │   └── page.tsx
│       ├── absensi/
│       │   └── page.tsx
│       ├── records/
│       │   └── page.tsx
│       ├── users/
│       │   └── page.tsx
│       ├── content/
│       │   └── page.tsx
│       ├── access-manager/
│       │   └── page.tsx
│       └── profile/
│           ├── page.tsx
│           └── [userId]/
│               └── page.tsx
└── api/
    ├── tracker/
    │   ├── route.ts
    │   ├── action/
    │   │   └── route.ts
    │   └── reset/
    │       └── route.ts
    ├── absensi/
    │   ├── route.ts
    │   └── cell/
    │       └── route.ts
    ├── records/
    │   ├── route.ts
    │   ├── [userId]/
    │   │   └── route.ts
    │   └── reset/
    │       └── route.ts
    ├── users/
    │   ├── route.ts
    │   └── [userId]/
    │       └── route.ts
    ├── sp/
    │   ├── route.ts
    │   ├── user/
    │   │   └── [userId]/
    │   │       └── route.ts
    │   └── [spId]/
    │       └── revoke/
    │           └── route.ts
    ├── access-permissions/
    │   ├── route.ts
    │   └── reset/
    │       └── route.ts
    ├── landing-content/
    │   └── route.ts
    ├── testimonials/
    │   ├── route.ts
    │   └── [id]/
    │       └── route.ts
    ├── services/
    │   ├── route.ts
    │   └── [id]/
    │       └── route.ts
    ├── auth/
    │   └── callback/
    │       └── route.ts
    └── auto-trigger/
        └── route.ts
```

### API Route Method Reference

| Path | Methods | Auth | Description |
| --- | --- | --- | --- |
| `/api/tracker` | GET | Staff JWT | Tracker grid data with filters |
| `/api/tracker/action` | POST | Staff JWT | Manual status change action |
| `/api/tracker/reset` | POST | Owner JWT | Mass reset all worker statuses |
| `/api/absensi` | GET | Staff JWT | Monthly attendance grid |
| `/api/absensi/cell` | PATCH | Staff JWT | Edit single attendance cell |
| `/api/records` | GET | Staff JWT | Monthly records summary |
| `/api/records/[userId]` | PATCH | Staff JWT | Edit individual worker record |
| `/api/records/reset` | POST | Owner JWT | Reset all records for current month |
| `/api/users` | GET, POST | Staff JWT | List workers / Create worker |
| `/api/users/[userId]` | PATCH, DELETE | Staff JWT | Update / Hard delete worker |
| `/api/sp` | POST | Staff JWT | Issue new SP |
| `/api/sp/user/[userId]` | GET | Staff JWT | Get all SPs for a worker |
| `/api/sp/[spId]/revoke` | PATCH | Staff JWT | Revoke active SP |
| `/api/access-permissions` | GET, PATCH | Staff JWT | Get / Update permission matrix |
| `/api/access-permissions/reset` | POST | Owner JWT | Reset to default permissions |
| `/api/landing-content` | GET, PATCH | GET: public / PATCH: Staff JWT | Landing page CMS content |
| `/api/testimonials` | GET, POST | GET: public / POST: Staff JWT | List / Create testimonials |
| `/api/testimonials/[id]` | PATCH, DELETE | Staff JWT | Update / Delete testimonial |
| `/api/services` | GET, POST | GET: public / POST: Staff JWT | List / Create services |
| `/api/services/[id]` | PATCH | Staff JWT | Update service |
| `/api/auth/callback` | GET | — | OAuth callback handler |
| `/api/auto-trigger` | GET | CRON_SECRET | Cron engine endpoint |

## 5. Route Group Rules

### `(public)`

Use this route group for the public landing experience only.

Contains:

- landing page layout
- SEO-friendly public page structure
- public-only background treatments

Should not contain:

- staff auth logic
- admin shell logic
- operational components

### `admin/(auth)`

Use this route group for auth pages that should not inherit the admin panel shell.

Contains:

- login page
- auth-specific layout

Should not contain:

- sidebar
- admin header
- panel content wrappers

### `admin/(panel)`

Use this route group for all secured staff pages.

Contains:

- panel layout with sidebar + header + RealtimeConnectionBanner
- page container
- all secured admin routes

## 6. Components Structure

```text
src/components/
├── ui/
├── public/
│   ├── layout/
│   ├── sections/
│   └── shared/
├── admin/
│   ├── layout/
│   ├── dashboard/
│   ├── tracker/
│   ├── absensi/
│   ├── records/
│   ├── users/
│   ├── content/
│   ├── access-manager/
│   └── profile/
└── shared/
    ├── theme/
    ├── feedback/
    ├── status/
    ├── forms/
    ├── data-display/
    └── realtime/
```

## 7. Component Ownership Rules

### `components/ui/`

Only low-level ShadCN/base UI primitives belong here.

Examples:

- button, input, dialog, dropdown-menu, sheet, table, tabs, toast
- badge, avatar, scroll-area, separator, label, skeleton
- alert-dialog, card, popover, tooltip, select, textarea, accordion

Do not place Kireiku-specific business components here.

### `components/public/`

Only public landing components belong here.

Examples:

- `PublicNavbar`, `HeroSection`, `ServicesSection`
- `TestimonialsCarousel`, `FAQAccordion`, `PublicFooter`
- `WhyKireikuSection`, `HowItWorksSection`

### `components/admin/`

Only admin panel components belong here.

Examples:

- `AdminSidebar`, `AdminHeader`, `MobileNavDrawer`
- `TrackerToolbar`, `WorkerCard`, `BreakCountdown`
- `AbsensiGrid`, `RecordsTable`, `UsersTable`
- `ContentTabs`, `PermissionMatrixTable`

### `components/shared/`

Use this for reusable branded/business components used by both surfaces.

Examples:

- `ThemeModeToggle`, `StatusBadge`, `SPIndicator`
- `EmptyState`, `ErrorState`, `LoadingState`
- `LiveClockWIB`, `LiveBadge`, `MonthNavigator`
- `RealtimeConnectionBanner`, `FlashMessage`
- `OverrideWarningBanner`, `VirtualizedGrid`
- shared form field wrappers

## 8. Tracker Component Structure

The tracker is complex enough to deserve its own internal folder structure.

```text
src/components/admin/tracker/
├── TrackerHeader.tsx
├── TrackerToolbar.tsx
├── TrackerGroupTabs.tsx
├── TrackerGrid.tsx
├── WorkerCard.tsx
├── WorkerCardHeader.tsx
├── WorkerCardMetrics.tsx
├── WorkerActionButtons.tsx
├── BreakCountdown.tsx
├── ResetStatusModal.tsx
├── TrackerEmptyState.tsx
└── TrackerErrorBanner.tsx
```

### Tracker Ownership Notes

- `BreakCountdown.tsx` should remain a small client component.
- `StatusBadge`, `SPIndicator`, and `FlexibleBadge` should stay in `components/shared/`, not inside tracker-only folders.
- `WorkerActionButtons.tsx` should not contain permission fetching logic directly. It should receive already-resolved capabilities via props or hooks.

## 9. Lib Structure

```text
src/lib/
├── supabase/
│   ├── client.ts
│   ├── server.ts
│   ├── middleware.ts
│   └── queries/
│       ├── tracker.ts
│       ├── absensi.ts
│       ├── records.ts
│       ├── users.ts
│       ├── sp.ts
│       ├── permissions.ts
│       ├── content.ts
│       ├── testimonials.ts
│       ├── services.ts
│       ├── dashboard.ts
│       └── profile.ts
├── redis/
│   └── client.ts
├── auth/
│   ├── get-session.ts
│   ├── get-permissions.ts
│   ├── redirect-to-first-allowed-page.ts
│   └── guards.ts
├── query/
│   ├── client.ts
│   ├── keys.ts
│   └── helpers.ts
├── state-machine/
│   ├── transitions.ts
│   ├── shift-phase.ts
│   └── validators.ts
├── realtime/
│   ├── channels.ts
│   └── connection-monitor.ts
└── utils/
    ├── cn.ts
    ├── format.ts
    ├── date.ts
    ├── status.ts
    └── validation.ts
```

### Lib Ownership Notes

- `state-machine/transitions.ts` — valid transition table, maps current status → allowed actions.
- `state-machine/shift-phase.ts` — PRE-SHIFT / IN-SHIFT / POST-SHIFT calculation including cross-midnight shifts (D, E, 3, F).
- `state-machine/validators.ts` — validate an action against current status + shift phase + permissions.
- `realtime/channels.ts` — Supabase Realtime channel setup helpers.
- `realtime/connection-monitor.ts` — WebSocket connection state tracking, auto-reconnect logic.
- `supabase/queries/` — each file exports typed query/mutation functions for a specific domain.
- `query/keys.ts` — centralized React Query key factory to prevent key drift.

## 10. Hooks Structure

```text
src/hooks/
├── use-theme-mode.ts
├── use-live-clock.ts
├── use-break-countdown.ts
├── use-tracker-filters.ts
├── use-worker-actions.ts
├── use-realtime-workers.ts
├── use-permissions.ts
├── use-realtime-connection.ts
├── use-optimistic-action.ts
├── use-month-navigator.ts
├── use-flash-message.ts
├── use-absensi-cell.ts
├── use-debounced-search.ts
└── use-intersection-observer.ts
```

### Hook Descriptions

| Hook | Purpose |
| --- | --- |
| `use-theme-mode` | Switch light/dark/system theme |
| `use-live-clock` | WIB clock that ticks every second |
| `use-break-countdown` | Client-side break timer from break fields |
| `use-tracker-filters` | Manage tracker search/filter/sort state |
| `use-worker-actions` | Execute tracker actions with optimistic updates |
| `use-realtime-workers` | Subscribe to worker_status realtime changes |
| `use-permissions` | Read current user's resolved permissions |
| `use-realtime-connection` | Monitor Supabase WebSocket connection state |
| `use-optimistic-action` | Version-aware optimistic mutation with rollback |
| `use-month-navigator` | Shared month navigation (absensi + records) |
| `use-flash-message` | Read URL error params and display flash messages |
| `use-absensi-cell` | Absensi cell edit with sync logic |
| `use-debounced-search` | 300ms debounced search input value |
| `use-intersection-observer` | Trigger animations when elements enter viewport |

### Hook Rules

- Hooks should encapsulate behavior, not page layout.
- Hooks that depend on React Query or Supabase subscriptions should live outside component folders unless they are truly page-local.
- Keep hooks named by behavior, not by visual element.

## 11. Stores Structure

```text
src/stores/
├── ui-store.ts
├── auth-store.ts
└── tracker-ui-store.ts
```

### Store Rules

- Zustand is for UI state only.
- Do not mirror full server collections into stores.
- Query cache remains the source of truth for server-driven lists.

## 12. Types Structure

```text
src/types/
├── auth.ts
├── permissions.ts
├── worker.ts
├── attendance.ts
├── records.ts
├── content.ts
├── api.ts
├── sp.ts
├── services.ts
├── testimonials.ts
├── dashboard.ts
├── status.ts
└── shifts.ts
```

### Type Descriptions

| File | Contents |
| --- | --- |
| `auth.ts` | Session, User, Tier types |
| `permissions.ts` | Permission matrix types, resource/action enums |
| `worker.ts` | WorkerProfile, WorkerStatus, WorkerCard composite |
| `attendance.ts` | Attendance record, cell edit payload |
| `records.ts` | Monthly records, override fields |
| `content.ts` | Landing content, CMS types |
| `api.ts` | API response wrappers, error types, pagination |
| `sp.ts` | SP record, SP form payload |
| `services.ts` | Service entity, form payload |
| `testimonials.ts` | Testimonial entity, form payload |
| `dashboard.ts` | Dashboard summary, chart data, activity feed |
| `status.ts` | Status enum, DisplayStatus, StatusConfig, action types |
| `shifts.ts` | Shift definitions, phase enum, cross-midnight rules |

## 13. Constants Structure

```text
src/constants/
├── routes.ts
├── permissions.ts
├── status.ts
├── theme.ts
├── tracker.ts
├── shifts.ts
├── actions.ts
├── dashboard.ts
└── default-permissions.ts
```

### Constant Descriptions

| File | Contents |
| --- | --- |
| `routes.ts` | Route path constants, admin route list |
| `permissions.ts` | Resource/action string constants |
| `status.ts` | STATUS_CONFIG, SP_CONFIG, tone/color mappings |
| `theme.ts` | Theme mode constants |
| `tracker.ts` | Tracker sort modes, filter defaults |
| `shifts.ts` | Shift reference table (A–F with start/end times, cross-midnight flags, ALPHA expiry rules) |
| `actions.ts` | Action-per-status mapping table from PRD Section 8.3 |
| `dashboard.ts` | Dashboard section configuration |
| `default-permissions.ts` | Default permission matrix from PRD Appendix B |

### Important Rule

`status.ts` is required on day one. Do not scatter status colors across components.

## 14. Styles Structure

```text
src/styles/
├── tokens.css
├── utilities.css
├── animations.css
└── effects.css
```

### Style Rules

- `globals.css` loads the shared style entry points and contains the tweakcn theme template (oklch CSS variables for light/dark mode).
- Tokens should live centrally, not inside page files.
- `effects.css` — reusable glass effect utilities (glassmorphism) dan glow effect utilities (red accent glow, SP3 glow, status glow). Diload dari `globals.css`.
- `animations.css` — shared keyframe animations and transition utilities.
- Utility classes for glass effects, gradients, and glows should be shared and named consistently.

## 15. Testing Structure

```text
src/
├── __tests__/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
└── ...

tests/
└── e2e/
```

### Testing Rules

- Keep unit and integration tests close to source ownership under `src/__tests__`.
- Keep Playwright specs in top-level `tests/e2e`.
- Shared fixtures and mock payloads should be reusable across tracker, dashboard, and auth tests.

## 16. Public Assets Strategy

```text
public/
├── images/
│   ├── brand/
│   ├── services/
│   ├── testimonials/
│   └── og/
├── icons/
└── favicons/
```

### Asset Rules

- put static branded assets in `public/`
- use `next/image` for rendered content assets
- prefer CSS-generated backgrounds for ambient effects
- service icons from DB should still fall back to local generic assets or Lucide icons

## 17. Naming Conventions

### Files

- components: `PascalCase.tsx`
- hooks: `use-kebab-case.ts`
- stores: `kebab-case-store.ts`
- route folders: `kebab-case`
- constants/types/utils: `kebab-case.ts`

### Route Folders

- use `access-manager`, not `accessManager`

## 18. Ownership Boundaries

- page files should assemble screens, not hold long business logic
- business rules live in `lib/`, hooks, or server handlers
- reusable display logic lives in components
- role/permission helpers live in `lib/auth/`
- status config lives in `constants/status.ts`
- state transition logic lives in `lib/state-machine/`
- realtime helpers live in `lib/realtime/`

## 19. Rebuild Order

Use this structure in this order:

1. `src/app/` shell
2. `src/components/ui/` (ShadCN init)
3. `src/styles/` tokens/utilities/effects/animations
4. `src/constants/` (status, shifts, actions, permissions first)
5. `src/types/`
6. `src/lib/` auth/query/supabase/state-machine/realtime setup
7. `src/stores/`
8. `src/hooks/`
9. public components
10. admin layout components
11. page-specific modules like tracker

## 20. Final Rule

If a new file does not clearly belong to one of the folders above, stop and classify it before adding it. That discipline is what keeps the rebuild clean.
