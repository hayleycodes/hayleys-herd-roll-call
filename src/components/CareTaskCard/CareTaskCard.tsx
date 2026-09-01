import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import PigThumb from '../ui/PigThumb/PigThumb';
import './CareTaskCard.css';

interface Props {
  label: string;
  meta?: string;
  badge?: ReactNode;
  pigName?: string;
  pigImagePath?: string | null;
  pigId?: number;
  onSkip?: () => void;
  onDone?: () => void;
  variant?: 'default' | 'overdue' | 'oneoff';
}

const CareTaskCard = ({
  label,
  meta,
  badge,
  pigName,
  pigImagePath,
  pigId,
  onSkip,
  onDone,
  variant = 'default',
}: Props) => {
  const variantClass =
    variant === 'overdue'
      ? ' careTaskCardOverdue'
      : variant === 'oneoff'
        ? ' careTaskCardOneoff'
        : '';

  return (
    <div className={`careTaskCard${variantClass}`}>
      {pigName && pigId != null && (
        <Link to={`/pigs/${pigId}`} className="careTaskPig">
          <PigThumb
            imagePath={pigImagePath ?? null}
            className="careTaskThumb"
            placeholderClassName="careTaskThumbPlaceholder"
          />
          <span className="careTaskPigName">{pigName}</span>
        </Link>
      )}
      <div className="careTaskBody">
        <span className="careTaskLabel">{label}</span>
        {meta && <span className="careTaskMeta">{meta}</span>}
        {badge}
      </div>
      {onSkip && (
        <button className="btn btn--outline" onClick={onSkip}>
          Skip
        </button>
      )}
      {onDone && (
        <button className="btn btn--outline" onClick={onDone}>
          Done
        </button>
      )}
    </div>
  );
};

export default CareTaskCard;
