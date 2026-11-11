# Chaos on the Quay

A toon-shaded browser FPS set in the harbour town of Mågevig. One self-contained HTML page built on three.js r160.

## Play

Open `docs/index.html` in a browser. No server needed.

To host it on GitHub Pages: Settings → Pages → Deploy from a branch → `main`, folder `/docs`.

## Build

```
npm install
npm run build
```

This inlines `node_modules/three/build/three.min.js` and `game.js` into `src.html` and writes `docs/index.html`.

## Files

- `game.js` — all game code (world, enemies, weapons, input, HUD logic)
- `src.html` — markup and CSS, with placeholders for the two scripts
- `build.js` — the inlining step
- `docs/index.html` — the built, playable page

## Controls

Desktop: WASD move, mouse aim/fire, Shift sprint, Space jump, 1–3 or wheel to switch weapon, R reload, M mute.
Touch: left thumb moves, drag on the right side to look, on-screen buttons for fire, jump, reload and weapon.
