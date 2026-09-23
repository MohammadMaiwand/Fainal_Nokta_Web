# Nokta Academy Management System

Full-stack school/academy platform: **Node.js API**, **React web app**, **Vite PWA**, and **Flutter mobile** client. Role-based access, multilingual UI (en / fa / ps), finance, attendance, messaging, and offline-friendly frontends.

---

## Repository layout

| Path | Description |
|------|-------------|
| [`backend/`](backend/) | Express + TypeScript + MongoDB API |
| [`frontend/`](frontend/) | React 18 + Vite + Tailwind web application |
| [`Nokta_App/frontend_mobile/`](Nokta_App/frontend_mobile/) | Mobile-oriented Vite PWA (unchanged contract with API) |
| [`Nokta_App/frontend_mobile/flutter/`](Nokta_App/frontend_mobile/flutter/) | **Flutter** native mobile app |
| [`scripts/`](scripts/) | Backup and utility scripts |
| [`.github/`](.github/) | CI workflows |
| [`deploy/`](deploy/) | Production nginx configuration |

---

## Prerequisites

- **Node.js** 18+
- **npm** (use `npm.cmd` on Windows if execution policy blocks `npm`)
- **MongoDB** (default `mongodb://localhost:27017/nokta_academy`)
- **Flutter** 3.11+ (mobile only)

---

## Offline Windows start

After dependencies have been installed once, the web system can run without internet.

```bat
Start-Nokta-Academy-Windows.bat
```

The launcher checks Node.js, local `node_modules`, MongoDB, backend build, frontend build, and then starts:

- App: `http://127.0.0.1:4173`
- API: `http://127.0.0.1:8081/api`
- Health: `http://127.0.0.1:8081/health`

Logs are written to `.offline-runtime/`. If dependencies are missing, connect internet once and run:

```bash
npm ci
npm ci --prefix backend
npm ci --prefix frontend
```

Then run `Start-Nokta-Academy-Windows.bat` again.

---

## Backend setup

```bash
cd backend
npm install
copy .env.example .env    # Windows
# edit .env — never commit .env
npm run seed              # optional dev data
npm run dev
```

- API: `http://localhost:8081/api`
- Health: `http://localhost:8081/health`

### Backend commands

```bash
npm run lint
npm run build
npm run test
npm run validate-api
```

### Backend environment (`.env`)

See [`backend/.env.example`](backend/.env.example). Key variables:

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | MongoDB connection |
| `JWT_SECRET` | Access token signing (≥ 32 chars in production) |
| `REFRESH_SECRET` | Refresh tokens |
| `PORT` | Default `8081` |

---

## Web frontend setup

```bash
cd frontend
npm install
npm run dev
```

- App: `http://localhost:5173`
- Proxies `/api` → `http://127.0.0.1:8081`

### Frontend commands

```bash
npm run typecheck
npm run test
npm run build
npm run validate-permissions
npm run preview
```

### Frontend environment

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | API base (optional; dev proxy default) |

---

## Flutter mobile setup

```bash
cd Nokta_App/frontend_mobile/flutter
flutter pub get
flutter gen-l10n
flutter run --dart-define=API_BASE_URL=http://localhost:8081/api --dart-define=APP_ENV=development
```

| Target | `API_BASE_URL` |
|--------|----------------|
| Desktop / iOS simulator | `http://localhost:8081/api` |
| Android emulator | `http://10.0.2.2:8081/api` |
| Physical phone (LAN) | `http://192.168.x.x:8081/api` |
| Production | `https://your-domain.com/api` + `APP_ENV=production` |

### Flutter commands

```bash
flutter analyze
flutter test
```

Release builds (local machine, HTTPS required for production):

```bash
flutter build apk --release --dart-define=API_BASE_URL=https://your-domain.com/api --dart-define=APP_ENV=production
```

### Flutter compile-time defines

| Define | Example |
|--------|---------|
| `API_BASE_URL` | Must end with `/api` |
| `APP_ENV` | `development` \| `staging` \| `production` |

---

## PWA (`Nokta_App/frontend_mobile/`)

```bash
cd Nokta_App/frontend_mobile
npm install
npm run build
```

Uses the same backend API as web; not modified when changing Flutter-only code.

---

## What NOT to commit

- `.env`, `.env.local`, real secrets
- `node_modules/`, `dist/`, `build/`, `.dart_tool/`
- `android/key.properties`, `*.jks`, `*.keystore`
- Browser profiles (`chrome-profile*`, cookies, login data)
- `backups/` with real database dumps
- APK/AAB binaries (optional: store in CI artifacts)

See [`.gitignore`](.gitignore).

---

## Troubleshooting

- PowerShell blocks `npm` → use `npm.cmd`
- Backend won’t start → check MongoDB and `MONGO_URI`
- Flutter production build fails at startup → use **HTTPS** `API_BASE_URL` with `APP_ENV=production`
- PWA stale cache → unregister service worker in DevTools once
