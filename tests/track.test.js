// tests/track.test.js
import { describe, it, expect } from 'vitest';
import { sampleLoop } from '../src/game/track.js';

const square = [{ x: -10, z: -10 }, { x: 10, z: -10 }, { x: 10, z: 10 }, { x: -10, z: 10 }];

describe('track sampling', () => {
  it('returns the requested number of waypoints', () => {
    const wp = sampleLoop(square, 64);
    expect(wp).toHaveLength(64);
  });
  it('waypoints form a closed loop (last near first)', () => {
    const wp = sampleLoop(square, 64);
    const d = Math.hypot(wp[0].x - wp[63].x, wp[0].z - wp[63].z);
    expect(d).toBeLessThan(5); // adjacent, not identical
  });
  it('consecutive waypoints are roughly evenly spaced', () => {
    const wp = sampleLoop(square, 64);
    const gaps = wp.map((p, i) => { const n = wp[(i + 1) % wp.length]; return Math.hypot(n.x - p.x, n.z - p.z); });
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    for (const g of gaps) expect(Math.abs(g - avg)).toBeLessThan(avg * 0.6);
  });
  it('each waypoint has a forward tangent of unit length', () => {
    const wp = sampleLoop(square, 32);
    for (const p of wp) expect(Math.hypot(p.tx, p.tz)).toBeCloseTo(1, 1);
  });
});
