import { PALETTE } from '../config.js';

// Each track: closed loop of {x,z} control points (world units), neon theme, width.
export const TRACKS = [
  {
    name: 'NEON CIRCUIT', color: PALETTE.cyan, width: 14,
    points: [
      { x: 0, z: -80 }, { x: 70, z: -70 }, { x: 95, z: 0 }, { x: 70, z: 70 },
      { x: 0, z: 90 }, { x: -70, z: 70 }, { x: -95, z: 0 }, { x: -70, z: -70 },
    ],
  },
  {
    name: 'SUNSET LOOP', color: PALETTE.magenta, width: 13,
    points: [
      { x: 0, z: -70 }, { x: 60, z: -60 }, { x: 40, z: 0 }, { x: 80, z: 50 },
      { x: 0, z: 80 }, { x: -80, z: 50 }, { x: -40, z: 0 }, { x: -60, z: -60 },
    ],
  },
  {
    name: 'GRID RUNNER', color: PALETTE.lime, width: 12,
    points: [
      { x: -90, z: -50 }, { x: 0, z: -90 }, { x: 90, z: -50 }, { x: 60, z: 20 },
      { x: 90, z: 70 }, { x: 0, z: 50 }, { x: -90, z: 70 }, { x: -60, z: 20 },
    ],
  },
];
