import { useState } from 'react';
import { usePigImage } from '../../hooks/usePigImage';
import { getPigColorClass } from '../../constants/colors';
import { MOOD_OPTIONS } from '../../services/pig-moods.service';
import type { Pig } from '../../services/pigs.types';
import EmojiButton from '../ui/EmojiButton/EmojiButton';
import { FEATURE_MOOD } from '../../config/features';
import './RollcallCard.css';

type Props = {
  pig: Pig;
  onSighted: (moods: string[]) => void;
  onSkipped: () => void;
  disabled: boolean;
};

const RollcallCard = ({ pig, onSighted, onSkipped, disabled }: Props) => {
  const { imageUrl, imageLoading, imageReady } = usePigImage(pig.image_path);
  const pigColorClass = getPigColorClass(pig.id);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);

  const toggleMood = (mood: string) => {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    );
  };

  return (
    <div className={`rollcallCard ${pigColorClass}`}>
      <div className="rollcallCardMain">
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
        <EmojiButton
          className="rollcallActionBtn sighted"
          size="lg"
          shape="circle"
          onClick={() => onSighted(selectedMoods)}
          disabled={disabled}
          aria-label="Mark pig as sighted"
        >
          👀
        </EmojiButton>
      </div>
      <h2 className="rollcallCardName">{pig.name}</h2>
      {FEATURE_MOOD && (
        <div className="rollcallMoods">
          {MOOD_OPTIONS.map((option) => {
            const isSelected = selectedMoods.includes(option.mood);
            return (
              <button
                key={option.mood}
                className={`rollcallMoodBtn ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleMood(option.mood)}
                disabled={disabled}
                aria-label={option.label}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RollcallCard;
