import { useCallback, useEffect, useRef } from 'react';
import JSMpeg from '@cycjimmy/jsmpeg-player';
import './PigCam.css';

const WS_URL =
  import.meta.env.VITE_PIGCAM_WS_URL || 'ws://localhost:3001/stream';

type PigCamProps = {
  visible: boolean;
  rotated?: boolean;
  onRotateToggle?: () => void;
};

const PigCam = ({ visible, rotated, onRotateToggle }: PigCamProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // @cycjimmy/jsmpeg-player ships no types, so the player instance is untyped.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);

  const connect = useCallback(() => {
    if (!containerRef.current) return;

    try {
      playerRef.current?.destroy();
    } catch {
      // Ignore: destroy() throws if the player is already torn down.
    }

    containerRef.current.innerHTML = '';
    playerRef.current = new JSMpeg.VideoElement(containerRef.current, WS_URL, {
      autoplay: true,
      videoBufferSize: 512 * 1024,
      disableWebAssembly: true,
    });
  }, []);

  useEffect(() => {
    connect();

    return () => {
      try {
        playerRef.current?.destroy();
      } catch {
        // Ignore: destroy() throws if the player is already torn down.
      }
    };
  }, [connect]);

  return (
    <div className={`pigCamSticky${visible ? '' : ' pigCamHidden'}`}>
      <div className="pigCam">
        <div ref={containerRef} />
        <button className="pigCamRefresh" onClick={connect}>
            ↻
        </button>
        {onRotateToggle && (
          <button className="pigCamRotate" onClick={onRotateToggle}>
            {rotated ? '✕' : '⛶'}
          </button>
        )}
      </div>
    </div>
  );
};

export default PigCam;
