import { useEffect, useMemo, useState } from 'react';
import DetailPanel from './DetailPanel.jsx';

function feedLabel(camera) {
  if (camera.statusLabel) return camera.statusLabel;
  if (!camera.available) return 'SEASONAL / OFFLINE';
  if (camera.mediaType === 'image') return `REFRESHES EVERY ${camera.refreshSeconds} SEC`;
  return 'LIVE VIDEO';
}

function OfflineFeed({ camera }) {
  return (
    <div className="camera-offline">
      {camera.fallbackImageUrl && (
        <img
          src={camera.fallbackImageUrl}
          alt={camera.fallbackImageAlt || 'Last available camera preview'}
        />
      )}
      <div>
        <span>FEED STATUS</span>
        <strong>{camera.offlineTitle || 'SEASONAL CAMERA OFFLINE'}</strong>
        <p>{camera.offlineMessage || 'The official provider is not broadcasting this camera right now.'}</p>
        <a href={camera.sourcePageUrl} target="_blank" rel="noreferrer">CHECK OFFICIAL SOURCE ↗</a>
      </div>
    </div>
  );
}

function RefreshingImage({ camera }) {
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [failed, setFailed] = useState(false);
  const [displayUrl, setDisplayUrl] = useState(camera.fallbackImageUrl || null);

  useEffect(() => {
    const timer = window.setInterval(() => setRefreshKey(Date.now()), camera.refreshSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [camera.refreshSeconds]);

  const imageUrl = useMemo(() => {
    const separator = camera.mediaUrl.includes('?') ? '&' : '?';
    return `${camera.mediaUrl}${separator}t=${refreshKey}`;
  }, [camera.mediaUrl, refreshKey]);

  useEffect(() => {
    let active = true;
    const candidate = new Image();
    candidate.onload = () => {
      if (!active) return;
      setDisplayUrl(imageUrl);
      setFailed(false);
    };
    candidate.onerror = () => {
      if (active && !displayUrl) setFailed(true);
    };
    candidate.src = imageUrl;
    return () => {
      active = false;
      candidate.onload = null;
      candidate.onerror = null;
    };
  }, [imageUrl]);

  if (failed && !displayUrl) return <OfflineFeed camera={camera} />;
  if (!displayUrl) return <div className="camera-media-loading">REFRESHING OFFICIAL CAMERA…</div>;

  return (
    <img
      className="camera-still"
      src={displayUrl}
      alt={`Current view from ${camera.name}`}
      onError={() => {
        setDisplayUrl(null);
        setFailed(true);
      }}
    />
  );
}

function EmbeddedFeed({ camera }) {
  const [failed, setFailed] = useState(false);
  const separator = camera.mediaUrl.includes('?') ? '&' : '?';
  const src = `${camera.mediaUrl}${separator}autoplay=1&mute=1&playsinline=1&rel=0`;

  if (failed) return <OfflineFeed camera={camera} />;

  return (
    <>
      <iframe
        src={src}
        title={`${camera.name} live camera`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        onError={() => setFailed(true)}
      />
      <button className="feed-fallback-trigger" type="button" onClick={() => setFailed(true)}>
        FEED NOT LOADING?
      </button>
    </>
  );
}

export default function CameraExperience({ camera, onExit }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  return (
    <section className="camera-experience" aria-label={`${camera.name} camera experience`}>
      <header className="camera-experience-header">
        <button type="button" onClick={onExit}>← RETURN TO GLOBE</button>
        <div>
          <span>{camera.region}</span>
          <h2>{camera.name}</h2>
        </div>
        <strong className={camera.available ? 'feed-badge' : 'feed-badge feed-badge-offline'}>
          <i /> {feedLabel(camera)}
        </strong>
      </header>

      <div className="camera-experience-body">
        <div className="camera-viewer-column">
          <div className="camera-frame">
            {!camera.available ? <OfflineFeed camera={camera} /> : camera.mediaType === 'image' ? (
              <RefreshingImage camera={camera} />
            ) : (
              <EmbeddedFeed camera={camera} />
            )}
          </div>
          <footer className="camera-credit">
            <span>{camera.delayLabel}</span>
            <span>{camera.credit}</span>
            <a href={camera.sourcePageUrl} target="_blank" rel="noreferrer">OFFICIAL SOURCE ↗</a>
          </footer>
        </div>

        <DetailPanel
          marker={camera}
          variant="camera"
          showHeader={false}
          showSampleSignal={false}
        />
      </div>
    </section>
  );
}
