import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import './PigCard.css';
import type { Pig } from '../../../services/pigs.types';
import { getPigImageUrl } from '../../../services/pig-images.service';

export const PASTEL_BORDERS = [
  '#ffc1c8', // pink
  '#fef0a3', // yellow
  '#c8b6ff', // lavender
  '#a8e6cf', // mint
  '#8ed6ff', // sky blue
  '#ffd6a5', // peach
  '#ffb3e6', // rose
  '#b5ead7', // sage
];

type Props = {
  pig: Pig;
  relationship?: string;
  fading?: boolean;
  passed?: boolean;
  onEyeClick?: (origin: { x: number; y: number }) => void;
};

const PigCard = ({ pig, relationship, fading, passed, onEyeClick }: Props) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(!!pig.image_path);
  const [wiggling, setWiggling] = useState(false);
  const circleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pig.image_path) {
      setImageLoading(false);
      return;
    }
    setImageLoading(true);
    const load = async () => {
      const { signedUrl } = await getPigImageUrl(pig.image_path!);
      setImageUrl(signedUrl);
      setImageLoading(false);
    };
    load();
  }, [pig.image_path]);

  const lastSighted = pig.last_sighted
    ? formatDistanceToNow(new Date(pig.last_sighted), {
        addSuffix: true,
      })
    : '';

  const pigColor = PASTEL_BORDERS[pig.id % PASTEL_BORDERS.length];

  const handleTap = () => {
    setWiggling(true);
  };

  return (
    <div className={`pigCard${fading ? ' pigCardFading' : ''}${passed ? ' pigCardPassed' : ''}`} onClick={handleTap}>
      {onEyeClick && (
        <button
          className="eyeButton"
          style={{ backgroundColor: pigColor, borderColor: pigColor }}
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
          <div
            ref={circleRef}
            className={`pigCardCircle${wiggling ? ' wiggle' : ''}`}
            onAnimationEnd={() => setWiggling(false)}
            style={{ borderColor: pigColor }}
          >
            {imageLoading ? (
              <span className="pigCardEmoji pigCardSpin">🐷</span>
            ) : imageUrl ? (
              <img src={imageUrl} alt={pig.name} className="pigCardImage" />
            ) : (
              <span className="pigCardEmoji">🐹</span>
            )}
          </div>
        </div>
        <div className="pigCardLabel" style={{ backgroundColor: pigColor }}>
          <h3 className="pigCardName">{pig.name}</h3>
          {relationship && (
            <span className="pigCardRelationship">{relationship}</span>
          )}
          <div className="pigCardSighted">
            <span>{lastSighted}</span>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default PigCard;
