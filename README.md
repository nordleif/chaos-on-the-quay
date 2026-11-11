# Chaos on the Quay

A toon-shaded browser FPS set in the harbour town of Mågevig. One self-contained HTML page built on three.js r160, plus a small room server for multiplayer.

## Play

Open `docs/index.html` in a browser, or https://nordleif.github.io/chaos-on-the-quay/.

The menu has three modes:

- **Solo**: defend the harbour alone. Works offline.
- **Co-op**: up to 8 players against shared waves. No friendly fire. Fallen players return at the next wave. The round ends when everyone is down.
- **PvP**: up to 8 players shoot each other while the creatures attack everyone. Player kills give 300 points, creature kills their usual points. First to 3000 wins. Respawn after 3 seconds.

Co-op and PvP create a room and put it in the address bar (`?room=abc123&mode=pvp`). Share that link, or use **Kopiér link** in the pause menu.

## Build

```
npm install
npm run build
```

This inlines `node_modules/three/build/three.min.js` and `game.js` into `src.html` and writes `docs/index.html`.

## Multiplayer

### How it works

- One browser in each room is the **host**. It runs waves, creatures, barrels and pickup spots, and broadcasts a snapshot 10 times a second. The other browsers render that snapshot.
- Every player owns their own movement and HP, and sends their state 15 times a second.
- Hits on creatures go to the host. Hits on players (PvP) go to the victim. Explosions are announced by whoever caused them.
- The server (`server/`) is a relay: a Cloudflare Worker with one Durable Object per room. It assigns ids and colors, picks the host and forwards messages. When the host leaves or hides its tab, the next player takes over.
- Browsers pause animation frames for background tabs, so a timer keeps the simulation running when frames stop.

### Run locally

```
cd server
npm install
npm run dev
```

Serve `docs/` with any static server and open it with `?server=ws://127.0.0.1:8787`. Add `&debug` to expose `window.__kaj` for inspection.

### Deploy the server

```
cd server
npx wrangler login
npm run deploy
```

Wrangler prints the worker URL, for example `https://chaos-on-the-quay.<account>.workers.dev`. Put it in `SERVER` near the top of the multiplayer section in `game.js` (as `wss://...`), rebuild and push. GitHub Pages serves the new page.

### Cost

The Workers free plan is enough for casual play. Durable Object requests are the limit: a full 8-player room sends about 130 messages a second, and the free plan covers a few hours of that per day. The $5/month Workers Paid plan removes that limit in practice.

## Files

- `game.js`: all game code (world, enemies, weapons, input, HUD, multiplayer)
- `src.html`: markup and CSS, with placeholders for the two scripts
- `build.js`: the inlining step
- `docs/index.html`: the built, playable page
- `server/`: the room relay (Cloudflare Worker + Durable Object)

## Controls

Desktop: WASD move, mouse aim/fire, Shift sprint, Space jump, 1-3 or wheel to switch weapon, R reload, M mute, Esc pause.
Touch: left thumb moves, drag on the right side to look, on-screen buttons for fire, jump, reload and weapon.
