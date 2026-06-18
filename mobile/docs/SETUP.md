# Setup Guide — Mobile App

This is a focused setup guide. The full overview is in [README.md](./README.md).

## 1. Prerequisites

```bash
node --version     # 18+
npm --version
```

Install Expo CLI globally:

```bash
npm install -g expo
```

Install Expo Go on your physical phone (iOS App Store / Play Store) **OR** use a
simulator:

- iOS Simulator: macOS + Xcode 15+
- Android Emulator: Android Studio (any recent version)

## 2. Backend must be running

The mobile app is a **client** — it cannot work without the backend. Make sure
the API server is running first:

```bash
cd ../server
npm install
cp .env.example .env
npm run migrate     # one-time
npm run seed        # one-time
npm run dev         # → http://localhost:4000
```

Verify it's up:

```bash
curl http://localhost:4000/health
# → {"ok":true,"env":"development"}
```

## 3. Configure the mobile app's API URL

Create `mobile/.env`:

```bash
# iOS Simulator (default)
EXPO_PUBLIC_API_URL=http://localhost:4000

# Android Emulator (default — 10.0.2.2 = host machine's localhost)
# EXPO_PUBLIC_API_URL=http://10.0.2.2:4000

# Real device on same Wi-Fi — replace with your Mac/IP address
# EXPO_PUBLIC_API_URL=http://192.168.1.50:4000
```

## 4. Install + run

```bash
cd mobile
npm install
npx expo start
```

The terminal will print a QR code and a menu:

```
› Metro waiting on exp://192.168.1.50:8081
› Press i │ open iOS simulator
› Press a │ open Android emulator
› Press w │ open web
› Press r │ reload app
› Press m │ toggle menu
› Press ? │ show all commands
```

For a physical device:
1. Install "Expo Go" from the App Store / Play Store
2. Make sure your phone is on the same Wi-Fi as your Mac
3. Scan the QR code with the Expo Go app

For the simulator, just press `i` or `a`.

## 5. First login

The Login screen has demo accounts pre-filled — tap any row to auto-fill.

| Role | Identifier |
|---|---|
| Student | `student@school.test` (password `Password123!`) |
| Parent | `42101-1234567-8` (CNIC login) |
| Teacher | `teacher@school.test` |
| Admin | `admin@school.test` |

In **Phase A**, only the Student portal is implemented. Logging in as Student
routes to the 7-tab bottom navigator (Home, Attendance, Classes, Work, Results,
Inbox, Profile). Other roles show a brief loading state — Phase B will add
their tabs.

## 6. Common issues

### "Network request failed" on every API call

- iOS Simulator: backend must be at `http://localhost:4000` (not `127.0.0.1`)
- Android Emulator: backend must be at `http://10.0.2.2:4000`
- Real device: phone must be on the same Wi-Fi as the Mac, and Mac firewall
  must allow incoming connections on port 4000

### SecureStore errors

`expo-secure-store` does not work in Expo Go on web. Use a simulator or a
device.

### Push notifications don't arrive

- Make sure `EXPO_PUBLIC_API_URL` is reachable from the backend to Expo's
  push API (`https://exp.host`)
- For real device pushes, configure an EAS project ID in `app.json` under
  `extra.eas.projectId` and run `eas build:configure`

### Camera / microphone not working in Jitsi WebView

The `app.json` declares the necessary `NSCameraUsageDescription` and
`NSMicrophoneUsageDescription` for iOS, and the Android permissions in
`android.permissions`. If you fork the app and remove these, prompts will
fail silently.

## 7. Building for distribution

```bash
npm install -g eas-cli
eas login
eas build:configure                       # one-time, creates eas.json entry
eas build -p android --profile preview    # internal APK
eas build -p ios --profile preview        # simulator build (no signing needed)
```

For production builds (App Store / Play Store), use `--profile production`
and configure signing credentials.

## 8. Connecting to a deployed backend

Set `EXPO_PUBLIC_API_URL` to the deployed URL when building:

```bash
EXPO_PUBLIC_API_URL=https://api.yourschool.com eas build -p android --profile production
```

Make sure the backend's `CORS_ORIGIN` env var allows the Expo Go origin (or
your app's deep-link origin).
