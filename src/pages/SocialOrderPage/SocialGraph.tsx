import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import PigCard from '../../components/PigList/PigCard/PigCard';
import Modal from '../../components/ui/Modal/Modal';
import { getPigColorClass } from '../../constants/colors';
import { usePigImage } from '../../hooks/usePigImage';
import type { Pig, SocialOrderItem } from '../../services/pigs.types';
import {
  computeDominanceTree,
  computeGraphRanking,
  computePigGraphDetail,
  type DominanceTreeNode,
} from '../../services/social-order-graph';

type Props = {
  pigs: Pig[];
  socialOrder: SocialOrderItem[];
};

// A PigCard that, instead of navigating to the pig's page, selects it so we
// can show its dominance subgraph. Intercepting in the capture phase marks the
// click handled before react-router's Link sees it, so it won't navigate.
const GraphPig = ({
  pig,
  onSelect,
  className,
}: {
  pig: Pig;
  onSelect: (pig: Pig) => void;
  className: string;
}) => (
  <div
    className={className}
    onClickCapture={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect(pig);
    }}
  >
    <PigCard pig={pig} hideLastSeen />
  </div>
);

// A self-contained pig node for use inside the modal: circular photo + name,
// no nested <a> (PigCard's own link misbehaves inside the transformed modal
// sheet). Either a button that drills into that pig, or a link to its profile.
const PigDot = ({
  pig,
  onSelect,
  asLink,
  repeated,
  large,
}: {
  pig: Pig;
  onSelect?: (pig: Pig) => void;
  asLink?: boolean;
  repeated?: boolean;
  large?: boolean;
}) => {
  const { imageUrl, imageReady } = usePigImage(pig.image_path);
  const className = `graphNode${large ? ' graphNodeLarge' : ''} ${getPigColorClass(pig.id)}`;

  const inner = (
    <>
      <span className="graphNodePhoto">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={pig.name}
            style={{ opacity: imageReady ? 1 : 0, transition: 'opacity 0.3s ease' }}
          />
        ) : (
          <span className="graphNodeEmoji">🐹</span>
        )}
      </span>
      <span className="graphNodeName">
        {pig.name}
        {repeated && ' ↩'}
      </span>
    </>
  );

  return asLink ? (
    <Link to={`/pigs/${pig.id}`} className={className}>
      {inner}
    </Link>
  ) : (
    <button type="button" className={className} onClick={() => onSelect?.(pig)}>
      {inner}
    </button>
  );
};

const PigRow = ({
  pigs,
  onSelect,
}: {
  pigs: Pig[];
  onSelect: (pig: Pig) => void;
}) => (
  <div className="graphDetailRow">
    {pigs.map((pig) => (
      <PigDot key={pig.id} pig={pig} onSelect={onSelect} />
    ))}
  </div>
);

// ---- Tidy tree layout (contour packing, Reingold–Tilford style) ----

const NODE_W = 56;
const NODE_H = 78;
const H_GAP = 22;
const LEVEL_H = 112;

type Placed = {
  node: DominanceTreeNode;
  children: Placed[];
  relX: number; // x relative to parent's centre
  x: number; // absolute centre x (filled in the second pass)
  depth: number;
};

const buildPlaced = (node: DominanceTreeNode, depth: number): Placed => ({
  node,
  children: node.children.map((c) => buildPlaced(c, depth + 1)),
  relX: 0,
  x: 0,
  depth,
});

// Bottom-up pass: pack sibling subtrees as tightly as their contours allow and
// centre each parent over its children. Returns the subtree's left/right
// contours (min/max x per relative depth) in a frame where this node is x = 0.
const contour = (n: Placed): { left: number[]; right: number[] } => {
  if (n.children.length === 0) return { left: [0], right: [0] };

  const sep = NODE_W + H_GAP;
  const kids = n.children.map(contour);
  const pos: number[] = [];
  const envRight: number[] = []; // rightmost contour of already-placed siblings

  kids.forEach((c, i) => {
    let off = 0;
    const shared = Math.min(envRight.length, c.left.length);
    for (let d = 0; d < shared; d++) {
      off = Math.max(off, envRight[d] - c.left[d] + sep);
    }
    pos[i] = off;
    for (let d = 0; d < c.right.length; d++) {
      const v = off + c.right[d];
      envRight[d] = d < envRight.length ? Math.max(envRight[d], v) : v;
    }
  });

  const center = (pos[0] + pos[pos.length - 1]) / 2;
  n.children.forEach((child, i) => (child.relX = pos[i] - center));

  const left = [0];
  const right = [0];
  const depth = kids.reduce((m, c) => Math.max(m, c.left.length), 0);
  for (let d = 0; d < depth; d++) {
    let l = Infinity;
    let r = -Infinity;
    n.children.forEach((child, i) => {
      const c = kids[i];
      if (d < c.left.length) l = Math.min(l, child.relX + c.left[d]);
      if (d < c.right.length) r = Math.max(r, child.relX + c.right[d]);
    });
    left[d + 1] = l;
    right[d + 1] = r;
  }
  return { left, right };
};

type LaidNode = { pig: Pig; repeated: boolean; x: number; y: number; key: string };
type LaidLine = { x1: number; y1: number; x2: number; y2: number };

const layoutTree = (root: DominanceTreeNode) => {
  const placed = buildPlaced(root, 0);
  contour(placed);

  let minX = Infinity;
  let maxX = -Infinity;
  let maxDepth = 0;
  const assign = (n: Placed, parentX: number) => {
    n.x = parentX + n.relX;
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x);
    maxDepth = Math.max(maxDepth, n.depth);
    n.children.forEach((c) => assign(c, n.x));
  };
  assign(placed, 0);

  const shift = NODE_W / 2 - minX; // place leftmost node's edge at x = 0
  const nodes: LaidNode[] = [];
  const lines: LaidLine[] = [];
  let counter = 0;

  const collect = (n: Placed) => {
    const x = n.x + shift;
    const y = n.depth * LEVEL_H;
    nodes.push({
      pig: n.node.pig,
      repeated: n.node.repeated,
      x,
      y,
      key: `${n.node.pig.id}-${counter++}`,
    });
    if (n.children.length) {
      const busY = y + NODE_H + (LEVEL_H - NODE_H) / 2;
      const childXs = n.children.map((c) => c.x + shift);
      lines.push({ x1: x, y1: y + NODE_H, x2: x, y2: busY }); // parent → bus
      lines.push({
        x1: Math.min(...childXs),
        y1: busY,
        x2: Math.max(...childXs),
        y2: busY,
      }); // sibling bus
      n.children.forEach((c) => {
        const cx = c.x + shift;
        lines.push({ x1: cx, y1: busY, x2: cx, y2: c.depth * LEVEL_H }); // bus → child
      });
    }
    n.children.forEach(collect);
  };
  collect(placed);

  return {
    nodes,
    lines,
    width: maxX - minX + NODE_W,
    height: maxDepth * LEVEL_H + NODE_H,
  };
};

const TidyTree = ({
  root,
  onSelect,
}: {
  root: DominanceTreeNode;
  onSelect: (pig: Pig) => void;
}) => {
  const { nodes, lines, width, height } = useMemo(
    () => layoutTree(root),
    [root]
  );
  return (
    <div className="graphTreeScroll">
      <div className="tidyTree" style={{ width, height }}>
        <svg className="tidyTreeLines" width={width} height={height}>
          {lines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
          ))}
        </svg>
        {nodes.map((n) => (
          <div
            className="tidyTreeNode"
            key={n.key}
            style={{ left: n.x - NODE_W / 2, top: n.y }}
          >
            <PigDot pig={n.pig} onSelect={onSelect} repeated={n.repeated} />
          </div>
        ))}
      </div>
    </div>
  );
};

// A graph-derived ranking, separate from the pecking order. Pigs are scored
// transitively, with dominance loops collapsed into co-equal tiers. Clicking a
// pig opens its dominance subgraph.
const SocialGraph = ({ pigs, socialOrder }: Props) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const groups = useMemo(
    () => computeGraphRanking(pigs, socialOrder),
    [pigs, socialOrder]
  );

  // Look up a pig's rank/metrics for the detail header.
  const groupByPigId = useMemo(() => {
    const map = new Map<number, (typeof groups)[number]>();
    for (const group of groups)
      for (const pig of group.pigs) map.set(pig.id, group);
    return map;
  }, [groups]);

  const detail = useMemo(
    () =>
      selectedId == null
        ? null
        : computePigGraphDetail(pigs, socialOrder, selectedId),
    [selectedId, pigs, socialOrder]
  );

  const tree = useMemo(
    () =>
      selectedId == null
        ? null
        : computeDominanceTree(pigs, socialOrder, selectedId),
    [selectedId, pigs, socialOrder]
  );

  if (!groups.length) {
    return (
      <p className="muted socialGraphEmpty">
        No dominance observations yet. Add some in the Observations tab.
      </p>
    );
  }

  const selectPig = (pig: Pig) => setSelectedId(pig.id);

  return (
    <div className="graphRank">
      <p className="graphRankLegend muted">
        Ranked by 👥 pigs dominated, then 🪜 chain depth, then 💪 strength. Tap a
        row for their graph.
      </p>
      <ol className="graphRankList">
        {groups.map((group) => (
          <li
            className={`graphRankRow${group.rank === 1 ? ' graphRankTop' : ''}${group.isLoop ? ' graphRankLoop' : ''}`}
            key={group.pigs.map((p) => p.id).join('-')}
            role="button"
            tabIndex={0}
            onClick={() => selectPig(group.pigs[0])}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectPig(group.pigs[0]);
              }
            }}
          >
            <span className="graphRankNum">
              {group.rank === 1 ? '👑' : group.rank}
            </span>

            <div className="graphRankPigs">
              {group.isLoop && <span className="graphRankLoopTag">🔁 loop</span>}
              {group.pigs.map((pig) => (
                <GraphPig
                  key={pig.id}
                  pig={pig}
                  onSelect={selectPig}
                  className="graphRankPigCard"
                />
              ))}
            </div>

            <div className="graphRankMetrics">
              <span className="graphMetric" title="Pigs dominated (directly or indirectly)">
                👥 Descendants: {group.metrics.descendants}
              </span>
              <span className="graphMetric" title="Longest dominance chain beneath">
                🪜 Chain: {group.metrics.chain}
              </span>
              <span className="graphMetric" title="Clout: total strength of the pigs you dominate">
                💪 Power: {group.metrics.power}
              </span>
            </div>
          </li>
        ))}
      </ol>

      <Modal isOpen={selectedId != null} onClose={() => setSelectedId(null)}>
        {detail && (
          <div className="graphDetail">
            <div className="graphDetailFocus">
              <PigDot pig={detail.pig} asLink large />
              {(() => {
                const m = groupByPigId.get(detail.pig.id)?.metrics;
                return (
                  m && (
                    <div className="graphDetailMetrics">
                      <span className="graphMetric">
                        👥 Descendants: {m.descendants}
                      </span>
                      <span className="graphMetric">🪜 Chain: {m.chain}</span>
                      <span className="graphMetric">💪 Power: {m.power}</span>
                    </div>
                  )
                );
              })()}
            </div>

            {detail.inLoopWith.length > 0 && (
              <section className="graphDetailSection">
                <p className="graphDetailHeading">🔁 In a loop with</p>
                <PigRow pigs={detail.inLoopWith} onSelect={selectPig} />
              </section>
            )}

            {detail.dominatedBy.length > 0 && (
              <section className="graphDetailSection">
                <p className="graphDetailHeading">▲ Dominated by</p>
                <PigRow pigs={detail.dominatedBy} onSelect={selectPig} />
              </section>
            )}

            <section className="graphDetailSection">
              <p className="graphDetailHeading">
                ▼ Everyone below {detail.pig.name}
              </p>
              {tree && tree.children.length > 0 ? (
                <TidyTree root={tree} onSelect={selectPig} />
              ) : (
                <p className="muted">{detail.pig.name} dominates no one yet.</p>
              )}
            </section>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SocialGraph;
