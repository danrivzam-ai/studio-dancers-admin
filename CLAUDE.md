# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Dev server (Vite)
npm run build      # Production build
npm run lint       # ESLint
npm run preview    # Preview production build locally
```

No test suite exists. Verification is done by running `npm run dev` and testing in browser.

## Multi-App Architecture

This is a **single Vite build** that serves multiple apps via URL query params, routed in `src/main.jsx`:

| URL param | App rendered | Auth |
|---|---|---|
| _(none)_ | `App.jsx` — Admin panel | Supabase Auth |
| `?recepcion` | `RecepcionApp` | Custom username/password (receptionists table) |
| `?portal` | `ClientPortalApp` — Student portal | Custom cedula/phone4 (RPC) |
| `?instructora` | `InstructoraApp` | Custom session token (RPC) |
| `?aliados` | `LandingPage` | Public |

**Critical:** The portal and instructora apps use the Supabase **anon key** without a Supabase Auth session. RLS policies must account for this — `authenticated` policies won't apply there. Portal actions go through `SECURITY DEFINER` RPCs (e.g., `rpc_client_login`, `rpc_client_submit_transfer`).

## Data Layer Pattern

All data access is in `src/hooks/use*.js`. Each hook returns state + async mutation functions. Mutations follow:
```js
return { success: true, data }   // or
return { success: false, error: 'message' }
```

Always use `try/catch/finally` with a `loading` state. Always call `.select()` after `.insert()` / `.update()` and `.single()` for single rows.

**Key hooks:**
- `useStudents` — core CRUD + `registerPayment`, `reactivateCycle`, `pauseStudent`
- `useAuth` — Supabase Auth + role detection from `user_roles` table. Loading is set to `false` before role fetch (role fetched in background to avoid blocking)
- `useItems` — courses and products (dynamic DB + static hardcoded). Calls `setDynamicCourses()` to update the global registry in `src/lib/courses.js`
- `useTransferRequests` — Realtime subscription for portal transfer uploads; fires Telegram notification on INSERT

## Course & Pricing System

Courses are defined **statically** in `src/lib/courses.js` (COURSES, NINAS, DANCE_CAMP arrays) plus **dynamically** from DB via `useItems`. `getCourseById()` checks dynamic first, then static.

Course `priceType` drives all payment logic:
- `'mes'` — monthly recurring with `classesPerCycle` class count
- `'paquete'` — class bundle with `classesPerPackage`
- `'programa'` — fixed total price (Dance Camp), supports partial payments

**Grandfathered pricing:** `registerPayment` uses `student.monthly_fee` (not `course.price`) for `mes`/`paquete` courses. This preserves individual student rates when course price changes. `StudentDetail` shows an amber "Tarifa histórica" badge when `student.monthly_fee < course.price`.

## Payment Status Logic

**Never use** `student.payment_status` (raw DB field) for UI decisions. Always use `getPaymentStatus(student, course)` from `src/lib/dateUtils.js` which computes the real status from balance, dates, and class count.

Adult course cycle completion is determined by **class count** (`getCycleInfo().classesPassed >= classesTotal`), not just the `next_payment_date`. This matters for the "Lista para renovar" (sky blue) state.

All EC timezone comparisons use `parseISO(getTodayEC())` — never `new Date()` directly, which shifts after 7PM Ecuador time (UTC-5).

## Date Utilities (`src/lib/dateUtils.js`)

- `getTodayEC()` → `'yyyy-MM-dd'` string in Ecuador timezone
- `getNowEC()` → full Date object in Ecuador time
- `toNoonLocal(dateStr)` → parses any Supabase date format at noon local to avoid UTC midnight day-shift bug
- `getDaysUntilDue(student, course)` → returns `{ days, status, label, color }` using EC today
- `getCycleInfo(student, course)` → `{ classesPassed, classesTotal, remaining, ... }`

## WhatsApp & Notifications

- `src/lib/whatsapp.js` — message builders. `buildReminderMessage(student, course, settings, ..., isAdultCourse, course)` — always pass course as last arg for correct cycle dates via `resolveCycleDates()`
- `src/lib/whatsappMetaApi.js` — `notifyTelegram({ botToken, chatId, text })` sends Telegram messages
- Telegram transfer notifications: fired from **both** `useTransferRequests` (admin Realtime, authenticated) and `UploadTransfer.jsx` in the portal repo (uses `VITE_TELEGRAM_TRANSFERS_BOT_TOKEN` / `VITE_TELEGRAM_TRANSFERS_CHAT_ID` env vars)
- Meta Pixel: `sendLeadEvent()` on new student, `sendPurchaseEvent()` on payment — skipped for courtesy students

## Database Conventions

- All PKs: `UUID` with `gen_random_uuid()`
- Timestamps: `TIMESTAMPTZ`
- Soft deletes: `deleted_at TIMESTAMP` (NOT on `payments` or `quick_payments`)
- Voided records: `.eq('voided', false)` filter required on `payments`, `quick_payments`, and `expenses`
- Audit trail: call `logAudit()` from `src/lib/auditLog.js` after every mutation

Migration files: `database-update-v*.sql` — run in Supabase SQL Editor. Always use `IF NOT EXISTS` / `DO $$ ... $$` for idempotency.

## Auth & Roles

Roles in `user_roles` table: `admin`, `receptionist`, `viewer`, `supervisor`, `contador`.

`useAuth` exposes `can(permission)` helper and convenience booleans (`isAdmin`, `isContador`). The `contador` role gets a separate read-only `ContadorDashboard` instead of the main app.

Screen lock: `ScreenLock` component (`src/components/ScreenLock.jsx`) overlays the app with a PIN prompt. Theater curtain design in burgundy (`#551735`).

## Environment Variables

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_META_PIXEL_ID
VITE_META_CAPI_TOKEN
VITE_TELEGRAM_TRANSFERS_BOT_TOKEN   # Notificación de transferencias del portal
VITE_TELEGRAM_TRANSFERS_CHAT_ID
```

## Companion Repository

The student portal has its **own repo**: `D:\Studio Dancers Portal` / `studio-dancers-portal` (branch: `master`). It shares the same Supabase project but is a separate Vite app with its own `src/lib/banks.js`, `src/lib/supabase.js`, and `src/components/UploadTransfer.jsx`. Changes to portal features must be made there, not here.

## Key Gotchas

- `App.jsx` is ~1400+ lines — line numbers shift with every edit. Use grep/search, not line references.
- `isProgramFullyPaid` must use computed `paymentStatus.status === 'paid'`, not `student.payment_status`
- `cash_registers` UNIQUE constraint is on `(register_date, shift)`, not just `register_date`
- The `🩰` ballet slipper emoji (U+1F9F0) is not supported on older Android — removed from all WhatsApp templates
- Portal login (`RecepcionLogin`, `ClientPortalApp`, `InstructoraApp`) runs without Supabase Auth — RLS `authenticated` policies don't apply; use `anon` policies or SECURITY DEFINER RPCs
