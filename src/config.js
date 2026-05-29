export const PALETTE = {
  magenta: 0xff2bd6, cyan: 0x18f0ff, lime: 0xaaff00,
  purple: 0x7a18ff, orange: 0xff7b00, bg: 0x06000f,
};
export const PHYSICS = {
  accel: 44, reverseAccel: 18, maxSpeed: 90, maxReverse: 16, // 90 m/s ≈ 325 km/h top speed
  friction: 10, brakeFriction: 34,
  steerRate: 1.8,       // base yaw rate (rad/s)
  steerResponse: 7,     // how fast steering input ramps in (higher = snappier)
  highSpeedSteerCut: 0.4, // fraction of steering authority removed at top speed
  grip: 22, driftGrip: 5, offTrackMul: 0.5, boostMul: 1.7, // high grip = holds line, little slide
};
export const RACE = { laps: 3, racerCount: 4 }; // player + 3 AI
export const ITEMS = ['boost', 'shock', 'oil'];
