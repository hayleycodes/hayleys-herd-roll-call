import type { ReactNode } from 'react';
import './Panel.css';

type PanelProps = {
  heading: string;
  subHeading?: string;
  theme: 'green' | 'pink' | 'blue' | 'purple' | 'custom';
  color?: string;
  children: ReactNode;
};

const Panel = ({ heading, subHeading, theme, color, children }: PanelProps) => {
  const style = color
    ? ({
        '--panel-color': color,
        borderColor: color,
        backgroundColor: `color-mix(in srgb, ${color} 40%, white)`,
      } as React.CSSProperties)
    : undefined;

  return (
    <div className={`panel ${theme}Panel`} style={style}>
      <div className="panelHeading">
        <h2>{heading}</h2>
        {subHeading && <p>{subHeading}</p>}
      </div>
      <div className="panelContent">{children}</div>
    </div>
  );
};

export default Panel;
