import { formatDistanceToNow } from 'date-fns';
import './MoodPanel.css';
import {
  getPigMoods,
  addPigMood,
  deletePigMood,
  MOOD_OPTIONS,
  getMoodLabel,
  getMoodEmoji,
} from '../../services/pig-moods.service';
import type { Pig, MoodRecord } from '../../services/pigs.types';
import Panel from '../ui/Panel/Panel';
import EmojiButton from '../ui/EmojiButton/EmojiButton';
import Button from '../ui/Button/Button';
import { useState } from 'react';

type Props = {
  pig: Pig;
  moods: MoodRecord[];
  setMoods: (m: MoodRecord[]) => void;
};

const MoodPanel = ({ pig, moods, setMoods }: Props) => {
  const handleAddMood = async (mood: string) => {
    await addPigMood(pig.id, mood);
    const updated = await getPigMoods(pig.id);
    setMoods(updated);
  };

  const handleDelete = async (id: number) => {
    await deletePigMood(id);
    const updated = await getPigMoods(pig.id);
    setMoods(updated);
  };

  const [showAll, setShowAll] = useState(false);
  const displayMoods = showAll ? moods : moods.slice(0, 3);

  return (
    <Panel heading="Mood 🧠" theme="custom" color="#ffa726">
      {!pig.passed_away && (
        <div className="moodGrid">
          {MOOD_OPTIONS.map((opt) => (
            <button
              key={opt.mood}
              className="moodGridBtn"
              onClick={() => handleAddMood(opt.mood)}
              aria-label={opt.label}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {moods.length === 0 ? (
        <p className="muted">No mood logs yet</p>
      ) : (
        <div className="moodCardList">
          {displayMoods.map((record) => (
            <div key={record.id} className="moodCard">
              <span className="moodEmoji">{getMoodEmoji(record.mood)}</span>
              <span className="moodLabel">{getMoodLabel(record.mood)}</span>
              <span className="muted moodTime">
                {formatDistanceToNow(new Date(record.created_at), {
                  addSuffix: true,
                })}
              </span>
              <EmojiButton
                className="moodDeleteBtn"
                size="sm"
                onClick={() => handleDelete(record.id)}
                aria-label="Delete mood"
              >
                🗑️
              </EmojiButton>
            </div>
          ))}
          {moods.length > 3 && (
            <Button onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Hide mood history' : 'Show mood history'}
            </Button>
          )}
        </div>
      )}
    </Panel>
  );
};

export default MoodPanel;
