# School Platform — React Native Mobile App (Phase A)

This is the **React Native (Expo) mobile client** for the same School Management
Platform whose backend lives in the sibling `server/` folder. It is a pure
client — all data, auth, RBAC, and business logic remain on the server.

## What this app does (Phase A + B)

### Phase A — Student portal ✅
- Sign in with **email or CNIC** (parents use CNIC `42101-1234567-8`)
- Token auto-refresh on 401 (silent retry once, then force logout)
- Tokens stored in `expo-secure-store` (Keychain/Keystore), never AsyncStorage
- Role-based routing (Student → 7 tabs, Parent → 7 tabs)
- Five Student tabs: Home, Attendance, Classes (Jitsi via WebView), Work, Results
- Bottom-tab "More": Inbox (notifications) + Profile + Logout
- Pull-to-refresh on every list screen
- Native push registration (ExponentPushToken → backend `/api/push/register-device`)
- Live classes open Jitsi in a WebView (no native Jitsi SDK)

### Phase B — Parent portal ✅
- **CNIC login** (primary path for parents — `42101-1234567-8`)
- **Multi-child support** via `ChildPicker` — horizontal chip switcher
- **Home dashboard** — list of all linked children with per-child summary cards (attendance %, results %, unpaid count)
- **Attendance tab** — recent days + overall % per child, color-coded status badges
- **Results tab** — subject-wise marks + overall % + grade per child
- **Fees tab** — list of challans with Paid/Unpaid/Overdue badges + PKR amounts
- **Feedback tab** — list of evaluation forms to acknowledge (full form UI is Phase E)
- **Inbox + Profile** — shared with Phase A
- Tap a child's Attendance/Results/Fees button on Home → deep-links to that tab with `studentId` pre-selected

### Phase C — Teacher portal ✅
- **Dashboard** — today overview + quick actions ("Mark attendance", "Start live class", "Upload results")
- **Mark attendance** — pick class+section from your assignments, default-everyone-present, tap to cycle status, save all at once
- **My attendance** — view your own record (Phase E adds check-in / check-out buttons)
- **Live classes** — schedule + join via Jitsi WebView (tap "Join now" when status=live)
- **Results upload** — bulk marks for a class+subject+term, numeric input, auto-derived A/B/C/D/F grade
- **Remarks** — pick class + student, write a remark with category (general/praise/concern/academic) and visibility (parent/internal)
- **Inbox + Profile** — shared from Phase A
- Same auth + token refresh + secure storage flow as Phase A/B

## What's coming next (Phase D+)

- Phase D: Admin / Coordinator / Accountant / Operator / Alumni (read-heavy mobile views)
- Phase E: Camera + file picker flows (`expo-image-picker`, `expo-document-picker`); full quiz-taking UI; full evaluation form UI; teacher self-check-in / check-out
- Phase F: Offline cache + retry queues (TanStack Query handles most automatically)
- Phase G: EAS Build for production distribution

## Quick start

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo`
- Expo Go app on your phone (iOS App Store / Play Store), OR
- iOS Simulator (macOS + Xcode), OR
- Android emulator (Android Studio)

### Setup

```bash
cd mobile
npm install
cp .env.example .env       # edit EXPO_PUBLIC_API_URL
npx expo start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Press `w` for web (limited — no SecureStore, no native push)
- Or scan the QR code with Expo Go

### Configure the backend URL

Set `EXPO_PUBLIC_API_URL` to where the API server is reachable from your device:

| Where you're running | EXPO_PUBLIC_API_URL |
|---|---|
| iOS Simulator (Mac) | `http://localhost:4000` |
| Android Emulator | `http://10.0.2.2:4000` (host's localhost) |
| Real device on same Wi-Fi | `http://<your-mac-ip>:4000` |
| Production | `https://api.yourschool.com` |

### Demo accounts (same as backend)

Password for all: `Password123!`

| Role | Identifier |
|---|---|
| Admin | `admin@school.test` |
| Coordinator | `coord@school.test` |
| Teacher | `teacher@school.test` |
| Student | `student@school.test` |
| Parent | `42101-1234567-8` (CNIC) |
| Accountant | `accounts@school.test` |
| Operator | `operator@school.test` |
| Alumni | `alumni@school.test` |

## File layout

```
mobile/
├── app.json              Expo config (icons, plugins, permissions)
├── eas.json              EAS Build config
├── App.tsx               Root component (providers + navigator)
├── index.ts              registerRootComponent entry
├── src/
│   ├── config/
│   │   ├── env.ts          Reads EXPO_PUBLIC_API_URL
│   │   └── theme.ts        Colors/spacing matching web
│   ├── api/
│   │   ├── client.ts        axios + auto-refresh interceptor
│   │   ├── clientBare.ts    Unauthenticated axios (for login)
│   │   ├── auth.ts          login, logout, me, dashboardPathFor
│   │   ├── student.ts       All /api/student/* wrappers
│   │   └── push.ts          registerDevice/unregisterDevice
│   ├── auth/
│   │   └── SessionContext.tsx  SessionProvider + useSession hook
│   ├── navigation/
│   │   ├── RootNavigator.tsx      login vs role-tabs (Student / Parent / Teacher / Other)
│   │   ├── StudentTabBar.tsx      7 bottom tabs (Student)
│   │   ├── ParentTabBar.tsx       7 bottom tabs (Parent)
│   │   └── TeacherTabBar.tsx      7 bottom tabs (Teacher)
│   ├── components/
│   │   ├── Screen.tsx         SafeArea + padding + pull-to-refresh
│   │   ├── Card.tsx           White card with title/hint
│   │   ├── Button.tsx         Primary/secondary/danger
│   │   ├── TextField.tsx      Labeled input with error
│   │   ├── EmptyState.tsx     icon + title + hint
│   │   ├── ErrorBanner.tsx    Inline error with retry
│   │   ├── ChildPicker.tsx    Horizontal chip switcher for multi-child parents
│   │   └── RosterPicker.tsx   Horizontal chip switcher for teacher assignments
│   ├── screens/
│   │   ├── auth/LoginScreen.tsx
│   │   ├── student/
│   │   │   ├── StudentDashboardScreen.tsx
│   │   │   ├── StudentAttendanceScreen.tsx
│   │   │   ├── StudentResultsScreen.tsx
│   │   │   ├── StudentAssignmentsScreen.tsx
│   │   │   └── StudentLiveClassesScreen.tsx
│   │   ├── parent/
│   │   │   ├── ParentDashboardScreen.tsx       children list + per-child summary cards
│   │   │   ├── ParentAttendanceScreen.tsx      per-child attendance + ChildPicker
│   │   │   ├── ParentResultsScreen.tsx         per-child results + ChildPicker
│   │   │   ├── ParentFeesScreen.tsx            per-child challans + ChildPicker
│   │   │   └── ParentEvaluationsScreen.tsx     feedback forms to acknowledge
│   │   ├── teacher/
│   │   │   ├── TeacherDashboardScreen.tsx      today overview + quick actions
│   │   │   ├── TeacherAttendanceScreen.tsx     bulk mark attendance for a class
│   │   │   ├── TeacherLiveClassesScreen.tsx    live classes + join via Jitsi
│   │   │   ├── TeacherResultsScreen.tsx        bulk upload marks with auto grade
│   │   │   └── TeacherRemarksScreen.tsx        add/view student remarks
│   │   └── shared/
│   │       ├── NotificationsScreen.tsx
│   │       ├── ProfileScreen.tsx
│   │       └── WebViewScreen.tsx
│   └── push/
│       └── notifications.ts  Expo push + backend register
└── docs/
    ├── README.md
    └── SETUP.md
```

## Architecture notes

- **No business logic in the app.** Every endpoint used by the app exists in the
  server already. The mobile code is purely a typed view layer + auth/session.
- **No new APIs were created except one.** `/api/push/register-device` is the
  single additive backend endpoint added for native push tokens. All other
  endpoints are reused as-is.
- **TanStack Query** handles caching + automatic retries. Pull-to-refresh
  invalidates queries.
- **Auto-refresh interceptor**: on a 401, we POST `/api/auth/refresh` once, store
  the new pair in SecureStore, retry the original request. If refresh fails,
  the SessionProvider clears state and RootNavigator bounces the user to Login.

## Building for distribution

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview    # internal APK
eas build -p ios --profile preview        # internal simulator build
eas submit -p ios                         # once ready for App Store
```

## Phase A acceptance — done

- [x] App launches on iOS Simulator / Android emulator / real device via Expo Go
- [x] Login screen accepts email OR CNIC, persists session in SecureStore
- [x] Token auto-refresh on 401 with retry; logout on refresh failure
- [x] Student dashboard renders live data from `/api/student/dashboard`
- [x] Attendance, Results, Assignments, Live Classes tabs all fetch real data
- [x] Pull-to-refresh works on every list screen
- [x] Live Class tap → opens Jitsi WebView
- [x] App connects to backend at `EXPO_PUBLIC_API_URL`
- [x] Bottom-tab navigation per role (Student in Phase A; others in B+)
- [x] Notifications inbox tab + mark-as-read
- [x] Profile + Logout
- [x] Native push registration wired to `/api/push/register-device`
