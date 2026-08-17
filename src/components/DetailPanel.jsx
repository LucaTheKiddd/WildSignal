import { useEffect, useState } from 'react';
import {
  fetchConservationStatus,
  fetchRegionSummary,
  fetchSpecies,
  fetchSpeciesWikipedia,
  fetchWeather,
} from '../lib/api.js';
import TaxonomyPie3D from './TaxonomyPie3D.jsx';

const initialSection = () => ({ loading: true, data: null });
const LiveTag = () => <span className="data-tag data-tag-live"><i /> LIVE</span>;
const SampleTag = () => <span className="data-tag data-tag-sample">SAMPLE</span>;
const WikipediaTag = () => <span className="data-tag data-tag-wikipedia">WIKIPEDIA</span>;

function LoadingRows({ count = 2 }) {
  return <div className="loading-rows" aria-label="Loading live data">{Array.from({ length: count }, (_, index) => <i key={index} />)}</div>;
}

function Unavailable({ reason = 'Source did not return data.' }) {
  return <p className="unavailable">Not available <small>{reason}</small></p>;
}

function formatObservedAt(value) {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function compassDirection(degrees) {
  if (!Number.isFinite(degrees)) return '';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(degrees / 45) % 8];
}

function formatCoordinates(lat, lng) {
  return `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'} / ${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? 'E' : 'W'}`;
}

function SpeciesPreview({ item }) {
  const articleUrl = item.wikipedia?.articleUrl
    || `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(item.scientificName || item.commonName)}`;
  return (
    <article className="species-preview-card">
      {item.wikipedia?.thumbnailUrl && <img src={item.wikipedia.thumbnailUrl} alt="" loading="lazy" />}
      <div>
        <span className="species-card-title">
          <strong>{item.commonName || item.scientificName}</strong>
          <em>{item.occurrences} REC.</em>
        </span>
        {item.commonName && <small>{item.scientificName}</small>}
        {item.wikipedia?.summary && <p>{item.wikipedia.summary}</p>}
        <a href={articleUrl} target="_blank" rel="noreferrer">
          {item.wikipedia ? 'Wikipedia preview' : 'Search Wikipedia'} <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}

export default function DetailPanel({ marker, onClose, showHeader = true, showSampleSignal = true, variant = 'panel' }) {
  const [weather, setWeather] = useState(initialSection);
  const [species, setSpecies] = useState(initialSection);
  const [speciesWikipedia, setSpeciesWikipedia] = useState(initialSection);
  const [conservation, setConservation] = useState(initialSection);
  const [regionContext, setRegionContext] = useState(initialSection);

  useEffect(() => {
    let active = true;
    setWeather(initialSection());
    setSpecies(initialSection());
    setSpeciesWikipedia(initialSection());
    setConservation(initialSection());
    setRegionContext(initialSection());

    const requests = [
      fetchWeather(marker).then((data) => { if (active) setWeather({ loading: false, data }); return data; }),
      fetchSpecies(marker).then((data) => {
        if (active) setSpecies({ loading: false, data });
        if (!data?.species?.length) {
          if (active) setSpeciesWikipedia({ loading: false, data: null });
          return data;
        }
        fetchSpeciesWikipedia(data.species).then((previews) => {
          if (active) setSpeciesWikipedia({ loading: false, data: previews });
        });
        return data;
      }),
      fetchConservationStatus(marker).then((data) => { if (active) setConservation({ loading: false, data }); return data; }),
      fetchRegionSummary(marker).then((data) => { if (active) setRegionContext({ loading: false, data }); return data; }),
    ];

    Promise.allSettled(requests).then((results) => {
      if (!active) return;
      if (results[0].status === 'rejected') setWeather({ loading: false, data: null });
      if (results[1].status === 'rejected') setSpecies({ loading: false, data: null });
      if (results[2].status === 'rejected') setConservation({ loading: false, data: null });
      if (results[3].status === 'rejected') setRegionContext({ loading: false, data: null });
    });
    return () => { active = false; };
  }, [marker]);

  return (
    <aside className={`detail-panel detail-panel-${variant}`} aria-label={`Live data for ${marker.name}`}>
      {showHeader && <header className="detail-header">
        <button type="button" onClick={onClose} aria-label="Close location details">×</button>
        <p>{marker.region}</p><h2>{marker.name}</h2>
        <div className="coordinates">{formatCoordinates(marker.lat, marker.lng)}</div>
      </header>}

      {showSampleSignal && <section className="signal-summary">
        <div className="section-heading"><span>PROTOTYPE SIGNAL</span><SampleTag /></div>
        <strong><i style={{ '--signal-color': marker.color }} />{marker.signal}</strong>
        <small>Illustrative category—not a live scientific assessment.</small>
      </section>}

      <section className="detail-section region-section">
        <div className="section-heading"><span>ABOUT THIS REGION</span><WikipediaTag /></div>
        {regionContext.loading ? <LoadingRows count={3} /> : regionContext.data ? <article className="region-context-card">
          {regionContext.data.thumbnailUrl && <img src={regionContext.data.thumbnailUrl} alt="" loading="lazy" />}
          <div><strong>{regionContext.data.title}</strong>
            {regionContext.data.summary && <p>{regionContext.data.summary}</p>}
            <a href={regionContext.data.articleUrl} target="_blank" rel="noreferrer">Explore the Wikipedia article <span aria-hidden="true">↗</span></a>
          </div>
        </article> : <Unavailable reason="Wikipedia did not return a matching regional article." />}
      </section>

      <section className="detail-section weather-section">
        <div className="section-heading"><span>CURRENT WEATHER</span><LiveTag /></div>
        {weather.loading ? <LoadingRows /> : weather.data ? <>
          <div className="weather-primary"><strong>{weather.data.temperature}{weather.data.temperatureUnit}</strong><span>{weather.data.condition}<small>{weather.data.isDay ? 'Daytime' : 'Nighttime'}</small></span></div>
          <div className="weather-meta"><span>WIND</span><strong>{weather.data.windSpeed} {weather.data.windUnit} {compassDirection(weather.data.windDirection)}</strong></div>
          <p className="source-note">Open-Meteo · {formatObservedAt(weather.data.observedAt)} {weather.data.timezone}</p>
        </> : <Unavailable />}
      </section>

      <section className="detail-section species-section">
        <div className="section-heading"><span>RECENT SPECIES RECORDS</span><LiveTag /></div>
        {species.loading ? <LoadingRows count={4} /> : species.data?.species.length ? <>
          {species.data.mostCommonSpecies && <div className="most-common-species">
            <span>MOST REPRESENTED IN THIS SAMPLE</span>
            <strong>{species.data.mostCommonSpecies.commonName || species.data.mostCommonSpecies.scientificName}</strong>
            {species.data.mostCommonSpecies.commonName && <em>{species.data.mostCommonSpecies.scientificName}</em>}
            <small>{species.data.mostCommonSpecies.occurrences} of {species.data.recordsReviewed} sampled records</small>
          </div>}
          <div className="composition-heading"><strong>OBSERVED OCCURRENCE MIX</strong><span>{species.data.uniqueSpecies} species represented</span></div>
          <TaxonomyPie3D data={species.data.composition} />
          <div className="species-preview-list">
            {(speciesWikipedia.data || species.data.species).map((item) => <SpeciesPreview item={item} key={`${item.scientificName}-${item.commonName}`} />)}
          </div>
          {speciesWikipedia.loading && <p className="source-note wikipedia-loading">Loading Wikipedia previews…</p>}
          <p className="source-note">GBIF · {species.data.recordsReviewed} recent records sampled within {species.data.radiusKm} km</p>
          <p className="data-caveat">Chart shows the taxonomic mix of retrieved GBIF occurrences—not population abundance, ecosystem genetics, or a complete biodiversity survey.</p>
        </> : <Unavailable reason="No recent nearby records found." />}
      </section>

      <section className="detail-section conservation-section">
        <div className="section-heading"><span>CONSERVATION CONTEXT</span><LiveTag /></div>
        {conservation.loading ? <LoadingRows /> : conservation.data ? <>
          <div className="conservation-stat"><strong>{conservation.data.threatenedSpecies.toLocaleString()}</strong><span>Vulnerable, endangered, or critically endangered species indexed nationally</span></div>
          <p className="source-note">IUCN Red List · {conservation.data.assessedSpecies.toLocaleString()} country assessments</p>
        </> : <Unavailable reason="Add VITE_IUCN_API_TOKEN to enable this source." />}
      </section>
    </aside>
  );
}
