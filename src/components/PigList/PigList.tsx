import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
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

// Stagger the cards in one at a time whenever the grid (re)mounts — on page
// load and whenever the unseen filter toggles.
const listContainerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04 },
  },
};

const listItemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

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
  // Toggles 'a'/'b' each time a sighted pig leaves so the pop keyframe replays
  // on the cards that shift up to fill the gap.
  const [popPhase, setPopPhase] = useState<'a' | 'b' | null>(null);
  // Only cards at or below this index pop — the ones from the departed pig's
  // old position down, i.e. the region that actually shifts.
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
        return a.name.localeCompare(b.name);
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
    // Where the pig sits now; when she leaves, everything from here down shifts
    // up, so only those cards should pop.
    const oldIndex = Math.max(
      0,
      pigs.findIndex((p) => p.id === pig.id)
    );

    setConfettiOrigin(origin);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 1800);

    setSightedPigs((prev) => new Map(prev).set(pig.id, prevLastSighted));

    const markSighted = () =>
      setPigs((prev) =>
        prev.map((p) => (p.id === pig.id ? { ...p, last_sighted: now } : p))
      );

    // Without the unseen filter the pig stays in place, so record the sighting
    // right away — just confetti, no reshuffle. With the filter active, defer it
    // until the confetti has played (below): dropping last_sighted removes the
    // card from the filtered list, and the cards below pop up to fill the gap.
    if (!unseenFilterActive) markSighted();

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

    // Let the confetti play, then drop the pig from the filtered list. Her card
    // fades out (AnimatePresence exit) while the cards below pop up to fill the
    // gap (popPhase toggle re-runs the pigCardPop keyframe on them).
    if (unseenFilterActive) {
      setTimeout(() => {
        markSighted();
        setPopFromIndex(oldIndex);
        setPopPhase((p) => (p === 'a' ? 'b' : 'a'));
      }, 800);
    }

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
      <motion.div
        // Remounting on filter toggle replays the staggered entrance.
        key={String(unseenFilterActive)}
        className="pigList"
        variants={listContainerVariants}
        initial="hidden"
        animate="show"
      >
        <AnimatePresence mode="popLayout">
          {pigs.map((pig, i) => (
            <motion.div
              key={pig.id}
              variants={listItemVariants}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.3 } }}
            >
              <PigCard
                pig={pig}
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
        </AnimatePresence>
      </motion.div>

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
