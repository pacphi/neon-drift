# NEON DRIFT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A browser-playable 3D synthwave kart racer (Three.js + Vite) with custom arcade physics, 3 AI opponents, item boxes, lap/position tracking, and 3 selectable neon tracks.

**Architecture:** Vite ESM project. Pure-logic modules (`physics`, `race`, `items`, `track` sampling) have **no Three.js imports** and are Vitest-unit-tested. Render modules own all Three.js objects. A fixed-timestep loop drives `InputState → physics → race → render`. A top-level state machine sequences TITLE → TRACK_SELECT → RACE → RESULTS.

**Tech Stack:** Three.js (r160+), Vite, Vitest, Playwright, WebAudio. No external art/audio assets — everything procedural.

---

## File Structure

```
package.json, vite.config.js, vitest.config.js, index.html
src/
  main.js                # bootstrap + state machine
  config.js              # shared constants (palette, physics tunables, race rules)
  engine/loop.js         # fixed-timestep accumulator
  engine/input.js        # keyboard + mouse → unified InputState
  engine/audio.js        # WebAudio synth SFX
  render/scene.js        # renderer, chase camera, lights
  render/materials.js    # neon emissive material factory
  render/skybox.js       # gradient sky + sun
  render/grid.js         # neon grid floor
  render/postfx.js       # bloom + scanline/vignette composer
  game/physics.js        # PURE arcade step           [unit tested]
  game/kart.js           # kart entity (physics state + mesh)
  game/tracks.js         # 3 track data definitions
  game/track.js          # spline → mesh + waypoints + checkpoints  [sampling unit tested]
  game/ai.js             # waypoint-follow CPU racers
  game/items.js          # PURE item box + effects     [unit tested]
  game/race.js           # PURE laps/checkpoints/positions/timer  [unit tested]
  ui/hud.js              # DOM HUD overlay
  ui/menus.js            # DOM title/select/results screens
tests/
  physics.test.js, race.test.js, items.test.js, track.test.js
  e2e/smoke.spec.js
```

**Vector convention:** all pure-logic math uses plain `{x, z}` objects (ground plane; y is up and handled by render). Keeps logic Three.js-free and testable.

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.js`, `vitest.config.js`, `index.html`, `src/main.js`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "neon-drift",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test"
  },
  "dependencies": { "three": "^0.160.0" },
  "devDependencies": {
    "vite": "^5.0.0",
    "vitest": "^1.2.0",
    "@playwright/test": "^1.40.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.js` and `vitest.config.js`**

```js
// vite.config.js
import { defineConfig } from 'vite';
export default defineConfig({ base: './', server: { open: true } });
```

```js
// vitest.config.js
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['tests/**/*.test.js'] } });
```

- [ ] **Step 3: Create `index.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>NEON DRIFT</title>
  <style>
    html,body{margin:0;height:100%;background:#06000f;overflow:hidden;
      font-family:'Courier New',monospace;color:#0ff;}
    #app{position:fixed;inset:0;}
    canvas{display:block;width:100%;height:100%;}
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create placeholder `src/main.js`**

```js
console.log('NEON DRIFT boot');
```

- [ ] **Step 5: Install + verify dev server boots**

Run: `npm install && npm run build`
Expected: build succeeds, `dist/` produced.

- [ ] **Step 6: Commit**

```bash
git add package.json vite.config.js vitest.config.js index.html src/main.js package-lock.json
git commit -m "chore: scaffold Vite + Three.js project"
```

---

## Task 2: Shared config

**Files:**
- Create: `src/config.js`

- [ ] **Step 1: Create `src/config.js`** (single source of tunables)

```js
export const PALETTE = {
  magenta: 0xff2bd6, cyan: 0x18f0ff, lime: 0xaaff00,
  purple: 0x7a18ff, orange: 0xff7b00, bg: 0x06000f,
};
export const PHYSICS = {
  accel: 28, reverseAccel: 14, maxSpeed: 60, maxReverse: 14,
  friction: 8, brakeFriction: 26, steerRate: 2.4,
  grip: 9, driftGrip: 3.2, offTrackMul: 0.45, boostMul: 1.6,
};
export const RACE = { laps: 3, racerCount: 4 }; // player + 3 AI
export const ITEMS = ['boost', 'shock', 'oil'];
```

- [ ] **Step 2: Commit**

```bash
git add src/config.js && git commit -m "feat: shared config constants"
```

---

## Task 3: Physics (PURE, TDD)

**Files:**
- Create: `src/game/physics.js`
- Test: `tests/physics.test.js`

State shape: `{ pos:{x,z}, vel:{x,z}, heading:number, speed:number }`.
Input shape: `{ steer:-1..1, throttle:0..1, brake:0..1, drift:bool }`.

- [ ] **Step 1: Write failing tests**

```js
// tests/physics.test.js
import { describe, it, expect } from 'vitest';
import { createKartState, stepPhysics, forwardSpeed } from '../src/game/physics.js';
import { PHYSICS } from '../src/config.js';

const noInput = { steer: 0, throttle: 0, brake: 0, drift: false };

describe('physics', () => {
  it('throttle increases forward speed', () => {
    let s = createKartState({ x: 0, z: 0 });
    s = stepPhysics(s, { ...noInput, throttle: 1 }, 0.1, { offTrack: false });
    expect(forwardSpeed(s)).toBeGreaterThan(0);
  });

  it('friction decays speed when coasting', () => {
    let s = createKartState({ x: 0, z: 0 });
    s = stepPhysics(s, { ...noInput, throttle: 1 }, 0.5, { offTrack: false });
    const moving = forwardSpeed(s);
    s = stepPhysics(s, noInput, 0.5, { offTrack: false });
    expect(forwardSpeed(s)).toBeLessThan(moving);
  });

  it('forward speed never exceeds maxSpeed', () => {
    let s = createKartState({ x: 0, z: 0 });
    for (let i = 0; i < 200; i++) s = stepPhysics(s, { ...noInput, throttle: 1 }, 0.1, { offTrack: false });
    expect(forwardSpeed(s)).toBeLessThanOrEqual(PHYSICS.maxSpeed + 0.5);
  });

  it('off-track reduces achievable speed', () => {
    let on = createKartState({ x: 0, z: 0 }), off = createKartState({ x: 0, z: 0 });
    for (let i = 0; i < 100; i++) {
      on = stepPhysics(on, { ...noInput, throttle: 1 }, 0.1, { offTrack: false });
      off = stepPhysics(off, { ...noInput, throttle: 1 }, 0.1, { offTrack: true });
    }
    expect(forwardSpeed(off)).toBeLessThan(forwardSpeed(on));
  });

  it('steering rotates heading only while moving', () => {
    let s = createKartState({ x: 0, z: 0 });
    const h0 = s.heading;
    s = stepPhysics(s, { ...noInput, steer: 1 }, 0.1, { offTrack: false });
    expect(s.heading).toBeCloseTo(h0); // no movement, no turn
    s = stepPhysics(s, { ...noInput, throttle: 1 }, 0.2, { offTrack: false });
    s = stepPhysics(s, { ...noInput, steer: 1, throttle: 1 }, 0.1, { offTrack: false });
    expect(s.heading).not.toBeCloseTo(h0);
  });

  it('drift produces more lateral slide than gripping', () => {
    const mk = () => { let s = createKartState({ x: 0, z: 0 }); s.vel = { x: 5, z: 0 }; s.heading = 0; return s; };
    let grip = mk(), drift = mk();
    grip = stepPhysics(grip, noInput, 0.2, { offTrack: false });
    drift = stepPhysics(drift, { ...noInput, drift: true }, 0.2, { offTrack: false });
    expect(Math.abs(drift.vel.x)).toBeGreaterThan(Math.abs(grip.vel.x));
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- tests/physics.test.js`
Expected: FAIL (module/exports missing).

- [ ] **Step 3: Implement `src/game/physics.js`**

```js
import { PHYSICS as P } from '../config.js';

export function createKartState(pos = { x: 0, z: 0 }, heading = 0) {
  return { pos: { ...pos }, vel: { x: 0, z: 0 }, heading, speed: 0 };
}

// signed speed along the kart's heading
export function forwardSpeed(s) {
  const fx = Math.sin(s.heading), fz = Math.cos(s.heading);
  return s.vel.x * fx + s.vel.z * fz;
}

export function stepPhysics(s, input, dt, env = {}) {
  const offMul = env.offTrack ? P.offTrackMul : 1;
  const boost = env.boost ? P.boostMul : 1;
  const fx = Math.sin(s.heading), fz = Math.cos(s.heading);

  // longitudinal forces
  let fwd = s.vel.x * fx + s.vel.z * fz;
  if (input.throttle) fwd += P.accel * boost * input.throttle * dt;
  if (input.brake) {
    if (fwd > 0) fwd -= P.brakeFriction * input.brake * dt;
    else fwd -= P.reverseAccel * input.brake * dt;
  }
  // friction (coast)
  if (!input.throttle && !input.brake) fwd -= Math.sign(fwd) * Math.min(Math.abs(fwd), P.friction * dt);

  const maxF = P.maxSpeed * offMul * boost;
  fwd = Math.max(-P.maxReverse, Math.min(maxF, fwd));

  // recompose: forward component + decayed lateral component (grip)
  let lat = s.vel.x * fz - s.vel.z * fx; // perpendicular component (right vector = (fz,-fx))
  const grip = input.drift ? P.driftGrip : P.grip;
  lat -= Math.sign(lat) * Math.min(Math.abs(lat), grip * dt);

  s.vel.x = fwd * fx + lat * fz;
  s.vel.z = fwd * fz - lat * fx;

  // steering scales with speed (none at rest)
  const speedFactor = Math.min(1, Math.abs(fwd) / 12);
  s.heading += input.steer * P.steerRate * speedFactor * dt * Math.sign(fwd || 1);

  s.pos.x += s.vel.x * dt;
  s.pos.z += s.vel.z * dt;
  s.speed = Math.hypot(s.vel.x, s.vel.z);
  return s;
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- tests/physics.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/game/physics.js tests/physics.test.js
git commit -m "feat: pure arcade kart physics with tests"
```

---

## Task 4: Track data + spline sampling (sampling is TDD)

**Files:**
- Create: `src/game/tracks.js`, `src/game/track.js`
- Test: `tests/track.test.js`

- [ ] **Step 1: Create `src/game/tracks.js`** (data only — control points are closed loops)

```js
import { PALETTE } from '../config.js';

// Each track: closed loop of {x,z} control points (world units), neon theme, width.
export const TRACKS = [
  {
    name: 'NEON CIRCUIT', color: PALETTE.cyan, width: 14,
    points: [
      { x: 0, z: -80 }, { x: 70, z: -70 }, { x: 95, z: 0 }, { x: 70, z: 70 },
      { x: 0, z: 90 }, { x: -70, z: 70 }, { x: -95, z: 0 }, { x: -70, z: -70 },
    ],
  },
  {
    name: 'SUNSET LOOP', color: PALETTE.magenta, width: 13,
    points: [
      { x: 0, z: -70 }, { x: 60, z: -60 }, { x: 40, z: 0 }, { x: 80, z: 50 },
      { x: 0, z: 80 }, { x: -80, z: 50 }, { x: -40, z: 0 }, { x: -60, z: -60 },
    ],
  },
  {
    name: 'GRID RUNNER', color: PALETTE.lime, width: 12,
    points: [
      { x: -90, z: -50 }, { x: 0, z: -90 }, { x: 90, z: -50 }, { x: 60, z: 20 },
      { x: 90, z: 70 }, { x: 0, z: 50 }, { x: -90, z: 70 }, { x: -60, z: 20 },
    ],
  },
];
```

- [ ] **Step 2: Write failing tests for sampling**

```js
// tests/track.test.js
import { describe, it, expect } from 'vitest';
import { sampleLoop } from '../src/game/track.js';

const square = [{ x: -10, z: -10 }, { x: 10, z: -10 }, { x: 10, z: 10 }, { x: -10, z: 10 }];

describe('track sampling', () => {
  it('returns the requested number of waypoints', () => {
    const wp = sampleLoop(square, 64);
    expect(wp).toHaveLength(64);
  });
  it('waypoints form a closed loop (last near first)', () => {
    const wp = sampleLoop(square, 64);
    const d = Math.hypot(wp[0].x - wp[63].x, wp[0].z - wp[63].z);
    expect(d).toBeLessThan(5); // adjacent, not identical
  });
  it('consecutive waypoints are roughly evenly spaced', () => {
    const wp = sampleLoop(square, 64);
    const gaps = wp.map((p, i) => { const n = wp[(i + 1) % wp.length]; return Math.hypot(n.x - p.x, n.z - p.z); });
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    for (const g of gaps) expect(Math.abs(g - avg)).toBeLessThan(avg * 0.6);
  });
  it('each waypoint has a forward tangent of unit length', () => {
    const wp = sampleLoop(square, 32);
    for (const p of wp) expect(Math.hypot(p.tx, p.tz)).toBeCloseTo(1, 1);
  });
});
```

- [ ] **Step 3: Run tests, verify fail**

Run: `npm test -- tests/track.test.js`
Expected: FAIL (`sampleLoop` undefined).

- [ ] **Step 4: Implement sampling in `src/game/track.js`** (pure part first; mesh-building added in Task 9 render and must NOT break this export)

```js
// Catmull-Rom closed-loop sampler. Pure, no Three.js.
function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  const f = (a, b, c, d) =>
    0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return { x: f(p0.x, p1.x, p2.x, p3.x), z: f(p0.z, p1.z, p2.z, p3.z) };
}

// Returns `count` evenly-spaced points along the closed spline, each with unit tangent {tx,tz}.
export function sampleLoop(points, count = 200) {
  const n = points.length;
  // dense sample first, then resample by arc length for even spacing
  const dense = [];
  const per = 40;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
    for (let j = 0; j < per; j++) dense.push(catmull(p0, p1, p2, p3, j / per));
  }
  // cumulative length
  const len = [0];
  for (let i = 1; i <= dense.length; i++) {
    const a = dense[i - 1], b = dense[i % dense.length];
    len.push(len[i - 1] + Math.hypot(b.x - a.x, b.z - a.z));
  }
  const total = len[dense.length];
  const out = [];
  for (let k = 0; k < count; k++) {
    const target = (k / count) * total;
    let i = 1; while (i < dense.length && len[i] < target) i++;
    const a = dense[i - 1], b = dense[i % dense.length];
    const seg = len[i] - len[i - 1] || 1;
    const f = (target - len[i - 1]) / seg;
    const x = a.x + (b.x - a.x) * f, z = a.z + (b.z - a.z) * f;
    out.push({ x, z });
  }
  // tangents
  for (let k = 0; k < count; k++) {
    const nx = out[(k + 1) % count], p = out[k];
    let tx = nx.x - p.x, tz = nx.z - p.z;
    const m = Math.hypot(tx, tz) || 1; p.tx = tx / m; p.tz = tz / m;
  }
  return out;
}
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npm test -- tests/track.test.js`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/game/tracks.js src/game/track.js tests/track.test.js
git commit -m "feat: track data + arc-length spline sampling with tests"
```

---

## Task 5: Items (PURE, TDD)

**Files:**
- Create: `src/game/items.js`
- Test: `tests/items.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/items.test.js
import { describe, it, expect } from 'vitest';
import { rollItem, applyItem, tickEffects, createEffectState } from '../src/game/items.js';

describe('items', () => {
  it('rollItem returns a known item id', () => {
    const seq = [0, 0.5, 0.99].map(r => rollItem(() => r));
    for (const it of seq) expect(['boost', 'shock', 'oil']).toContain(it);
  });
  it('boost sets a timed boost flag that expires', () => {
    let fx = createEffectState();
    fx = applyItem(fx, 'boost');
    expect(fx.boost).toBe(true);
    fx = tickEffects(fx, 5); // 5s > boost duration
    expect(fx.boost).toBe(false);
  });
  it('shock returns spin targets within radius', () => {
    const self = { pos: { x: 0, z: 0 }, heading: 0 };
    const rivals = [
      { id: 1, pos: { x: 3, z: 0 } },   // near
      { id: 2, pos: { x: 999, z: 0 } }, // far
    ];
    const r = applyItem(createEffectState(), 'shock', { self, rivals });
    expect(r.spun).toContain(1);
    expect(r.spun).not.toContain(2);
  });
  it('oil registers a hazard at the dropping kart position', () => {
    const self = { pos: { x: 5, z: 7 }, heading: 0 };
    const r = applyItem(createEffectState(), 'oil', { self });
    expect(r.hazards[0]).toMatchObject({ x: 5, z: 7 });
  });
});
```

- [ ] **Step 2: Run tests, verify fail**

Run: `npm test -- tests/items.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement `src/game/items.js`**

```js
import { ITEMS } from '../config.js';

const BOOST_DURATION = 2.5; // seconds
const SHOCK_RADIUS = 18;

export function createEffectState() {
  return { boost: false, boostT: 0, spun: [], hazards: [] };
}

export function rollItem(rng = Math.random) {
  return ITEMS[Math.floor(rng() * ITEMS.length) % ITEMS.length];
}

// Returns a NEW effect state with the item applied. ctx: { self, rivals }
export function applyItem(fx, item, ctx = {}) {
  const next = { ...fx, spun: [...fx.spun], hazards: [...fx.hazards] };
  if (item === 'boost') { next.boost = true; next.boostT = BOOST_DURATION; }
  if (item === 'shock' && ctx.rivals) {
    next.spun = ctx.rivals
      .filter(r => Math.hypot(r.pos.x - ctx.self.pos.x, r.pos.z - ctx.self.pos.z) <= SHOCK_RADIUS)
      .map(r => r.id);
  }
  if (item === 'oil' && ctx.self) next.hazards.push({ x: ctx.self.pos.x, z: ctx.self.pos.z, t: 12 });
  return next;
}

export function tickEffects(fx, dt) {
  const next = { ...fx, hazards: fx.hazards.map(h => ({ ...h, t: h.t - dt })).filter(h => h.t > 0) };
  if (next.boost) { next.boostT = fx.boostT - dt; if (next.boostT <= 0) { next.boost = false; next.boostT = 0; } }
  next.spun = []; // spin events are consumed each frame by the caller
  return next;
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- tests/items.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/game/items.js tests/items.test.js
git commit -m "feat: pure item effects with tests"
```

---

## Task 6: Race logic (PURE, TDD)

**Files:**
- Create: `src/game/race.js`
- Test: `tests/race.test.js`

Model: each racer has `{ id, lap, nextCp, cpProgress }`. Track has `checkpointCount` (waypoint indices designated as checkpoints, in order; index 0 = start/finish). A lap counts when a racer crosses every checkpoint in order and returns to checkpoint 0.

- [ ] **Step 1: Write failing tests**

```js
// tests/race.test.js
import { describe, it, expect } from 'vitest';
import { createRace, passCheckpoint, standings, isFinished } from '../src/game/race.js';

describe('race', () => {
  it('lap only increments after all checkpoints hit in order', () => {
    let r = createRace([{ id: 'p' }], { checkpointCount: 4, laps: 3 });
    r = passCheckpoint(r, 'p', 1);
    r = passCheckpoint(r, 'p', 2);
    r = passCheckpoint(r, 'p', 3);
    expect(r.racers.p.lap).toBe(0);
    r = passCheckpoint(r, 'p', 0); // crossing finish completes lap
    expect(r.racers.p.lap).toBe(1);
  });
  it('out-of-order checkpoint is ignored', () => {
    let r = createRace([{ id: 'p' }], { checkpointCount: 4, laps: 3 });
    r = passCheckpoint(r, 'p', 2); // skipped 1
    expect(r.racers.p.nextCp).toBe(1);
  });
  it('standings sort by lap then checkpoint progress', () => {
    let r = createRace([{ id: 'a' }, { id: 'b' }], { checkpointCount: 4, laps: 3 });
    r = passCheckpoint(r, 'a', 1);
    r = passCheckpoint(r, 'a', 2);
    r = passCheckpoint(r, 'b', 1);
    const order = standings(r).map(s => s.id);
    expect(order[0]).toBe('a');
  });
  it('isFinished true when racer reaches lap target', () => {
    let r = createRace([{ id: 'p' }], { checkpointCount: 1, laps: 2 });
    r = passCheckpoint(r, 'p', 0);
    r = passCheckpoint(r, 'p', 0);
    expect(isFinished(r, 'p')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests, verify fail**

Run: `npm test -- tests/race.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement `src/game/race.js`**

```js
export function createRace(racers, { checkpointCount, laps }) {
  const map = {};
  for (const r of racers) map[r.id] = { id: r.id, lap: 0, nextCp: 1 % checkpointCount, cpHits: 0, time: 0, finished: false };
  return { racers: map, checkpointCount, laps, time: 0 };
}

// Called when a racer crosses checkpoint index `cp`. Only the expected next cp advances progress.
export function passCheckpoint(race, id, cp) {
  const r = race.racers[id];
  if (!r || r.finished) return race;
  const expected = r.nextCp;
  if (cp !== expected) return race; // out of order: ignore
  r.cpHits++;
  if (cp === 0) { // completed a full loop back to start/finish
    r.lap++;
    if (r.lap >= race.laps) { r.finished = true; r.finishTime = race.time; }
  }
  r.nextCp = (cp + 1) % race.checkpointCount;
  return race;
}

// progress score for sorting: laps dominate, then checkpoints hit
function progress(r) { return r.lap * 1e6 + r.cpHits; }

export function standings(race) {
  return Object.values(race.racers).slice().sort((a, b) => progress(b) - progress(a));
}

export function isFinished(race, id) { return !!race.racers[id]?.finished; }
export function allFinished(race) { return Object.values(race.racers).every(r => r.finished); }
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- tests/race.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/game/race.js tests/race.test.js
git commit -m "feat: pure race/lap/position logic with tests"
```

---

## Task 7: Input abstraction

**Files:**
- Create: `src/engine/input.js`

- [ ] **Step 1: Implement `src/engine/input.js`** (merges keyboard + mouse into one InputState)

```js
// Unified InputState: { steer:-1..1, throttle:0..1, brake:0..1, drift:bool, useItem:bool, pause:bool }
export function createInput(target = window, canvas = document.body) {
  const keys = new Set();
  let mouseSteer = 0, mouseThrottle = 0, mouseItem = false, pausePressed = false;

  const onKey = (e, down) => {
    const k = e.key.toLowerCase();
    if (down) keys.add(k); else keys.delete(k);
    if (down && k === 'escape') pausePressed = true;
    if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
  };
  target.addEventListener('keydown', e => onKey(e, true));
  target.addEventListener('keyup', e => onKey(e, false));
  canvas.addEventListener('mousemove', e => {
    const w = canvas.clientWidth || window.innerWidth;
    mouseSteer = Math.max(-1, Math.min(1, (e.clientX / w) * 2 - 1));
  });
  canvas.addEventListener('mousedown', e => { if (e.button === 0) mouseThrottle = 1; if (e.button === 2) mouseItem = true; });
  canvas.addEventListener('mouseup',   e => { if (e.button === 0) mouseThrottle = 0; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  function sample() {
    const has = (...k) => k.some(x => keys.has(x));
    let steer = 0;
    if (has('arrowleft', 'a')) steer -= 1;
    if (has('arrowright', 'd')) steer += 1;
    if (steer === 0) steer = mouseSteer;
    const throttle = Math.max(has('arrowup', 'w') ? 1 : 0, mouseThrottle);
    const brake = has('arrowdown', 's') ? 1 : 0;
    const drift = has(' ');
    const useItem = has('shift', 'control') || mouseItem;
    const pause = pausePressed;
    pausePressed = false; mouseItem = false; // edge-consume
    return { steer, throttle, brake, drift, useItem, pause };
  }
  return { sample };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/input.js && git commit -m "feat: unified keyboard+mouse input"
```

---

## Task 8: Fixed-timestep loop

**Files:**
- Create: `src/engine/loop.js`

- [ ] **Step 1: Implement `src/engine/loop.js`**

```js
// Fixed-timestep accumulator. update(dt) called at fixed 60Hz; render(alpha) every frame.
export function createLoop(update, render, step = 1 / 60) {
  let acc = 0, last = 0, raf = 0, running = false;
  function frame(now) {
    if (!running) return;
    const t = now / 1000;
    let dt = t - last; last = t;
    if (dt > 0.25) dt = 0.25; // clamp after tab-out
    acc += dt;
    while (acc >= step) { update(step); acc -= step; }
    render(acc / step);
    raf = requestAnimationFrame(frame);
  }
  return {
    start() { if (running) return; running = true; last = performance.now() / 1000; raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/loop.js && git commit -m "feat: fixed-timestep game loop"
```

---

## Task 9: Render foundation — scene, materials, skybox, grid, postfx

**Files:**
- Create: `src/render/scene.js`, `src/render/materials.js`, `src/render/skybox.js`, `src/render/grid.js`, `src/render/postfx.js`
- Modify: `src/game/track.js` (add `buildTrackMesh` using `sampleLoop`)

> Render modules are validated in-browser (no unit tests). Each must export the interface other modules expect.

- [ ] **Step 1: `src/render/materials.js`** — neon emissive factory

```js
import * as THREE from 'three';
export function neon(color, intensity = 1.4) {
  return new THREE.MeshStandardMaterial({
    color: 0x000000, emissive: color, emissiveIntensity: intensity,
    metalness: 0.2, roughness: 0.4,
  });
}
export function neonLine(color) { return new THREE.LineBasicMaterial({ color }); }
```

- [ ] **Step 2: `src/render/scene.js`** — renderer + chase camera + lights

```js
import * as THREE from 'three';
import { PALETTE } from '../config.js';
export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(PALETTE.bg, 120, 420);
  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 2000);
  scene.add(new THREE.AmbientLight(0x4040ff, 0.6));
  const dir = new THREE.DirectionalLight(0xff66ff, 0.8); dir.position.set(0, 100, -50); scene.add(dir);
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  // chase camera: follows target {pos,heading} with smoothing
  const camPos = new THREE.Vector3();
  function follow(target, dt) {
    const back = 16, up = 7;
    const tx = target.pos.x - Math.sin(target.heading) * back;
    const tz = target.pos.z - Math.cos(target.heading) * back;
    camPos.set(tx, up, tz);
    camera.position.lerp(camPos, Math.min(1, dt * 6));
    camera.lookAt(target.pos.x, 2, target.pos.z);
  }
  return { renderer, scene, camera, follow };
}
```

- [ ] **Step 3: `src/render/skybox.js`** — synthwave gradient + sun (shader on a back sphere)

```js
import * as THREE from 'three';
export function createSky() {
  const uniforms = { top: { value: new THREE.Color(0x1b0a40) }, mid: { value: new THREE.Color(0xff2bd6) }, bot: { value: new THREE.Color(0xff7b00) } };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms,
    vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vP; uniform vec3 top,mid,bot;
      void main(){ float h=normalize(vP).y; vec3 c = h>0.0 ? mix(mid,top,h) : mix(mid,bot,-h);
      float sun = smoothstep(0.18,0.0,abs(h-0.05)); c += sun*vec3(1.0,0.5,0.1)*step(0.0,0.06-abs(h-0.05));
      gl_FragColor=vec4(c,1.0); }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), mat);
}
```

- [ ] **Step 4: `src/render/grid.js`** — neon Tron floor

```js
import * as THREE from 'three';
import { PALETTE } from '../config.js';
export function createGrid() {
  const g = new THREE.GridHelper(2000, 200, PALETTE.cyan, PALETTE.purple);
  g.material.opacity = 0.35; g.material.transparent = true; g.position.y = -0.05;
  return g;
}
```

- [ ] **Step 5: Add `buildTrackMesh` to `src/game/track.js`** (uses existing `sampleLoop`; designates N checkpoints)

```js
import * as THREE from 'three';
import { neon } from '../render/materials.js';
// ...keep existing sampleLoop above...

// Builds ribbon mesh + walls; returns { mesh, waypoints, checkpoints, startPositions, halfWidth }
export function buildTrackMesh(track, { waypointCount = 240, checkpointCount = 12 } = {}) {
  const wp = sampleLoop(track.points, waypointCount);
  const hw = track.width / 2;
  const verts = [], idx = [];
  wp.forEach((p, i) => {
    const rx = p.tz, rz = -p.tx; // right vector
    verts.push(p.x + rx * hw, 0, p.z + rz * hw);
    verts.push(p.x - rx * hw, 0, p.z - rz * hw);
  });
  const n = wp.length;
  for (let i = 0; i < n; i++) {
    const a = (i * 2) % (n * 2), b = (i * 2 + 1) % (n * 2), c = ((i + 1) % n) * 2, d = ((i + 1) % n) * 2 + 1;
    idx.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const mesh = new THREE.Group();
  const road = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x0a0a18, emissive: track.color, emissiveIntensity: 0.12, side: THREE.DoubleSide }));
  mesh.add(road);
  // glowing edge lines
  const edge = (offset) => {
    const pts = wp.map(p => new THREE.Vector3(p.x + p.tz * offset, 0.1, p.z - p.tx * offset));
    pts.push(pts[0].clone());
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: track.color }));
  };
  mesh.add(edge(hw)); mesh.add(edge(-hw));
  // checkpoints = evenly spaced waypoint indices (index 0 = start/finish)
  const checkpoints = [];
  for (let k = 0; k < checkpointCount; k++) checkpoints.push(Math.floor((k / checkpointCount) * n));
  // start grid: 4 karts staggered behind start line along -tangent
  const s = wp[0]; const startPositions = [];
  for (let i = 0; i < 4; i++) {
    const off = (i % 2 ? 1 : -1) * 3, back = Math.floor(i / 2) * 6 + 4;
    startPositions.push({ x: s.x - s.tx * back + s.tz * off, z: s.z - s.tz * back - s.tx * off, heading: Math.atan2(s.tx, s.tz) });
  }
  return { mesh, waypoints: wp, checkpoints, startPositions, halfWidth: hw };
}
```

- [ ] **Step 6: `src/render/postfx.js`** — bloom + scanline composer

```js
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const Scanline = {
  uniforms: { tDiffuse: { value: null }, h: { value: window.innerHeight } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float h; varying vec2 vUv;
    void main(){ vec4 c=texture2D(tDiffuse,vUv); float s=sin(vUv.y*h*3.14159)*0.04;
      float v=smoothstep(0.9,0.3,distance(vUv,vec2(0.5))); gl_FragColor=vec4(c.rgb*(1.0-s)*v,1.0); }`,
};

export function createComposer(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.1, 0.7, 0.2);
  composer.addPass(bloom);
  composer.addPass(new ShaderPass(Scanline));
  addEventListener('resize', () => composer.setSize(innerWidth, innerHeight));
  return composer;
}
```

- [ ] **Step 7: Verify track sampling tests still pass after edit**

Run: `npm test -- tests/track.test.js`
Expected: PASS (4 tests) — `sampleLoop` unchanged.

- [ ] **Step 8: Commit**

```bash
git add src/render src/game/track.js
git commit -m "feat: render foundation (scene, sky, grid, bloom) + track mesh"
```

---

## Task 10: Kart entity + AI

**Files:**
- Create: `src/game/kart.js`, `src/game/ai.js`

- [ ] **Step 1: `src/game/kart.js`** — wraps physics state + builds mesh

```js
import * as THREE from 'three';
import { createKartState } from './physics.js';
import { neon } from '../render/materials.js';

export function createKart(color, startPos) {
  const state = createKartState({ x: startPos.x, z: startPos.z }, startPos.heading);
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 3.4), neon(color, 1.2));
  body.position.y = 0.8; group.add(body);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 0.6), neon(0xffffff, 1.6));
  wing.position.set(0, 1.3, -1.6); group.add(wing);
  [-1, 1].forEach(sx => [-1.2, 1.2].forEach(sz => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12), neon(color, 0.8));
    w.rotation.z = Math.PI / 2; w.position.set(sx * 1.1, 0.5, sz); group.add(w);
  }));
  function sync() { group.position.set(state.pos.x, 0, state.pos.z); group.rotation.y = state.heading; }
  sync();
  return { state, group, sync, effects: null, item: null };
}
```

- [ ] **Step 2: `src/game/ai.js`** — waypoint follower + rubber-banding

```js
import { stepPhysics } from './physics.js';

// Computes an InputState steering the kart toward a lookahead waypoint.
export function aiInput(kart, waypoints, race, opts = {}) {
  const st = kart.state;
  // find nearest waypoint
  let best = 0, bd = Infinity;
  for (let i = 0; i < waypoints.length; i++) {
    const d = (waypoints[i].x - st.pos.x) ** 2 + (waypoints[i].z - st.pos.z) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  const look = waypoints[(best + (opts.lookahead || 6)) % waypoints.length];
  const desired = Math.atan2(look.x - st.pos.x, look.z - st.pos.z);
  let diff = desired - st.heading;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  const steer = Math.max(-1, Math.min(1, diff * 2));
  const throttle = Math.abs(diff) > 0.6 ? 0.6 : 1; // ease off in sharp turns
  return { steer, throttle, brake: 0, drift: Math.abs(diff) > 0.9, useItem: false, pause: false };
}

// rubber-band: returns env.boost-ish speed multiplier nudge based on placement
export function rubberBand(place, total) {
  if (place === 0) return 0.96;             // leader slightly slower
  return 1 + Math.min(0.12, place / total * 0.12); // trailing slightly faster
}

export function stepAI(kart, waypoints, dt, env, opts) {
  return stepPhysics(kart.state, aiInput(kart, waypoints, null, opts), dt, env);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/game/kart.js src/game/ai.js
git commit -m "feat: kart entity + waypoint AI with rubber-banding"
```

---

## Task 11: UI — HUD + menus

**Files:**
- Create: `src/ui/hud.js`, `src/ui/menus.js`

- [ ] **Step 1: `src/ui/hud.js`** — DOM overlay (speed, lap, position, timer, item)

```js
export function createHUD(root = document.body) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;pointer-events:none;font-family:"Courier New",monospace;text-shadow:0 0 8px currentColor;';
  el.innerHTML = `
    <div id="lap"  style="position:absolute;top:14px;left:18px;color:#18f0ff;font-size:28px;"></div>
    <div id="pos"  style="position:absolute;top:14px;right:18px;color:#ff2bd6;font-size:28px;"></div>
    <div id="time" style="position:absolute;top:52px;left:18px;color:#aaff00;font-size:20px;"></div>
    <div id="spd"  style="position:absolute;bottom:18px;right:24px;color:#18f0ff;font-size:34px;"></div>
    <div id="item" style="position:absolute;bottom:18px;left:24px;color:#fff;font-size:22px;border:2px solid #ff2bd6;padding:6px 12px;min-width:80px;text-align:center;"></div>`;
  root.appendChild(el);
  const $ = id => el.querySelector('#' + id);
  return {
    update({ lap, laps, place, total, time, speed, item }) {
      $('lap').textContent = `LAP ${Math.min(lap + 1, laps)}/${laps}`;
      $('pos').textContent = `${place}/${total}`;
      $('time').textContent = (time).toFixed(1) + 's';
      $('spd').textContent = Math.round(speed * 3.6) + ' km/h';
      $('item').textContent = item ? item.toUpperCase() : '—';
    },
    show(v) { el.style.display = v ? 'block' : 'none'; },
    destroy() { el.remove(); },
  };
}
```

- [ ] **Step 2: `src/ui/menus.js`** — title / track select / results (returns promises resolving to choices)

```js
import { TRACKS } from '../game/tracks.js';

function screen(html) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:rgba(6,0,15,.82);color:#18f0ff;font-family:"Courier New",monospace;text-align:center;z-index:10;';
  el.innerHTML = html; document.body.appendChild(el); return el;
}
const neonBtn = 'cursor:pointer;pointer-events:auto;background:transparent;border:2px solid #ff2bd6;color:#fff;padding:12px 26px;font-size:20px;font-family:inherit;text-shadow:0 0 8px #ff2bd6;';

export function titleScreen() {
  return new Promise(res => {
    const el = screen(`<h1 style="font-size:64px;color:#ff2bd6;text-shadow:0 0 18px #ff2bd6;letter-spacing:6px;">NEON DRIFT</h1>
      <p style="color:#aaff00;">Arrows / WASD to steer · Space to drift · Shift to use item</p>
      <button id="go" style="${neonBtn}">START</button>`);
    el.querySelector('#go').onclick = () => { el.remove(); res(); };
  });
}

export function trackSelect() {
  return new Promise(res => {
    const cards = TRACKS.map((t, i) => `<button class="tk" data-i="${i}" style="${neonBtn};border-color:#${t.color.toString(16).padStart(6,'0')};">${t.name}</button>`).join('');
    const el = screen(`<h2 style="color:#18f0ff;font-size:40px;">SELECT TRACK</h2><div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">${cards}</div>`);
    el.querySelectorAll('.tk').forEach(b => b.onclick = () => { el.remove(); res(Number(b.dataset.i)); });
  });
}

export function resultsScreen(order) {
  return new Promise(res => {
    const rows = order.map((r, i) => `<div style="font-size:24px;color:${i===0?'#aaff00':'#18f0ff'};">${i + 1}. ${r.name}${r.finishTime != null ? '  ' + r.finishTime.toFixed(1) + 's' : ''}</div>`).join('');
    const el = screen(`<h2 style="color:#ff2bd6;font-size:48px;">RESULTS</h2>${rows}<button id="again" style="${neonBtn}">RACE AGAIN</button>`);
    el.querySelector('#again').onclick = () => { el.remove(); res(); };
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/hud.js src/ui/menus.js
git commit -m "feat: HUD + neon menu screens"
```

---

## Task 12: Audio (WebAudio synth SFX)

**Files:**
- Create: `src/engine/audio.js`

- [ ] **Step 1: `src/engine/audio.js`**

```js
export function createAudio() {
  let ctx, engine;
  function ensure() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; }
  function blip(freq, dur = 0.12, type = 'square', gain = 0.12) {
    const c = ensure(); const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = gain;
    o.connect(g).connect(c.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur); o.stop(c.currentTime + dur);
  }
  return {
    resume() { ensure().resume?.(); },
    pickup() { blip(880, 0.1); blip(1320, 0.12); },
    boost() { blip(220, 0.3, 'sawtooth', 0.18); },
    hit() { blip(120, 0.2, 'square', 0.2); },
    startEngine() {
      const c = ensure(); engine = c.createOscillator(); const g = c.createGain();
      engine.type = 'sawtooth'; engine.frequency.value = 60; g.gain.value = 0.04;
      engine.connect(g).connect(c.destination); engine.start(); engine._g = g;
    },
    setRpm(speed01) { if (engine) engine.frequency.value = 60 + speed01 * 140; },
    stopEngine() { engine?.stop(); engine = null; },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/audio.js && git commit -m "feat: procedural WebAudio SFX"
```

---

## Task 13: Integration — wire everything in `main.js` + race scene

**Files:**
- Modify: `src/main.js` (full game), create `src/game/world.js` (per-race orchestration to keep main.js small)

- [ ] **Step 1: Create `src/game/world.js`** — owns one race instance (karts, track, items, race state, render sync)

```js
import * as THREE from 'three';
import { buildTrackMesh } from './track.js';
import { createKart } from './kart.js';
import { stepPhysics } from './physics.js';
import { aiInput, rubberBand } from './ai.js';
import { createRace, passCheckpoint, standings, allFinished, isFinished } from './race.js';
import { createEffectState, applyItem, tickEffects, rollItem } from './items.js';
import { neon } from '../render/materials.js';
import { PALETTE, RACE } from '../config.js';

const COLORS = [PALETTE.cyan, PALETTE.magenta, PALETTE.lime, PALETTE.orange];

export function createWorld(scene, track) {
  const built = buildTrackMesh(track, { checkpointCount: 12 });
  scene.add(built.mesh);

  const karts = [];
  for (let i = 0; i < RACE.racerCount; i++) {
    const k = createKart(COLORS[i], built.startPositions[i]);
    k.id = i === 0 ? 'player' : 'ai' + i;
    k.isPlayer = i === 0;
    k.effects = createEffectState();
    scene.add(k.group); karts.push(k);
  }
  const race = createRace(karts.map(k => ({ id: k.id })), { checkpointCount: 12, laps: RACE.laps });

  // item boxes: place at a few waypoints
  const boxes = [];
  [30, 90, 150, 210].forEach(wi => {
    const w = built.waypoints[wi % built.waypoints.length];
    const m = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), neon(0xffffff, 1.4));
    m.position.set(w.x, 1.5, w.z); scene.add(m);
    boxes.push({ mesh: m, x: w.x, z: w.z, active: true, cooldown: 0 });
  });
  const hazards = []; // {mesh,x,z,t}

  function nearestCheckpointCrossed(kart) {
    // detect crossing of the expected next checkpoint waypoint within radius
    const r = race.racers[kart.id];
    const cpIdx = built.checkpoints[r.nextCp];
    const w = built.waypoints[cpIdx];
    if (Math.hypot(kart.state.pos.x - w.x, kart.state.pos.z - w.z) < track.width) {
      passCheckpoint(race, kart.id, r.nextCp);
    }
  }

  function offTrack(kart) {
    // distance to nearest waypoint center > halfWidth ⇒ off track
    let bd = Infinity;
    for (const w of built.waypoints) { const d = (w.x - kart.state.pos.x) ** 2 + (w.z - kart.state.pos.z) ** 2; if (d < bd) bd = d; }
    return Math.sqrt(bd) > built.halfWidth + 1.5;
  }

  function place(kart) {
    const order = standings(race);
    return order.findIndex(s => s.id === kart.id) + 1;
  }

  function update(dt, playerInput, audio) {
    race.time += dt;
    karts.forEach((k, i) => {
      const input = k.isPlayer ? playerInput : aiInput(k, built.waypoints, race, { lookahead: 6 });
      // item use
      if (input.useItem && k.item) {
        const rivals = karts.filter(o => o !== k).map(o => ({ id: o.id, pos: o.state.pos }));
        k.effects = applyItem(k.effects, k.item, { self: { pos: k.state.pos, heading: k.state.heading }, rivals });
        if (k.item === 'boost') audio?.boost?.();
        if (k.item === 'oil') { const h = k.effects.hazards.at(-1); const m = new THREE.Mesh(new THREE.CircleGeometry(2.5, 16), neon(0x222200, 0.6)); m.rotation.x = -Math.PI / 2; m.position.set(h.x, 0.1, h.z); scene.add(m); hazards.push({ mesh: m, x: h.x, z: h.z, t: h.t }); }
        k.item = null;
      }
      // apply shock spins to rivals
      k.effects.spun.forEach(id => { const t = karts.find(x => x.id === id); if (t) t.state.spinT = 0.8; });

      const env = { offTrack: offTrack(k), boost: k.effects.boost };
      if (k.state.spinT > 0) { k.state.heading += dt * 12; k.state.spinT -= dt; }
      stepPhysics(k.state, input, dt, env);
      k.effects = tickEffects(k.effects, dt);
      nearestCheckpointCrossed(k);
      k.sync();
      if (k.isPlayer && audio) audio.setRpm?.(Math.min(1, k.state.speed / 60));
    });

    // item box pickups
    boxes.forEach(b => {
      b.mesh.rotation.y += dt * 2;
      if (!b.active) { b.cooldown -= dt; if (b.cooldown <= 0) { b.active = true; b.mesh.visible = true; } return; }
      for (const k of karts) if (Math.hypot(k.state.pos.x - b.x, k.state.pos.z - b.z) < 3 && !k.item) {
        k.item = rollItem(); b.active = false; b.mesh.visible = false; b.cooldown = 5;
        if (k.isPlayer) audio?.pickup?.();
      }
    });
    // hazards spin karts
    hazards.forEach(h => { for (const k of karts) if (Math.hypot(k.state.pos.x - h.x, k.state.pos.z - h.z) < 2.5) k.state.spinT = Math.max(k.state.spinT || 0, 0.6); });

    return allFinished(race) || isFinished(race, 'player');
  }

  const player = karts[0];
  function results() {
    return standings(race).map(s => ({ id: s.id, name: s.id === 'player' ? 'YOU' : s.id.toUpperCase(), finishTime: s.finishTime }));
  }
  function dispose() { scene.remove(built.mesh); karts.forEach(k => scene.remove(k.group)); boxes.forEach(b => scene.remove(b.mesh)); hazards.forEach(h => scene.remove(h.mesh)); }

  return { update, player, race, place, results, dispose, builtTrack: built };
}
```

- [ ] **Step 2: Rewrite `src/main.js`** — state machine tying menus, loop, world, render

```js
import { createScene } from './render/scene.js';
import { createSky } from './render/skybox.js';
import { createGrid } from './render/grid.js';
import { createComposer } from './render/postfx.js';
import { createInput } from './engine/input.js';
import { createLoop } from './engine/loop.js';
import { createAudio } from './engine/audio.js';
import { createHUD } from './ui/hud.js';
import { titleScreen, trackSelect, resultsScreen } from './ui/menus.js';
import { createWorld } from './game/world.js';
import { TRACKS } from './game/tracks.js';
import { RACE } from './config.js';

const app = document.getElementById('app');
const { renderer, scene, camera, follow } = createScene(app);
scene.add(createSky()); scene.add(createGrid());
const composer = createComposer(renderer, scene, camera);
const input = createInput(window, renderer.domElement);
const audio = createAudio();
const hud = createHUD(); hud.show(false);

let world = null, paused = false, finished = false;

const loop = createLoop(
  (dt) => {
    if (!world || paused) return;
    const inp = input.sample();
    if (inp.pause) paused = !paused;
    finished = world.update(dt, inp, audio);
    follow(world.player.state, dt);
    hud.update({
      lap: world.race.racers.player.lap, laps: RACE.laps,
      place: world.place(world.player), total: RACE.racerCount,
      time: world.race.time, speed: world.player.state.speed,
      item: world.player.item,
    });
    if (finished) endRace();
  },
  () => composer.render(),
);
loop.start();

async function endRace() {
  const order = world.results();
  hud.show(false); audio.stopEngine();
  world.dispose(); world = null; finished = false;
  await resultsScreen(order);
  startFlow();
}

async function startFlow() {
  const idx = await trackSelect();
  audio.resume(); audio.startEngine();
  world = createWorld(scene, TRACKS[idx]);
  hud.show(true);
}

(async function boot() {
  await titleScreen();
  startFlow();
})();
```

- [ ] **Step 3: Run full build + unit tests**

Run: `npm run build && npm test`
Expected: build succeeds; all unit tests (physics, track, items, race) PASS.

- [ ] **Step 4: Manual in-browser verification**

Run: `npm run dev`
Verify: title → track select → race renders with neon grid/sky/bloom; kart drives with arrows + mouse; item boxes spin and grant items; HUD updates lap/position/timer/speed; 3 laps → results screen → race again loops. No console errors.

- [ ] **Step 5: Commit**

```bash
git add src/game/world.js src/main.js
git commit -m "feat: integrate full playable race loop + state machine"
```

---

## Task 14: E2E smoke test

**Files:**
- Create: `tests/e2e/smoke.spec.js`, `playwright.config.js`

- [ ] **Step 1: `playwright.config.js`**

```js
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  webServer: { command: 'npm run dev', port: 5173, reuseExistingServer: true },
  use: { baseURL: 'http://localhost:5173' },
});
```

- [ ] **Step 2: `tests/e2e/smoke.spec.js`**

```js
import { test, expect } from '@playwright/test';

test('boots and reaches a race without console errors', async ({ page }) => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByText('START').click();
  await expect(page.getByText('SELECT TRACK')).toBeVisible();
  await page.locator('.tk').first().click();
  await page.waitForTimeout(1500); // race renders
  await expect(page.locator('#lap')).toContainText('LAP');
  expect(errors).toEqual([]);
});
```

- [ ] **Step 3: Run E2E**

Run: `npx playwright install --with-deps chromium && npm run e2e`
Expected: 1 test PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/smoke.spec.js playwright.config.js
git commit -m "test: playwright smoke test for boot→race"
```

---

## Task 15: README + final polish pass

**Files:**
- Create: `README.md`

- [ ] **Step 1: `README.md`** — how to run/play

```md
# NEON DRIFT
A synthwave 3D kart racer in the browser. Three.js + Vite.

## Run
npm install
npm run dev    # play at http://localhost:5173

## Test
npm test       # unit (physics, race, items, track)
npm run e2e    # playwright smoke

## Controls
Steer: ← → / A D or mouse  · Throttle: ↑ / W or left-click · Brake: ↓ / S
Drift: Space · Item: Shift / right-click · Pause: Esc
```

- [ ] **Step 2: Final verification**

Run: `npm run build && npm test`
Expected: build clean, all unit tests pass.

- [ ] **Step 3: Commit**

```bash
git add README.md && git commit -m "docs: README with run/play instructions"
```

---

## Self-Review Notes

- **Spec coverage:** aesthetic (Task 9), tech/Vite (Task 1), modules (all), states (Task 13), gameplay items/laps/positions (Tasks 5/6/13), controls kb+mouse (Task 7), physics (Task 3), AI+rubber-band (Task 10), 3 tracks+select (Tasks 4/11), testing Vitest+Playwright (Tasks 3-6,14). ✅
- **Pure-logic isolation:** physics/items/race/sampleLoop have no Three.js imports → unit testable. ✅
- **Type consistency:** kart state `{pos:{x,z},vel:{x,z},heading,speed}` used identically across physics/kart/ai/world; race racer keys `id/lap/nextCp/cpHits/finished` consistent; `buildTrackMesh` returns `{mesh,waypoints,checkpoints,startPositions,halfWidth}` consumed in world.js. ✅
- **Checkpoint count:** fixed at 12 in both `buildTrackMesh` call and `createRace` in world.js. ✅
