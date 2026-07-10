import type { Pig, SocialOrderItem } from './pigs.types';

export type DavidEntry = {
  pig: Pig;
  score: number; // David's score: higher = more dominant (can be negative)
  wins: number; // total observations this pig won
  losses: number; // total observations this pig lost
  rank: number; // 1-based; near-equal scores share a rank
};

export type DavidRanking = {
  ranked: DavidEntry[]; // pigs involved in at least one observation
  unranked: Pig[]; // pigs with no observations, sorted by name
};

/**
 * Ranks pigs by David's score — the standard dominance metric for animal
 * hierarchies (David 1987; De Vries, Stevens & Vervaecke 2006). A deliberate
 * hybrid between the flat Copeland pecking order and the transitive "empire"
 * graph:
 *
 *  - Like the empire graph, beating a *strong* pig is worth more than beating a
 *    weak one: each pig's score folds in the scores of the pigs it beat (w2/l2).
 *  - Like a ladder, no single rivalry can swing the whole order: every dyad
 *    contributes a *proportion* of wins, not a hard-flipped edge, and thin
 *    evidence is shrunk toward 50/50 (the Dij chance correction) so a lone win
 *    doesn't crown a pig and a lone loss doesn't sink one.
 */
export function computeDavidScore(
  pigs: Pig[],
  items: SocialOrderItem[]
): DavidRanking {
  const pigById = new Map(pigs.map((p) => [p.id, p]));

  // Tally wins each way per unordered pair, plus each pig's raw match record.
  type Dyad = { a: number; b: number; aWins: number; bWins: number }; // a < b
  const dyads = new Map<string, Dyad>();
  const wins = new Map<number, number>();
  const losses = new Map<number, number>();
  const involved = new Set<number>();

  for (const item of items) {
    const d = item.dominant_pig_id;
    const s = item.submissive_pig_id;
    if (!pigById.has(d) || !pigById.has(s)) continue; // pig not in current herd
    involved.add(d);
    involved.add(s);
    wins.set(d, (wins.get(d) ?? 0) + 1);
    losses.set(s, (losses.get(s) ?? 0) + 1);
    const a = Math.min(d, s);
    const b = Math.max(d, s);
    const key = `${a}#${b}`;
    let dyad = dyads.get(key);
    if (!dyad) {
      dyad = { a, b, aWins: 0, bWins: 0 };
      dyads.set(key, dyad);
    }
    if (d === a) dyad.aWins++;
    else dyad.bWins++;
  }

  // Chance-corrected dyadic dominance index Dij (De Vries 2006): i's share of
  // wins over j, pulled toward 0.5 when the pair has few interactions. Stored
  // both ways; Dij + Dji = 1. dyadIndex.get(i).get(j) = Dij.
  const dyadIndex = new Map<number, Map<number, number>>();
  const setIndex = (i: number, j: number, value: number) => {
    if (!dyadIndex.has(i)) dyadIndex.set(i, new Map());
    dyadIndex.get(i)!.set(j, value);
  };
  for (const dyad of dyads.values()) {
    const n = dyad.aWins + dyad.bWins;
    const pAB = dyad.aWins / n; // proportion a beat b
    const dAB = pAB - (pAB - 0.5) / (n + 1); // shrink toward 0.5 by evidence
    setIndex(dyad.a, dyad.b, dAB);
    setIndex(dyad.b, dyad.a, 1 - dAB);
  }

  // w = Σ Dij over opponents; l = Σ Dji. Non-interacting pairs contribute 0.
  const w = new Map<number, number>();
  const l = new Map<number, number>();
  for (const id of involved) {
    let wi = 0;
    let li = 0;
    for (const dij of (dyadIndex.get(id) ?? new Map()).values()) {
      wi += dij;
      li += 1 - dij; // Dji
    }
    w.set(id, wi);
    l.set(id, li);
  }

  // w2 = Σ Dij·w(j); l2 = Σ Dji·l(j). David's score = w + w2 − l − l2, so
  // beating pigs who themselves win a lot (high w) is rewarded.
  const ranked: DavidEntry[] = [];
  for (const id of involved) {
    let w2 = 0;
    let l2 = 0;
    for (const [j, dij] of dyadIndex.get(id) ?? new Map()) {
      w2 += dij * (w.get(j) ?? 0);
      l2 += (1 - dij) * (l.get(j) ?? 0);
    }
    const score = (w.get(id) ?? 0) + w2 - (l.get(id) ?? 0) - l2;
    ranked.push({
      pig: pigById.get(id)!,
      score,
      wins: wins.get(id) ?? 0,
      losses: losses.get(id) ?? 0,
      rank: 0,
    });
  }

  ranked.sort(
    (a, b) =>
      b.score - a.score ||
      b.wins - a.wins ||
      a.pig.name.localeCompare(b.pig.name)
  );

  // Standard competition ranking: near-equal scores share a rank.
  ranked.forEach((entry, i) => {
    entry.rank =
      i > 0 && Math.abs(entry.score - ranked[i - 1].score) < 1e-9
        ? ranked[i - 1].rank
        : i + 1;
  });

  const unranked = pigs
    .filter((p) => !involved.has(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { ranked, unranked };
}
