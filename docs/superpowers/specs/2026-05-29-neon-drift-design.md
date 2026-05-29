# NEON DRIFT — Design Spec

**Date:** 2026-05-29
**Status:** Built (MVP) — this doc reflects the **as-built** state.

A browser-based 3D kart racer with a Tron/synthwave 80s aesthetic. Built with
Three.js + Vite, custom arcade physics, fully procedural neon visuals (no
downloaded assets), AI opponents, typed item pickups, lap/position/timing, a
race-start countdown, and three selectable tracks of increasing length.

---

## 1. Aesthetic

Synthwave/Tron "80s raster" look:

- Glowing **emissive neon materials** on all geometry (magenta/cyan/lime palette).
- Tron-style **grid floor** receding to the horizon.
- **Synthwave gradient sky**: magenta → purple → deep blue with a soft banded
  sun on the horizon (clamped so it never blows out under bloom).
- **Bloom** post-processing tuned (strength ~0.55, threshold ~0.82) plus **ACES
  tone mapping** so neon glows like a CRT without washing the frame to white.
- **Scanline + vignette** overlay pass for the raster/CRT feel.
- Procedural geometry only — zero external asset files; instant load.

## 2. Tech & Delivery

- **Three.js (^0.184) + Vite (^8)**, modular ESM JavaScript.
- **Package manager: pnpm (>=11)**; **Node >=26** (enforced via `engines` +
  `.npmrc engine-strict` + an `only-allow pnpm` preinstall guard). Run:
  `pnpm install && pnpm dev`. Ship: `pnpm build` → static `dist/`.
- **Custom arcade physics** (kinematic), no physics engine dependency.
- **WebAudio** procedural SFX (engine hum, pickup, boost, hit, countdown beeps,
  GO) — synthesized in-code, no audio files.
- **Quality tooling:** Vitest 4 (unit), Playwright (Firefox e2e), TypeScript 6
  `checkJs` typecheck, ESLint 10 (flat config), Prettier 3. `pnpm check` gates
  typecheck + lint + format + test; `pnpm fix` autofixes lint + format.
- **CI/CD:** GitHub Actions (`check` + `audit` + `build` + Firefox e2e on Node 26) and Dependabot (npm + github-actions, weekly).

## 3. Module Architecture

```
src/
  main.js              # bootstrap, state machine, countdown, pause, HUD wiring
  config.js            # palette + all physics/race tunables
  engine/
    loop.js            # fixed-timestep update + variable render
    input.js           # keyboard + mouse → unified InputState (incl. L, pause)
    audio.js           # WebAudio synth SFX (engine, beeps, GO, pickup, hit)
  render/
    scene.js           # renderer (ACES), chase camera, lights
    postfx.js          # bloom + scanline/vignette composer
    skybox.js          # synthwave gradient sky + sun
    grid.js            # neon grid floor
    materials.js       # shared neon emissive material factory
    trackMesh.js       # buildTrackMesh: ribbon + neon edges (Three.js)
  game/
    kart.js            # kart entity: physics state + mesh
    physics.js         # pure arcade step — UNIT TESTED
    ai.js              # waypoint-following CPU racers
    track.js           # PURE spline sampling + computeTrackData — UNIT TESTED
    tracks.js          # 3 track definitions (points, color, width, laps)
    items.js           # pure item effects — UNIT TESTED
    race.js            # laps/checkpoints/positions/timing/timeout — UNIT TESTED
    world.js           # per-race orchestration (karts, items, walls, lines)
  ui/
    hud.js             # lap, position, times, item slot, controls legend
    menus.js           # title, track select, results screens
```

Boundary rule: `physics.js`, `race.js`, `items.js`, and `track.js`
(`sampleLoop` / `computeTrackData`) are **pure logic with no Three.js imports**,
so they are deterministically unit-testable. All Three.js mesh building lives in
`render/` (notably `trackMesh.js`) and `world.js`.

## 4. Game States

`TITLE → TRACK_SELECT → RACE → RESULTS → (back to TRACK_SELECT)`. A **3-2-1-GO**
countdown freezes the simulation at the start of each race (and on resume).
`PAUSE` (Esc) overlays RACE, suspends audio, and re-runs the countdown on resume.
State machine + countdown/pause live in `main.js`.

## 5. Gameplay

- **3 procedural neon tracks**, progressively longer with more laps:
  NEON CIRCUIT (3 laps), SUNSET LOOP (5), GRID RUNNER (8). Track select shows lap
  counts. Lap range is 3–10.
- **Player + 3 AI racers.** AI share the player's top speed — **no rubber-band
  speed boost** — so racing is fair and close.
- **Checkpoint-validated lap counting** (checkpoints in order; prevents
  reverse/shortcut cheating).
- A **visible start/finish line** spanning the track; crossing it advances your
  lap. On the **final lap** it becomes a neon **checkerboard**.
- **Timing:** total race time, current-lap time, and **best lap** per racer. A
  per-track **max race time** (≈ length × laps × factor) ends the race on timeout
  (DNF). Results rank by finish time, then progress.
- **Typed item pickups** — a distinct neon **shape** signals each bonus, and a
  trio (one of each) spans the track at several points so you pick your lane:
  - **Boost** (cone) — temporary top-speed + acceleration burst (~3.5 s).
  - **Shock** (octahedron) — briefly spins out nearby rivals.
  - **Oil** (icosahedron) — drops a slick **behind** you (dropper is immune).
  - Spin effects are cooldown-gated so a kart can never be perma-spun.
- **Drift** (Space) lowers lateral grip for a controlled slide (feel only).
- Top speed ≈ **325 km/h** (90 m/s).

## 6. Controls (keyboard AND mouse both active)

| Action          | Keyboard     | Mouse                               |
| --------------- | ------------ | ----------------------------------- |
| Steer           | ← → / A D    | pointer X **while holding L-click** |
| Throttle        | ↑ / W        | left-click hold                     |
| Brake/Reverse   | ↓ / S        | —                                   |
| Drift           | Space        | —                                   |
| Use item        | Shift / Ctrl | right-click                         |
| Pause           | Esc          | —                                   |
| Controls legend | L (toggle)   | —                                   |

Mouse steering engages **only while the left button is held** (mouse-driving),
so an idle pointer never pulls a keyboard driver off line. `input.js` merges both
into one `InputState { steer, throttle, brake, drift, useItem, pause, legend }`.

## 7. Physics Model

Per fixed step on each kart:

1. Throttle applies force along heading; brake decelerates / reverses; coasting
   applies rolling friction.
2. Decompose velocity into forward/lateral; **high lateral grip** holds the line
   (much lower while drifting → slide).
3. **Steering is smoothed** (input ramps in), keeps a small low-speed floor so
   the kart can pivot when nearly stopped, and is **reduced at high speed** for
   stability. Sign chosen so Left turns left on screen (and AI matches it).
4. Top speed clamps (×1.7 while boosting, ×0.5 off-track).
5. Heading is normalized to `[-π, π]`.

`world.js` adds **soft walls** (cancels only the into-wall velocity so you slide
along and recover) and **kart-to-kart collisions** (separate + trade momentum).
All tunables live in `config.js`.

## 8. AI

Each CPU follows the waypoint spline with a lookahead steering controller, easing
off throttle in sharp turns. AI use the **same top speed** as the player and pick
up / use items. (A `rubberBand` helper exists but is intentionally not applied to
speed, to keep races fair.)

## 9. Tracks

`tracks.js` exports 3 definitions: closed-loop 2D control points, neon theme
color, road width (~24–27 u), and lap count. `track.js` (pure) builds a
Catmull-Rom spline, resamples evenly by arc length into **waypoints** (with unit
tangents), derives **checkpoints**, **grid start positions**, and total
**length**. `render/trackMesh.js` extrudes the ribbon + glowing neon edges.

## 10. Testing & Quality

- **Vitest** unit tests (pure, deterministic): physics (accel/friction/clamp,
  grip, steer direction & speed-scaling), race (ordered checkpoints, lap +
  best/total lap times, timeout, finish-time standings), items (effects, boost
  expiry, shock radius, oil hazard), track sampling (count, closed loop, even
  spacing, unit tangents). **23 tests.**
- **Playwright** smoke (Firefox): boots, `<canvas>` mounts, title → select →
  race, HUD shows LAP, no console errors.
- **typecheck / lint / format** enforced locally (`pnpm check`) and in CI.
- Feel/visuals validated manually in-browser.

## 11. Build Approach (as-built)

Foundations (scaffold, config, install) were laid first, then a ruflo swarm of
parallel agents built non-overlapping module groups (pure logic; render; UI +
audio), with the lead integrating `world.js` + `main.js` and verifying the
playable build in-browser. Subsequent play-test feedback drove a controls/feel/
gameplay tuning pass and the toolchain modernization (pnpm, Node 26, CVE-clean
deps, lint/format/typecheck, CI, Dependabot).

## 12. Out of Scope (MVP / YAGNI)

Manual mini-turbo charge, online multiplayer, gamepad/touch controls, custom
track editor, persistent leaderboards, minimap, more than 3 item types or 3
tracks.
