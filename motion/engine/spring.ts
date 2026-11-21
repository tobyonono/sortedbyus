// Damped spring, solved exactly (no stepping), for motion that settles the way
// a physical thing does. Progress goes 0 → 1 and may overshoot. Plain maths so
// the site, the studio and the token script can all use it.

export interface Spring {
  stiffness: number;
  damping: number;
  mass: number;
  /** Starting velocity in progress units per second (0 = from rest). */
  velocity: number;
}

/** Progress (0 → 1, may overshoot) at `t` seconds. */
export function springAt(s: Spring, t: number): number {
  if (t <= 0) return 0;
  const m = Math.max(s.mass, 0.001);
  const w0 = Math.sqrt(s.stiffness / m);
  const zeta = s.damping / (2 * Math.sqrt(s.stiffness * m));
  const v0 = s.velocity;
  let x: number; // displacement from the target, starting at -1
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    x = Math.exp(-zeta * w0 * t) * (-Math.cos(wd * t) + ((v0 - zeta * w0) / wd) * Math.sin(wd * t));
  } else if (zeta === 1) {
    x = (-1 + (v0 - w0) * t) * Math.exp(-w0 * t);
  } else {
    const r = Math.sqrt(zeta * zeta - 1);
    const r1 = -w0 * (zeta - r);
    const r2 = -w0 * (zeta + r);
    const c2 = (v0 + r1) / (r2 - r1);
    const c1 = -1 - c2;
    x = c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
  }
  return 1 + x;
}

const settleCache = new Map<string, number>();

/** Seconds until the spring stays within `epsilon` of its target. Cached: templates ask every frame. */
export function settleTime(s: Spring, epsilon = 0.002): number {
  const key = `${s.stiffness}|${s.damping}|${s.mass}|${s.velocity}|${epsilon}`;
  const hit = settleCache.get(key);
  if (hit !== undefined) return hit;
  const value = computeSettle(s, epsilon);
  if (settleCache.size > 200) settleCache.clear();
  settleCache.set(key, value);
  return value;
}

function computeSettle(s: Spring, epsilon: number): number {
  const step = 1 / 240;
  let last = 0;
  for (let t = step; t < 12; t += step) if (Math.abs(1 - springAt(s, t)) > epsilon) last = t;
  return Math.round((last + step) * 100) / 100;
}

/** Build a spring from a duration (seconds) and bounce (0 = none, 0.9 = lots). */
export function springFromDuration(duration: number, bounce: number, mass = 1): Spring {
  const d = Math.max(duration, 0.05);
  const stiffness = Math.pow((2 * Math.PI) / d, 2) * mass;
  const damping = ((4 * Math.PI * (1 - Math.min(Math.max(bounce, 0), 0.95))) * mass) / d;
  return { stiffness: round(stiffness), damping: round(damping), mass, velocity: 0 };
}

/** Rough duration/bounce read back from a spring (for the editor's other mode). */
export function durationOf(s: Spring) {
  const duration = (2 * Math.PI) / Math.sqrt(s.stiffness / s.mass);
  const bounce = 1 - (s.damping * duration) / (4 * Math.PI * s.mass);
  return { duration: round(duration), bounce: round(Math.min(Math.max(bounce, 0), 0.95)) };
}

/** CSS `linear()` easing that follows the spring, and its duration in ms. */
export function springToCss(s: Spring, points = 48) {
  const total = settleTime(s);
  const stops: string[] = [];
  for (let i = 0; i <= points; i++) stops.push(String(Math.round(springAt(s, (total * i) / points) * 10000) / 10000));
  stops[stops.length - 1] = "1";
  return { easing: `linear(${stops.join(", ")})`, durationMs: Math.round(total * 1000) };
}

export function springCode(s: Spring) {
  return `spring({ stiffness: ${s.stiffness}, damping: ${s.damping}, mass: ${s.mass}, velocity: ${s.velocity} })`;
}

const round = (n: number) => Math.round(n * 1000) / 1000;
