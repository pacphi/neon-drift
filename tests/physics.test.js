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
