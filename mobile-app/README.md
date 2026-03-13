# Deprecated Capacitor Path

`mobile-app/` is deprecated.

This workspace was the wrong architecture for the mobile product because it wraps the web frontend inside a Capacitor shell.

Do not continue mobile feature work here.

## Status
- Deprecated as of 2026-03-11
- Kept in the repo only as a migration reference until the team decides it is safe to remove
- Not the long-term runtime for the mobile app

## Correct path
Use [`native-mobile/`](../native-mobile/README.md) for the real mobile app:
- React Native
- TypeScript
- Native navigation
- Native secure storage
- Direct API integration without webview packaging

## What remains valid here
- Historical packaging notes
- Android-specific troubleshooting context from the abandoned Capacitor direction
- A UX/reference bridge to compare old mobile-web screens during the transition

## What not to do
- Do not ship from this folder
- Do not describe this folder as native
- Do not wire new product work into `frontend/build-mobile`
- Do not add hidden dependencies from `frontend/` back into this workspace
