import type { ReactNode } from 'react';
import './Panel.css';

type PanelProps = {
  heading: string;
  subHeading?: string;
  theme: 'green' | 'pink' | 'blue';
  children: ReactNode;
};

const Panel = ({ heading, subHeading, theme, children }: PanelProps) => {
  return (
    <div className={`panel ${theme}Panel`}>
      <div className="panelHeading">
        <h2>{heading}</h2>
        {subHeading && <p>{subHeading}</p>}
      </div>
      <div className="panelContent">{children}</div>
    </div>
  );
};

export default Panel;
