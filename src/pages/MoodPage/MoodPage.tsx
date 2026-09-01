import { useEffect, useState } from 'react';

import './MoodPage.css';
import Loading from '../../components/ui/Loading/Loading';
import { getAllPigs } from '../../services/pigs.service';
import {
  addPigMood,
  MOOD_OPTIONS,
  getPigMoods,
} from '../../services/pig-moods.service';
import { usePigImage } from '../../hooks/usePigImage';
import type { Pig, MoodRecord } from '../../services/pigs.types';
import { getErrorMessage } from '../../lib/get-error-message';

const PigMoodRow = ({
  pig,
  moods,
  done,
  onMoodSelect,
}: {
  pig: Pig;
  moods: MoodRecord[];
  done: boolean;
  onMoodSelect: (pigId: number, mood: string) => void;
}) => {
  const { imageUrl, imageLoading, imageReady } = usePigImage(
    pig.image_paths?.[0] ?? null
  );
  const latestMood = moods[0];

  return (
    <div className={`moodRow${done ? ' moodRowDone' : ''}`}>
      <div className="moodRowPig">
        <div className="moodRowAvatar">
          {imageLoading ? (
            <span className="moodRowEmoji moodRowSpin">🐷</span>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={pig.name}
              className="moodRowImage"
              style={{
                opacity: imageReady ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            />
          ) : (
            <span className="moodRowEmoji">🐹</span>
          )}
        </div>
        <span className="moodRowName">{pig.name}</span>
        {latestMood && (
          <span className="moodRowLatest">
            {MOOD_OPTIONS.find((m) => m.mood === latestMood.mood)?.label ??
              latestMood.mood}
          </span>
        )}
      </div>
      <div className="moodRowOptions">
        {MOOD_OPTIONS.map((opt) => (
          <button
            key={opt.mood}
            className="moodRowBtn"
            onClick={() => onMoodSelect(pig.id, opt.mood)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const MoodPage = () => {
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [moodsByPig, setMoodsByPig] = useState<Map<number, MoodRecord[]>>(
    new Map()
  );
  const [donePigs, setDonePigs] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const allPigs = await getAllPigs();
        const moodsMap = new Map<number, MoodRecord[]>();
        const moodResults = await Promise.all(
          allPigs.map((p) => getPigMoods(p.id))
        );
        allPigs.forEach((p, i) => moodsMap.set(p.id, moodResults[i]));
        setPigs(allPigs);
        setMoodsByPig(moodsMap);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleMoodSelect = async (pigId: number, mood: string) => {
    await addPigMood(pigId, mood);
    const updated = await getPigMoods(pigId);
    setMoodsByPig((prev) => {
      const next = new Map(prev);
      next.set(pigId, updated);
      return next;
    });
    setDonePigs((prev) => new Set(prev).add(pigId));
  };

  if (loading) return <Loading />;
  if (error) return <p>{error}</p>;

  const query = search.toLowerCase().trim();
  const filtered = query
    ? pigs.filter((p) => p.name.toLowerCase().includes(query))
    : pigs;

  // Sort: pigs without a mood selected this session first, done pigs at the bottom
  const sortedPigs = [...filtered].sort((a, b) => {
    const aDone = donePigs.has(a.id) ? 1 : 0;
    const bDone = donePigs.has(b.id) ? 1 : 0;
    return aDone - bDone;
  });

  return (
    <div className="moodPage">
      <h2>Mood Check-in 🧠</h2>
      <div className="pigSearchWrapper">
        <input
          type="text"
          className="pigSearch"
          placeholder="Search pigs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="pigSearchClear" onClick={() => setSearch('')}>
            ✕
          </button>
        )}
      </div>
      <div className="moodPageList">
        {sortedPigs.map((pig) => (
          <PigMoodRow
            key={pig.id}
            pig={pig}
            moods={moodsByPig.get(pig.id) ?? []}
            done={donePigs.has(pig.id)}
            onMoodSelect={handleMoodSelect}
          />
        ))}
      </div>
    </div>
  );
};

export default MoodPage;
