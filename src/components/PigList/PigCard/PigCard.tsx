import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import './PigCard.css';
import type { Pig } from '../../../services/pigs.types';
import { usePigImage } from '../../../hooks/usePigImage';
import { PASTEL_BORDERS } from '../../../constants/colors';

type Props = {
  pig: Pig;
  relationship?: string;
  fading?: boolean;
  passed?: boolean;
  sick?: boolean;
  notSightedToday?: boolean;
  hideLastSeen?: boolean;
  onEyeClick?: (origin: { x: number; y: number }) => void;
};

const PigCard = ({
  pig,
  relationship,
  fading,
  passed,
  sick,
  notSightedToday,
  hideLastSeen,
  onEyeClick,
}: Props) => {
  const { imageUrl, imageLoading, imageReady } = usePigImage(pig.image_path);
  const [wiggling, setWiggling] = useState(false);
  const circleRef = useRef<HTMLDivElement>(null);

  const lastSighted = pig.last_sighted
    ? formatDistanceToNow(new Date(pig.last_sighted), {
        addSuffix: true,
      })
    : '';

  const pigColor = sick ? '#e63946' : PASTEL_BORDERS[pig.id % PASTEL_BORDERS.length];
  const unseenColor = '#ff6b6b';
  const eyeColor = notSightedToday ? unseenColor : pigColor;

  const handleTap = () => {
    setWiggling(true);
  };

  return (
    <div
      className={`pigCard${fading ? ' pigCardFading' : ''}${passed ? ' pigCardPassed' : ''}${sick ? ' pigCardSick' : ''}`}
      style={
        passed
          ? ({
              '--float-delay': `${(pig.id * 1.37) % 7}s`,
            } as React.CSSProperties)
          : undefined
      }
      onClick={handleTap}
    >
      {onEyeClick && (
        <button
          className="eyeButton"
          style={{ backgroundColor: eyeColor, borderColor: eyeColor }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            onEyeClick({
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            });
          }}
        >
          👀
        </button>
      )}
      <Link to={`/pigs/${pig.id}`} className="pigCardLink">
        <div className="pigCardCircleWrapper">
          {/* {notSightedToday && <span className="pigCardUnseen">👻</span>} */}
          <div
            ref={circleRef}
            className={`pigCardCircle${wiggling ? ' wiggle' : ''}`}
            onAnimationEnd={() => setWiggling(false)}
            style={{ borderColor: pigColor }}
          >
            {imageLoading ? (
              <span className="pigCardEmoji pigCardSpin">🐷</span>
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt={pig.name}
                className="pigCardImage"
                style={{
                  opacity: imageReady ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                }}
              />
            ) : (
              <span className="pigCardEmoji">🐹</span>
            )}
          </div>
        </div>
        <div className="pigCardLabel" style={{ backgroundColor: pigColor }}>
          <h3 className="pigCardName">{sick && '🤒 '}{pig.name}</h3>
          {relationship && (
            <span className="pigCardRelationship">{relationship}</span>
          )}
          {!hideLastSeen && (
            <div className="pigCardSighted">
              <span>{lastSighted}</span>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

export default PigCard;
