import { useState } from 'react';
import { format } from 'date-fns';
import { PigThumb } from '../PigPicker/PigPicker';
import {
  bondEventLabel,
  interactionsBetween,
  parseTs,
  type BondEvent,
  type FriendRel,
} from '../../services/friendship';
import './FriendBars.css';

type Props = {
  // The pig whose friendships these bars belong to.
  selfId: number;
  rels: FriendRel[];
  historyEvents: BondEvent[];
};

// Horizontal relationship bar chart. Clicking a bar folds down the list of
// interactions with that friend, each with a timestamp.
const FriendBars = ({ selfId, rels, historyEvents }: Props) => {
  const [expandedPartner, setExpandedPartner] = useState<number | null>(null);

  if (rels.length === 0) {
    return <p className="friendStatEmpty">No friends yet 🌱</p>;
  }

  // Bar widths are scaled against the strongest relationship.
  const maxPoints = rels.reduce((m, r) => Math.max(m, r.points), 0);

  return (
    <div className="friendBars">
      {rels.map((r) => {
        const partnerId = Number(r.partner.id);
        const expanded = expandedPartner === partnerId;
        // Rendered even while collapsed so the fold-up can animate its content.
        const interactions = interactionsBetween(
          historyEvents,
          selfId,
          partnerId
        );
        return (
          <div key={r.partner.id}>
            <button
              type="button"
              className={`friendBarRow${expanded ? ' expanded' : ''}`}
              title={r.tier.label}
              aria-expanded={expanded}
              onClick={() => setExpandedPartner(expanded ? null : partnerId)}
            >
              <span className="friendBarLabel">
                <PigThumb imagePath={r.partner.image_paths?.[0] ?? null} />
                <span className="friendBarName">{r.partner.name}</span>
              </span>
              <span className="friendBarTrack">
                <span
                  className="friendBarFill"
                  style={{
                    width: `${maxPoints ? (r.points / maxPoints) * 100 : 0}%`,
                  }}
                />
                <span className="friendBarValue">
                  {r.tier.icon} {r.points}
                </span>
              </span>
              <span className="friendBarChevron" aria-hidden>
                {expanded ? '▾' : '▸'}
              </span>
            </button>
            <div
              className={`friendInteractionsWrap${expanded ? ' open' : ''}`}
            >
              <ul className="friendInteractions">
                {interactions.length === 0 ? (
                  <li className="friendInteractionEmpty">
                    No recorded interactions
                  </li>
                ) : (
                  interactions.map((ev) => (
                    <li className="friendInteraction" key={ev.uid}>
                      <span className="friendInteractionLabel">
                        {bondEventLabel(ev)}
                      </span>
                      <span className="friendInteractionTime">
                        {format(new Date(parseTs(ev.ts)), 'd MMM yyyy, h:mm a')}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FriendBars;
