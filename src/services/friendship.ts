import { subMonths } from 'date-fns';
import type {
  FriendCategory,
  FriendEvent,
  Pig,
  SightingEvent,
} from './pigs.types';
import {
  computeProximityEvents,
  computeProximityPoints,
} from './friendship-proximity';
import { friendCategoryLabel } from '../constants/friend-categories';

// Friendship strength only reflects the last 2 months — relationships change.
export const FRIENDSHIP_MONTHS = 2;

export const parseTs = (ts: string | null) =>
  Date.parse((ts ?? '').replace(' ', 'T'));

// Relationship strength: 1 point per shared event. Tiers are just a friendly
// label over the raw points total. Ordered strongest first.
export const TIERS = [
  { key: 'inseparable', icon: '💞', label: 'Inseparable', min: 10 },
  { key: 'close', icon: '💖', label: 'Close Friends', min: 6 },
  { key: 'friends', icon: '💕', label: 'Friends', min: 3 },
  { key: 'acquaintances', icon: '🌱', label: 'Acquaintances', min: 0 },
] as const;

export type TierKey = (typeof TIERS)[number]['key'];

export const tierFor = (points: number) =>
  TIERS.find((t) => points >= t.min) ?? TIERS[TIERS.length - 1];

// A bonding event from any source: a logged friend event, a map sighting of
// 2+ pigs together, or a derived proximity moment (pigs sighted near each
// other). Proximity events aren't stored, so they can't be deleted.
export type BondEvent = {
  uid: string;
  rawId: number;
  source: 'logged' | 'map' | 'proximity';
  category: FriendCategory | null;
  pigIds: number[];
  ts: string;
};

export type FriendPair = {
  key: string;
  pigA: Pig;
  pigB: Pig;
  points: number;
};

// A friendly label for a single bonding event, matching the events list.
export const bondEventLabel = (ev: BondEvent) => {
  if (ev.source === 'proximity') return '👀 Spotted nearby';
  const base = ev.category ? friendCategoryLabel(ev.category) : 'Spotted together';
  return ev.source === 'map' ? `📍 ${base}` : base;
};

export type FriendData = {
  bondEvents: BondEvent[];
  historyEvents: BondEvent[];
  friendPairs: FriendPair[];
  statsByPig: Map<number, Record<TierKey, number>>;
};

// Turn raw friend events, map sightings and derived proximity moments into the
// ranked pairs, per-pig tier stats and the full event history the Friends UI
// renders. Everything is scoped to the last FRIENDSHIP_MONTHS.
export const computeFriendData = (
  friendEvents: FriendEvent[],
  sightingEvents: SightingEvent[],
  allPigs: Pig[]
): FriendData => {
  const pigById = new Map(allPigs.map((p) => [Number(p.id), p]));
  const cutoff = subMonths(new Date(), FRIENDSHIP_MONTHS).getTime();

  const logged: BondEvent[] = friendEvents
    .filter((e) => parseTs(e.observed_at ?? e.created_at) >= cutoff)
    .map((e) => ({
      uid: `f-${e.id}`,
      rawId: e.id,
      source: 'logged',
      category: e.category,
      pigIds: e.pig_ids,
      ts: e.observed_at ?? e.created_at ?? '',
    }));

  const fromMap: BondEvent[] = sightingEvents
    .filter(
      (s) =>
        s.pig_ids.length >= 2 &&
        parseTs(s.observed_at ?? s.created_at) >= cutoff
    )
    .map((s) => ({
      uid: `s-${s.id}`,
      rawId: s.id,
      source: 'map',
      category: (s.behaviour as FriendCategory | null) ?? null,
      pigIds: s.pig_ids,
      ts: s.observed_at ?? s.created_at ?? '',
    }));

  const bondEvents = [...logged, ...fromMap].sort((a, b) =>
    b.ts.localeCompare(a.ts)
  );

  const recentSightings = sightingEvents.filter(
    (s) => parseTs(s.observed_at ?? s.created_at) >= cutoff
  );
  const proximityPoints = computeProximityPoints(recentSightings);

  const proximityEvents: BondEvent[] = computeProximityEvents(
    recentSightings
  ).map((ev) => ({
    uid: `p-${ev.pigIds[0]}-${ev.pigIds[1]}-${ev.t}`,
    rawId: 0,
    source: 'proximity',
    category: null,
    pigIds: ev.pigIds,
    ts: new Date(ev.t).toISOString(),
  }));

  const historyEvents = [...bondEvents, ...proximityEvents].sort(
    (a, b) => parseTs(b.ts) - parseTs(a.ts)
  );

  // Rank pairs by total points: +1 for each explicit event they shared, plus
  // their proximity points (0.5 each).
  const points = new Map<string, number>();
  const add = (key: string, n: number) =>
    points.set(key, (points.get(key) ?? 0) + n);

  for (const ev of bondEvents) {
    const ids = ev.pigIds.filter((id) => pigById.has(id));
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        add(ids[i] < ids[j] ? `${ids[i]}-${ids[j]}` : `${ids[j]}-${ids[i]}`, 1);
      }
    }
  }
  for (const [key, pts] of proximityPoints) add(key, pts);

  const friendPairs: FriendPair[] = [];
  for (const [key, pts] of points) {
    const [lo, hi] = key.split('-').map(Number);
    const pigA = pigById.get(lo);
    const pigB = pigById.get(hi);
    if (pigA && pigB) friendPairs.push({ key, pigA, pigB, points: pts });
  }
  friendPairs.sort((a, b) => b.points - a.points);

  // For each pig, how many friends fall into each strength tier.
  const statsByPig = new Map<number, Record<TierKey, number>>();
  const ensure = (id: number) => {
    let s = statsByPig.get(id);
    if (!s) {
      s = { inseparable: 0, close: 0, friends: 0, acquaintances: 0 };
      statsByPig.set(id, s);
    }
    return s;
  };
  for (const pair of friendPairs) {
    const tier = tierFor(pair.points);
    ensure(Number(pair.pigA.id))[tier.key]++;
    ensure(Number(pair.pigB.id))[tier.key]++;
  }

  return { bondEvents, historyEvents, friendPairs, statsByPig };
};

export type FriendRel = {
  partner: Pig;
  points: number;
  tier: (typeof TIERS)[number];
};

// A pig's friends, strongest first, for the bar chart.
export const relsForPig = (
  pigId: number,
  friendPairs: FriendPair[]
): FriendRel[] =>
  friendPairs
    .filter(
      (p) => Number(p.pigA.id) === pigId || Number(p.pigB.id) === pigId
    )
    .map((p) => {
      const partner = Number(p.pigA.id) === pigId ? p.pigB : p.pigA;
      return { partner, points: p.points, tier: tierFor(p.points) };
    });

// All bonding events shared by two specific pigs, newest first.
export const interactionsBetween = (
  historyEvents: BondEvent[],
  pigIdA: number,
  pigIdB: number
) =>
  historyEvents.filter(
    (ev) => ev.pigIds.includes(pigIdA) && ev.pigIds.includes(pigIdB)
  );
