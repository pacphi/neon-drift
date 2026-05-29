import { ITEMS } from '../config.js';

const BOOST_DURATION = 2.5; // seconds
const SHOCK_RADIUS = 18;

export function createEffectState() {
  return { boost: false, boostT: 0, spun: [], hazards: [] };
}

export function rollItem(rng = Math.random) {
  return ITEMS[Math.floor(rng() * ITEMS.length) % ITEMS.length];
}

// Returns a NEW effect state with the item applied. ctx: { self, rivals }
export function applyItem(fx, item, ctx = {}) {
  const next = { ...fx, spun: [...fx.spun], hazards: [...fx.hazards] };
  if (item === 'boost') { next.boost = true; next.boostT = BOOST_DURATION; }
  if (item === 'shock' && ctx.rivals) {
    next.spun = ctx.rivals
      .filter(r => Math.hypot(r.pos.x - ctx.self.pos.x, r.pos.z - ctx.self.pos.z) <= SHOCK_RADIUS)
      .map(r => r.id);
  }
  if (item === 'oil' && ctx.self) next.hazards.push({ x: ctx.self.pos.x, z: ctx.self.pos.z, t: 12 });
  return next;
}

export function tickEffects(fx, dt) {
  const next = { ...fx, hazards: fx.hazards.map(h => ({ ...h, t: h.t - dt })).filter(h => h.t > 0) };
  if (next.boost) { next.boostT = fx.boostT - dt; if (next.boostT <= 0) { next.boost = false; next.boostT = 0; } }
  next.spun = []; // spin events are consumed each frame by the caller
  return next;
}
