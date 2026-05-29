# NEON DRIFT

A browser-based 3D synthwave kart racer (Three.js + Vite). Glowing neon karts,
a Tron grid floor, an 80s sunset sky with bloom, AI opponents, item pickups,
lap/position/timing, and three progressively longer tracks. **MVP.**

## Requirements

- **Node >= 26**
- **pnpm >= 11** (this repo enforces pnpm — `npm install` is blocked)

## Run

```bash
pnpm install
pnpm dev          # play at the printed localhost URL
```

Build a static bundle:

```bash
pnpm build        # outputs dist/
pnpm preview      # serve the built bundle
```

## Scripts

| Command                   | Purpose                                                |
| ------------------------- | ------------------------------------------------------ |
| `pnpm dev` / `pnpm build` | Vite dev server / production build                     |
| `pnpm test`               | Vitest unit tests (physics, race/timing, items, track) |
| `pnpm e2e`                | Playwright smoke test (Firefox)                        |
| `pnpm typecheck`          | TypeScript type-checks the JS (`checkJs`)              |
| `pnpm lint` / `lint:fix`  | ESLint (flat config) — `:fix` autofixes                |
| `pnpm format` / `:check`  | Prettier write / verify                                |
| `pnpm audit` / `:fix`     | CVE audit / fix                                        |
| `pnpm check`              | typecheck + lint + format:check + test (CI gate)       |
| `pnpm fix`                | lint:fix + format                                      |
| `pnpm deps:outdated`      | list outdated deps                                     |
| `pnpm deps:update`        | upgrade within semver ranges (compatible)              |
| `pnpm deps:update:latest` | upgrade to latest (may cross majors)                   |

The Playwright e2e drives **Firefox**; fetch it once with
`pnpm exec playwright install firefox`.

CI (`.github/workflows/ci.yml`) runs the full `check` + `audit` + `build` and a
Firefox e2e job on Node 26 / pnpm. Dependabot keeps deps and Actions current.

## Controls

Press **L** in-game to toggle the controls legend.

| Action          | Keyboard     | Mouse                       |
| --------------- | ------------ | --------------------------- |
| Steer           | ← → / A D    | move pointer (hold L-click) |
| Throttle        | ↑ / W        | hold left-click             |
| Brake / reverse | ↓ / S        | —                           |
| Drift           | Space        | —                           |
| Use item        | Shift / Ctrl | right-click                 |
| Pause           | Esc          | —                           |

## Gameplay

- **3 tracks**, progressively longer with more laps: NEON CIRCUIT (3), SUNSET
  LOOP (5), GRID RUNNER (8).
- A **3‑2‑1‑GO** countdown starts each race (and after resuming from pause).
- **3 AI opponents** share your top speed (no unfair boost); racing is close.
- **Item pickups** — shape tells you the bonus: cone = **Boost**, octahedron =
  **Shock** (spins nearby rivals), icosahedron = **Oil** (drop a slick behind you).
- A visible **start/finish line** you cross each lap; it turns into a neon
  **checkerboard** on the final lap.
- HUD shows lap, position, total time, current-lap time, **best lap**, and the
  **max race time** remaining (a per-track timeout based on length × laps).
- Top speed ≈ **325 km/h**.

## Architecture

Pure game logic (`src/game/physics.js`, `race.js`, `items.js`, and the track
sampling in `track.js`) has no Three.js imports and is unit-tested. Rendering
modules under `src/render/` own all Three.js objects. `src/game/world.js`
orchestrates a race; `src/main.js` is the title→select→race→results state machine.

See `docs/superpowers/specs/` and `docs/superpowers/plans/` for the design spec
and implementation plan.
