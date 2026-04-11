import { useState } from "react";
import { motion } from "framer-motion";
import PigCard from "./PigCard/PigCard";
import "./PigList.css";
import type { Pig } from "../../services/pigs.types";
import { createPigSighting } from "../../services/pigs.service";
import PassedPigList from "./PassedPigList/PassedPigList";
import Modal from "../ui/Modal/Modal";
import Confetti from "../ui/Confetti/Confetti";

type PigListProps = {
  pigs: Pig[];
  passedPigs: Pig[];
  setPigs: React.Dispatch<React.SetStateAction<Pig[]>>;
};

const PigList = ({ pigs, passedPigs, setPigs }: PigListProps) => {
  const [selectedPig, setSelectedPig] = useState<Pig | null>(null);
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

      setSelectedPig(null);
      setShowConfetti(true);

      // After confetti plays, fade the card out then re-sort
      setTimeout(() => {
        setFadingPigId(sightedId);
      }, 1200);

      setTimeout(() => {
        setFadingPigId(null);
        setPigs((prev) =>
          [...prev].sort((a, b) =>
            new Date(a.last_sighted ?? 0).getTime() -
            new Date(b.last_sighted ?? 0).getTime()
          ),
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
              notSightedToday={!pig.last_sighted || new Date(pig.last_sighted).toDateString() !== today}
              onEyeClick={(origin) => { setSelectedPig(pig); setConfettiOrigin(origin); }}
            />
          </motion.div>
        ))}
      </div>

      <PassedPigList passedPigs={passedPigs} />

      <Modal isOpen={!!selectedPig} onClose={closeModal}>
        <p>Mark {selectedPig?.name} as seen?</p>

        <div className="confirmActions">
          <button onClick={closeModal}>Cancel</button>

          <button onClick={handleConfirm} disabled={updating}>
            {updating ? "Saving..." : "Confirm"}
          </button>
        </div>
      </Modal>
    </>
  );
};

export default PigList;
