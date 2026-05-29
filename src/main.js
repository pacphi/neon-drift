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
const { renderer, scene, camera, follow, resetCamera } = createScene(app);
scene.add(createSky());
scene.add(createGrid());
const composer = createComposer(renderer, scene, camera);
const input = createInput(window, renderer.domElement);
const audio = createAudio();
const hud = createHUD();
hud.show(false);

let world = null,
  paused = false,
  finished = false;
let countdown = 0,
  lastBeep = -99; // countdown > 0 freezes the sim until GO

const pauseEl = document.createElement('div');
pauseEl.textContent = 'PAUSED — press ESC to resume';
pauseEl.style.cssText =
  'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(6,0,15,.6);color:#ff2bd6;font-family:"Courier New",monospace;font-size:32px;text-shadow:0 0 12px #ff2bd6;z-index:8;';
document.body.appendChild(pauseEl);

const cdEl = document.createElement('div');
cdEl.style.cssText =
  'position:fixed;inset:0;display:none;align-items:center;justify-content:center;color:#aaff00;font-family:"Courier New",monospace;font-size:140px;font-weight:bold;text-shadow:0 0 30px #aaff00;z-index:9;pointer-events:none;';
document.body.appendChild(cdEl);

let goTimer = 0; // seconds the "GO!" banner stays up after countdown ends
function startCountdown() {
  countdown = 3.0;
  lastBeep = -99;
  goTimer = 0;
} // shows 3, 2, 1, GO

const loop = createLoop(
  (dt) => {
    if (!world) return;
    // sample input every frame (even while paused) so ESC can always toggle
    const inp = input.sample();
    if (inp.legend) hud.toggleLegend();
    if (inp.pause) {
      paused = !paused;
      pauseEl.style.display = paused ? 'flex' : 'none';
      if (paused) {
        audio.suspend();
      } else {
        audio.resume();
        startCountdown();
      } // re-countdown on resume
    }
    if (paused) return; // frozen: keep rendering the last frame, skip simulation

    // race-start / resume countdown: freeze the sim, show 3-2-1 with beeps
    if (countdown > 0) {
      countdown -= dt;
      const n = Math.max(1, Math.ceil(countdown));
      if (n !== lastBeep) {
        lastBeep = n;
        audio.beep();
      }
      cdEl.style.display = 'flex';
      cdEl.textContent = String(n);
      follow(world.player.state, dt); // keep camera framed during countdown
      if (countdown <= 0) {
        countdown = 0;
        goTimer = 0.9;
        audio.go();
        cdEl.textContent = 'GO!';
      }
      return; // sim stays frozen until GO
    }
    // "GO!" banner shows briefly while the race is already running, then hides
    if (goTimer > 0) {
      goTimer -= dt;
      cdEl.style.display = 'flex';
      cdEl.textContent = 'GO!';
      if (goTimer <= 0) cdEl.style.display = 'none';
    }

    finished = world.update(dt, inp, audio);
    follow(world.player.state, dt);
    const pr = world.race.racers.player;
    hud.update({
      lap: pr.lap,
      laps: world.race.laps,
      place: world.place(world.player),
      total: RACE.racerCount,
      time: world.race.time,
      curLap: world.race.time - pr.lastLapStart,
      bestLap: pr.bestLap,
      timeLeft: Math.max(0, world.race.maxTime - world.race.time),
      speed: world.player.state.speed,
      item: world.player.item,
    });
    if (finished) endRace();
  },
  () => composer.render(),
);
loop.start();

async function endRace() {
  const order = world.results();
  hud.show(false);
  audio.stopEngine();
  paused = false;
  pauseEl.style.display = 'none';
  countdown = 0;
  goTimer = 0;
  cdEl.style.display = 'none';
  world.dispose();
  world = null;
  finished = false;
  await resultsScreen(order);
  startFlow();
}

async function startFlow() {
  const idx = await trackSelect();
  audio.resume();
  audio.startEngine();
  paused = false;
  pauseEl.style.display = 'none';
  world = createWorld(scene, TRACKS[idx]);
  resetCamera();
  hud.show(true);
  startCountdown(); // 3-2-1-GO before racing
}

// debug probe (read-only) for verifying controls during development
/** @type {any} */ (window).__player = () => (world ? { ...world.player.state } : null);

// During dev, force a full reload on any hot update so game loops / listeners
// never stack across edits (HMR state preservation is useless for a game loop).
if (import.meta.hot) import.meta.hot.on('vite:beforeUpdate', () => location.reload());

(async function boot() {
  await titleScreen();
  startFlow();
})();
