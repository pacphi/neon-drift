// tests/race.test.js
import { describe, it, expect } from 'vitest';
import { createRace, passCheckpoint, standings, isFinished } from '../src/game/race.js';

describe('race', () => {
  it('lap only increments after all checkpoints hit in order', () => {
    let r = createRace([{ id: 'p' }], { checkpointCount: 4, laps: 3 });
    r = passCheckpoint(r, 'p', 1);
    r = passCheckpoint(r, 'p', 2);
    r = passCheckpoint(r, 'p', 3);
    expect(r.racers.p.lap).toBe(0);
    r = passCheckpoint(r, 'p', 0); // crossing finish completes lap
    expect(r.racers.p.lap).toBe(1);
  });
  it('out-of-order checkpoint is ignored', () => {
    let r = createRace([{ id: 'p' }], { checkpointCount: 4, laps: 3 });
    r = passCheckpoint(r, 'p', 2); // skipped 1
    expect(r.racers.p.nextCp).toBe(1);
  });
  it('standings sort by lap then checkpoint progress', () => {
    let r = createRace([{ id: 'a' }, { id: 'b' }], { checkpointCount: 4, laps: 3 });
    r = passCheckpoint(r, 'a', 1);
    r = passCheckpoint(r, 'a', 2);
    r = passCheckpoint(r, 'b', 1);
    const order = standings(r).map(s => s.id);
    expect(order[0]).toBe('a');
  });
  it('isFinished true when racer reaches lap target', () => {
    let r = createRace([{ id: 'p' }], { checkpointCount: 1, laps: 2 });
    r = passCheckpoint(r, 'p', 0);
    r = passCheckpoint(r, 'p', 0);
    expect(isFinished(r, 'p')).toBe(true);
  });
});
