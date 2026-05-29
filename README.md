# 🏎️ NEON DRIFT

> A browser-based **3D synthwave kart racer**. Glowing neon karts, a Tron-style
> grid floor, an 80s sunset sky with bloom, AI rivals, item pickups, and three
> progressively gnarlier tracks. Buckle up. 🌆✨

🟪🟦🟧 _Steer with the arrow keys, drift through the neon, and beat the clock._
**MVP — and very playable.**

---

## 🎮 Just want to play?

You only need two things: **Node** and **pnpm** (see [Prerequisites](#-prerequisites)).
Then, from a terminal in this folder:

```bash
pnpm install      # one-time setup
pnpm dev          # then open the http://localhost URL it prints
```

That's it — your browser opens the title screen. Pick a track, wait for the
**3‑2‑1‑GO**, and race! 🏁

> 💡 Not sure what a "terminal" is? It's the text-command app on your computer
> (**Terminal** on Mac, **PowerShell** on Windows). Copy the commands above,
> paste them in, press Enter.

### ⌨️ Controls

Press **L** in-game to toggle the controls legend any time.

| Action             | Keyboard     | Mouse                       |
| ------------------ | ------------ | --------------------------- |
| 🏎️ Steer           | ← → / A D    | move pointer (hold L-click) |
| 🚀 Throttle        | ↑ / W        | hold left-click             |
| 🛑 Brake / reverse | ↓ / S        | —                           |
| 💨 Drift           | Space        | —                           |
| 🎁 Use item        | Shift / Ctrl | right-click                 |
| ⏸️ Pause           | Esc          | —                           |

### 🕹️ What to expect

- 🗺️ **3 tracks**, each longer with more laps: **NEON CIRCUIT** (3), **SUNSET
  LOOP** (5), **GRID RUNNER** (8).
- 🤖 **3 AI opponents** that share your top speed — no cheating, just close racing.
- 🎁 **Item pickups** — the shape tells you the bonus:
  - 🔺 cone = **Boost**
  - 🔷 octahedron = **Shock** (spins nearby rivals)
  - 🔶 icosahedron = **Oil** (drop a slick behind you)
- 🏁 A glowing **start/finish line** you cross each lap — it flips to a neon
  **checkerboard** on the final lap.
- 📊 HUD tracks lap, position, total time, current-lap time, **best lap**, and
  the **time remaining** before the per-track timeout.
- ⚡ Top speed ≈ **325 km/h**.

---

## ✅ Prerequisites

| Tool       | Version   | Why                                                        |
| ---------- | --------- | ---------------------------------------------------------- |
| 🟢 Node.js | **>= 26** | Runs the dev server and build tooling                      |
| 📦 pnpm    | **>= 11** | Package manager — this repo enforces it (`npm` is blocked) |
| 🌐 Browser | Modern    | Any recent Chrome / Firefox / Edge / Safari with WebGL     |

Don't have them yet?

- **Node** → install from [nodejs.org](https://nodejs.org/) (pick v26+).
- **pnpm** → after Node, run `npm install -g pnpm` (or see
  [pnpm.io/installation](https://pnpm.io/installation)).

Check what you have:

```bash
node -v     # should print v26.x or higher
pnpm -v     # should print 11.x or higher
```

---

## 🚀 Getting started (developers)

```bash
pnpm install            # install dependencies
pnpm dev                # hot-reloading dev server
```

Build and preview a static production bundle:

```bash
pnpm build              # outputs to dist/
pnpm preview            # serve the built bundle locally
```

### 🛠️ Scripts

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

CI (`.github/workflows/ci.yml`) runs the full `check` + `audit` + `build` plus a
Firefox e2e job on Node 26 / pnpm. Dependabot keeps deps and Actions current.

### 🧱 Architecture

Pure game logic (`src/game/physics.js`, `race.js`, `items.js`, and the track
sampling in `track.js`) has **no Three.js imports** and is unit-tested.
Rendering modules under `src/render/` own all Three.js objects. `src/game/world.js`
orchestrates a race; `src/main.js` is the title → select → race → results state
machine.

See `docs/superpowers/specs/` and `docs/superpowers/plans/` for the design spec
and implementation plan.

---

## 📚 Sources & tech stack

The shoulders this game stands on:

| Tech                 | Role                                 | Link                                                       |
| -------------------- | ------------------------------------ | ---------------------------------------------------------- |
| 🎲 **Three.js**      | 3D rendering / WebGL scene graph     | <https://threejs.org/>                                     |
| ⚡ **Vite**          | Dev server + production bundler      | <https://vite.dev/>                                        |
| 🟢 **Node.js**       | JavaScript runtime                   | <https://nodejs.org/>                                      |
| 📦 **pnpm**          | Fast, disk-efficient package manager | <https://pnpm.io/>                                         |
| 🧪 **Vitest**        | Unit testing                         | <https://vitest.dev/>                                      |
| 🎭 **Playwright**    | End-to-end browser testing           | <https://playwright.dev/>                                  |
| 📐 **TypeScript**    | Type-checking (`checkJs` over JS)    | <https://www.typescriptlang.org/>                          |
| 🔍 **ESLint**        | Linting (flat config)                | <https://eslint.org/>                                      |
| 💅 **Prettier**      | Code formatting                      | <https://prettier.io/>                                     |
| 🔊 **Web Audio API** | Sound effects                        | <https://developer.mozilla.org/docs/Web/API/Web_Audio_API> |
| 🖼️ **WebGL**         | Hardware-accelerated graphics        | <https://developer.mozilla.org/docs/Web/API/WebGL_API>     |

---

## 📄 License

Released under the [MIT License](LICENSE) — free to play, fork, and remix.

<sub>🌌 Built for casual gamers who want to drift, and for vibe coders who want to
read clean game logic. Have fun out there. 🏁</sub>
