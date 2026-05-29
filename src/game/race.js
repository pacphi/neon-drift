// Pure race/lap/position/timing logic — no rendering. A lap counts only when a
// racer crosses every checkpoint in order and returns to checkpoint 0.
export function createRace(racers, { checkpointCount, laps, maxTime = Infinity }) {
  const map = {};
  for (const r of racers) {
    map[r.id] = {
      id: r.id, lap: 0, nextCp: 1 % checkpointCount, cpHits: 0,
      finished: false, finishTime: null,
      lapTimes: [], lastLapStart: 0, bestLap: null,
    };
  }
  return { racers: map, checkpointCount, laps, maxTime, time: 0 };
}

// Called when a racer crosses checkpoint index `cp`. Only the expected next cp
// advances progress; crossing cp 0 completes a lap and records its time.
export function passCheckpoint(race, id, cp) {
  const r = race.racers[id];
  if (!r || r.finished) return race;
  if (cp !== r.nextCp) return race; // out of order: ignore
  r.cpHits++;
  if (cp === 0) {
    const lapTime = race.time - r.lastLapStart;
    r.lapTimes.push(lapTime);
    if (r.bestLap === null || lapTime < r.bestLap) r.bestLap = lapTime;
    r.lastLapStart = race.time;
    r.lap++;
    if (r.lap >= race.laps) { r.finished = true; r.finishTime = race.time; }
  }
  r.nextCp = (cp + 1) % race.checkpointCount;
  return race;
}

// progress score for sorting: laps dominate, then checkpoints hit
function progress(r) { return r.lap * 1e6 + r.cpHits; }

// Standings: finished racers first (by finish time), then the rest by progress.
export function standings(race) {
  return Object.values(race.racers).slice().sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1;
    if (b.finished) return 1;
    return progress(b) - progress(a);
  });
}

export function isFinished(race, id) { return !!race.racers[id]?.finished; }
export function allFinished(race) { return Object.values(race.racers).every(r => r.finished); }
export function timedOut(race) { return race.time >= race.maxTime; }

// Seconds elapsed on the racer's current (in-progress) lap.
export function currentLapTime(race, id) {
  const r = race.racers[id];
  return r ? race.time - r.lastLapStart : 0;
}
