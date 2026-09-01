import { useEffect, useState } from 'react';
import './Confetti.css';

const EMOJIS = ['🎉', '✨', '🐖', '🤩', '💜', '🥕', '🎊', '🥦'];

type Particle = {
  id: number;
  emoji: string;
  x: number;
  y: number;
  angle: number;
  distance: number;
  delay: number;
  duration: number;
};

type Props = {
  active: boolean;
  origin?: { x: number; y: number };
};

const makeBatch = (origin?: { x: number; y: number }): Particle[] => {
  const cx = origin?.x ?? window.innerWidth / 2;
  const cy = origin?.y ?? window.innerHeight / 2;
  return Array.from({ length: 20 }, (_, i) => ({
    id: Date.now() + i,
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    x: cx,
    y: cy,
    angle: (Math.PI * 2 * i) / 20 + (Math.random() - 0.5) * 0.5,
    distance: 80 + Math.random() * 120,
    delay: Math.random() * 0.15,
    duration: 0.6 + Math.random() * 0.5,
  }));
};

const Confetti = ({ active, origin }: Props) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  // Fire a fresh burst during render each time `active` transitions to true,
  // rather than setting state inside an effect.
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (active) setParticles(makeBatch(origin));
  }

  useEffect(() => {
    if (particles.length === 0) return;
    const timer = setTimeout(() => setParticles([]), 2000);
    return () => clearTimeout(timer);
  }, [particles]);

  if (particles.length === 0) return null;

  return (
    <div className="confettiContainer">
      {particles.map((p) => (
        <span
          key={p.id}
          className="confettiParticle"
          style={
            {
              left: `${p.x}px`,
              top: `${p.y}px`,
              '--tx': `${Math.cos(p.angle) * p.distance}px`,
              '--ty': `${Math.sin(p.angle) * p.distance}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            } as React.CSSProperties
          }
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
};

export default Confetti;
