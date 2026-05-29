import * as THREE from 'three';
import { buildTrackMesh } from '../render/trackMesh.js';
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
    const r = race.racers[kart.id];
    const cpIdx = built.checkpoints[r.nextCp];
    const w = built.waypoints[cpIdx];
    if (Math.hypot(kart.state.pos.x - w.x, kart.state.pos.z - w.z) < track.width) {
      passCheckpoint(race, kart.id, r.nextCp);
    }
  }

  function offTrack(kart) {
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
        if (k.item === 'oil') {
          const h = k.effects.hazards.at(-1);
          const m = new THREE.Mesh(new THREE.CircleGeometry(2.5, 16), neon(0x222200, 0.6));
          m.rotation.x = -Math.PI / 2; m.position.set(h.x, 0.1, h.z); scene.add(m);
          hazards.push({ mesh: m, x: h.x, z: h.z, t: h.t });
        }
        k.item = null;
      }
      // apply shock spins to rivals
      k.effects.spun.forEach(id => { const t = karts.find(x => x.id === id); if (t) t.state.spinT = 0.8; });

      const env = { offTrack: offTrack(k), boost: k.effects.boost };
      if (k.state.spinT > 0) { k.state.heading += dt * 12; k.state.spinT -= dt; }
      // AI rubber-banding: nudge top speed via boost env when trailing
      if (!k.isPlayer) {
        const rb = rubberBand(place(k) - 1, RACE.racerCount);
        env.boost = env.boost || rb > 1.0;
      }
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
  function dispose() {
    scene.remove(built.mesh);
    karts.forEach(k => scene.remove(k.group));
    boxes.forEach(b => scene.remove(b.mesh));
    hazards.forEach(h => scene.remove(h.mesh));
  }

  return { update, player, race, place, results, dispose, builtTrack: built };
}
