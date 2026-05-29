export function createRace(racers, { checkpointCount, laps }) {
  const map = {};
  for (const r of racers) map[r.id] = { id: r.id, lap: 0, nextCp: 1 % checkpointCount, cpHits: 0, time: 0, finished: false };
  return { racers: map, checkpointCount, laps, time: 0 };
}

// Called when a racer crosses checkpoint index `cp`. Only the expected next cp advances progress.
export function passCheckpoint(race, id, cp) {
  const r = race.racers[id];
  if (!r || r.finished) return race;
  const expected = r.nextCp;
  if (cp !== expected) return race; // out of order: ignore
  r.cpHits++;
  if (cp === 0) { // completed a full loop back to start/finish
    r.lap++;
    if (r.lap >= race.laps) { r.finished = true; r.finishTime = race.time; }
  }
  r.nextCp = (cp + 1) % race.checkpointCount;
  return race;
}

// progress score for sorting: laps dominate, then checkpoints hit
function progress(r) { return r.lap * 1e6 + r.cpHits; }

export function standings(race) {
  return Object.values(race.racers).slice().sort((a, b) => progress(b) - progress(a));
}

export function isFinished(race, id) { return !!race.racers[id]?.finished; }
export function allFinished(race) { return Object.values(race.racers).every(r => r.finished); }
