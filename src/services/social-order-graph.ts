import type { Pig, SocialOrderItem } from './pigs.types';

export type GraphMetrics = {
  descendants: number; // distinct pigs dominated directly or indirectly
  chain: number; // longest dominance chain (tier depth) beneath
  power: number; // "clout": recursive strength of the pigs you dominate
};

export type GraphRankGroup = {
  rank: number; // 1-based; pigs with identical metrics share a rank
  pig: Pig;
  metrics: GraphMetrics;
};

/**
 * A graph-based dominance ranking, kept deliberately separate from the
 * Copeland-score pecking order so the two can be compared.
 *
 * Each observation is a directed edge dominant ▸ submissive. The score is
 * transitive: dominating a pig who themselves dominates others counts for
 * more than dominating a dead end. The dominance graph is built loop-free
 * (see buildDominanceGraph), so every metric below is well-defined.
 *
 * Three metrics, combined lexicographically (descendants, then chain depth,
 * then power):
 *  - descendants: distinct pigs reachable downstream (empire size)
 *  - chain:       longest chain beneath (how deep the hierarchy runs)
 *  - power:       "clout" — recursively rewards dominating pigs who are
 *                 themselves powerful, so beating a strong pig beats a dead end
 */
export function computeGraphRanking(
  pigs: Pig[],
  items: SocialOrderItem[]
): GraphRankGroup[] {
  const { pigById, involved, out } = buildDominanceGraph(pigs, items);
  if (!involved.size) return [];

  // The graph is acyclic, so each metric recurses safely over `out`.
  const reachCache = new Map<number, Set<number>>();
  const reach = (v: number): Set<number> => {
    const cached = reachCache.get(v);
    if (cached) return cached;
    const result = new Set<number>();
    reachCache.set(v, result); // acyclic, so safe to set before recursing
    for (const child of out.get(v) ?? []) {
      result.add(child);
      for (const d of reach(child)) result.add(d);
    }
    return result;
  };

  // Longest chain (tier depth) beneath a pig.
  const chainCache = new Map<number, number>();
  const chain = (v: number): number => {
    const cached = chainCache.get(v);
    if (cached !== undefined) return cached;
    let best = 0;
    for (const child of out.get(v) ?? []) best = Math.max(best, 1 + chain(child));
    chainCache.set(v, best);
    return best;
  };

  // "Clout": a transitive strength score that rewards dominating pigs who are
  // themselves powerful, so beating a strong pig is worth more than beating a
  // dead end. A pig that dominates nobody scores 0 (no floor).
  const powerCache = new Map<number, number>();
  const power = (v: number): number => {
    const cached = powerCache.get(v);
    if (cached !== undefined) return cached;
    let total = 0;
    for (const child of out.get(v) ?? []) total += 1 + power(child);
    powerCache.set(v, total);
    return total;
  };

  const groups = [...involved].map((id) => ({
    pig: pigById.get(id)!,
    metrics: { descendants: reach(id).size, chain: chain(id), power: power(id) },
  }));

  groups.sort(
    (a, b) =>
      b.metrics.descendants - a.metrics.descendants ||
      b.metrics.chain - a.metrics.chain ||
      b.metrics.power - a.metrics.power ||
      a.pig.name.localeCompare(b.pig.name)
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
};

/**
 * The dominance subgraph around a single pig: its direct neighbours, every
 * pig it dominates transitively, and its longest chain.
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

  // Every pig reachable downstream (the graph is acyclic).
  const downstream = new Set<number>();
  const stack = [...(out.get(pigId) ?? [])];
  while (stack.length) {
    const node = stack.pop()!;
    if (downstream.has(node)) continue;
    downstream.add(node);
    for (const next of out.get(node) ?? []) if (!downstream.has(next)) stack.push(next);
  }

  // Longest chain downward.
  let best: number[] = [pigId];
  const path: number[] = [pigId];
  const walk = (node: number) => {
    if (path.length > best.length) best = [...path];
    for (const next of out.get(node) ?? []) {
      path.push(next);
      walk(next);
      path.pop();
    }
  };
  walk(pigId);

  return {
    pig,
    dominatedBy,
    dominates,
    descendants: toPigs(downstream),
    longestChain: best.map((id) => pigById.get(id)!),
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

/**
 * A forest covering every pig with at least one observation. Roots are the pigs
 * nobody dominates; remaining pigs (e.g. those only inside a loop) seed extra
 * trees. A single shared "expanded" set spans the whole forest, so each pig is
 * drawn once and anything reached again becomes a `repeated` leaf.
 */
export function computeDominanceForest(
  pigs: Pig[],
  items: SocialOrderItem[]
): DominanceTreeNode[] {
  const { pigById, involved, out, inMap } = buildDominanceGraph(pigs, items);
  if (!involved.size) return [];

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

  const byName = (a: number, b: number) =>
    pigById.get(a)!.name.localeCompare(pigById.get(b)!.name);

  const roots: DominanceTreeNode[] = [];
  // Top of the hierarchy first: pigs nobody dominates.
  [...involved]
    .filter((id) => !inMap.get(id)?.size)
    .sort(byName)
    .forEach((id) => roots.push(build(id)));
  // Then anything still unplaced (loop-only components with no clear top).
  [...involved]
    .filter((id) => !expanded.has(id))
    .sort(byName)
    .forEach((id) => roots.push(build(id)));

  return roots;
}

type DominanceGraph = {
  pigById: Map<number, Pig>;
  involved: Set<number>;
  out: Map<number, Set<number>>; // dominator -> pigs it dominates
  inMap: Map<number, Set<number>>; // pig -> pigs that dominate it
};

type DominanceEdge = { from: number; to: number; weight: number };

/**
 * Resolves observations into a directed, acyclic dominance graph.
 *
 * Each unordered pair is collapsed to a single edge by *tally*: it points
 * toward whichever pig won more often (a lone stale reversal no longer flips an
 * established relationship). An even tally falls back to the most recent
 * observation. The edge's weight is the margin — how lopsided the rivalry is.
 *
 * Genuine dominance loops (A▸B▸C▸A) are then broken by cutting their weakest
 * edge, so the flimsiest rivalry gives way and the standoff becomes a clean
 * ranking. See {@link breakCycles}.
 */
function buildDominanceGraph(
  pigs: Pig[],
  items: SocialOrderItem[]
): DominanceGraph {
  const pigById = new Map(pigs.map((p) => [p.id, p]));

  // Tally wins each way per unordered pair, keeping the most recent
  // observation as a tiebreak for when the two directions are even.
  type PairTally = {
    lo: number;
    hi: number;
    loWins: number; // times `lo` dominated `hi`
    hiWins: number; // times `hi` dominated `lo`
    latest: SocialOrderItem;
  };
  const pairs = new Map<string, PairTally>();
  for (const item of items) {
    if (!pigById.has(item.dominant_pig_id)) continue;
    if (!pigById.has(item.submissive_pig_id)) continue;
    const d = item.dominant_pig_id;
    const s = item.submissive_pig_id;
    const lo = Math.min(d, s);
    const hi = Math.max(d, s);
    const key = `${lo}#${hi}`;
    let pair = pairs.get(key);
    if (!pair) {
      pair = { lo, hi, loWins: 0, hiWins: 0, latest: item };
      pairs.set(key, pair);
    }
    if (d === lo) pair.loWins++;
    else pair.hiWins++;
    if (isMoreRecent(item, pair.latest)) pair.latest = item;
  }

  // Resolve each pair to one directed edge. Direction by tally; even tally
  // falls back to the most recent observation. Weight = margin of victory.
  const edges: DominanceEdge[] = [];
  for (const pair of pairs.values()) {
    let from: number;
    let to: number;
    if (pair.loWins > pair.hiWins) {
      from = pair.lo;
      to = pair.hi;
    } else if (pair.hiWins > pair.loWins) {
      from = pair.hi;
      to = pair.lo;
    } else {
      from = pair.latest.dominant_pig_id;
      to = pair.latest.submissive_pig_id;
    }
    edges.push({ from, to, weight: Math.abs(pair.loWins - pair.hiWins) });
  }

  const kept = breakCycles(edges);

  // Every pig with an observation stays "involved" even if its only edge was
  // cut — take the node set from all resolved pairs, not just the kept edges.
  const involved = new Set<number>();
  for (const e of edges) {
    involved.add(e.from);
    involved.add(e.to);
  }

  const out = new Map<number, Set<number>>();
  const inMap = new Map<number, Set<number>>();
  for (const e of kept) {
    if (!out.has(e.from)) out.set(e.from, new Set());
    out.get(e.from)!.add(e.to);
    if (!inMap.has(e.to)) inMap.set(e.to, new Set());
    inMap.get(e.to)!.add(e.from);
  }

  return { pigById, involved, out, inMap };
}

/**
 * Greedily breaks every dominance loop, cutting the weakest edge each time.
 *
 * While any cycle remains, we find the edges that lie on one (both endpoints in
 * the same non-trivial strongly-connected component) and remove the one with
 * the smallest weight — the least decisive rivalry. Ties are cut in a stable
 * order so the result is deterministic. Finding a true minimum feedback arc set
 * is NP-hard, but for a herd this greedy heuristic is more than enough.
 */
function breakCycles(edges: DominanceEdge[]): DominanceEdge[] {
  const kept = [...edges];
  for (;;) {
    const comp = stronglyConnectedComponents(kept);
    const onCycle = kept.filter((e) => comp.get(e.from) === comp.get(e.to));
    if (onCycle.length === 0) return kept;
    onCycle.sort(
      (a, b) => a.weight - b.weight || a.from - b.from || a.to - b.to
    );
    kept.splice(kept.indexOf(onCycle[0]), 1);
  }
}

/**
 * Tarjan's SCC over an edge list. Returns a map from node id to component id;
 * two nodes share an id iff they sit on a common cycle.
 */
function stronglyConnectedComponents(
  edges: DominanceEdge[]
): Map<number, number> {
  const out = new Map<number, number[]>();
  const nodes = new Set<number>();
  for (const e of edges) {
    nodes.add(e.from);
    nodes.add(e.to);
    if (!out.has(e.from)) out.set(e.from, []);
    out.get(e.from)!.push(e.to);
  }

  const index = new Map<number, number>();
  const low = new Map<number, number>();
  const onStack = new Set<number>();
  const stack: number[] = [];
  const comp = new Map<number, number>();
  let idx = 0;
  let sccCount = 0;

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
      const c = sccCount++;
      let w: number;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        comp.set(w, c);
      } while (w !== v);
    }
  };
  for (const v of nodes) if (!index.has(v)) strongconnect(v);
  return comp;
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
