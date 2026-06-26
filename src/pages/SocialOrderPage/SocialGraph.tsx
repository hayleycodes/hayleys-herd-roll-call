import { useMemo, useState } from 'react';

import PigCard from '../../components/PigList/PigCard/PigCard';
import Modal from '../../components/ui/Modal/Modal';
import type { Pig, SocialOrderItem } from '../../services/pigs.types';
import {
  computeGraphRanking,
  computePigGraphDetail,
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

const PigRow = ({
  pigs,
  onSelect,
}: {
  pigs: Pig[];
  onSelect: (pig: Pig) => void;
}) => (
  <div className="graphDetailRow">
    {pigs.map((pig) => (
      <GraphPig
        key={pig.id}
        pig={pig}
        onSelect={onSelect}
        className="graphDetailPigCard"
      />
    ))}
  </div>
);

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
              <div className="graphDetailFocusCard">
                <PigCard pig={detail.pig} hideLastSeen />
              </div>
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

            {detail.dominates.length > 0 && (
              <section className="graphDetailSection">
                <p className="graphDetailHeading">▼ Boss Pig of:</p>
                <PigRow pigs={detail.dominates} onSelect={selectPig} />
              </section>
            )}

            {detail.longestChain.length > 1 && (
              <section className="graphDetailSection">
                <p className="graphDetailHeading">
                  🪜 Longest chain ({detail.longestChain.length - 1} deep)
                </p>
                <div className="graphDetailChain">
                  {detail.longestChain.map((pig, i) => (
                    <div className="graphDetailChainStep" key={pig.id}>
                      {i > 0 && <span className="graphDetailArrow">▸</span>}
                      <GraphPig
                        pig={pig}
                        onSelect={selectPig}
                        className="graphDetailPigCard"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {detail.descendants.length > 0 && (
              <section className="graphDetailSection">
                <p className="graphDetailHeading">
                  👥 All descendants ({detail.descendants.length})
                </p>
                <PigRow pigs={detail.descendants} onSelect={selectPig} />
              </section>
            )}

            {detail.dominatedBy.length === 0 &&
              detail.dominates.length === 0 && (
                <p className="muted">No dominance observations for this pig.</p>
              )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SocialGraph;
