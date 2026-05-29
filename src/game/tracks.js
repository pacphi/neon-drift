import { PALETTE } from '../config.js';

// Each track: closed loop of {x,z} control points (world units), neon theme,
// road width, and lap count. Tracks are ordered progressively longer with more
// laps (3 → 5 → 8), all within the 3..10 lap range.
export const TRACKS = [
  {
    name: 'NEON CIRCUIT', color: PALETTE.cyan, width: 27, laps: 3,
    points: [
      { x: 0, z: -80 }, { x: 70, z: -70 }, { x: 95, z: 0 }, { x: 70, z: 70 },
      { x: 0, z: 90 }, { x: -70, z: 70 }, { x: -95, z: 0 }, { x: -70, z: -70 },
    ],
  },
  {
    name: 'SUNSET LOOP', color: PALETTE.magenta, width: 26, laps: 5,
    points: [
      { x: 0, z: -100 }, { x: 85, z: -85 }, { x: 60, z: 0 }, { x: 115, z: 70 },
      { x: 0, z: 115 }, { x: -115, z: 70 }, { x: -60, z: 0 }, { x: -85, z: -85 },
    ],
  },
  {
    name: 'GRID RUNNER', color: PALETTE.lime, width: 24, laps: 8,
    points: [
      { x: -135, z: -75 }, { x: 0, z: -135 }, { x: 135, z: -75 }, { x: 90, z: 30 },
      { x: 135, z: 105 }, { x: 40, z: 60 }, { x: 0, z: 120 }, { x: -40, z: 60 },
      { x: -135, z: 105 }, { x: -90, z: 30 },
    ],
  },
];
