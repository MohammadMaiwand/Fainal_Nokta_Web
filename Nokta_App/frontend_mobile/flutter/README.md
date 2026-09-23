# Nokta Academy — Mobile (Android / iOS)

Flutter **mobile-only** client for the Nokta backend (JWT, RBAC, `/api`).

**Entry:** `lib/main.dart`  
**Android Studio:** open this folder (`Nokta_App/frontend_mobile/flutter`).

## Platforms

| Supported | Removed |
|-----------|---------|
| Android (primary) | Windows desktop |
| iOS | Linux / macOS / Web |

## Quick start

```bash
cd Nokta_App/frontend_mobile/flutter
flutter pub get
```

Dev stack (backend + web — **one command**, same as the React web app):

```bash
# From repo root (Nokta_V7 - Copy)
npm install
npm run dev
```

- Web UI: http://localhost:5173  
- API (web + mobile): http://localhost:5173/api → backend :4000  

Or: `Nokta_App/scripts/Start-Nokta-Dev.ps1`

### Android Studio / emulator

1. Start **`npm run dev`** from repo root (keep it running)  
2. Device Manager → start an AVD  
3. Run **`lib/main.dart`** (config: **Nokta Academy (Android Emulator)**)

Mobile uses the same proxy as web: `http://10.0.2.2:5173/api` on the emulator.

### Physical phone (same Wi‑Fi)

```bash
flutter run -d YOUR_DEVICE_ID --dart-define=API_BASE_URL=http://YOUR_PC_IP:5173/api --dart-define=APP_ENV=development
```

## Project layout

```
lib/
  main.dart          # app entry
  app/               router, theme, env
  core/              API, auth, widgets
  features/          screens by module
android/             Gradle / Android Studio
ios/                 Xcode (optional)
```

Persian guide: [`docs/android-studio-fa.md`](docs/android-studio-fa.md) · [`OPEN_ANDROID_STUDIO.md`](OPEN_ANDROID_STUDIO.md)

## Release build (Android)

```bash
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://your-domain.com/api \
  --dart-define=APP_ENV=production
```

See [`docs/android-release-guide.md`](docs/android-release-guide.md).
