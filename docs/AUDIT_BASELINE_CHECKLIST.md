# Nokta Academy — Baseline Technical Audit Checklist

Branch checkpoint: `audit/baseline-checkpoint-20260717-2132`  
Date: 2026-07-17

## Dependency map (summary)

| Layer | Path | Notes |
|-------|------|-------|
| Backend entry | `backend/src/server.ts` → `app.ts` | Express + MongoDB |
| API router | `backend/src/routes/index.ts` | Mounts all domain routers under `/api` |
| Auth | `middlewares/auth.ts`, `services/authService.ts` | JWT access + refresh + SessionToken |
| Permissions | `middlewares/permission.ts`, `config/systemMasterRules.ts` | Route policies |
| React app | `frontend/src/app/main.tsx`, `routes/AppRoutes.tsx` | Vite + React Query |
| API client | `frontend/src/services/apiClient.ts` | Proxy `/api` → `:8081` |
| Flutter | `Nokta_App/frontend_mobile/flutter/` | Dio client; Flutter SDK not on PATH here |

### Critical API modules (must be mounted)

`/auth` `/users` `/students` `/teachers` `/classes` `/timetable` `/attendance` `/exams` `/results` `/payments` `/finance` `/expenses` `/salaries` `/payroll` `/employee-tax` `/loans` `/messages` `/uploads` `/search` `/ai-results` `/intelligence` `/academy-financial-report` `/enterprise` `/dashboard` `/reports` `/audit` `/notifications` `/roles` `/permissions` `/families` `/books` `/fees` `/branches` `/admin` …

---

## Phase 4 — Manual / automated test checklist

### 1. Authentication
- [ ] Login success (super_admin / teacher / student / parent)
- [ ] Login failure + lockout after repeated failures
- [ ] Refresh token rotation
- [ ] Logout blacklists access token
- [ ] Expired JWT returns 401 and client redirects to login

### 2. Authorization
- [ ] Role-denied paths redirect to `/forbidden`
- [ ] `PERMISSION_DENIED_ROUTE` audit on blocked API
- [ ] Branch-scoped data isolation for branch_manager

### 3. Users and roles
- [ ] Create / update / soft-delete user
- [ ] Assign role + permissions
- [ ] Family portal account create (`/families/:id/portal-account`)

### 4. Messages
- [ ] Public contact form (`/api/messages/public-contact`)
- [ ] Staff inbox list / reply / close
- [ ] Student message to teacher

### 5. CRUD operations
- [ ] Students, teachers, classes, subjects, books — create/read/update/delete
- [ ] Validation errors return 400 with clear message

### 6–10. Exams pipeline
- [ ] Create exam (manual + AI generate)
- [ ] Publish / schedule
- [ ] Student attempt (online)
- [ ] Auto-grade MCQ / true-false
- [ ] Descriptive grading by teacher
- [ ] AI result analysis (`/api/ai-results`)

### 11. Notifications
- [ ] List / mark read
- [ ] Role-targeted publish

### 12. Localization
- [ ] Switch en / fa / ps without missing key crashes
- [ ] RTL layout for fa/ps

### 13. Mobile / backend connectivity
- [ ] Flutter `API_BASE_URL` points to reachable host (not broken localhost on device)
- [ ] Login + refresh on emulator
- [ ] Physical device uses LAN IP or tunnel

### 14–16. UX states
- [ ] Error banners on failed queries
- [ ] Empty lists show empty copy
- [ ] Loading skeletons clear when settled (no infinite spinner)

### 17. Database integrity
- [ ] Soft-delete respected (`isDeleted: false` filters)
- [ ] Payment / finance balances reconcile
- [ ] Audit retention job soft-deletes noisy middleware logs

---

## Latest validation run (web only — 2026-07-17)

| Check | Result |
|-------|--------|
| `backend` `validate-api` | PASS (`failedCount: 0`) — student `RESOURCE_VIEW` for books |
| `backend` `validate-integrations` | PASS |
| `frontend` `validate-permissions` | PASS |
| `frontend` `validate-translations` | PASS (after `sync-locale-extras`) |
| `frontend` `test:e2e` (public smoke) | PASS |
| `frontend` `test:e2e:finance` | PASS (smoke without browser binary) |
| Playwright `test:e2e:browser` | Optional — run when Chromium installed |

### Phase 3 web hardening applied
- Home page catalog queries no longer swallow errors; loading/error banner shown
- Crud dependent-field failures surface `errors.unable_load_records`
- Auth session check has 20s watchdog to avoid infinite loading
- Jobs skip when MongoDB disconnected (cleaner validate-api teardown)


```bat
REM Backend
cd backend
npm ci
npm run typecheck
npm run build
npm test
npm run validate-api
npm run dev
curl http://127.0.0.1:8081/health

REM Frontend
cd frontend
npm ci
npm run typecheck
npm test
npm run build
npm run validate-permissions
npm run validate-translations
npm run dev

REM Flutter (requires Flutter SDK on PATH)
cd Nokta_App\frontend_mobile\flutter
flutter pub get
flutter analyze
flutter test
```
