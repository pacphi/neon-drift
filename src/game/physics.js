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
