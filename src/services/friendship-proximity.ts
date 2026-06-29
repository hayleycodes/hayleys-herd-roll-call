import type { SightingEvent } from './pigs.types';

const FIVE_MIN = 5 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

// Each counted proximity moment is worth less than a deliberate observation.
export const PROXIMITY_WEIGHT = 0.5;

type Obs = {
  pigId: number;
  t: number;
  col: number;
  row: number;
  level: number;
};

const pairKey = (a: number, b: number) =>
  a < b ? `${a}-${b}` : `${b}-${a}`;

/**
 * Proximity friendship points per pig pair, derived from sightings:
 * two pigs sighted within 5 minutes of each other, within 1 cell (Chebyshev
 * <= 1) on the same level, count as being together. Repeats for a pair within
 * an hour collapse to one point. Each counted moment is worth PROXIMITY_WEIGHT.
 *
 * Returns a map of `${loId}-${hiId}` -> points.
 */
export const computeProximityPoints = (
  sightings: SightingEvent[]
): Map<string, number> => {
  // Flatten to one observation per pig per sighting.
  const obs: Obs[] = [];
  for (const s of sightings) {
    if (s.cleared) continue;
    const t = Date.parse((s.observed_at ?? s.created_at ?? '').replace(' ', 'T'));
    if (Number.isNaN(t)) continue;
    const col = Math.floor(s.x);
    const row = Math.floor(s.y);
    for (const pigId of s.pig_ids) {
      obs.push({ pigId, t, col, row, level: s.level });
    }
  }

  // Candidate proximity moments (times) per pair.
  const moments = new Map<string, number[]>();
  for (let i = 0; i < obs.length; i++) {
    for (let j = i + 1; j < obs.length; j++) {
      const a = obs[i];
      const b = obs[j];
      if (a.pigId === b.pigId) continue;
      if (a.level !== b.level) continue;
      if (Math.abs(a.t - b.t) > FIVE_MIN) continue;
      if (Math.abs(a.col - b.col) > 1 || Math.abs(a.row - b.row) > 1) continue;
      const key = pairKey(a.pigId, b.pigId);
      const list = moments.get(key) ?? [];
      list.push(Math.min(a.t, b.t));
      moments.set(key, list);
    }
  }

  // Count moments with a 1-hour cooldown per pair, then weight them.
  const points = new Map<string, number>();
  for (const [key, times] of moments) {
    times.sort((x, y) => x - y);
    let counted = 0;
    let lastCounted = -Infinity;
    for (const t of times) {
      if (t - lastCounted >= ONE_HOUR) {
        counted += 1;
        lastCounted = t;
      }
    }
    points.set(key, counted * PROXIMITY_WEIGHT);
  }
  return points;
};
