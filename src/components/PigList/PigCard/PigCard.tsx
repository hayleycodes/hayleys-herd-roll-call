import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import './PigCard.css';
import type { Pig } from '../../../services/pigs.types';
import { useRandomPigImage } from '../../../hooks/usePigImage';
import { getPigColorClass } from '../../../constants/colors';
import EmojiButton from '../../ui/EmojiButton/EmojiButton';

type Props = {
  pig: Pig;
  relationship?: string;
  passed?: boolean;
  sick?: boolean;
  notSightedToday?: boolean;
  hideLastSeen?: boolean;
  sighted?: boolean;
  highlightUnseen?: boolean;
  crowned?: boolean;
  pinned?: boolean;
  onEyeClick?: (origin: { x: number; y: number }) => void;
  onUndoClick?: () => void;
  onPinClick?: () => void;
};

const PigCard = ({
  pig,
  relationship,
  passed,
  sick,
  notSightedToday,
  hideLastSeen,
  sighted,
  highlightUnseen,
  crowned,
  pinned,
  onEyeClick,
  onUndoClick,
  onPinClick,
}: Props) => {
  const { imageUrl, imageLoading, imageReady } = useRandomPigImage(
    pig.image_paths
  );
  const [wiggling, setWiggling] = useState(false);
  const circleRef = useRef<HTMLDivElement>(null);

  const lastSighted = pig.last_sighted
    ? formatDistanceToNow(new Date(pig.last_sighted), {
        addSuffix: true,
      })
    : '';

  const pigColorClass = getPigColorClass(pig.id, sick);
  const eyeUnseen = notSightedToday && !sick;

  const handleTap = () => {
    setWiggling(true);
  };

  return (
    <div
      className={`pigCard ${pigColorClass}${passed ? ' pigCardPassed' : ''}${sick ? ' pigCardSick' : ''}${pinned ? ' pigCardPinned' : ''}`}
      style={
        passed
          ? ({
              '--float-delay': `${(pig.id * 1.37) % 7}s`,
            } as React.CSSProperties)
          : undefined
      }
      onClick={handleTap}
    >
      <Link to={`/pigs/${pig.id}`} className="pigCardLink">
        <div className="pigCardCircleWrapper">
          {crowned && (
            <span
              className="pigCardCrown"
              style={
                {
                  // Stable pseudo-random tilt per pig: -18° … +18°.
                  '--crown-rotate': `${((pig.id * 53) % 37) - 18}deg`,
                } as React.CSSProperties
              }
            >
              👑
            </span>
          )}
          {onPinClick && (
            <EmojiButton
              className={`pinButton${pinned ? ' pinButtonActive' : ''}`}
              size="sm"
              variant="pig"
              aria-label={pinned ? `Unpin ${pig.name}` : `Pin ${pig.name} to top`}
              onClick={(e) => {
                e.preventDefault();
                onPinClick();
              }}
            >
              📌
            </EmojiButton>
          )}
          {onEyeClick &&
            (sighted ? (
              <EmojiButton
                className="eyeButton undoButton"
                size="sm"
                variant="pig"
                aria-label={`Undo sighting for ${pig.name}`}
                onClick={(e) => {
                  e.preventDefault();
                  onUndoClick?.();
                }}
              >
                ↩️
              </EmojiButton>
            ) : (
              <EmojiButton
                className={`eyeButton${eyeUnseen ? ' eyeButtonUnseen' : ''}${eyeUnseen && highlightUnseen ? ' eyeButtonUnseenActive' : ''}`}
                size="sm"
                variant="pig"
                aria-label={`Mark ${pig.name} as seen`}
                onClick={(e) => {
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  onEyeClick({
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                  });
                }}
              >
                👀
              </EmojiButton>
            ))}
          {/* {notSightedToday && <span className="pigCardUnseen">👻</span>} */}
          <div
            ref={circleRef}
            className={`pigCardCircle${wiggling ? ' wiggle' : ''}`}
            onAnimationEnd={() => setWiggling(false)}
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
        <div className="pigCardLabel">
          <h3 className="pigCardName">
            {sick && '🤒 '}
            {pig.name}
          </h3>
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
