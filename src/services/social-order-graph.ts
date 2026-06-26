import type { Pig, SocialOrderItem } from './pigs.types';

export type GraphMetrics = {
  descendants: number; // distinct pigs dominated directly or indirectly
  chain: number; // longest dominance chain (tier depth) beneath
  power: number; // "clout": recursive strength of the pigs you dominate
};

export type GraphRankGroup = {
  rank: number; // 1-based; tied groups share a rank
  pigs: Pig[]; // more than one => a dominance loop (co-equal tier)
  isLoop: boolean;
  metrics: GraphMetrics;
};

/**
 * A graph-based dominance ranking, kept deliberately separate from the
 * Copeland-score pecking order so the two can be compared.
 *
 * Each observation is a directed edge dominant ▸ submissive. The score is
 * transitive: dominating a pig who themselves dominates others counts for
 * more than dominating a dead end.
 *
 * Cycles (A▸B▸C▸A) make any transitive measure ill-defined, so we first
 * condense strongly-connected components (Tarjan) into co-equal tiers — pigs
 * in a loop can't be ranked against each other, so they share a row. The
 * resulting condensed graph is acyclic, and every metric below is well-defined
 * on it.
 *
 * Three metrics, combined lexicographically (descendants, then chain depth,
 * then power):
 *  - descendants: distinct pigs reachable downstream (empire size)
 *  - chain:       longest tier-depth beneath (how deep the hierarchy runs)
 *  - power:       "clout" — recursively rewards dominating pigs who are
 *                 themselves powerful, so beating a strong pig beats a dead end
 *
 * Conflicting observations of the same pair are resolved by recency.
 */
export function computeGraphRanking(
  pigs: Pig[],
  items: SocialOrderItem[]
): GraphRankGroup[] {
  // 1. Build the directed dominance graph (pairs resolved by recency).
  const { pigById, involved, out } = buildDominanceGraph(pigs, items);
  if (!involved.size) return [];

  const nodes = [...involved];

  // 2. Tarjan's SCC: collapse dominance loops into co-equal components.
  const index = new Map<number, number>();
  const low = new Map<number, number>();
  const onStack = new Set<number>();
  const stack: number[] = [];
  let idx = 0;
  const comp = new Map<number, number>(); // pig id -> scc index
  const sccs: number[][] = []; // scc index -> member pig ids

  const strongconnect = (v: number) => {
    index.set(v, idx);
    low.set(v, idx);
    idx++;
    stack.push(v);
    onStack.add(v);
    for (const w of out.get(v) ?? []) {
      if (!index.has(w)) {
        strongconnect(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!));
      }
    }
    if (low.get(v) === index.get(v)) {
      const members: number[] = [];
      let w: number;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        comp.set(w, sccs.length);
        members.push(w);
      } while (w !== v);
      sccs.push(members);
    }
  };
  for (const v of nodes) if (!index.has(v)) strongconnect(v);

  // 3. Condensed DAG adjacency between SCCs.
  const sccOut = new Map<number, Set<number>>();
  for (const [a, targets] of out) {
    const ca = comp.get(a)!;
    for (const b of targets) {
      const cb = comp.get(b)!;
      if (ca === cb) continue;
      if (!sccOut.has(ca)) sccOut.set(ca, new Set());
      sccOut.get(ca)!.add(cb);
    }
  }

  // 4. Reachable SCCs (downstream, excluding self) — memoised over the DAG.
  const reachCache = new Map<number, Set<number>>();
  const reachSccs = (c: number): Set<number> => {
    const cached = reachCache.get(c);
    if (cached) return cached;
    const result = new Set<number>();
    reachCache.set(c, result); // acyclic, so safe to set before recursing
    for (const child of sccOut.get(c) ?? []) {
      result.add(child);
      for (const d of reachSccs(child)) result.add(d);
    }
    return result;
  };
  const descendantCount = (c: number): number => {
    let n = 0;
    for (const sc of reachSccs(c)) n += sccs[sc].length;
    return n;
  };

  // 5. Longest chain (tier depth) beneath each SCC.
  const chainCache = new Map<number, number>();
  const chain = (c: number): number => {
    const cached = chainCache.get(c);
    if (cached !== undefined) return cached;
    let best = 0;
    for (const child of sccOut.get(c) ?? []) best = Math.max(best, 1 + chain(child));
    chainCache.set(c, best);
    return best;
  };

  // 6. "Clout": a transitive strength score that rewards dominating tiers
  //    that are themselves powerful, so beating a strong pig is worth more
  //    than beating a dead end. For each tier directly below, add its size
  //    plus its own clout. A pig that dominates nobody scores 0 (no floor).
  const powerCache = new Map<number, number>();
  const power = (c: number): number => {
    const cached = powerCache.get(c);
    if (cached !== undefined) return cached;
    let total = 0;
    for (const child of sccOut.get(c) ?? []) {
      total += sccs[child].length + power(child);
    }
    powerCache.set(c, total);
    return total;
  };

  // 7. Build one group per SCC, sort, and assign ranks (ties share a rank).
  const groups = sccs.map((members, c) => {
    const memberPigs = members
      .map((id) => pigById.get(id)!)
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      pigs: memberPigs,
      isLoop: members.length > 1,
      metrics: { descendants: descendantCount(c), chain: chain(c), power: power(c) },
    };
  });

  groups.sort(
    (a, b) =>
      b.metrics.descendants - a.metrics.descendants ||
      b.metrics.chain - a.metrics.chain ||
      b.metrics.power - a.metrics.power ||
      a.pigs[0].name.localeCompare(b.pigs[0].name)
  );

  let rank = 0;
  let prev: GraphMetrics | null = null;
  return groups.map((g, i) => {
    if (
      !prev ||
      prev.descendants !== g.metrics.descendants ||
      prev.chain !== g.metrics.chain ||
      Math.abs(prev.power - g.metrics.power) > 1e-9
    ) {
      rank = i + 1;
    }
    prev = g.metrics;
    return { rank, ...g };
  });
}

export type PigGraphDetail = {
  pig: Pig;
  dominatedBy: Pig[]; // pigs that directly dominate this pig
  dominates: Pig[]; // pigs this pig directly dominates
  descendants: Pig[]; // all pigs dominated directly or indirectly
  longestChain: Pig[]; // a longest dominance chain starting at this pig
  inLoopWith: Pig[]; // other pigs sharing a dominance loop with this one
};

/**
 * The dominance subgraph around a single pig: its direct neighbours, every
 * pig it dominates transitively, its longest chain, and any loop it sits in.
 * Cycle-safe — traversals never revisit a pig.
 */
export function computePigGraphDetail(
  pigs: Pig[],
  items: SocialOrderItem[],
  pigId: number
): PigGraphDetail | null {
  const { pigById, out, inMap } = buildDominanceGraph(pigs, items);
  const pig = pigById.get(pigId);
  if (!pig) return null;

  const byName = (a: Pig, b: Pig) => a.name.localeCompare(b.name);
  const toPigs = (ids: Iterable<number>) =>
    [...ids].map((id) => pigById.get(id)!).sort(byName);

  // Direct neighbours.
  const dominates = toPigs(out.get(pigId) ?? []);
  const dominatedBy = toPigs(inMap.get(pigId) ?? []);

  // Reachable sets in each direction (cycle-safe via a visited set).
  const reachable = (start: number, edges: Map<number, Set<number>>) => {
    const seen = new Set<number>();
    const stack = [...(edges.get(start) ?? [])];
    while (stack.length) {
      const node = stack.pop()!;
      if (seen.has(node)) continue;
      seen.add(node);
      for (const next of edges.get(node) ?? []) if (!seen.has(next)) stack.push(next);
    }
    return seen;
  };
  const downstream = reachable(pigId, out);
  const upstream = reachable(pigId, inMap);

  // A pig reachable both downstream and upstream shares a loop with this pig.
  const loop = [...downstream].filter((id) => upstream.has(id));

  // Longest simple chain downward (no revisits — safe even with loops).
  let best: number[] = [pigId];
  const path: number[] = [pigId];
  const onPath = new Set([pigId]);
  const walk = (node: number) => {
    if (path.length > best.length) best = [...path];
    for (const next of out.get(node) ?? []) {
      if (onPath.has(next)) continue;
      onPath.add(next);
      path.push(next);
      walk(next);
      path.pop();
      onPath.delete(next);
    }
  };
  walk(pigId);

  return {
    pig,
    dominatedBy,
    dominates,
    descendants: toPigs(downstream),
    longestChain: best.map((id) => pigById.get(id)!),
    inLoopWith: toPigs(loop),
  };
}

export type DominanceTreeNode = {
  pig: Pig;
  children: DominanceTreeNode[];
  repeated: boolean; // already expanded elsewhere (loop/diamond) — not re-expanded
};

/**
 * A spanning tree of everyone the given pig dominates, directly or indirectly.
 * Each pig is expanded once; if it's reached again (a diamond or a loop) it
 * appears as a `repeated` leaf so the tree stays finite.
 */
export function computeDominanceTree(
  pigs: Pig[],
  items: SocialOrderItem[],
  pigId: number
): DominanceTreeNode | null {
  const { pigById, out } = buildDominanceGraph(pigs, items);
  if (!pigById.has(pigId)) return null;

  const expanded = new Set<number>();
  const build = (id: number): DominanceTreeNode => {
    const pig = pigById.get(id)!;
    if (expanded.has(id)) return { pig, children: [], repeated: true };
    expanded.add(id);
    const children = [...(out.get(id) ?? [])]
      .map((cid) => pigById.get(cid)!)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((child) => build(child.id));
    return { pig, children, repeated: false };
  };

  return build(pigId);
}

type DominanceGraph = {
  pigById: Map<number, Pig>;
  involved: Set<number>;
  out: Map<number, Set<number>>; // dominator -> pigs it dominates
  inMap: Map<number, Set<number>>; // pig -> pigs that dominate it
};

/**
 * Resolves observations into a directed dominance graph. Each unordered pair
 * is collapsed to its most recent direction (a later reversal flips the edge).
 */
function buildDominanceGraph(
  pigs: Pig[],
  items: SocialOrderItem[]
): DominanceGraph {
  const pigById = new Map(pigs.map((p) => [p.id, p]));

  const latestByPair = new Map<string, SocialOrderItem>();
  for (const item of items) {
    if (!pigById.has(item.dominant_pig_id)) continue;
    if (!pigById.has(item.submissive_pig_id)) continue;
    const lo = Math.min(item.dominant_pig_id, item.submissive_pig_id);
    const hi = Math.max(item.dominant_pig_id, item.submissive_pig_id);
    const key = `${lo}#${hi}`;
    const existing = latestByPair.get(key);
    if (!existing || isMoreRecent(item, existing)) latestByPair.set(key, item);
  }

  const involved = new Set<number>();
  const out = new Map<number, Set<number>>();
  const inMap = new Map<number, Set<number>>();
  for (const item of latestByPair.values()) {
    const d = item.dominant_pig_id;
    const s = item.submissive_pig_id;
    involved.add(d);
    involved.add(s);
    if (!out.has(d)) out.set(d, new Set());
    out.get(d)!.add(s);
    if (!inMap.has(s)) inMap.set(s, new Set());
    inMap.get(s)!.add(d);
  }

  return { pigById, involved, out, inMap };
}

function recencyKey(item: SocialOrderItem): string {
  return item.observed_at ?? item.created_at ?? '';
}

function isMoreRecent(a: SocialOrderItem, b: SocialOrderItem): boolean {
  const ka = recencyKey(a);
  const kb = recencyKey(b);
  if (ka !== kb) return ka > kb;
  return a.id > b.id;
}
