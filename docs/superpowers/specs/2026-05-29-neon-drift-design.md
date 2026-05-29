# NEON DRIFT — Design Spec

**Date:** 2026-05-29
**Status:** Approved (brainstorming → planning)

A browser-based 3D kart racer with a Tron/synthwave 80s aesthetic. Built with
Three.js + Vite, custom arcade physics, fully procedural neon visuals (no
downloaded assets), AI opponents, item boxes, lap/position tracking, and a
3-track selection menu.

---

## 1. Aesthetic

Synthwave/Tron "80s raster" look:

- Glowing **emissive neon materials** on all geometry (magenta/cyan/lime palette).
- Infinite scrolling **grid floor** (Tron-style), perspective into the horizon.
- **Synthwave gradient sky**: magenta → purple → deep blue, with a banded retro
  sun on the horizon.
- **Bloom** post-processing so emissive surfaces glow like a CRT.
- **Scanline + vignette** overlay pass for the raster/CRT feel.
- Procedural geometry only — boxes, cylinders, extruded track ribbon. Zero
  external asset files, so the game runs instantly with no asset loading.

## 2. Tech & Delivery

- **Three.js + Vite**, modular ESM JavaScript.
- Run: `npm install && npm run dev`. Ship: `npm run build` → static `dist/`.
- **Custom arcade physics** (kinematic), no physics engine dependency.
- **WebAudio** procedural SFX (engine hum, item pickup, boost, collision) —
  synthesized in-code, no audio files.

## 3. Module Architecture

Single-purpose units communicating through narrow interfaces:

```
src/
  main.js              # bootstrap, canvas mount, top-level state machine
  engine/
    loop.js            # fixed-timestep update + variable render
    input.js           # keyboard + mouse/pointer abstraction (unified InputState)
    audio.js           # WebAudio synth SFX
  render/
    scene.js           # renderer, chase camera, lights
    postfx.js          # bloom + scanline/vignette composer
    skybox.js          # synthwave gradient sky + sun
    grid.js            # neon grid floor
    materials.js       # shared neon emissive material factory
  game/
    kart.js            # kart entity: physics state + mesh
    physics.js         # pure arcade step (accel/friction/grip/drift) — UNIT TESTED
    ai.js              # waypoint-following CPU racers w/ rubber-banding
    track.js           # track mesh from centerline spline + walls + checkpoints
    tracks.js          # 3 track definitions (control points, theme color)
    items.js           # item boxes + effects — UNIT TESTED
    race.js            # laps, checkpoints, positions, timer, standings — UNIT TESTED
  ui/
    hud.js             # speed, lap x/3, position, timer, item slot
    menus.js           # title, track select, results screens
```

Boundary rule: `physics.js`, `race.js`, `items.js` are **pure logic** (no
Three.js imports) so they are deterministically unit-testable. Rendering modules
own all Three.js objects.

## 4. Game States

`TITLE → TRACK_SELECT → RACE → RESULTS → (back to TRACK_SELECT)`, with `PAUSE`
overlaying `RACE`. State machine lives in `main.js`.

## 5. Gameplay (First Playable)

- **3 procedural neon tracks** + a track-select menu.
- **Player + 3 AI racers**; **3 laps** per race.
- **Checkpoint-validated lap counting** (must pass checkpoints in order to count
  a lap — prevents reverse/shortcut cheating).
- Live **position** (1st–4th), **lap counter** (x/3), lap + total **timer**,
  **results screen** with finishing order and times.
- **Item boxes** on track; driving over one grants a random item:
  - **Boost** — temporary top-speed + acceleration burst.
  - **Shock** — briefly spins out nearby rival karts.
  - **Oil slick** — drop a hazard that spins karts that hit it.
- **Drift**: holding handbrake reduces lateral grip for a controlled slide (feel
  only; no manual mini-turbo charge in v1).

## 6. Controls (keyboard AND mouse both active)

| Action       | Keyboard            | Mouse                      |
|--------------|---------------------|----------------------------|
| Steer        | ← → / A D           | horizontal pointer position |
| Throttle     | ↑ / W               | left-click hold            |
| Brake/Reverse| ↓ / S               | —                          |
| Drift/Handbrake | Space            | —                          |
| Use item     | Shift / Ctrl        | right-click                |
| Pause        | Esc                 | —                          |

`input.js` merges both into one `InputState { steer:-1..1, throttle:0..1,
brake:0..1, drift:bool, useItem:bool }` so the kart code is input-source-agnostic.

## 7. Physics Model

Per fixed step on each kart:
1. Throttle applies force along heading; brake decelerates / reverses.
2. Decompose velocity into forward/lateral; **lateral grip** scrubs sideways
   velocity (grip lower while drifting → slide).
3. Steering rate scales with speed (no steering at standstill, reduced at top
   speed).
4. Rolling friction + air drag cap top speed.
5. **Wall collision**: push back along normal + scrub speed.
6. **Off-track** (on grid, off ribbon): apply slow-down multiplier.

All tunables (accel, maxSpeed, grip, driftGrip, steerRate, friction) live in one
config object in `physics.js`.

## 8. AI

Each CPU kart follows the track's waypoint list with a lookahead steering
controller toward a point ahead on the spline, randomized target speed per
racer, and light **rubber-banding** (slightly faster when behind the player,
slightly slower when ahead) to keep races close. AI also collects and uses items.

## 9. Tracks

`tracks.js` exports 3 track definitions as arrays of 2D control points + a theme
neon color + item-box placements. `track.js` builds a Catmull-Rom spline through
them, extrudes a ribbon mesh with neon edge walls, samples evenly-spaced
**waypoints** (for AI) and **checkpoints** (for lap validation), and computes the
start/finish line + grid start positions.

## 10. Testing

- **Vitest** unit tests (pure logic, deterministic):
  - `physics.js`: acceleration increases speed; friction decays it; speed clamps
    to max; lateral grip reduces sideways velocity; off-track multiplier applies.
  - `race.js`: checkpoints must be hit in order; lap increments only on full
    valid loop; position sort by (laps, checkpoint progress, distance).
  - `items.js`: each item applies its documented effect; boost expires; oil
    placement registers a hazard.
  - track spline sampling returns monotonic, evenly-spaced waypoints.
- **Playwright** smoke test: page boots, `<canvas>` mounts, title→track-select→
  race transition works, **no console errors**.
- Visual/feel: validated manually in-browser with screenshots.

## 11. Build Approach (the "swarm")

After the implementation plan, fan out a ruflo swarm of parallel named agents
coordinating via SendMessage:
- **render** — scene, skybox, grid, postfx, materials, aesthetic.
- **physics** — kart + arcade physics + input.
- **track-ai** — track/tracks generation + AI racers.
- **gameplay** — items + race logic (laps/positions/timer).
- **ui** — HUD + menus + state machine wiring.
- **tester** — Vitest + Playwright suites.

Lead integrates the modules, runs build + tests, and verifies the playable build
in-browser.

## 12. Out of Scope (v1 / YAGNI)

Manual mini-turbo charge, online multiplayer, gamepad support, custom track
editor, mobile touch controls, persistent leaderboards, more than 3 items.
