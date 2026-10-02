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

## Device integration

All monitoring-band and dispenser-box messages enter through `handleDeviceEvent()` in `src/lib/store.ts`. Connect the ESP32 transport there. No demonstration readings are seeded.

Medication, schedules, limits, and profile settings are currently saved in browser storage.

## Technology

- TanStack Start
- React
- TypeScript
- Tailwind CSS
