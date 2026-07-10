import { useState, type ReactNode } from 'react';

type Props = {
  summary: ReactNode; // the always-visible one-liner
  children: ReactNode; // the longer explanation, revealed on "more info"
};

/** A tab's one-line algorithm summary with a fold-down longer explanation. */
const AlgorithmInfo = ({ summary, children }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="algoInfo">
      <p className="graphRankLegend muted">
        {summary}{' '}
        <button
          type="button"
          className="algoInfoToggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? 'Less info ▲' : 'More info ▼'}
        </button>
      </p>
      <div
        className={`algoInfoReveal${open ? ' algoInfoOpen' : ''}`}
        aria-hidden={!open}
      >
        <div className="algoInfoRevealInner">
          <div className="algoInfoDetails muted">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default AlgorithmInfo;
