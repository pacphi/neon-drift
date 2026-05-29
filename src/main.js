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
scene.add(createSky());
scene.add(createGrid());
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
