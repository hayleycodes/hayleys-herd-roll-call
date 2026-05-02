import { useCallback, useEffect, useRef } from 'react';
import JSMpeg from '@cycjimmy/jsmpeg-player';
import './PigCam.css';

const WS_URL =
  import.meta.env.VITE_PIGCAM_WS_URL || 'ws://localhost:3001/stream';

const PigCam = ({ visible }: { visible: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  const connect = useCallback(() => {
    if (!containerRef.current) return;

    try {
      playerRef.current?.destroy();
    } catch {}

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
      } catch {}
    };
  }, [connect]);

  return (
    <div className={`pigCam${visible ? '' : ' pigCamHidden'}`}>
      <div ref={containerRef} />
      <a href="intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.tplink.iot;end" className="pigCamOpen">
        📲
      </a>
      <button className="pigCamRefresh" onClick={connect}>
        ↻
      </button>
    </div>
  );
};

export default PigCam;
