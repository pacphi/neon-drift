import * as THREE from 'three';
import { buildTrackMesh } from '../render/trackMesh.js';
import { createKart } from './kart.js';
import { stepPhysics } from './physics.js';
import { aiInput } from './ai.js';
import {
  createRace,
  passCheckpoint,
  standings,
  allFinished,
  isFinished,
  timedOut,
} from './race.js';
import { createEffectState, applyItem, tickEffects } from './items.js';
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
    scene.add(k.group);
    karts.push(k);
  }
  const laps = track.laps || RACE.laps;
  // Max race time scales with track length and lap count: a generous ceiling of
  // roughly 2.4x the time to drive every lap at ~16 m/s average.
  const estLapTime = built.length / 16;
  const maxTime = Math.round(laps * estLapTime * 2.4);
  const race = createRace(
    karts.map((k) => ({ id: k.id })),
    { checkpointCount: 12, laps, maxTime },
  );

  // Item pickups: distinct neon SHAPE per bonus type so you can see what each
  // gives and pick the lane you want. A trio (one of each) spans the track width
  // at several points along the lap.
  const ITEM_KINDS = [
    { type: 'boost', color: PALETTE.cyan, make: () => new THREE.ConeGeometry(1.7, 3.4, 4) }, // pyramid = speed
    { type: 'shock', color: PALETTE.magenta, make: () => new THREE.OctahedronGeometry(1.9) }, // spiky = shock
    { type: 'oil', color: PALETTE.orange, make: () => new THREE.IcosahedronGeometry(1.8) }, // blob = oil
  ];
  const boxes = [];
  const N = built.waypoints.length;
  [Math.floor(N * 0.18), Math.floor(N * 0.45), Math.floor(N * 0.72)].forEach((wi) => {
    const w = built.waypoints[wi % N];
    const rx = w.tz,
      rz = -w.tx; // unit right vector
    [-0.5, 0, 0.5].forEach((frac, i) => {
      const kind = ITEM_KINDS[i];
      const x = w.x + rx * built.halfWidth * frac;
      const z = w.z + rz * built.halfWidth * frac;
      const m = new THREE.Mesh(kind.make(), neon(kind.color, 1.5));
      m.position.set(x, 1.9, z);
      scene.add(m);
      boxes.push({ mesh: m, x, z, type: kind.type, active: true, cooldown: 0 });
    });
  });
  const hazards = []; // {mesh,x,z,t}

  // Start/finish line across the track at waypoint 0. `checker` builds the neon
  // checkerboard variant shown on the final lap; otherwise a solid neon bar.
  function makeStartLine(checker) {
    const s = built.waypoints[0];
    const rx = s.tz,
      rz = -s.tx; // right vector
    const tx = s.tx,
      tz = s.tz; // forward vector
    const ang = Math.atan2(s.tx, s.tz); // start heading (aligns cell x→right, z→forward)
    const group = new THREE.Group();
    const W = built.halfWidth * 2;
    const cols = 14,
      cell = W / cols,
      rows = checker ? 2 : 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const across = -W / 2 + cell * (c + 0.5);
        const fwd = checker ? (r - 0.5) * cell : 0;
        const x = s.x + rx * across + tx * fwd;
        const z = s.z + rz * across + tz * fwd;
        const color = checker ? ((r + c) % 2 ? PALETTE.magenta : PALETTE.cyan) : 0xffffff;
        const depth = checker ? cell * 0.92 : 3.2;
        const m = new THREE.Mesh(new THREE.BoxGeometry(cell * 0.92, 0.3, depth), neon(color, 1.7));
        m.position.set(x, 0.18, z);
        m.rotation.y = ang;
        group.add(m);
      }
    }
    return group;
  }
  const startLineNormal = makeStartLine(false);
  scene.add(startLineNormal);
  const startLineFinal = makeStartLine(true);
  startLineFinal.visible = false;
  scene.add(startLineFinal);

  function nearestCheckpointCrossed(kart) {
    const r = race.racers[kart.id];
    const cpIdx = built.checkpoints[r.nextCp];
    const w = built.waypoints[cpIdx];
    if (Math.hypot(kart.state.pos.x - w.x, kart.state.pos.z - w.z) < track.width) {
      passCheckpoint(race, kart.id, r.nextCp);
    }
  }

  function nearestWaypoint(pos) {
    let best = built.waypoints[0],
      bd = Infinity;
    for (const w of built.waypoints) {
      const d = (w.x - pos.x) ** 2 + (w.z - pos.z) ** 2;
      if (d < bd) {
        bd = d;
        best = w;
      }
    }
    return { point: best, dist: Math.sqrt(bd) };
  }

  function offTrack(kart) {
    return nearestWaypoint(kart.state.pos).dist > built.halfWidth + 1.5;
  }

  // Soft wall: if a kart strays past the ribbon edge, push it back to the
  // boundary and scrub speed — so you can't fly off into the void.
  function containToTrack(kart) {
    const { point, dist } = nearestWaypoint(kart.state.pos);
    const limit = built.halfWidth + 0.6;
    if (dist > limit) {
      const nx = (kart.state.pos.x - point.x) / dist;
      const nz = (kart.state.pos.z - point.z) / dist;
      kart.state.pos.x = point.x + nx * limit;
      kart.state.pos.z = point.z + nz * limit;
      // Cancel only the outward (into-wall) velocity so the kart slides ALONG the
      // wall instead of dead-stopping, then apply a gentle scrub. You can recover
      // by steering back onto the track.
      const vn = kart.state.vel.x * nx + kart.state.vel.z * nz;
      if (vn > 0) {
        kart.state.vel.x -= vn * nx;
        kart.state.vel.z -= vn * nz;
      }
      kart.state.vel.x *= 0.9;
      kart.state.vel.z *= 0.9;
    }
  }

  function place(kart) {
    const order = standings(race);
    return order.findIndex((s) => s.id === kart.id) + 1;
  }

  function update(dt, playerInput, audio) {
    race.time += dt;
    karts.forEach((k) => {
      const input = k.isPlayer ? playerInput : aiInput(k, built.waypoints, race, { lookahead: 6 });
      // item use
      if (input.useItem && k.item) {
        const used = k.item;
        const rivals = karts.filter((o) => o !== k).map((o) => ({ id: o.id, pos: o.state.pos }));
        k.effects = applyItem(k.effects, used, {
          self: { pos: k.state.pos, heading: k.state.heading },
          rivals,
        });
        if (used === 'oil') {
          // drop the slick BEHIND the kart and make the dropper briefly immune,
          // so using oil never spins you out.
          const h = k.effects.hazards.at(-1);
          h.x = k.state.pos.x - Math.sin(k.state.heading) * 7;
          h.z = k.state.pos.z - Math.cos(k.state.heading) * 7;
          k.state.spinCD = Math.max(k.state.spinCD || 0, 2);
          const m = new THREE.Mesh(new THREE.CircleGeometry(2.6, 20), neon(0xff7b00, 0.7));
          m.rotation.x = -Math.PI / 2;
          m.position.set(h.x, 0.12, h.z);
          scene.add(m);
          hazards.push({ mesh: m, x: h.x, z: h.z, t: h.t });
        }
        if (k.isPlayer) {
          used === 'boost' ? audio?.boost?.() : audio?.hit?.();
        }
        k.item = null;
      }
      // apply shock spins to rivals (respect a cooldown so a kart can never be
      // perma-spun — a single spin lasts ~0.7s then it's immune for 3s)
      k.effects.spun.forEach((id) => {
        const t = karts.find((x) => x.id === id);
        if (t && !(t.state.spinCD > 0)) {
          t.state.spinT = 0.7;
          t.state.spinCD = 3;
        }
      });

      if (k.state.spinCD > 0) k.state.spinCD -= dt;
      // AI uses the SAME top speed as the player (no boost) — only an item boost
      // ever raises it. This keeps the race fair.
      const env = { offTrack: offTrack(k), boost: k.effects.boost };
      if (k.state.spinT > 0) {
        k.state.heading += dt * 9;
        k.state.spinT -= dt;
      }
      stepPhysics(k.state, input, dt, env);
      containToTrack(k);
      k.effects = tickEffects(k.effects, dt);
      nearestCheckpointCrossed(k);
      k.sync();
      if (k.isPlayer && audio) audio.setRpm?.(Math.min(1, k.state.speed / 90));
    });

    // kart-to-kart collisions: separate overlapping karts and trade a little
    // momentum so bumping feels physical.
    for (let a = 0; a < karts.length; a++) {
      for (let b = a + 1; b < karts.length; b++) {
        const ka = karts[a].state,
          kb = karts[b].state;
        const dx = kb.pos.x - ka.pos.x,
          dz = kb.pos.z - ka.pos.z;
        const d = Math.hypot(dx, dz) || 0.001;
        const minD = 4;
        if (d < minD) {
          const nx = dx / d,
            nz = dz / d,
            push = (minD - d) / 2;
          ka.pos.x -= nx * push;
          ka.pos.z -= nz * push;
          kb.pos.x += nx * push;
          kb.pos.z += nz * push;
          const rel = (kb.vel.x - ka.vel.x) * nx + (kb.vel.z - ka.vel.z) * nz;
          if (rel < 0) {
            const imp = rel * 0.6;
            ka.vel.x += nx * imp;
            ka.vel.z += nz * imp;
            kb.vel.x -= nx * imp;
            kb.vel.z -= nz * imp;
          }
        }
      }
    }
    karts.forEach((k) => k.sync()); // re-sync meshes after collision displacement

    // item box pickups
    boxes.forEach((b) => {
      b.mesh.rotation.y += dt * 2;
      if (!b.active) {
        b.cooldown -= dt;
        if (b.cooldown <= 0) {
          b.active = true;
          b.mesh.visible = true;
        }
        return;
      }
      for (const k of karts)
        if (Math.hypot(k.state.pos.x - b.x, k.state.pos.z - b.z) < 5 && !k.item) {
          k.item = b.type;
          b.active = false;
          b.mesh.visible = false;
          b.cooldown = 5;
          if (k.isPlayer) audio?.pickup?.();
        }
    });
    // hazards spin karts (cooldown-gated so you can't get stuck spinning on one)
    hazards.forEach((h) => {
      for (const k of karts) {
        if (Math.hypot(k.state.pos.x - h.x, k.state.pos.z - h.z) < 2.5 && !(k.state.spinCD > 0)) {
          k.state.spinT = 0.7;
          k.state.spinCD = 3;
        }
      }
    });

    // start/finish line shows the neon checkerboard once the player is on the final lap
    const onFinalLap = race.racers.player.lap >= laps - 1;
    startLineNormal.visible = !onFinalLap;
    startLineFinal.visible = onFinalLap;

    return allFinished(race) || isFinished(race, 'player') || timedOut(race);
  }

  const player = karts[0];
  function results() {
    return standings(race).map((s) => ({
      id: s.id,
      name: s.id === 'player' ? 'YOU' : s.id.toUpperCase(),
      finishTime: s.finishTime, // null if did-not-finish (timeout)
      bestLap: s.bestLap,
      laps: s.lap,
    }));
  }
  function dispose() {
    scene.remove(built.mesh);
    scene.remove(startLineNormal);
    scene.remove(startLineFinal);
    karts.forEach((k) => scene.remove(k.group));
    boxes.forEach((b) => scene.remove(b.mesh));
    hazards.forEach((h) => scene.remove(h.mesh));
  }

  return { update, player, race, place, results, dispose, builtTrack: built };
}
