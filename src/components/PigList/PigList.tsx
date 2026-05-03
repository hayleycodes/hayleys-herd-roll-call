import { useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import PigCard from "./PigCard/PigCard";
import "./PigList.css";
import type { Pig } from "../../services/pigs.types";
import { createPigSighting } from "../../services/pigs.service";
import { addPigMood, MOOD_OPTIONS } from "../../services/pig-moods.service";
import "../../components/MoodPanel/MoodPanel.css";
import { FEATURE_MOOD } from "../../config/features";
import PassedPigList from "./PassedPigList/PassedPigList";
import Modal from "../ui/Modal/Modal";
import Button from "../ui/Button/Button";
import Confetti from "../ui/Confetti/Confetti";

type PigListProps = {
  pigs: Pig[];
  passedPigs: Pig[];
  setPigs: React.Dispatch<React.SetStateAction<Pig[]>>;
  sickPigIds?: Set<number>;
  modalContainer?: RefObject<HTMLDivElement | null>;
};

const PigList = ({ pigs, passedPigs, setPigs, sickPigIds, modalContainer }: PigListProps) => {
  const [selectedPig, setSelectedPig] = useState<Pig | null>(null);
  const [sightingStep, setSightingStep] = useState<'confirm' | 'mood' | 'logged'>('confirm');
  const [updating, setUpdating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiOrigin, setConfettiOrigin] = useState<{ x: number; y: number } | undefined>();
  const [fadingPigId, setFadingPigId] = useState<number | null>(null);

  const handleConfirm = async () => {
    if (!selectedPig) return;

    const sightedId = selectedPig.id;
    const now = new Date().toISOString();

    try {
      setUpdating(true);

      await createPigSighting(sightedId);

      // Update the timestamp but don't re-sort yet
      setPigs((prev) =>
        prev.map((p) =>
          p.id === sightedId ? { ...p, last_sighted: now } : p,
        ),
      );

      setShowConfetti(true);
      if (FEATURE_MOOD) {
        setSightingStep('mood');
      } else {
        setSightingStep('logged');
        setTimeout(() => closeModal(), 1200);
      }

      // After confetti plays, fade the card out then re-sort
      setTimeout(() => {
        setFadingPigId(sightedId);
      }, 1200);

      setTimeout(() => {
        setFadingPigId(null);
        setPigs((prev) =>
          [...prev].sort((a, b) => {
            if (sickPigIds) {
              const aSick = sickPigIds.has(a.id) ? 0 : 1;
              const bSick = sickPigIds.has(b.id) ? 0 : 1;
              if (aSick !== bSick) return aSick - bSick;
            }
            return new Date(a.last_sighted ?? 0).getTime() -
              new Date(b.last_sighted ?? 0).getTime();
          }),
        );
        setShowConfetti(false);
      }, 1800);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const closeModal = () => {
    setSelectedPig(null);
    setTimeout(() => setSightingStep('confirm'), 300);
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
            transition={{ delay: i * 0.05, duration: 0.3, ease: 'easeOut' }}
          >
            <PigCard
              pig={pig}
              fading={pig.id === fadingPigId}
              sick={sickPigIds?.has(pig.id)}
              notSightedToday={!pig.last_sighted || new Date(pig.last_sighted).toDateString() !== today}
              onEyeClick={(origin) => { setSelectedPig(pig); setConfettiOrigin(origin); }}
            />
          </motion.div>
        ))}
      </div>

      <PassedPigList passedPigs={passedPigs} />

      {(() => {
        const modal = (
          <Modal isOpen={!!selectedPig} onClose={closeModal}>
            {sightingStep === 'confirm' ? (
              <>
                <p>Mark {selectedPig?.name} as seen?</p>
                <div className="confirmActions">
                  <Button variant="danger" onClick={closeModal}>Cancel</Button>
                  <Button variant="success" onClick={handleConfirm} disabled={updating}>
                    {updating ? "Saving..." : "Confirm"}
                  </Button>
                </div>
              </>
            ) : sightingStep === 'mood' ? (
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
              <p className="moodLoggedMessage">{FEATURE_MOOD ? 'Mood logged! ✨' : 'Sighting logged! ✨'}</p>
            )}
          </Modal>
        );
        return modalContainer?.current ? createPortal(modal, modalContainer.current) : modal;
      })()}
    </>
  );
};

export default PigList;
