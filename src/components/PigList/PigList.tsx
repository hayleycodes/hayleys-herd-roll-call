import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import PigCard from './PigCard/PigCard';
import './PigList.css';
import type { Pig } from '../../services/pigs.types';
import {
  createPigSighting,
  setPigLastSighted,
  setPigPinned,
} from '../../services/pigs.service';
import { addPigMood, MOOD_OPTIONS } from '../../services/pig-moods.service';
import '../../components/MoodPanel/MoodPanel.css';
import { FEATURE_MOOD, FEATURE_PIN } from '../../config/features';
import PassedPigList from './PassedPigList/PassedPigList';
import Modal from '../ui/Modal/Modal';
import Button from '../ui/Button/Button';
import Confetti from '../ui/Confetti/Confetti';

type PigListProps = {
  pigs: Pig[];
  passedPigs: Pig[];
  setPigs: React.Dispatch<React.SetStateAction<Pig[]>>;
  sickPigIds?: Set<number>;
  topPigIds?: Set<number>;
  unseenFilterActive?: boolean;
  modalContainer?: RefObject<HTMLDivElement | null>;
};

const PigList = ({
  pigs,
  passedPigs,
  setPigs,
  sickPigIds,
  topPigIds,
  unseenFilterActive,
  modalContainer,
}: PigListProps) => {
  const [selectedPig, setSelectedPig] = useState<Pig | null>(null);
  const [sightingStep, setSightingStep] = useState<'mood' | 'logged'>('mood');
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiOrigin, setConfettiOrigin] = useState<
    { x: number; y: number } | undefined
  >();
  const [fadingPigId, setFadingPigId] = useState<number | null>(null);
  // Toggles 'a'/'b' on each re-sort so the pop keyframe replays (alternating
  // between two identical animations restarts them without remounting cards).
  const [popPhase, setPopPhase] = useState<'a' | 'b' | null>(null);
  // Only cards at or below this index pop — i.e. from the sighted pig's old
  // position down, the region that actually shifts when it moves to the bottom.
  const [popFromIndex, setPopFromIndex] = useState(0);
  // Pigs sighted this session, mapped to their previous last_sighted value so
  // the sighting can be undone.
  const [sightedPigs, setSightedPigs] = useState<Map<number, string | null>>(
    new Map()
  );
  // Per-pig timers that revert the undo button back to the eye after a minute.
  const undoTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  // Clear any pending timers on unmount.
  useEffect(() => {
    const timers = undoTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const resortPigs = () => {
    setPigs((prev) =>
      [...prev].sort((a, b) => {
        const aPinned = a.pinned ? 0 : 1;
        const bPinned = b.pinned ? 0 : 1;
        if (aPinned !== bPinned) return aPinned - bPinned;
        if (sickPigIds) {
          const aSick = sickPigIds.has(a.id) ? 0 : 1;
          const bSick = sickPigIds.has(b.id) ? 0 : 1;
          if (aSick !== bSick) return aSick - bSick;
        }
        return (
          new Date(a.last_sighted ?? 0).getTime() -
          new Date(b.last_sighted ?? 0).getTime()
        );
      })
    );
  };

  const handleTogglePin = async (pig: Pig) => {
    const nextPinned = !pig.pinned;
    setPigs((prev) =>
      prev.map((p) => (p.id === pig.id ? { ...p, pinned: nextPinned } : p))
    );
    resortPigs();

    try {
      await setPigPinned(pig.id, nextPinned);
    } catch (err) {
      console.error(err);
      // Roll back on failure
      setPigs((prev) =>
        prev.map((p) => (p.id === pig.id ? { ...p, pinned: !nextPinned } : p))
      );
      resortPigs();
    }
  };

  const clearSighted = (pigId: number) => {
    const timer = undoTimers.current.get(pigId);
    if (timer) clearTimeout(timer);
    undoTimers.current.delete(pigId);
    setSightedPigs((prev) => {
      const next = new Map(prev);
      next.delete(pigId);
      return next;
    });
  };

  const handleSighting = async (
    pig: Pig,
    origin: { x: number; y: number }
  ) => {
    const now = new Date().toISOString();
    const prevLastSighted = pig.last_sighted ?? null;
    // Position the pig occupies now; everything from here down shifts when it
    // moves to the bottom, so only these cards should pop.
    const oldIndex = Math.max(
      0,
      pigs.findIndex((p) => p.id === pig.id)
    );

    setConfettiOrigin(origin);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 1800);

    setSightedPigs((prev) => new Map(prev).set(pig.id, prevLastSighted));
    setPigs((prev) =>
      prev.map((p) => (p.id === pig.id ? { ...p, last_sighted: now } : p))
    );

    try {
      await createPigSighting(pig.id);
    } catch (err) {
      console.error(err);
      // Roll back the optimistic update on failure
      clearSighted(pig.id);
      setPigs((prev) =>
        prev.map((p) =>
          p.id === pig.id ? { ...p, last_sighted: prevLastSighted } : p
        )
      );
      return;
    }

    // Revert the undo button back to the eye after a minute.
    const existing = undoTimers.current.get(pig.id);
    if (existing) clearTimeout(existing);
    undoTimers.current.set(
      pig.id,
      setTimeout(() => clearSighted(pig.id), 60000)
    );

    // After the confetti plays, fade the card out then re-sort it to the bottom.
    setTimeout(() => setFadingPigId(pig.id), 800);
    setTimeout(() => {
      setFadingPigId(null);
      resortPigs();
      setPopFromIndex(oldIndex);
      setPopPhase((p) => (p === 'a' ? 'b' : 'a'));
    }, 1200);

    if (FEATURE_MOOD) {
      setSightingStep('mood');
      setSelectedPig(pig);
    }
  };

  const handleUndo = async (pig: Pig) => {
    const prevLastSighted = sightedPigs.get(pig.id) ?? null;

    clearSighted(pig.id);
    setPigs((prev) =>
      prev.map((p) =>
        p.id === pig.id ? { ...p, last_sighted: prevLastSighted } : p
      )
    );
    resortPigs();

    try {
      await setPigLastSighted(pig.id, prevLastSighted);
    } catch (err) {
      console.error(err);
    }
  };

  const closeModal = () => {
    setSelectedPig(null);
    setTimeout(() => setSightingStep('mood'), 300);
  };

  const handleSightingMood = async (mood: string) => {
    if (!selectedPig) return;
    await addPigMood(selectedPig.id, mood);
    setSightingStep('logged');
    setTimeout(() => {
      closeModal();
    }, 1200);
  };

  const today = new Date().toDateString();

  return (
    <>
      <Confetti active={showConfetti} origin={confettiOrigin} />
      <div className="pigList">
        {pigs.map((pig, i) => (
          <motion.div
            key={pig.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: i * 0.05,
              duration: 0.3,
              ease: 'easeOut',
            }}
          >
            <PigCard
              pig={pig}
              fading={pig.id === fadingPigId}
              popPhase={i >= popFromIndex ? popPhase : null}
              popIndex={i - popFromIndex}
              sick={sickPigIds?.has(pig.id)}
              notSightedToday={
                !pig.last_sighted ||
                new Date(pig.last_sighted).toDateString() !== today
              }
              sighted={sightedPigs.has(pig.id)}
              crowned={topPigIds?.has(pig.id)}
              highlightUnseen={unseenFilterActive}
              pinned={pig.pinned}
              onEyeClick={(origin) => handleSighting(pig, origin)}
              onUndoClick={() => handleUndo(pig)}
              onPinClick={
                FEATURE_PIN ? () => handleTogglePin(pig) : undefined
              }
            />
          </motion.div>
        ))}
      </div>

      <PassedPigList passedPigs={passedPigs} />

      {(() => {
        const modal = (
          <Modal isOpen={!!selectedPig} onClose={closeModal}>
            {sightingStep === 'mood' ? (
              <>
                <p>How is {selectedPig?.name} feeling?</p>
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
                  <Button onClick={closeModal}>Skip</Button>
                </div>
              </>
            ) : (
              <p className="moodLoggedMessage">
                {FEATURE_MOOD ? 'Mood logged! ✨' : 'Sighting logged! ✨'}
              </p>
            )}
          </Modal>
        );
        return modalContainer?.current
          ? createPortal(modal, modalContainer.current)
          : modal;
      })()}
    </>
  );
};

export default PigList;
