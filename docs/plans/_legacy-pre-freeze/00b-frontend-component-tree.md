# Frontend Component Tree Specification

## 1. Goal

This document defines the component architecture for the Kireiku frontend rebuild.

It answers five implementation questions before coding starts:

1. What components exist on each page?
2. Which components are shared, and which are page-specific?
3. Which components must be Server Components vs Client Components?
4. What are the props contracts for critical reusable components?
5. Which components should be reused across multiple pages?

This document follows the folder structure defined in [00a-frontend-folder-structure.md](file:///Users/mualifwijaya/kireiku-app/docs/plans/00a-frontend-folder-structure.md) and the product rules in [00-frontend-master-plan.md](file:///Users/mualifwijaya/kireiku-app/docs/plans/00-frontend-master-plan.md).

## 2. Component Architecture Principles

- Page files should assemble screens, not contain long business logic.
- Shared visual language belongs in `components/shared/`.
- Page-specific modules belong in `components/public/` or `components/admin/`.
- Server Components should be the default unless interactivity requires a Client Component.
- Realtime subscriptions, forms, local timers, filters, and modal state belong in Client Components.
- Data fetching should prefer server entry + client islands for interactive regions.
- Status, SP visuals, and empty/error states must be shared across the admin surface.
- Derived status resolution (LATE, ALPHA) must happen consistently via shared utility.

## 3. App-Wide Component Tree

```text
RootApp
├── AppProviders
│   ├── ThemeProvider
│   ├── QueryProvider
│   ├── ToastProvider
│   └── OptionalAuthHydration
├── RootLayout
│   ├── html
│   ├── body
│   └── RouteGroupOutlet
├── PublicLayout
├── AdminAuthLayout
└── AdminPanelLayout
    ├── RealtimeConnectionBanner
    ├── AdminSidebar
    ├── AdminHeader
    ├── MobileNavDrawer
    └── AdminPageContainer
```

## 4. Public Surface Component Tree

### 4.1 Public Layout

```text
PublicLayout
├── PublicBackground
├── ThemeModeToggle
├── PublicContentSlot
└── GlobalToaster
```

### 4.2 Landing Page

```text
LandingPage
├── PublicNavbar
│   ├── BrandMark
│   ├── NavLinks
│   ├── ThemeModeToggle
│   ├── PrimaryCTA
│   └── MobileMenuTrigger
├── HeroSection
│   ├── TrustBadge
│   ├── HeroHeading (Orbitron Bold)
│   ├── HeroSubheading
│   ├── HeroPrimaryCTA
│   ├── HeroSecondaryCTA
│   └── HeroAmbientBackground
├── ServicesSection
│   ├── SectionHeading
│   └── ServiceCardGrid
│       └── ServiceCard
├── WhyKireikuSection
│   ├── SectionHeading
│   ├── StatsGrid
│   │   └── StatCard (with counter animation via IntersectionObserver)
│   └── USPGrid
│       └── USPCard
├── TestimonialsSection
│   ├── SectionHeading
│   ├── TestimonialsCarousel
│   │   └── TestimonialCard
│   └── CarouselControls
├── HowItWorksSection
│   ├── SectionHeading
│   └── StepGrid
│       └── StepCard
├── FAQSection
│   ├── SectionHeading
│   └── FAQAccordion
│       └── FAQItem
└── PublicFooter
    ├── FooterLinks
    ├── SocialLinks
    └── StaffLoginLink
```

## 5. Auth Surface Component Tree

### 5.1 Admin Login Page

```text
AdminLoginPage
├── LoginPageBackground
├── ThemeModeToggle
├── LoginBrandBlock
├── AdminLoginCard
│   ├── LoginTitle
│   ├── LoginSubtitle
│   ├── AdminLoginForm
│   │   ├── EmailField
│   │   ├── PasswordField
│   │   ├── PasswordVisibilityToggle
│   │   ├── InlineErrorBanner
│   │   └── SubmitButton
│   └── BackToWebsiteLink
└── GlobalToaster
```

## 6. Admin Shell Component Tree

### 6.1 Admin Panel Layout

```text
AdminPanelLayout
├── RealtimeConnectionBanner
│   ├── DisconnectedMessage
│   └── ReconnectButton
├── AdminSidebar
│   ├── SidebarBrand
│   ├── SidebarSection
│   │   └── SidebarNavItem (hidden if no view permission)
│   ├── SidebarAccountBlock
│   └── SidebarLogoutButton
├── MobileNavDrawer
│   ├── DrawerHeader
│   ├── DrawerNavList
│   └── DrawerFooter
├── AdminHeader
│   ├── SidebarToggleButton
│   ├── PageContextSlot
│   ├── LiveClockWIB
│   ├── ThemeModeToggle
│   └── ProfileDropdown
└── AdminPageContainer
    ├── FlashMessage (reads URL ?error= params)
    └── PageSlot
```

## 7. Admin Page Component Trees

### 7.1 Dashboard

```text
DashboardPage
├── DashboardPageHeader
│   ├── PageTitle
│   ├── PageDescription
│   ├── LiveBadge
│   ├── LastUpdatedText
│   └── RefreshButton
├── DashboardSummaryGrid
│   └── SummaryCard (per status: ON, LATE, ALPHA, BREAK, OFF, CUTI, SAKIT)
├── DashboardChartsRow
│   ├── StatusDistributionChartCard
│   │   └── RechartsTooltip (count + percentage on hover)
│   └── ActiveShiftsOverviewCard
│       └── ShiftStatusRow
├── RecentActivityCard
│   └── ActivityItem
├── MonthSummaryCard
│   └── MonthMetricRow
├── QuickAccessCard
│   └── QuickAccessLink
├── DashboardEmptyState
└── DashboardErrorState
```

### 7.2 Tracker

```text
TrackerPage
├── TrackerHeader
│   ├── PageTitle
│   ├── PageDescription
│   ├── LiveBadge
│   ├── LastSyncText
│   ├── AutoRefreshIndicator
│   └── ResetStatusButton (Owner only)
├── TrackerToolbar
│   ├── SearchInput (300ms debounce)
│   ├── ShiftFilter (multi-select)
│   ├── StatusFilter (multi-select)
│   ├── RoleFilter (multi-select)
│   └── SortSelect
├── TrackerGroupTabs
│   └── GroupTab
├── VirtualizedWorkerCardGrid (@tanstack/virtual)
│   └── WorkerCard
│       ├── WorkerCardHeader
│       │   ├── WorkerIdentity (avatar + name)
│       │   ├── ShiftChip (hidden if isFlexible)
│       │   ├── FlexibleBadge (shown if isFlexible)
│       │   ├── StatusBadge (resolves derived status)
│       │   └── SPIndicator
│       ├── WorkerCardMetrics
│       │   ├── WorkLateMinsMetric
│       │   ├── AlphaCountMetric
│       │   ├── CutiStockMetric
│       │   ├── SakitDaysMetric
│       │   └── PendingDaysMetric
│       ├── BreakCountdown (only when status=BREAK)
│       └── WorkerActionButtons
│           ├── StartButton
│           ├── SelesaiButton
│           ├── IstirahatButton
│           ├── PauseButton
│           ├── ResumeButton
│           ├── StopButton
│           ├── CutiButton
│           ├── SakitButton
│           ├── PendingButton
│           ├── LemburButton
│           ├── BatalCutiButton
│           ├── BatalSakitButton
│           ├── BatalPendingButton
│           └── BatalLemburButton
├── ResetStatusModal
│   ├── ResetWarning
│   ├── ConfirmActionField (type "RESET")
│   └── ResetConfirmButton
├── TrackerEmptyState
└── TrackerErrorBanner
```

### 7.3 Absensi

```text
AbsensiPage
├── AbsensiHeader
│   ├── PageTitle
│   ├── PageDescription
│   ├── MonthNavigator
│   └── AbsensiToolbar
├── AbsensiFilters
│   ├── SearchInput
│   ├── ShiftFilter
│   └── RoleFilter
├── AbsensiGridCard
│   ├── AbsensiGridHeader
│   ├── AbsensiTable
│   │   ├── WorkerRow
│   │   └── AttendanceCell (color-coded per status)
│   └── HorizontalScrollHint
├── AttendanceEditModal
│   ├── StatusSelector
│   ├── DateContextBanner (past / present / future indicator)
│   ├── SyncImpactPreview (shows effect on records + tracker)
│   ├── OverrideWarningBanner (if field has manual override)
│   ├── NotesField
│   └── ConfirmButton
├── AbsensiEmptyState
└── AbsensiErrorState
```

### 7.4 Records

```text
RecordsPage
├── RecordsHeader
│   ├── PageTitle
│   ├── PageDescription
│   ├── MonthNavigator
│   ├── FilterBar
│   └── ResetRecordsButton (Owner only)
├── RecordsTableCard
│   ├── RecordsTableToolbar
│   └── RecordsTable
│       ├── RecordsTableHeader
│       ├── RecordsTableRow
│       └── SortableColumnHeader
├── EditRecordModal
├── ResetRecordsModal
│   ├── ResetWarning
│   ├── ConfirmActionField (type "RESET RECORDS")
│   └── ResetConfirmButton
├── RecordsEmptyState
└── RecordsErrorState
```

### 7.5 Users

```text
UsersPage
├── UsersHeader
│   ├── PageTitle
│   ├── PageDescription
│   └── AddWorkerButton
├── UsersToolbar
│   ├── SearchInput
│   ├── ShiftFilter
│   ├── RoleFilter
│   ├── SPLevelFilter
│   └── PaginationControls
├── UsersTableCard
│   └── UsersTable
│       ├── UserRow
│       ├── StatusBadge
│       └── SPIndicator
├── AddWorkerModal
├── EditWorkerModal
│   ├── WorkerEditForm
│   │   └── ShiftChangeWarning (when shift is changed)
│   └── ConfirmButton
├── ManageSPModal
├── DeleteWorkerModal
│   ├── FirstConfirmStep (general warning)
│   ├── SecondConfirmStep (input exact worker name)
│   └── CascadeDeleteWarning
├── UsersEmptyState
└── UsersErrorState
```

### 7.6 Content

```text
ContentPage
├── ContentHeader
│   ├── PageTitle
│   ├── PageDescription
│   └── RevalidateHint
├── ContentTabs
│   ├── GeneralTab
│   │   └── GeneralContentForm
│   │       ├── HeroContentFields
│   │       ├── StatsContentFields
│   │       ├── WhyKireikuContentFields
│   │       ├── HowItWorksContentFields
│   │       └── FooterContentFields
│   │           └── OwnerOnlyFieldWrapper (disabled for Admin tier)
│   ├── ServicesTab
│   │   ├── ServicesTable
│   │   └── ServiceFormModal
│   ├── TestimonialsTab
│   │   ├── TestimonialsTable
│   │   └── TestimonialFormModal
│   └── FAQTab
│       ├── FAQList
│       └── FAQFormModal
├── ContentSuccessToast
└── ContentErrorState
```

### 7.7 Access Manager

```text
AccessManagerPage
├── AccessHeader
│   ├── PageTitle
│   ├── PageDescription
│   └── ResetToDefaultButton
├── PermissionMatrixCard
│   ├── PermissionMatrixTable
│   │   ├── ResourceRow
│   │   └── PermissionToggleCell (Owner column always ✓, non-editable)
│   └── PermissionLegend
├── AccessLogCard
│   ├── AccessLogFilters
│   │   ├── ResourceFilter
│   │   ├── UserFilter
│   │   └── DateRangeFilter
│   └── AccessLogTable
│       └── AuditLogEntry
├── ResetPermissionModal
├── AccessEmptyState
└── AccessErrorState
```

### 7.8 Own Profile

```text
OwnProfilePage
├── ProfileHeader
│   ├── AvatarBlock
│   ├── TierBadge
│   ├── EmployeeRoleLabel
│   ├── ShiftInfo
│   └── RealTimeStatusBadge
├── ProfileStatsGrid
│   └── ProfileStatCard (work_late, alpha, cuti_stock this month)
├── ProfileAccountCard
│   ├── DisplayNameForm
│   ├── PasswordForm
│   └── GIDDisplay (read-only)
├── ActiveSPCard
│   ├── SPIndicator
│   └── SPActiveList (active SPs with reason + expiry)
├── ProfileRecordsPreview
│   └── MiniRecordsTable (recent months)
└── SPHistoryTable
```

### 7.9 Worker Profile

```text
WorkerProfilePage
├── ProfileHeader
│   ├── AvatarBlock
│   ├── TierBadge
│   ├── EmployeeRoleLabel
│   ├── ShiftInfo
│   ├── RealTimeStatusBadge
│   └── OwnerAdminActions
│       ├── EditDataButton
│       ├── GiveSPButton
│       ├── NonaktifkanButton (Owner + Admin)
│       └── PecatButton (Owner only)
├── WorkerProfileStatsGrid
├── WorkerInfoCard
├── WorkerSPCard
│   ├── SPIndicator
│   ├── GiveSPButton
│   └── RevokeSPAction (per active SP)
├── WorkerAbsensiPreview
│   └── MiniCalendarAbsensi (current month mini calendar)
├── WorkerRecordsPreview
│   └── MiniRecordsTable (recent months summary)
├── EditWorkerDrawerOrModal
├── GiveSPModal
├── DisableWorkerModal
└── DeleteWorkerModal
    ├── FirstConfirmStep
    ├── SecondConfirmStep (input exact worker name)
    └── CascadeDeleteWarning
```

## 8. Critical Props Interfaces

### 8.1 `StatusBadge`

```ts
export interface StatusBadgeProps {
  status:
    | "ON"
    | "BREAK"
    | "LATE"
    | "ALPHA"
    | "OFF"
    | "CUTI"
    | "SAKIT"
    | "PENDING"
    | "LEMBUR";
  size?: "sm" | "md" | "lg";
  showDot?: boolean;
  showIcon?: boolean;
  className?: string;
}
```

### 8.2 `SPIndicator`

```ts
export interface SPIndicatorProps {
  spCount: 0 | 1 | 2 | 3;
  variant?: "badge" | "border-only" | "full";
  showBadge?: boolean;
  className?: string;
}
```

### 8.3 `WorkerActionButtons`

```ts
export interface WorkerActionButtonsProps {
  workerId: string;
  currentStatus:
    | "ON"
    | "BREAK"
    | "LATE"
    | "ALPHA"
    | "OFF"
    | "CUTI"
    | "SAKIT"
    | "PENDING"
    | "LEMBUR";
  canAct: boolean;
  canResetStatus?: boolean;
  isFlexible?: boolean;
  isSubmitting?: boolean;
  version: number;
  breakStartedAt?: string | null;
  onAction?: (action: WorkerActionType, workerId: string) => void;
}

export type WorkerActionType =
  | "START"
  | "SELESAI"
  | "ISTIRAHAT"
  | "PAUSE"
  | "RESUME"
  | "STOP"
  | "CUTI"
  | "SAKIT"
  | "PENDING"
  | "LEMBUR"
  | "BATAL_CUTI"
  | "BATAL_SAKIT"
  | "BATAL_PENDING"
  | "BATAL_LEMBUR";
```

### 8.4 `WorkerCard`

```ts
export interface WorkerCardProps {
  worker: {
    id: string;
    name: string;
    role: string;
    shiftCode: string;
    shiftLabel: string;
    currentStatus:
      | "ON"
      | "BREAK"
      | "LATE"
      | "ALPHA"
      | "OFF"
      | "CUTI"
      | "SAKIT"
      | "PENDING"
      | "LEMBUR";
    derivedStatus: string | null;
    spCount: 0 | 1 | 2 | 3;
    workLateMinutes: number;
    alphaCount: number;
    cutiStock: number;
    sakitDays?: number;
    pendingDays?: number;
    breakStartedAt?: string | null;
    breakAccumulatedSecs?: number;
    breakTimerRunning?: boolean;
    showCard: boolean;
    isFlexible?: boolean;
    version: number;
  };
  canAct: boolean;
  isSelected?: boolean;
  isUpdating?: boolean;
  onOpenDetail?: (workerId: string) => void;
  onAction?: (action: WorkerActionType, workerId: string) => void;
}
```

### 8.5 `RealtimeConnectionBanner`

```ts
export interface RealtimeConnectionBannerProps {
  isConnected: boolean;
  onReconnect: () => void;
  className?: string;
}
```

### 8.6 `MonthNavigator`

```ts
export interface MonthNavigatorProps {
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
  minMonth?: Date;
  maxMonth?: Date;
  className?: string;
}
```

### 8.7 `AttendanceEditModal`

```ts
export interface AttendanceEditModalProps {
  open: boolean;
  onClose: () => void;
  workerId: string;
  workerName: string;
  date: string;
  currentStatus: string | null;
  dateContext: "past" | "present" | "future";
  hasOverride: boolean;
  onSave: (payload: AttendanceCellEditPayload) => void;
}
```

### 8.8 `FlashMessage`

```ts
export interface FlashMessageProps {
  paramKey?: string; // default "error"
  messages?: Record<string, string>;
  className?: string;
}
```

## 9. Client vs Server Component Boundary

Server should be default. Client should be explicit.

### 9.1 Boundary Rules

- Use Server Components for:
  - page entry composition
  - initial data fetch wrappers
  - non-interactive section composition
  - SEO-sensitive public content
- Use Client Components for:
  - forms
  - local filters
  - dropdowns/tabs with local state
  - realtime subscriptions
  - timers
  - optimistic action handlers
  - modal/dialog state
  - connection monitoring

### 9.2 Boundary Table

| Component | Type | Reason |
| --- | --- | --- |
| `src/app/(public)/page.tsx` | Server | SEO-first landing assembly |
| `PublicNavbar` | Client | sticky nav, mobile menu, scroll spy, theme toggle |
| `HeroSection` | Server | mostly presentational |
| `ServicesSection` | Server | data-driven but non-interactive |
| `WhyKireikuSection` | Client | counter animation with IntersectionObserver |
| `TestimonialsCarousel` | Client | autoplay, navigation, drag interaction |
| `FAQAccordion` | Client | expand/collapse interaction |
| `src/app/admin/(auth)/login/page.tsx` | Server wrapper | route entry and redirect handling |
| `AdminLoginForm` | Client | form state, validation, submit |
| `src/app/admin/(panel)/layout.tsx` | Server | auth-aware shell assembly |
| `RealtimeConnectionBanner` | Client | monitors WebSocket state |
| `FlashMessage` | Client | reads URL params, displays toast |
| `AdminSidebar` | Client | collapse state, mobile behavior, active nav |
| `AdminHeader` | Client | mobile drawer trigger, profile dropdown, live clock |
| `src/app/admin/(panel)/dashboard/page.tsx` | Server wrapper | initial fetch and shell composition |
| `DashboardSummaryGrid` | Client | live refresh and reactive updates |
| `StatusDistributionChartCard` | Client | Recharts chart interactivity |
| `ActiveShiftsOverviewCard` | Client | live refresh |
| `RecentActivityCard` | Client | live feed updates |
| `MonthSummaryCard` | Client | reactive data |
| `QuickAccessCard` | Server | static links |
| `src/app/admin/(panel)/tracker/page.tsx` | Server wrapper | initial fetch bootstrap |
| `TrackerToolbar` | Client | search/filter/sort state |
| `TrackerGroupTabs` | Client | local tab interaction |
| `VirtualizedWorkerCardGrid` | Client | @tanstack/virtual + realtime patching |
| `WorkerCard` | Client | action buttons, local status updates |
| `BreakCountdown` | Client | timer with setInterval |
| `ResetStatusModal` | Client | dialog state and form confirm |
| `MonthNavigator` | Client | local state navigation |
| `AbsensiTable` | Client | grid scrolling and cell interaction |
| `AttendanceEditModal` | Client | modal form with sync preview |
| `DateContextBanner` | Client | computed from date comparison |
| `SyncImpactPreview` | Client | computed preview |
| `OverrideWarningBanner` | Client | conditional display |
| `RecordsTable` | Client | sorting, filtering, row interaction |
| `UsersTable` | Client | table actions and row actions |
| `ContentTabs` | Client | tab state and CRUD forms |
| `OwnerOnlyFieldWrapper` | Client | tier-based disabled state |
| `PermissionMatrixTable` | Client | toggles and immediate updates |
| `AccessLogTable` | Client | filtering and pagination |
| `ProfileAccountCard` | Client | editable profile forms |
| `MiniCalendarAbsensi` | Client | interactive calendar |
| `FlexibleBadge` | Server | simple display component |
| `AuditLogEntry` | Server | simple display component |

## 10. Shared Component Catalog

### 10.1 Theme

| Component | Purpose |
| --- | --- |
| `ThemeModeToggle` | switch light / dark / system |
| `ThemeModePill` | segmented desktop version of theme switcher |

### 10.2 Status And Identity

| Component | Purpose |
| --- | --- |
| `StatusBadge` | canonical worker status display |
| `SPIndicator` | SP border/badge visual system |
| `TierBadge` | role/tier label display |
| `ShiftChip` | shift code and shift label badge |
| `FlexibleBadge` | badge for flexible workers (replaces ShiftChip) |

### 10.3 Feedback States

| Component | Purpose |
| --- | --- |
| `EmptyState` | standard empty-state block |
| `ErrorState` | reusable error-state block |
| `LoadingState` | shared loading placeholder wrapper |
| `SectionSkeleton` | generic card/table/page skeleton |
| `InlineErrorBanner` | compact inline error messaging |
| `SuccessToastContent` | toast body pattern for CRUD success |
| `FlashMessage` | URL param flash message display |
| `OverrideWarningBanner` | warning when field has manual override |

### 10.4 Time And Realtime

| Component | Purpose |
| --- | --- |
| `LiveClockWIB` | shared WIB clock |
| `LastUpdatedText` | shared "last updated" label |
| `LiveBadge` | live/realtime indicator |
| `BreakCountdown` | reusable break timer display |
| `RealtimeConnectionBanner` | disconnection banner + reconnect |

### 10.5 Forms

| Component | Purpose |
| --- | --- |
| `FormField` | RHF-aware field wrapper |
| `FormSection` | grouped form layout section |
| `ConfirmActionField` | text-confirm input for destructive actions |
| `PasswordField` | shared password input with visibility toggle |

### 10.6 Data Display

| Component | Purpose |
| --- | --- |
| `PageHeader` | title + description + action slot |
| `FilterBar` | standard filter area container |
| `MetricChip` | compact metric badge |
| `PaginationControls` | shared paging control |
| `SearchInput` | standard debounced search field (300ms) |
| `MonthNavigator` | shared month prev/next navigation |
| `VirtualizedGrid` | @tanstack/virtual wrapper for large lists |
| `AuditLogEntry` | shared audit log display item |

## 11. Component Reuse Map

| Component | Landing | Login | Dashboard | Tracker | Absensi | Records | Users | Content | Access | Profile |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ThemeModeToggle` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `PageHeader` | No | No | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `StatusBadge` | No | No | Yes | Yes | Yes | Yes | Yes | No | No | Yes |
| `SPIndicator` | No | No | No | Yes | No | No | Yes | No | No | Yes |
| `FlexibleBadge` | No | No | No | Yes | No | No | Yes | No | No | Yes |
| `LiveClockWIB` | No | No | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `LiveBadge` | No | No | Yes | Yes | No | No | No | No | No | No |
| `MonthNavigator` | No | No | No | No | Yes | Yes | No | No | No | No |
| `EmptyState` | Limited | No | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `ErrorState` | Limited | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `SearchInput` | No | No | No | Yes | Yes | Yes | Yes | No | Yes | No |
| `FilterBar` | No | No | No | Yes | Yes | Yes | Yes | No | Yes | No |
| `ConfirmActionField` | No | No | No | Yes | No | Yes | Yes | No | Yes | Yes |
| `PasswordField` | No | Yes | No | No | No | No | No | No | No | Yes |
| `RealtimeConnectionBanner` | No | No | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `FlashMessage` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `OverrideWarningBanner` | No | No | No | No | Yes | Yes | No | No | No | No |
| `VirtualizedGrid` | No | No | No | Yes | No | No | No | No | No | No |
| `AuditLogEntry` | No | No | No | No | No | No | No | No | Yes | No |

## 12. Reuse Rules

- If a component appears in three or more pages, it should strongly be considered for `components/shared/`.
- If a component contains status color logic, it should not be duplicated page-by-page.
- If a component uses the same confirmation pattern as another page, reuse the shared form/confirmation component instead of rebuilding it.
- Tracker-specific composition can stay under `components/admin/tracker/`, but identity/status/timer primitives should stay shared.
- Derived status resolution must use a single shared utility — never inline the derivation logic in individual components.

## 13. Implementation Notes

- `page.tsx` files should mostly compose sections and pass data into page modules.
- Avoid putting modal definitions inline in page files once they become substantial.
- The tracker should be assembled from small focused modules because it will grow fastest.
- Shared component props should stay stable even if page internals change.
- Favor "server wrapper + client interactive island" over turning whole routes into client pages.
- `RealtimeConnectionBanner` sits in the admin panel layout so it covers all admin pages automatically.
- `FlashMessage` reads URL params on mount, displays toast, then cleans the URL.
- `VirtualizedWorkerCardGrid` wraps `@tanstack/virtual` to render only visible worker cards.

## 14. Build Order Recommendation

Build components in this order:

1. shared shell pieces (layouts, providers)
2. shared status/time/form/feedback primitives
3. public sections (with Framer Motion animations)
4. admin layout (sidebar, header, connection banner)
5. dashboard page modules (summary, charts, activity)
6. tracker page modules (cards, actions, countdown, virtualization)
7. remaining admin data pages (absensi, records, users, content, access manager, profile)
8. modal/confirmation components across all pages

The tracker tree should be implemented early because it pressure-tests almost every architectural decision in the system.
