# FTX Player (Scaffold)

Minimal cross‑platform Electron app that registers `.ftxsmart` files and the `ftx://` protocol, and shows the **Play / Dashboard / Purchase** flow.

## Quick Start
```bash
npm install
npm run start
```
- Open an example from `examples/`:
  - `public_demo.ftxsmart`: plays immediately
  - `paywalled_demo.ftxsmart`: requires unlock (use code **FREEPASS** in modal)

## Wire Your Backend
Edit `main.js` handlers:
- `api:checkPolicy` – return policy (public | code | pay | allowlist)
- `api:redeemCode` – verify codes (returns entitlement)
- `api:createCheckout` – create Stripe/crypto checkout URL

Update dashboard/docs/support links in `renderer/renderer.js`.

## Build Installers
```bash
npm run dist
```
- Windows: NSIS installer (file association configured)
- macOS: .app (UTType + protocol configured; add signing for distribution)

## Token JSON Example (.ftxsmart)
```json
{ "asset_title": "My Asset", "owner": "Owner", "policy": {"access": "public"}, "token_id": "id-001", "media_url": "https://..." }
```
