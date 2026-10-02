## Architecture
- All band/box device data enters through `handleDeviceEvent()` in src/lib/store.ts — single integration point for the ESP32 feed.
- App state is a localStorage-backed store (src/lib/store.ts); no demo/fake data is ever seeded.
- The primary navigation has four caregiver areas; settings and medicine inventory remain secondary destinations to reduce daily navigation clutter.
