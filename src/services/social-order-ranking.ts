import type { Pig, SocialOrderItem } from './pigs.types';

export type PeckingEntry = {
  pig: Pig;
  dominates: number; // distinct pigs this pig beats
  yieldsTo: number; // distinct pigs that beat this pig
  score: number; // dominates - yieldsTo (Copeland score)
  rank: number; // 1-based; pigs with equal scores share a rank
};

export type PeckingOrder = {
  ranked: PeckingEntry[]; // pigs involved in at least one observation
  unranked: Pig[]; // pigs with no observations, sorted by name
};

/**
 * Turns pairwise dominance observations into a ranked pecking order using a
 * Copeland score. Conflicting observations of the same pair are resolved by
 * recency: the most recent observation wins outright, nullifying all earlier
 * observations of that pair (a later reversal flips the result). Non-transitive
 * cycles (A▸B▸C▸A) still produce sensible scores.
 */
export function computePeckingOrder(
  pigs: Pig[],
  items: SocialOrderItem[]
): PeckingOrder {
  const pigById = new Map(pigs.map((p) => [p.id, p]));

  // Keep only the most recent observation per unordered pair, keyed
  // `${loId}#${hiId}` so both directions collapse to one entry.
  const latestByPair = new Map<string, SocialOrderItem>();
  const involved = new Set<number>();
  for (const item of items) {
    involved.add(item.dominant_pig_id);
    involved.add(item.submissive_pig_id);
    const lo = Math.min(item.dominant_pig_id, item.submissive_pig_id);
    const hi = Math.max(item.dominant_pig_id, item.submissive_pig_id);
    const key = `${lo}#${hi}`;
    const current = latestByPair.get(key);
    if (!current || isMoreRecent(item, current)) latestByPair.set(key, item);
  }

  // Tally distinct wins/losses from each pair's most recent observation.
  const dominates = new Map<number, number>();
  const yieldsTo = new Map<number, number>();
  for (const item of latestByPair.values()) {
    dominates.set(
      item.dominant_pig_id,
      (dominates.get(item.dominant_pig_id) ?? 0) + 1
    );
    yieldsTo.set(
      item.submissive_pig_id,
      (yieldsTo.get(item.submissive_pig_id) ?? 0) + 1
    );
  }

  // Build entries for involved pigs that are part of the current herd.
  const ranked: PeckingEntry[] = [];
  for (const id of involved) {
    const pig = pigById.get(id);
    if (!pig) continue; // observation references a pig not in the herd (e.g. passed)
    const d = dominates.get(id) ?? 0;
    const y = yieldsTo.get(id) ?? 0;
    ranked.push({ pig, dominates: d, yieldsTo: y, score: d - y, rank: 0 });
  }

  ranked.sort(
    (a, b) =>
      b.score - a.score ||
      b.dominates - a.dominates ||
      a.pig.name.localeCompare(b.pig.name)
  );

  // Standard competition ranking on score: equal scores share a rank.
  ranked.forEach((entry, i) => {
    entry.rank =
      i > 0 && entry.score === ranked[i - 1].score ? ranked[i - 1].rank : i + 1;
  });

  const unranked = pigs
    .filter((p) => !involved.has(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { ranked, unranked };
}

// Recency for an observation: prefer when it was observed, else when the row
// was created. ISO timestamps compare correctly as strings; a null sorts before
// any real timestamp, and the higher id (later-inserted row) breaks ties.
function recencyKey(item: SocialOrderItem): string {
  return item.observed_at ?? item.created_at ?? '';
}

function isMoreRecent(a: SocialOrderItem, b: SocialOrderItem): boolean {
  const ka = recencyKey(a);
  const kb = recencyKey(b);
  if (ka !== kb) return ka > kb;
  return a.id > b.id;
}
