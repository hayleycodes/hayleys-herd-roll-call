import { usePigImage } from '../../hooks/usePigImage';
import { PASTEL_BORDERS } from '../../constants/colors';
import type { Pig } from '../../services/pigs.types';
import './RollcallCard.css';

type Props = {
  pig: Pig;
  onSighted: () => void;
  onSkipped: () => void;
  disabled: boolean;
};

const RollcallCard = ({ pig, onSighted, onSkipped, disabled }: Props) => {
  const { imageUrl, imageLoading, imageReady } = usePigImage(pig.image_path);
  const borderColor = PASTEL_BORDERS[pig.id % PASTEL_BORDERS.length];

  return (
    <div className="rollcallCard">
      <div className="rollcallCardImage" style={{ borderColor }}>
        {imageLoading && <span className="rollcallCardSpin">🐷</span>}
        {!imageLoading && !imageUrl && (
          <span className="rollcallCardEmoji">🐹</span>
        )}
        {imageUrl && (
          <img
            src={imageUrl}
            alt={pig.name}
            className={`rollcallCardImg ${imageReady ? 'ready' : ''}`}
          />
        )}
      </div>
      <h2 className="rollcallCardName">{pig.name}</h2>
      <div className="rollcallActions">
        <button
          className="rollcallActionBtn skip"
          onClick={onSkipped}
          disabled={disabled}
          aria-label="Skip pig"
        >
          🤷‍♀️
        </button>
        <button
          className="rollcallActionBtn sighted"
          onClick={onSighted}
          disabled={disabled}
          aria-label="Mark pig as sighted"
        >
          👀
        </button>
      </div>
    </div>
  );
};

export default RollcallCard;
