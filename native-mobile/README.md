# Native Mobile App

This workspace is the real mobile app path for this repository.

## Stack
- Expo on top of React Native
- TypeScript
- React Navigation
- Native secure storage via `expo-secure-store`

## What this app is not
- Not Capacitor
- Not Ionic
- Not Cordova
- Not a website wrapped in a native shell
- Not dependent on `frontend/build-mobile`

## Local backend setup
The backend and Postgres still run from the root Docker Compose stack.

Start local services from the repository root:

```powershell
docker compose up -d postgres backend
```

## API configuration
Use `EXPO_PUBLIC_API_URL` for the default API target.

Examples:

- Android emulator:

```powershell
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api
```

- Physical device on the same Wi-Fi:

```powershell
EXPO_PUBLIC_API_URL=http://YOUR-COMPUTER-LAN-IP:5000/api
```

The app also exposes a runtime API URL override on the login screen and settings screen.

## Run the native app
From `native-mobile/`:

```powershell
npm install
npm run start
```

Android:

```powershell
npm run android
```

`npm run android` auto-detects the standard Windows Android Studio SDK/JBR locations, sets `ANDROID_HOME`, `ANDROID_SDK_ROOT`, and `JAVA_HOME` for the current process, and writes `android/local.properties` before calling Expo. If you use a custom SDK/JDK location, set those env vars explicitly first.

This workspace also applies a postinstall patch to the React Native Gradle plugin settings so the bundled Foojay toolchain resolver is compatible with the generated Android Gradle wrapper used here. Re-run `npm install` if `node_modules/` is recreated.

On Windows, `npm run android` also maps the project to a temporary `SUBST` drive and uses short per-user `TEMP` and `GRADLE_USER_HOME` roots under `C:\Users\<you>\.daycare-native-mobile\` while invoking Expo. This reduces React Native CMake/codegen path pressure more aggressively than a junction from `%TEMP%`.

Windows long paths should still be enabled for the machine. If `HKLM\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled` is `0`, turn it on and restart the shell before retrying native Android builds.

iOS:

```powershell
npm run ios
```

## Verification commands

Typecheck:

```powershell
npm run typecheck
```

Live backend auth + role routing verification:

```powershell
$env:LOCAL_API_BASE_URL="http://localhost:5000/api"
npm run verify:local -- --admin-email admin@test.com --admin-password password123 --educator-email educator@test.com --educator-password password123 --parent-email parent@test.com --parent-password password123
```

Generate native Android project files from Expo config:

```powershell
npm run prebuild:android
```
