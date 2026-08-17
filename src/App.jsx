import { useCallback, useEffect, useRef, useState } from 'react';
import CoverageGlobe from './components/CoverageGlobe.jsx';
import DetailPanel from './components/DetailPanel.jsx';
import CameraExperience from './components/CameraExperience.jsx';
import { CAMERA_COLOR, cameraLocations } from './data/cameraLocations.js';
import { monitoringLocations } from './data/monitoringLocations.js';

const legend = [
  ['#60f5b1', 'High diversity'],
  ['#66d9ff', 'Active monitoring'],
  ['#ffb45e', 'Conservation watch'],
];

export default function App() {
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [activeCamera, setActiveCamera] = useState(null);
  const [cameraPhase, setCameraPhase] = useState('idle');
  const cameraTimerRef = useRef(null);
  const coveredCountries = new Set(cameraLocations.map((camera) => camera.countryCode).filter(Boolean));
  const coveredContinents = new Set(cameraLocations.map((camera) => camera.continent).filter(Boolean));

  useEffect(() => () => window.clearTimeout(cameraTimerRef.current), []);

  const selectCamera = useCallback((camera) => {
    window.clearTimeout(cameraTimerRef.current);
    setSelectedMarker(null);
    setActiveCamera(camera);
    setCameraPhase('zooming');
    cameraTimerRef.current = window.setTimeout(() => setCameraPhase('viewing'), 2400);
  }, []);

  const exitCamera = useCallback(() => {
    window.clearTimeout(cameraTimerRef.current);
    setCameraPhase('returning');
    setActiveCamera(null);
    cameraTimerRef.current = window.setTimeout(() => setCameraPhase('idle'), 1600);
  }, []);

  const selectMarker = useCallback((marker) => {
    if (cameraPhase === 'idle') setSelectedMarker(marker);
  }, [cameraPhase]);

  return (
    <main className={`app-shell${selectedMarker ? ' has-detail-panel' : ''}${cameraPhase !== 'idle' ? ' camera-mode' : ''}`}>
      <div className="grain" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="#top" aria-label="WildSignal home">
          <span className="brand-mark" aria-hidden="true">W</span>
          <span>
            <strong>WILDSIGNAL</strong>
            <small>GLOBAL WILD CAMERA NETWORK</small>
          </span>
        </a>
        <div className="system-status"><i /> SYSTEM ONLINE</div>
      </header>

      <section className="hero" id="top">
        <div className="intro-panel">
          <p className="eyebrow">PUBLIC NATURE INTELLIGENCE / PROTOTYPE 01</p>
          <h1>THE WILD<br />HAS A SIGNAL.</h1>
          <p className="lede">
            Explore public wild-animal and habitat cameras across a curated set of countries worldwide.
          </p>
          <div className="coverage-card">
            <span>ACTIVE COVERAGE</span>
            <strong>{coveredCountries.size} COUNTRIES</strong>
            <small>{cameraLocations.length} public cameras · {coveredContinents.size} continents · {monitoringLocations.length} sample regions</small>
          </div>
        </div>

        <CoverageGlobe
          cameraLocations={cameraLocations}
          activeCamera={activeCamera}
          onSelectCamera={selectCamera}
          onSelectMarker={selectMarker}
        />

        {selectedMarker && (
          <DetailPanel marker={selectedMarker} onClose={() => setSelectedMarker(null)} />
        )}

        <aside className="map-key" aria-label="Map marker legend">
          <p>MAP KEY <span>LIVE + SAMPLE</span></p>
          <div className="camera-key"><i style={{ '--signal-color': CAMERA_COLOR }} />Public camera</div>
          {legend.map(([color, label]) => (
            <div key={label}><i style={{ '--signal-color': color }} />{label}</div>
          ))}
        </aside>

        <div className="coverage-tbd">
          <span>CURATED COVERAGE</span>
          <strong>{cameraLocations.length}</strong>
          <small>WILD-ONLY CAMERA RECORDS</small>
        </div>

        <div className="interaction-hint">
          <span className="mouse-icon" aria-hidden="true" />
          DRAG TO ORBIT · CLICK A PINK CAMERA
        </div>

        {cameraPhase === 'zooming' && activeCamera && (
          <div className="camera-zoom-overlay" aria-live="polite">
            <div className="camera-target"><i /><i /><i /></div>
            <span>CONNECTING TO PUBLIC CAMERA</span>
            <strong>{activeCamera.name}</strong>
            <small>{Math.abs(activeCamera.lat).toFixed(2)}° {activeCamera.lat >= 0 ? 'N' : 'S'} / {Math.abs(activeCamera.lng).toFixed(2)}° {activeCamera.lng >= 0 ? 'E' : 'W'}</small>
          </div>
        )}
      </section>

      {cameraPhase === 'viewing' && activeCamera && (
        <CameraExperience camera={activeCamera} onExit={exitCamera} />
      )}
    </main>
  );
}
