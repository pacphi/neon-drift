import { PHYSICS as P } from '../config.js';

export function createKartState(pos = { x: 0, z: 0 }, heading = 0) {
  return { pos: { ...pos }, vel: { x: 0, z: 0 }, heading, speed: 0, steer: 0 };
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

  // Smooth the steering input so a key tap ramps in progressively instead of
  // snapping to full lock (kills the "too touchy" feel).
  if (s.steer === undefined) s.steer = 0;
  s.steer += (input.steer - s.steer) * Math.min(1, dt * P.steerResponse);

  // A small floor (+3) keeps low-speed pivot responsive; authority is cut at high
  // speed for stability. Sign negated so Left turns left; inverted in reverse.
  const speedFactor = Math.min(1, (Math.abs(fwd) + 3) / 10);
  const highSpeedCut = 1 - P.highSpeedSteerCut * Math.min(1, Math.abs(fwd) / P.maxSpeed);
  const reverseDir = fwd < -0.5 ? -1 : 1;
  s.heading -= s.steer * P.steerRate * speedFactor * highSpeedCut * dt * reverseDir;

  // keep heading in [-PI, PI] so it never accumulates a large float
  s.heading = Math.atan2(Math.sin(s.heading), Math.cos(s.heading));

  s.pos.x += s.vel.x * dt;
  s.pos.z += s.vel.z * dt;
  s.speed = Math.hypot(s.vel.x, s.vel.z);
  return s;
}
