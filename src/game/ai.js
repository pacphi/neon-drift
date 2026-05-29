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
  // physics applies `heading -= steer*rate`, so to rotate heading toward the
  // target (by +diff) the steer command must be the negation of diff.
  const steer = Math.max(-1, Math.min(1, -diff * 2));
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
