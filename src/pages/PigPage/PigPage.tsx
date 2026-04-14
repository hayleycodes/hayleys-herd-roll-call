import { useParams } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';

import './PigPage.css';

import HealthPanel from '../../components/HealthPanel/HealthPanel';
import TasksPanel from '../../components/TasksPanel/TasksPanel';
import FamilyPanel from '../../components/FamilyPanel/FamilyPanel';
import Loading from '../../components/ui/Loading/Loading';
import Modal from '../../components/ui/Modal/Modal';
import Confetti from '../../components/ui/Confetti/Confetti';

import { getPigHealth } from '../../services/pig-health.service';
import { getTasksForPig } from '../../services/tasks.service';
import {
  compressImage,
  uploadPigImage,
} from '../../services/pig-images.service';
import { usePigImage } from '../../hooks/usePigImage';
import { PASTEL_BORDERS } from '../../constants/colors';

import {
  savePigImage,
  getPig,
  updateDescription,
  createPigSighting,
} from '../../services/pigs.service';

import { getPigFamily } from '../../services/pig-relationships.service';
import {
  getPigTags,
  addPigTag,
  removePigTag,
  getTagLabel,
  TAG_OPTIONS,
} from '../../services/pig-tags.service';

import type { Pig, Task } from '../../services/pigs.types';

const PIG_QUOTES = [
  'Wheek wheek! 🐹',
  'Got any veggies? 🥬',
  'Popcorning with joy! 🍿',
  'Rumble rumble... 💜',
  'Lettuce celebrate! 🥬🎉',
  'Just here for the hay 🌾',
  'Living my best pig life ✨',
  'Wheek wheek wheeeek! 📢',
  'Nap time is the best time 😴',
  'Did someone say cucumber? 🥒',
  'Hair looking fabulous today 💇',
  'Zooming around! 💨',
];

const getQuoteForPig = (pigId: number) => {
  return PIG_QUOTES[pigId % PIG_QUOTES.length];
};

const PigPage = () => {
  const { id } = useParams();

  const [pig, setPig] = useState<Pig | null>(null);
  const { imageUrl, imageLoading, imageReady } = usePigImage(pig?.image_path);

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');

  const [health, setHealth] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const [customTagEmoji, setCustomTagEmoji] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const [family, setFamily] = useState<{
    parents: Pig[];
    children: Pig[];
    siblings: Pig[];
    fosterFamily: Pig[];
  }>({
    parents: [],
    children: [],
    siblings: [],
    fosterFamily: [],
  });

  const [scrollScale, setScrollScale] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedPig, setSelectedPig] = useState<Pig | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiOrigin, setConfettiOrigin] = useState<
    { x: number; y: number } | undefined
  >();

  const handleConfirm = async () => {
    if (!selectedPig) return;

    try {
      setUpdating(true);

      await createPigSighting(selectedPig.id);

      const now = new Date().toISOString();

      setPig((prev) => (prev ? { ...prev, last_sighted: now } : null));

      setSelectedPig(null);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
    } catch (err) {
      console.error('Failed to save sighting:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpload = async (file: File, pigId: number) => {
    const compressed = await compressImage(file);

    const filePath = await uploadPigImage(compressed, pigId);

    await savePigImage(pigId, filePath);

    setPig((prev) => (prev ? { ...prev, image_path: filePath } : prev));
  };

  const handleAddTag = async (tag: string) => {
    if (!pig) return;
    await addPigTag(pig.id, tag);
    setTags((prev) => [...prev, tag]);
  };

  const handleAddCustomTag = async () => {
    const text = customTagInput.trim().replace(/\s+/g, '-');
    if (!pig || !text || tags.includes(text)) return;
    const tag = customTagEmoji ? `${text} ${customTagEmoji}` : text;
    if (tags.includes(tag)) return;
    await addPigTag(pig.id, tag);
    setTags((prev) => [...prev, tag]);
    setCustomTagInput('');
    setCustomTagEmoji('');
  };

  const handleRemoveTag = async (tag: string) => {
    if (!pig) return;
    await removePigTag(pig.id, tag);
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSaveDescription = async () => {
    if (!pig) return;

    try {
      const updated = await updateDescription(pig.id, descriptionDraft);
      setPig(updated);
      setIsEditingDescription(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleScroll = useCallback(() => {
    const scale = Math.max(0.55, 1 - (window.scrollY / 250) * 0.45);
    setScrollScale(scale);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const load = async () => {
      try {
        if (!id) throw new Error('Missing pig id');

        const pigId = Number(id);
        if (isNaN(pigId)) throw new Error('Invalid pig id');

        const [pigData, healthData, familyData, tagsData, tasksData] = await Promise.all([
          getPig(pigId),
          getPigHealth(pigId),
          getPigFamily(pigId),
          getPigTags(pigId),
          getTasksForPig(pigId),
        ]);

        setPig(pigData);
        setHealth(healthData);
        setFamily(familyData);
        setTags(tagsData);
        setTasks(tasksData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  if (loading) return <Loading />;
  if (error) return <div className="pigCardDetail error">{error}</div>;
  if (!pig) return <div className="pigCardDetail">Pig not found 🐷</div>;

  const pigColor = PASTEL_BORDERS[pig.id % PASTEL_BORDERS.length];

  return (
    <div className={`pigPage ${pig.passed_away && 'memorialMode'}`}>
      <Confetti active={showConfetti} origin={confettiOrigin} />

      <div
        className="pigDetailCard"
        style={{ '--pig-color': pigColor } as React.CSSProperties}
      >
        <div
          className="detailCircleWrapper"
          style={{
            transform: `scale(${scrollScale})`,
            transformOrigin: 'top center',
            marginBottom: `${-(1 - scrollScale) * 100}%`,
          }}
        >
          {!pig.passed_away && (
            <button
              className="eyeButton detailEyeButton"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setConfettiOrigin({
                  x: rect.left + rect.width / 2,
                  y: rect.top + rect.height / 2,
                });
                setSelectedPig(pig);
              }}
            >
              👀
            </button>
          )}
          {!pig.passed_away && (
            <div className="pigSpeechBubble">{getQuoteForPig(pig.id)}</div>
          )}
          <div className="editButtons">
            <button
              onClick={() => {
                setDescriptionDraft(pig.description ?? '');
                setIsEditingDescription(true);
              }}
              className="pigDescriptionEditButton"
              aria-label="Edit description"
            >
              ✏️
            </button>
            <label htmlFor="pig-image-upload" className="pigImageUploadButton">
              📸
            </label>
            <button
              className="pigTagEditButton"
              onClick={() => setShowTagPicker(!showTagPicker)}
              aria-label="Edit tags"
            >
              🏷️
            </button>
          </div>
          <div className="detailCircle" style={{ borderColor: pigColor }}>
            {imageLoading ? (
              <span className="detailEmoji pigCardSpin">🐷</span>
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt={pig.name}
                className="detailImage"
                style={{
                  opacity: imageReady ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                }}
              />
            ) : (
              <span className="detailEmoji">🐖</span>
            )}
          </div>
        </div>

        <div className="detailLabel" style={{ backgroundColor: pigColor }}>
          <h1 className="pigName">{pig.name}</h1>
          {pig.last_sighted && (
            <span className="detailSighted">
              Last sighted:{' '}
              {formatDistanceToNow(new Date(pig.last_sighted), {
                addSuffix: true,
              })}
            </span>
          )}
        </div>

        <div className="detailBody">
          {tags.length > 0 && (
            <div className="detailTags">
              {tags.map((tag) => (
                <span key={tag} className="detailTag">
                  {getTagLabel(tag)}
                </span>
              ))}
            </div>
          )}
          {showTagPicker && (
            <div className="tagPicker">
              {TAG_OPTIONS.map((opt) => {
                const active = tags.includes(opt.tag);
                return (
                  <button
                    key={opt.tag}
                    className={`tagOption${active ? ' tagOptionActive' : ''}`}
                    onClick={() =>
                      active ? handleRemoveTag(opt.tag) : handleAddTag(opt.tag)
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
              {tags
                .filter((tag) => !TAG_OPTIONS.some((opt) => opt.tag === tag))
                .map((tag) => (
                  <button
                    key={tag}
                    className="tagOption tagOptionActive"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag} ✕
                  </button>
                ))}
              <div className="customTagInput">
                <input
                  type="text"
                  placeholder="Custom tag..."
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag()}
                />
                <div className="emojiPickerWrapper" ref={emojiPickerRef}>
                  <button
                    type="button"
                    className="emojiPickerToggle"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    {customTagEmoji || '😀'}
                  </button>
                  {showEmojiPicker && (
                    <div className="emojiDropdown">
                      <EmojiPicker
                        onEmojiClick={(emojiData: EmojiClickData) => {
                          setCustomTagEmoji(emojiData.emoji);
                          setShowEmojiPicker(false);
                        }}
                        width={'100%'}
                        height={350}
                        skinTonesDisabled
                        searchPlaceholder="    Search emoji..."
                      />
                    </div>
                  )}
                </div>
                <button
                  className="btn-outline"
                  onClick={handleAddCustomTag}
                  disabled={!customTagInput.trim()}
                >
                  Add
                </button>
                <button
                  className="btn-outline"
                  onClick={() => setShowTagPicker(false)}
                >
                  Done
                </button>
              </div>
            </div>
          )}
          <div className="pigDescription">
            {!isEditingDescription ? (
              <p>{pig.description ?? 'No description yet 🐷'}</p>
            ) : (
              <div>
                <textarea
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  rows={3}
                />
                <div className="descriptionEditActions">
                  <button
                    className="btn-outline"
                    onClick={handleSaveDescription}
                  >
                    Save
                  </button>
                  <button
                    className="btn-outline"
                    onClick={() => setIsEditingDescription(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="pigMeta">
            {pig.created_at && (
              <span>
                Added: {new Date(pig.created_at).toLocaleDateString()}
              </span>
            )}
            {pig.dob && (
              <span>DOB: {new Date(pig.dob).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        <input
          id="pig-image-upload"
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file && pig) {
              await handleUpload(file, pig.id);
            }
          }}
        />
      </div>

      <HealthPanel pig={pig} health={health} setHealth={setHealth} />

      <TasksPanel tasks={tasks} setTasks={setTasks} pigId={pig.id} />

      <FamilyPanel family={family} />

      <Modal isOpen={!!selectedPig} onClose={() => setSelectedPig(null)}>
        <p>Mark {pig.name} as seen?</p>

        <div className="confirmActions">
          <button onClick={() => setSelectedPig(null)}>Cancel</button>
          <button onClick={handleConfirm} disabled={updating}>
            {updating ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default PigPage;
