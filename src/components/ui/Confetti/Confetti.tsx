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

const Confetti = ({ active, origin }: Props) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) return;

    const cx = origin?.x ?? window.innerWidth / 2;
    const cy = origin?.y ?? window.innerHeight / 2;

    const batch: Particle[] = Array.from({ length: 20 }, (_, i) => ({
      id: Date.now() + i,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      x: cx,
      y: cy,
      angle: (Math.PI * 2 * i) / 20 + (Math.random() - 0.5) * 0.5,
      distance: 80 + Math.random() * 120,
      delay: Math.random() * 0.15,
      duration: 0.6 + Math.random() * 0.5,
    }));

    setParticles(batch);

    const timer = setTimeout(() => setParticles([]), 2000);
    return () => clearTimeout(timer);
  }, [active]);

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
