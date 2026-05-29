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
    for (let i = 0; i < 200; i++)
      s = stepPhysics(s, { ...noInput, throttle: 1 }, 0.1, { offTrack: false });
    expect(forwardSpeed(s)).toBeLessThanOrEqual(PHYSICS.maxSpeed + 0.5);
  });

  it('off-track reduces achievable speed', () => {
    let on = createKartState({ x: 0, z: 0 }),
      off = createKartState({ x: 0, z: 0 });
    for (let i = 0; i < 100; i++) {
      on = stepPhysics(on, { ...noInput, throttle: 1 }, 0.1, { offTrack: false });
      off = stepPhysics(off, { ...noInput, throttle: 1 }, 0.1, { offTrack: true });
    }
    expect(forwardSpeed(off)).toBeLessThan(forwardSpeed(on));
  });

  it('steer left and right rotate heading in opposite directions', () => {
    const left = stepPhysics(createKartState({ x: 0, z: 0 }), { ...noInput, steer: -1 }, 0.1, {
      offTrack: false,
    });
    const right = stepPhysics(createKartState({ x: 0, z: 0 }), { ...noInput, steer: 1 }, 0.1, {
      offTrack: false,
    });
    expect(Math.sign(left.heading)).toBe(-Math.sign(right.heading));
    expect(left.heading).not.toBe(0); // low-speed pivot is allowed (no longer stuck at rest)
  });

  it('steering authority increases with speed', () => {
    const slow = stepPhysics(createKartState({ x: 0, z: 0 }), { ...noInput, steer: 1 }, 0.1, {
      offTrack: false,
    });
    let fast = createKartState({ x: 0, z: 0 });
    for (let i = 0; i < 10; i++)
      fast = stepPhysics(fast, { ...noInput, throttle: 1 }, 0.1, { offTrack: false });
    const before = fast.heading;
    fast = stepPhysics(fast, { ...noInput, steer: 1, throttle: 1 }, 0.1, { offTrack: false });
    expect(Math.abs(fast.heading - before)).toBeGreaterThan(Math.abs(slow.heading));
  });

  it('drift produces more lateral slide than gripping', () => {
    const mk = () => {
      let s = createKartState({ x: 0, z: 0 });
      s.vel = { x: 5, z: 0 };
      s.heading = 0;
      return s;
    };
    let grip = mk(),
      drift = mk();
    grip = stepPhysics(grip, noInput, 0.2, { offTrack: false });
    drift = stepPhysics(drift, { ...noInput, drift: true }, 0.2, { offTrack: false });
    expect(Math.abs(drift.vel.x)).toBeGreaterThan(Math.abs(grip.vel.x));
  });
});
