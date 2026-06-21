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
 * Copeland score. Repeat/conflicting observations of the same pair are resolved
 * by majority: whichever direction was observed more often wins; an equal count
 * is a "standoff" that counts for neither pig. Non-transitive cycles (A▸B▸C▸A)
 * still produce sensible scores.
 */
export function computePeckingOrder(
  pigs: Pig[],
  items: SocialOrderItem[]
): PeckingOrder {
  const pigById = new Map(pigs.map((p) => [p.id, p]));

  // Count observations per ordered pair: `${dominant}#${submissive}`.
  const counts = new Map<string, number>();
  const involved = new Set<number>();
  for (const item of items) {
    const key = `${item.dominant_pig_id}#${item.submissive_pig_id}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    involved.add(item.dominant_pig_id);
    involved.add(item.submissive_pig_id);
  }

  // Resolve each unordered pair and tally distinct wins/losses per pig.
  const dominates = new Map<number, number>();
  const yieldsTo = new Map<number, number>();
  const ids = [...involved];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i];
      const b = ids[j];
      const ab = counts.get(`${a}#${b}`) ?? 0;
      const ba = counts.get(`${b}#${a}`) ?? 0;
      if (ab === ba) continue; // standoff — counts for neither
      const winner = ab > ba ? a : b;
      const loser = ab > ba ? b : a;
      dominates.set(winner, (dominates.get(winner) ?? 0) + 1);
      yieldsTo.set(loser, (yieldsTo.get(loser) ?? 0) + 1);
    }
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
