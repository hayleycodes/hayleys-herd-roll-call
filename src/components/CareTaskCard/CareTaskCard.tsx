import { type ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPigImageUrl } from '../../services/pig-images.service';
import './CareTaskCard.css';

interface Props {
  label: string;
  meta?: string;
  badge?: ReactNode;
  pigName?: string;
  pigImagePath?: string | null;
  pigId?: number;
  onDone?: () => void;
  variant?: 'default' | 'overdue' | 'oneoff';
}

const PigThumb = ({ imagePath }: { imagePath: string | null }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imagePath) return;
    getPigImageUrl(imagePath).then(({ signedUrl }) => setUrl(signedUrl));
  }, [imagePath]);

  if (!url)
    return <div className="careTaskThumb careTaskThumbPlaceholder">🐹</div>;
  return (
    <div className="careTaskThumb" style={{ backgroundImage: `url(${url})` }} />
  );
};

const CareTaskCard = ({
  label,
  meta,
  badge,
  pigName,
  pigImagePath,
  pigId,
  onDone,
  variant = 'default',
}: Props) => {
  const variantClass = variant === 'overdue' ? ' careTaskCardOverdue' : variant === 'oneoff' ? ' careTaskCardOneoff' : '';

  return (
    <div className={`careTaskCard${variantClass}`}>
      {pigName && pigId != null && (
        <Link to={`/pigs/${pigId}`} className="careTaskPig">
          <PigThumb imagePath={pigImagePath ?? null} />
          <span className="careTaskPigName">{pigName}</span>
        </Link>
      )}
      <div className="careTaskBody">
        <span className="careTaskLabel">{label}</span>
        {meta && <span className="careTaskMeta">{meta}</span>}
        {badge}
      </div>
      {onDone && (
        <button className="btn btn--outline" onClick={onDone}>Done</button>
      )}
    </div>
  );
};

export default CareTaskCard;
