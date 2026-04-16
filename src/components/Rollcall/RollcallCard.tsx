import { usePigImage } from '../../hooks/usePigImage';
import { getPigColorClass } from '../../constants/colors';
import type { Pig } from '../../services/pigs.types';
import EmojiButton from '../ui/EmojiButton/EmojiButton';
import './RollcallCard.css';

type Props = {
  pig: Pig;
  onSighted: () => void;
  onSkipped: () => void;
  disabled: boolean;
};

const RollcallCard = ({ pig, onSighted, onSkipped, disabled }: Props) => {
  const { imageUrl, imageLoading, imageReady } = usePigImage(pig.image_path);
  const pigColorClass = getPigColorClass(pig.id);

  return (
    <div className={`rollcallCard ${pigColorClass}`}>
      <div className="rollcallCardImage">
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
        <EmojiButton
          className="rollcallActionBtn skip"
          size="lg"
          shape="circle"
          onClick={onSkipped}
          disabled={disabled}
          aria-label="Skip pig"
        >
          🤷‍♀️
        </EmojiButton>
        <EmojiButton
          className="rollcallActionBtn sighted"
          size="lg"
          shape="circle"
          onClick={onSighted}
          disabled={disabled}
          aria-label="Mark pig as sighted"
        >
          👀
        </EmojiButton>
      </div>
    </div>
  );
};

export default RollcallCard;
