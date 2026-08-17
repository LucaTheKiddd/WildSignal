import { useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import { feature } from 'topojson-client';
import countries from 'world-atlas/countries-110m.json';
import { monitoringLocations } from '../data/monitoringLocations.js';
import { CAMERA_COLOR } from '../data/cameraLocations.js';

const DEFAULT_VIEW = { lat: 18, lng: 12, altitude: 2.2 };
const CAMERA_VIEW_ALTITUDE = 0.35;
const CAMERA_ZOOM_MS = 2400;
const CAMERA_RETURN_MS = 1600;

function useElementSize(ref) {
  const [size, setSize] = useState({ width: 900, height: 700 });

  useEffect(() => {
    if (!ref.current) return undefined;
    const updateSize = () => {
      const bounds = ref.current.getBoundingClientRect();
      setSize({ width: Math.max(bounds.width, 320), height: Math.max(bounds.height, 420) });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

export default function CoverageGlobe({
  cameraLocations,
  activeCamera,
  onSelectCamera,
  onSelectMarker,
}) {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const previousCameraIdRef = useRef(null);
  const { width, height } = useElementSize(containerRef);
  const countryFeatures = useMemo(
    () => feature(countries, countries.objects.countries).features,
    [],
  );
  const activeCountries = useMemo(() => new Set(
    cameraLocations.map((camera) => camera.countryIsoNumeric).filter(Boolean),
  ), [cameraLocations]);
  const pointData = useMemo(() => [
    ...monitoringLocations.map((location) => ({ ...location, kind: 'monitoring' })),
    ...cameraLocations.map((camera) => ({ ...camera, kind: 'camera', color: CAMERA_COLOR })),
  ], [cameraLocations]);

  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.28;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    globeRef.current.pointOfView(DEFAULT_VIEW, 0);
  }, []);

  useEffect(() => {
    if (!globeRef.current) return undefined;
    const controls = globeRef.current.controls();
    let rotationTimer;

    if (activeCamera) {
      controls.autoRotate = false;
      globeRef.current.pointOfView({
        lat: activeCamera.lat,
        lng: activeCamera.lng,
        altitude: CAMERA_VIEW_ALTITUDE,
      }, CAMERA_ZOOM_MS);
      previousCameraIdRef.current = activeCamera.id;
    } else if (previousCameraIdRef.current) {
      globeRef.current.pointOfView(DEFAULT_VIEW, CAMERA_RETURN_MS);
      previousCameraIdRef.current = null;
      rotationTimer = window.setTimeout(() => {
        if (globeRef.current) globeRef.current.controls().autoRotate = true;
      }, CAMERA_RETURN_MS);
    }

    return () => window.clearTimeout(rotationTimer);
  }, [activeCamera]);

  const handlePointClick = (point) => {
    if (point.kind === 'camera') onSelectCamera(point);
    else onSelectMarker(point);
  };

  return (
    <div className="globe-stage" ref={containerRef}>
      <Globe
        ref={globeRef}
        width={width}
        height={height}
        backgroundColor="rgba(0,0,0,0)"
        showGlobe
        showAtmosphere
        atmosphereColor="#4ce0b3"
        atmosphereAltitude={0.16}
        polygonsData={countryFeatures}
        polygonAltitude={(country) => (activeCountries.has(String(country.id)) ? 0.012 : 0.006)}
        polygonCapColor={(country) => (
          activeCountries.has(String(country.id)) ? 'rgba(21, 69, 60, 0.96)' : 'rgba(56, 62, 64, 0.9)'
        )}
        polygonSideColor={() => 'rgba(4, 9, 10, 0.92)'}
        polygonStrokeColor={(country) => (
          activeCountries.has(String(country.id)) ? 'rgba(104, 255, 190, 0.55)' : 'rgba(117, 126, 128, 0.18)'
        )}
        polygonsTransitionDuration={600}
        pointsData={pointData}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointAltitude={(point) => (point.kind === 'camera' ? 0.085 : 0.055)}
        pointRadius={(point) => (point.kind === 'camera' ? 0.52 : 0.38)}
        pointResolution={18}
        onPointClick={handlePointClick}
        ringsData={cameraLocations}
        ringLat="lat"
        ringLng="lng"
        ringAltitude={0.02}
        ringColor={() => [CAMERA_COLOR, 'rgba(255, 79, 216, 0)']}
        ringMaxRadius={2.2}
        ringPropagationSpeed={1.35}
        ringRepeatPeriod={1250}
        pointLabel={(point) => point.kind === 'camera' ? `
          <div class="map-tooltip map-tooltip-camera">
            <span>PUBLIC CAMERA · ${point.provider}</span>
            <strong>${point.name}</strong>
            <em>${point.delayLabel}</em>
          </div>
        ` : `
          <div class="map-tooltip">
            <span>${point.region}</span>
            <strong>${point.name}</strong>
            <em>${point.signal} · sample signal</em>
          </div>
        `}
      />
      <div className={`globe-reticle${activeCamera ? ' globe-reticle-active' : ''}`} aria-hidden="true" />
    </div>
  );
}
