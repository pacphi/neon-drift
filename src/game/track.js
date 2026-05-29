// Catmull-Rom closed-loop sampler. Pure, no Three.js.
function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t,
    t3 = t2 * t;
  const f = (a, b, c, d) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return { x: f(p0.x, p1.x, p2.x, p3.x), z: f(p0.z, p1.z, p2.z, p3.z) };
}

/**
 * @typedef {{ x: number, z: number, tx: number, tz: number }} Waypoint
 */

// Returns `count` evenly-spaced points along the closed spline, each with unit tangent {tx,tz}.
/** @returns {Waypoint[]} */
export function sampleLoop(points, count = 200) {
  const n = points.length;
  // dense sample first, then resample by arc length for even spacing
  const dense = [];
  const per = 40;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n],
      p1 = points[i],
      p2 = points[(i + 1) % n],
      p3 = points[(i + 2) % n];
    for (let j = 0; j < per; j++) dense.push(catmull(p0, p1, p2, p3, j / per));
  }
  // cumulative length
  const len = [0];
  for (let i = 1; i <= dense.length; i++) {
    const a = dense[i - 1],
      b = dense[i % dense.length];
    len.push(len[i - 1] + Math.hypot(b.x - a.x, b.z - a.z));
  }
  const total = len[dense.length];
  /** @type {Waypoint[]} */
  const out = [];
  for (let k = 0; k < count; k++) {
    const target = (k / count) * total;
    let i = 1;
    while (i < dense.length && len[i] < target) i++;
    const a = dense[i - 1],
      b = dense[i % dense.length];
    const seg = len[i] - len[i - 1] || 1;
    const f = (target - len[i - 1]) / seg;
    const x = a.x + (b.x - a.x) * f,
      z = a.z + (b.z - a.z) * f;
    out.push({ x, z, tx: 0, tz: 0 });
  }
  // tangents
  for (let k = 0; k < count; k++) {
    const nx = out[(k + 1) % count],
      p = out[k];
    let tx = nx.x - p.x,
      tz = nx.z - p.z;
    const m = Math.hypot(tx, tz) || 1;
    p.tx = tx / m;
    p.tz = tz / m;
  }
  return out;
}

// Pure track data: waypoints, checkpoint indices, start grid, half-width.
// No Three.js — mesh building lives in the render layer.
export function computeTrackData(track, { waypointCount = 240, checkpointCount = 12 } = {}) {
  const waypoints = sampleLoop(track.points, waypointCount);
  const halfWidth = track.width / 2;

  // total centerline length (for race max-time estimation)
  let length = 0;
  for (let i = 0; i < waypoints.length; i++) {
    const a = waypoints[i],
      b = waypoints[(i + 1) % waypoints.length];
    length += Math.hypot(b.x - a.x, b.z - a.z);
  }

  const checkpoints = [];
  for (let k = 0; k < checkpointCount; k++) {
    checkpoints.push(Math.floor((k / checkpointCount) * waypoints.length));
  }

  const s = waypoints[0];
  const startPositions = [];
  for (let i = 0; i < 4; i++) {
    const off = (i % 2 ? 1 : -1) * 3.5;
    const back = Math.floor(i / 2) * 8 + 7;
    startPositions.push({
      x: s.x - s.tx * back + s.tz * off,
      z: s.z - s.tz * back - s.tx * off,
      heading: Math.atan2(s.tx, s.tz),
    });
  }

  return { waypoints, checkpoints, startPositions, halfWidth, length };
}
