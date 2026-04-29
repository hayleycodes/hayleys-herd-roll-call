import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllPigs, createPigSighting } from '../../services/pigs.service';
import { addPigMood } from '../../services/pig-moods.service';
import { FEATURE_MOOD } from '../../config/features';
import type { Pig } from '../../services/pigs.types';
import { getPigColorClass } from '../../constants/colors';
import RollcallCard from './RollcallCard';
import Confetti from '../ui/Confetti/Confetti';
import EmojiButton from '../ui/EmojiButton/EmojiButton';
import './RollcallOverlay.css';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const RollcallOverlay = ({ isOpen, onClose }: Props) => {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [queue, setQueue] = useState<Pig[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sightedCount, setSightedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [exitDirection, setExitDirection] = useState<-1 | 1>(-1);
  const [showConfetti, setShowConfetti] = useState(false);
  const [complete, setComplete] = useState(false);

  // Mount/unmount animation (same pattern as Modal)
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isOpen) {
      setMounted(true);
      timeout = setTimeout(() => setActive(true), 10);
    } else {
      setActive(false);
      timeout = setTimeout(() => {
        setMounted(false);
        setComplete(false);
        setShowConfetti(false);
      }, 300);
    }
    return () => clearTimeout(timeout);
  }, [isOpen]);

  // Fetch pigs and initialize queue when opening
  useEffect(() => {
    if (!isOpen) return;
    const init = async () => {
      const pigs = await getAllPigs();
      const today = new Date().toDateString();
      const unsighted = pigs.filter(
        (p: Pig) =>
          !p.last_sighted || new Date(p.last_sighted).toDateString() !== today
      );
      const alreadySighted = pigs.filter(
        (p: Pig) =>
          p.last_sighted && new Date(p.last_sighted).toDateString() === today
      );
      setQueue([...unsighted, ...alreadySighted]);
      setCurrentIndex(0);
      setSightedCount(0);
      setTotalCount(pigs.length);
      setComplete(false);
      setShowConfetti(false);
    };
    init();
  }, [isOpen]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSighted = useCallback(
    async (moods: string[]) => {
      const pig = queue[currentIndex];
      if (!pig || isAnimating) return;

      setIsAnimating(true);
      try {
        await createPigSighting(pig.id);
        if (FEATURE_MOOD && moods.length > 0) {
          await Promise.all(moods.map((mood) => addPigMood(pig.id, mood)));
        }
        const newSightedCount = sightedCount + 1;
        setSightedCount(newSightedCount);

        if (newSightedCount === totalCount) {
          setComplete(true);
          setShowConfetti(true);
          setIsAnimating(false);
          setTimeout(() => handleClose(), 2500);
        } else {
          setExitDirection(-1);
          setTimeout(() => {
            setCurrentIndex((prev) => prev + 1);
            setIsAnimating(false);
          }, 150);
        }
      } catch {
        setIsAnimating(false);
      }
    },
    [queue, currentIndex, isAnimating, sightedCount, totalCount, handleClose]
  );

  const handleSkipped = useCallback(() => {
    const pig = queue[currentIndex];
    if (!pig || isAnimating) return;

    setQueue((prev) => {
      const next = [...prev];
      const [skipped] = next.splice(currentIndex, 1);
      next.push(skipped);
      return next;
    });

    // Since we removed current item, the next item is now at currentIndex
    // Just trigger the animation without incrementing
    setExitDirection(1);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 150);
  }, [queue, currentIndex, isAnimating]);

  if (!mounted) return null;

  const currentPig = queue[currentIndex];
  const pigColorClass = currentPig ? getPigColorClass(currentPig.id) : '';

  return (
    <div className={`rollcallOverlay ${active ? 'open' : ''} ${pigColorClass}`}>
      <div className="rollcallHeader">
        <div className="rollcallProgress">
          {sightedCount} / {totalCount} sighted
        </div>
        <EmojiButton
          className="rollcallClose"
          shape="circle"
          onClick={handleClose}
          aria-label="Close rollcall"
        >
          ✕
        </EmojiButton>
      </div>

      <div className="rollcallContent">
        {complete ? (
          <div className="rollcallComplete">
            <span className="rollcallCompleteEmoji">🎉</span>
            <h2>All piggies sighted!</h2>
          </div>
        ) : currentPig ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentPig.id}-${currentIndex}`}
              initial={{ x: 200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: exitDirection * 200, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
            >
              <RollcallCard
                pig={currentPig}
                onSighted={handleSighted}
                onSkipped={handleSkipped}
                disabled={isAnimating}
              />
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>

      <Confetti active={showConfetti} />
    </div>
  );
};

export default RollcallOverlay;
