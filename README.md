# Chaos on the Quay

A toon-shaded browser FPS set in the harbour town of Mågevig. One self-contained HTML page built on three.js r160, plus a small room server for multiplayer. Both are hosted on one Cloudflare Worker.

## Play

https://chaos-on-the-quay.bo-29c.workers.dev

Opening `docs/index.html` directly also works. Multiplayer then connects to the URL above.

The menu has three modes:

- **Solo**: defend the harbour alone. Works offline.
- **Co-op**: up to 8 players against shared waves. No friendly fire. Fallen players return at the next wave. The round ends when everyone is down.
- **PvP**: up to 8 players shoot each other while the creatures attack everyone. Player kills give 300 points, creature kills their usual points. First to 3000 wins. Respawn after 3 seconds.

**Ny co-op** and **Ny PvP** start a game with an easy name such as **KRABBE 41**. Open games are listed under **Åbne spil** in the menu with their mode, player count and player names. Tap one to join. The list is public.

A game can also be shared as a link (`?room=krabbe-41&mode=coop`), from the address bar or **Kopiér link** in the pause menu.

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
- The Worker (`server/`) serves the page from `docs/` and runs the rooms under `/room/<id>`. Each room is a Durable Object that relays messages. It assigns ids and colors, picks the host and forwards messages. When the host leaves or hides its tab, the next player takes over.
- A single Lobby Durable Object keeps the list of open rooms, served at `/lobby`. Rooms report on every join and leave and every 30 seconds while in use. Rooms not heard from in 90 seconds drop off the list.
- Browsers pause animation frames for background tabs, so a timer keeps the simulation running when frames stop.

### Run locally

```
npm install && npm run build
cd server
npm install
npm run dev
```

Open http://127.0.0.1:8787. Add `?debug` to expose `window.__kaj` for inspection.

### Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the page and deploys the Worker. It needs the repository secret `CLOUDFLARE_API_TOKEN`: a Cloudflare API token made from the **Edit Cloudflare Workers** template.

To deploy by hand: `npm run build`, then `cd server && npx wrangler deploy`.

### Cost

The Workers free plan is enough for casual play. Durable Object requests are the limit: a full 8-player room sends about 130 messages a second, and the free plan covers a few hours of that per day. The $5/month Workers Paid plan removes that limit in practice.

## Files

- `game.js`: all game code (world, enemies, weapons, input, HUD, multiplayer)
- `src.html`: markup and CSS, with placeholders for the two scripts
- `build.js`: the inlining step
- `docs/index.html`: the built, playable page
- `server/`: the Worker that serves the page and the rooms
- `.github/workflows/deploy.yml`: deploys on push to `main`

## Controls

Desktop: WASD move, mouse aim/fire, Shift sprint, Space jump, 1-3 or wheel to switch weapon, R reload, M mute, Esc pause.
Touch: left thumb moves, drag on the right side to look, on-screen buttons for fire, jump, reload and weapon.
