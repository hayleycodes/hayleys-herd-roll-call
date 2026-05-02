import { useEffect, useRef } from 'react';
import JSMpeg from '@cycjimmy/jsmpeg-player';
import './PigCam.css';

const WS_URL = import.meta.env.VITE_PIGCAM_WS_URL || 'ws://localhost:3001/stream';

const PigCam = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    playerRef.current = new JSMpeg.VideoElement(containerRef.current, WS_URL, {
      autoplay: true,
      videoBufferSize: 512 * 1024,
      disableWebAssembly: false,
    });

    return () => {
      try {
        playerRef.current?.destroy();
      } catch {}
    };
  }, []);

  return (
    <div className="pigCam">
      <div ref={containerRef} />
    </div>
  );
};

export default PigCam;
