// tests/race.test.js
import { describe, it, expect } from 'vitest';
import {
  createRace,
  passCheckpoint,
  standings,
  isFinished,
  timedOut,
  currentLapTime,
} from '../src/game/race.js';

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
    const order = standings(r).map((s) => s.id);
    expect(order[0]).toBe('a');
  });
  it('isFinished true when racer reaches lap target', () => {
    let r = createRace([{ id: 'p' }], { checkpointCount: 1, laps: 2 });
    r = passCheckpoint(r, 'p', 0);
    r = passCheckpoint(r, 'p', 0);
    expect(isFinished(r, 'p')).toBe(true);
  });

  it('records per-lap and best-lap times from race.time', () => {
    let r = createRace([{ id: 'p' }], { checkpointCount: 1, laps: 3 });
    r.time = 20;
    r = passCheckpoint(r, 'p', 0); // lap 1 took 20s
    r.time = 35;
    r = passCheckpoint(r, 'p', 0); // lap 2 took 15s
    expect(r.racers.p.lapTimes).toEqual([20, 15]);
    expect(r.racers.p.bestLap).toBe(15);
  });

  it('currentLapTime measures elapsed time on the in-progress lap', () => {
    let r = createRace([{ id: 'p' }], { checkpointCount: 1, laps: 3 });
    r.time = 12;
    r = passCheckpoint(r, 'p', 0); // lap done at t=12
    r.time = 18;
    expect(currentLapTime(r, 'p')).toBe(6);
  });

  it('timedOut true once race.time reaches maxTime', () => {
    const r = createRace([{ id: 'p' }], { checkpointCount: 4, laps: 3, maxTime: 100 });
    r.time = 99;
    expect(timedOut(r)).toBe(false);
    r.time = 100;
    expect(timedOut(r)).toBe(true);
  });

  it('finished racers rank ahead of unfinished, by finish time', () => {
    let r = createRace([{ id: 'a' }, { id: 'b' }, { id: 'c' }], { checkpointCount: 1, laps: 1 });
    r.time = 30;
    r = passCheckpoint(r, 'b', 0); // b finishes at 30
    r.time = 25;
    r = passCheckpoint(r, 'a', 0); // a finishes at 25 (faster)
    // c never finishes
    const order = standings(r).map((s) => s.id);
    expect(order).toEqual(['a', 'b', 'c']);
  });
});
