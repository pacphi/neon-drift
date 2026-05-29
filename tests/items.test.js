// tests/items.test.js
import { describe, it, expect } from 'vitest';
import { rollItem, applyItem, tickEffects, createEffectState } from '../src/game/items.js';

describe('items', () => {
  it('rollItem returns a known item id', () => {
    const seq = [0, 0.5, 0.99].map((r) => rollItem(() => r));
    for (const it of seq) expect(['boost', 'shock', 'oil']).toContain(it);
  });
  it('boost sets a timed boost flag that expires', () => {
    let fx = createEffectState();
    fx = applyItem(fx, 'boost');
    expect(fx.boost).toBe(true);
    fx = tickEffects(fx, 5); // 5s > boost duration
    expect(fx.boost).toBe(false);
  });
  it('shock returns spin targets within radius', () => {
    const self = { pos: { x: 0, z: 0 }, heading: 0 };
    const rivals = [
      { id: 1, pos: { x: 3, z: 0 } }, // near
      { id: 2, pos: { x: 999, z: 0 } }, // far
    ];
    const r = applyItem(createEffectState(), 'shock', { self, rivals });
    expect(r.spun).toContain(1);
    expect(r.spun).not.toContain(2);
  });
  it('oil registers a hazard at the dropping kart position', () => {
    const self = { pos: { x: 5, z: 7 }, heading: 0 };
    const r = applyItem(createEffectState(), 'oil', { self });
    expect(r.hazards[0]).toMatchObject({ x: 5, z: 7 });
  });
});
