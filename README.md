# SmartDose Caregiver

A professional caregiver interface for a smart tablet dispenser and patient-monitoring band. It includes medication inventory, morning/afternoon/night dispense controls, dosage totals, vitals, fall and SOS alerts, and device connection states.

## Requirements

- Node.js 20 or newer
- Bun 1.2 or newer (recommended), or npm

## Start locally

```sh
bun install
bun run dev
```

Open the local address shown in the terminal.

## Production build

```sh
bun run build
bun run preview
```

## Firebase connection checklist

The Settings page connects to **Firebase Realtime Database** (not an MQTT broker). If it stays disconnected:

1. In Firebase Console → Authentication → Sign-in method, enable **Email/Password**.
2. Under Authentication → Users, create/confirm the exact email and password entered in Settings.
3. Open Realtime Database and copy its full database URL into Settings. It must be the database URL, not the Firebase project URL.
4. In Authentication → Settings → Authorized domains, ensure `localhost` is listed for local testing.
5. Check the browser Console/Network tab if the message says a request failed. Database rules must permit the signed-in user to read and write the required paths; do not make the database public just to make the UI connect.

The Connect button now shows Firebase authentication, URL, and permission errors instead of silently swallowing them. “Connected” means the Firebase sign-in succeeded and listeners were attached; a band/box only becomes online after data appears under `devices/band` or `devices/box`.

## Device integration

The browser listens at `devices/band` and `devices/box` in Firebase Realtime Database. The ESP32 firmware must publish to those exact paths. No demonstration readings are seeded.

Medication, schedules, limits, and profile settings are currently saved in browser storage.

## Technology

- TanStack Start
- React
- TypeScript
- Tailwind CSS
