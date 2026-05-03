# Hayley's Herd Roll Call

A PWA for tracking a herd of guinea pigs — recording sightings, health data, family relationships, and watching them live via PigCam.

## Stack & Platforms

| Layer | Technology | Platform |
|-------|-----------|----------|
| Frontend | React 19, TypeScript, Vite | Vercel |
| Backend/Auth/DB | Supabase (Postgres, auth, `pig_photos` storage bucket) | Supabase Cloud |
| PigCam relay | FFmpeg + WebSocket server (MPEG-TS stream) | Fly.io |
| Routing | React Router v7 | — |
| Visualisation | ReactFlow (family tree graph) | — |
| Animations | Framer Motion | — |
| PWA | vite-plugin-pwa (offline support) | — |
| Styling | Custom CSS with CSS variables, "Fuzzy Bubbles" font | — |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Supabase anon/public key |
| `VITE_PIGCAM_WS_URL` | WebSocket URL for the PigCam stream (defaults to `ws://localhost:3001/stream`) |

## Getting Started

```bash
npm install
npm run dev
```

## How PigCam Works

PigCam provides a live video feed of the guinea pig enclosure, rendered directly in the browser.

The setup has three parts:

1. **Camera** — A TP-Link camera captures an RTSP stream from the enclosure.
2. **Relay server** — A separate process (e.g. FFmpeg) takes the RTSP feed from the camera and re-encodes it as MPEG-TS, pushing it over a WebSocket at the URL configured by `VITE_PIGCAM_WS_URL`.
3. **Browser player** — The `PigCam` component uses [`@cycjimmy/jsmpeg-player`](https://github.com/nichenqin/jsmpeg-player) to connect to the WebSocket and decode the MPEG-TS stream onto a `<canvas>` element in real time — no HLS, no `<video>` tag, just software decoding in JS.

The component is sticky-positioned at the top of the home page so you can scroll through the pig list while keeping an eye on the feed. It supports:

- **Refresh** — tears down and reconnects the player if the stream drops
- **Rotate** — toggles a rotated view (useful when the camera is mounted sideways)
- **Open in app** — Android intent link to launch the TP-Link IoT app for full camera controls
