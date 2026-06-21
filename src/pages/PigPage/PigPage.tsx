import { useParams, Link } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';

import './PigPage.css';

import CareHealthPanel from '../../components/CareHealthPanel/CareHealthPanel';
import MoodPanel from '../../components/MoodPanel/MoodPanel';
import FamilyPanel from '../../components/FamilyPanel/FamilyPanel';
import Loading from '../../components/ui/Loading/Loading';
import Modal from '../../components/ui/Modal/Modal';
import Confetti from '../../components/ui/Confetti/Confetti';
import Button from '../../components/ui/Button/Button';
import EmojiButton from '../../components/ui/EmojiButton/EmojiButton';

import { getPigHealth } from '../../services/pig-health.service';
import {
  getPigMoods,
  addPigMood,
  MOOD_OPTIONS,
} from '../../services/pig-moods.service';
import { getPigWeights } from '../../services/pig-weights.service';
import { getPigRecurringTasks } from '../../services/recurring-tasks.service';
import {
  compressImage,
  uploadPigImage,
} from '../../services/pig-images.service';
import { usePigImage } from '../../hooks/usePigImage';
import { getPigColorClass } from '../../constants/colors';
import { FEATURE_MOOD } from '../../config/features';

import {
  savePigImage,
  getPig,
  getAllPigsIncludingPassed,
  updateDescription,
  createPigSighting,
} from '../../services/pigs.service';

import { getTopPigIds } from '../../services/pig-social-order.service';
import { getPigFamily } from '../../services/pig-relationships.service';
import type { PigFamily } from '../../services/pig-relationships.service';
import {
  getPigTags,
  addPigTag,
  removePigTag,
  getTagDefinitions,
  createTagDefinition,
} from '../../services/pig-tags.service';
import type { TagDefinition } from '../../services/pig-tags.service';

import type {
  Pig,
  WeightRecord,
  MoodRecord,
  PigRecurringTask,
} from '../../services/pigs.types';

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
  const [latestWeight, setLatestWeight] = useState<WeightRecord | null>(null);
  const [moods, setMoods] = useState<MoodRecord[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinition[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const [customTagEmoji, setCustomTagEmoji] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const [recurringTasks, setRecurringTasks] = useState<PigRecurringTask[]>([]);

  const [family, setFamily] = useState<PigFamily>({
    parents: [],
    children: [],
    siblings: [],
    fosterFamily: [],
  });
  const [allPigs, setAllPigs] = useState<Pig[]>([]);
  const [isTopPig, setIsTopPig] = useState(false);

  const [scrollScale, setScrollScale] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxMounted, setLightboxMounted] = useState(false);
  const [lightboxActive, setLightboxActive] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showMoodModal, setShowMoodModal] = useState(false);
  const [selectedPig, setSelectedPig] = useState<Pig | null>(null);
  const [sightingStep, setSightingStep] = useState<
    'confirm' | 'mood' | 'logged'
  >('confirm');
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

      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
      if (FEATURE_MOOD) {
        setSightingStep('mood');
      } else {
        setSightingStep('logged');
        setTimeout(() => closeSightingModal(), 800);
      }
    } catch (err) {
      console.error('Failed to save sighting:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleSightingMood = async (mood: string) => {
    if (!pig) return;
    await addPigMood(pig.id, mood);
    const updated = await getPigMoods(pig.id);
    setMoods(updated);
    setSightingStep('logged');
    setTimeout(() => {
      setSelectedPig(null);
      setSightingStep('confirm');
    }, 1200);
  };

  const closeSightingModal = () => {
    setSelectedPig(null);
    setTimeout(() => setSightingStep('confirm'), 300);
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
    const label = customTagEmoji ? `${text} ${customTagEmoji}` : text;
    const tag = text;
    if (tags.includes(tag)) return;
    await addPigTag(pig.id, tag);
    await createTagDefinition(tag, label);
    setTags((prev) => [...prev, tag]);
    setTagDefinitions((prev) => [...prev, { tag, label }]);
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

  const handleFamilyRefresh = async () => {
    if (!id) return;
    const pigId = Number(id);
    const [familyData, allPigsData] = await Promise.all([
      getPigFamily(pigId),
      getAllPigsIncludingPassed(),
    ]);
    setFamily(familyData);
    setAllPigs(allPigsData);
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

        const [
          pigData,
          healthData,
          familyData,
          tagsData,
          weightsData,
          allPigsData,
          tagDefs,
          moodsData,
          recurringData,
          topIds,
        ] = await Promise.all([
          getPig(pigId),
          getPigHealth(pigId),
          getPigFamily(pigId),
          getPigTags(pigId),
          getPigWeights(pigId),
          getAllPigsIncludingPassed(),
          getTagDefinitions(),
          getPigMoods(pigId),
          getPigRecurringTasks(pigId),
          getTopPigIds(),
        ]);

        setPig(pigData);
        setIsTopPig(topIds.has(pigId));
        setHealth(healthData);
        setFamily(familyData);
        setTags(tagsData);
        setAllPigs(allPigsData);
        setTagDefinitions(tagDefs);
        if (weightsData.length > 0) setLatestWeight(weightsData[0]);
        setMoods(moodsData);
        setRecurringTasks(recurringData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (lightboxOpen) {
      setLightboxMounted(true);
      timeout = setTimeout(() => setLightboxActive(true), 10);
    } else {
      setLightboxActive(false);
      timeout = setTimeout(() => setLightboxMounted(false), 300);
    }
    return () => clearTimeout(timeout);
  }, [lightboxOpen]);

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

  const isSick = tags.includes('sick');
  const pigColorClass = getPigColorClass(pig.id, isSick);

  const relatedPigIds = new Set([
    pig.id,
    ...family.parents.map((m) => m.pig.id),
    ...family.children.map((m) => m.pig.id),
    ...family.siblings.map((m) => m.pig.id),
    ...family.fosterFamily.map((m) => m.pig.id),
  ]);
  const availablePigs = allPigs.filter((p) => !relatedPigIds.has(p.id));

  return (
    <div
      className={`pigPage ${pig.passed_away && 'memorialMode'} ${isSick && 'sickMode'}`}
    >
      <Confetti active={showConfetti} origin={confettiOrigin} />

      <div className={`pigDetailCard ${pigColorClass}`}>
        <div
          className="detailCircleWrapper"
          style={{
            transform: `scale(${scrollScale})`,
            transformOrigin: 'top center',
            marginBottom: `${-(1 - scrollScale) * 100}%`,
          }}
        >
          {isTopPig && <span className="detailCrown">👑</span>}
          {!pig.passed_away && (
            <EmojiButton
              className="eyeButton detailEyeButton"
              size="lg"
              variant="pig"
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
            </EmojiButton>
          )}
          {!pig.passed_away && FEATURE_MOOD && (
            <EmojiButton
              className="detailMoodButton"
              size="lg"
              variant="pig"
              onClick={() => setShowMoodModal(true)}
              aria-label="Log mood"
            >
              🧠
            </EmojiButton>
          )}
          {!pig.passed_away && !isSick && (
            <div className="pigSpeechBubble">{getQuoteForPig(pig.id)}</div>
          )}
          <div className="editButtons">
            <EmojiButton
              variant="pig"
              onClick={() => {
                setDescriptionDraft(pig.description ?? '');
                setIsEditingDescription(true);
              }}
              aria-label="Edit description"
            >
              ✏️
            </EmojiButton>
            <EmojiButton
              variant="pig"
              aria-label="Upload photo"
              onClick={() =>
                document.getElementById('pig-image-upload')?.click()
              }
            >
              📸
            </EmojiButton>
            <EmojiButton
              variant="pig"
              onClick={() => setShowTagPicker(!showTagPicker)}
              aria-label="Edit tags"
            >
              🏷️
            </EmojiButton>
          </div>
          <div className="detailCircle">
            {imageLoading ? (
              <span className="detailEmoji pigCardSpin">🐷</span>
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt={pig.name}
                className="detailImage"
                onClick={() => setLightboxOpen(true)}
                style={{
                  opacity: imageReady ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                  cursor: 'pointer',
                }}
              />
            ) : (
              <span className="detailEmoji">🐖</span>
            )}
          </div>
        </div>

        <div className="detailLabel">
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
                <Link
                  key={tag}
                  to={`/tags?tag=${encodeURIComponent(tag)}`}
                  className={`detailTag detailTagLink${tag === 'sick' ? ' detailTagSick' : ''}`}
                >
                  {tagDefinitions.find(
                    (tagDefinition) => tagDefinition.tag === tag
                  )?.label ?? tag}
                </Link>
              ))}
            </div>
          )}
          {showTagPicker && (
            <div className="tagPicker">
              {tagDefinitions.map((opt) => {
                const active = tags.includes(opt.tag);
                return (
                  <button
                    key={opt.tag}
                    className={`tagOption${active ? ' tagOptionActive' : ''}${opt.tag === 'sick' ? ' tagOptionSick' : ''}`}
                    onClick={() =>
                      active ? handleRemoveTag(opt.tag) : handleAddTag(opt.tag)
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
              {tags
                .filter((tag) => !tagDefinitions.some((opt) => opt.tag === tag))
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
                  <EmojiButton
                    className="emojiPickerToggle"
                    shape="circle"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    {customTagEmoji || '😀'}
                  </EmojiButton>
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
                <Button
                  onClick={handleAddCustomTag}
                  disabled={!customTagInput.trim()}
                >
                  Add
                </Button>
                <Button onClick={() => setShowTagPicker(false)}>Done</Button>
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
                  <Button onClick={handleSaveDescription}>Save</Button>
                  <Button onClick={() => setIsEditingDescription(false)}>
                    Cancel
                  </Button>
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
            {latestWeight && <span>Weight: {latestWeight.weight_grams}g</span>}
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

      <div className="pigPageRight">
        <CareHealthPanel
          pig={pig}
          health={health}
          setHealth={setHealth}
          sick={isSick}
          recurringTasks={recurringTasks}
          onRecurringUpdate={async () => {
            const pigId = Number(id);
            const updated = await getPigRecurringTasks(pigId);
            setRecurringTasks(updated);
          }}
          latestWeight={latestWeight}
          onWeightAdded={async () => {
            const pigId = Number(id);
            const weights = await getPigWeights(pigId);
            if (weights.length > 0) setLatestWeight(weights[0]);
          }}
        />

        <FamilyPanel
          family={family}
          currentPigId={pig.id}
          availablePigs={availablePigs}
          onRefresh={handleFamilyRefresh}
        />
      </div>

      <Modal isOpen={!!selectedPig} onClose={closeSightingModal}>
        {sightingStep === 'confirm' ? (
          <>
            <p>Mark {pig.name} as seen?</p>
            <div className="confirmActions">
              <Button variant="danger" onClick={closeSightingModal}>
                Cancel
              </Button>
              <Button
                variant="success"
                onClick={handleConfirm}
                disabled={updating}
              >
                {updating ? 'Saving...' : 'Confirm'}
              </Button>
            </div>
          </>
        ) : sightingStep === 'mood' ? (
          <>
            <p>How is {pig.name} feeling?</p>
            <div className="moodGrid">
              {MOOD_OPTIONS.map((opt) => (
                <button
                  key={opt.mood}
                  className="moodGridBtn"
                  onClick={() => handleSightingMood(opt.mood)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="confirmActions">
              <Button onClick={closeSightingModal}>Skip</Button>
            </div>
          </>
        ) : (
          <p className="moodLoggedMessage">
            {FEATURE_MOOD ? 'Mood logged! ✨' : 'Sighting logged! ✨'}
          </p>
        )}
      </Modal>

      {FEATURE_MOOD && (
        <Modal isOpen={showMoodModal} onClose={() => setShowMoodModal(false)}>
          <div className="moodModalContent">
            <MoodPanel pig={pig} moods={moods} setMoods={setMoods} />
          </div>
        </Modal>
      )}

      {lightboxMounted && imageUrl && (
        <div
          className={`imageLightboxOverlay ${lightboxActive ? 'open' : ''} ${pigColorClass}`}
          onClick={() => setLightboxOpen(false)}
        >
          <EmojiButton
            className="lightboxClose"
            shape="circle"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close lightbox"
          >
            ✕
          </EmojiButton>
          <div
            className={`imageLightboxCircle ${lightboxActive ? 'open' : ''}`}
          >
            <img src={imageUrl} alt={pig.name} className="imageLightboxImg" />
          </div>
        </div>
      )}
    </div>
  );
};

export default PigPage;
