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
  sIdx: number; // index of the sighting it came from
};

// A single counted moment of two pigs being near each other.
export type ProximityEvent = {
  pigIds: [number, number];
  t: number; // epoch ms of the moment
};

const pairKey = (a: number, b: number) =>
  a < b ? `${a}-${b}` : `${b}-${a}`;

/**
 * Individual proximity moments, derived from sightings: two pigs sighted within
 * 5 minutes of each other, within 1 cell (Chebyshev <= 1) on the same level,
 * count as being near each other. Pigs in the *same* sighting are excluded —
 * those are already recorded as an explicit "together" event. Repeats for a
 * pair within an hour collapse to a single moment.
 */
export const computeProximityEvents = (
  sightings: SightingEvent[]
): ProximityEvent[] => {
  // Flatten to one observation per pig per sighting.
  const obs: Obs[] = [];
  sightings.forEach((s, sIdx) => {
    if (s.cleared) return;
    const t = Date.parse((s.observed_at ?? s.created_at ?? '').replace(' ', 'T'));
    if (Number.isNaN(t)) return;
    const col = Math.floor(s.x);
    const row = Math.floor(s.y);
    for (const pigId of s.pig_ids) {
      obs.push({ pigId, t, col, row, level: s.level, sIdx });
    }
  });

  // Candidate proximity moments (times) per pair.
  const moments = new Map<string, number[]>();
  for (let i = 0; i < obs.length; i++) {
    for (let j = i + 1; j < obs.length; j++) {
      const a = obs[i];
      const b = obs[j];
      if (a.pigId === b.pigId) continue;
      if (a.sIdx === b.sIdx) continue; // same sighting = explicit togetherness
      if (a.level !== b.level) continue;
      if (Math.abs(a.t - b.t) > FIVE_MIN) continue;
      if (Math.abs(a.col - b.col) > 1 || Math.abs(a.row - b.row) > 1) continue;
      const key = pairKey(a.pigId, b.pigId);
      const list = moments.get(key) ?? [];
      list.push(Math.min(a.t, b.t));
      moments.set(key, list);
    }
  }

  // Emit one event per counted moment, with a 1-hour cooldown per pair.
  const events: ProximityEvent[] = [];
  for (const [key, times] of moments) {
    times.sort((x, y) => x - y);
    let lastCounted = -Infinity;
    for (const t of times) {
      if (t - lastCounted >= ONE_HOUR) {
        const [lo, hi] = key.split('-').map(Number);
        events.push({ pigIds: [lo, hi], t });
        lastCounted = t;
      }
    }
  }
  return events;
};

/**
 * Proximity friendship points per pig pair. Each counted moment is worth
 * PROXIMITY_WEIGHT. Returns a map of `${loId}-${hiId}` -> points.
 */
export const computeProximityPoints = (
  sightings: SightingEvent[]
): Map<string, number> => {
  const points = new Map<string, number>();
  for (const ev of computeProximityEvents(sightings)) {
    const key = pairKey(ev.pigIds[0], ev.pigIds[1]);
    points.set(key, (points.get(key) ?? 0) + PROXIMITY_WEIGHT);
  }
  return points;
};
