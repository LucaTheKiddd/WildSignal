const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
const GBIF_URL = 'https://api.gbif.org/v1/occurrence/search';
const IUCN_URL = 'https://apiv3.iucnredlist.org/api/v3';
const WIKIPEDIA_URL = 'https://en.wikipedia.org/w/api.php';
const SPECIES_RADIUS_KM = 50;

const WEATHER_CONDITIONS = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Heavy freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Heavy freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Light showers',
  81: 'Showers',
  82: 'Heavy showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm with hail',
};

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return response.json();
}

function distanceInKm(lat1, lng1, lat2, lng2) {
  const toRadians = (value) => value * Math.PI / 180;
  const earthRadiusKm = 6371;
  const latDelta = toRadians(lat2 - lat1);
  const lngDelta = toRadians(lng2 - lng1);
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2))
    * Math.sin(lngDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function fetchWeather(location) {
  try {
    if (!Number.isFinite(location?.lat) || !Number.isFinite(location?.lng)) return null;

    const params = new URLSearchParams({
      latitude: String(location.lat),
      longitude: String(location.lng),
      current: 'temperature_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day',
      temperature_unit: 'fahrenheit',
      wind_speed_unit: 'mph',
      timezone: 'auto',
    });
    const data = await fetchJson(`${WEATHER_URL}?${params}`);
    const current = data.current;
    if (!current || !Number.isFinite(current.temperature_2m)) return null;

    return {
      temperature: Math.round(current.temperature_2m),
      temperatureUnit: data.current_units?.temperature_2m || '°F',
      windSpeed: Math.round(current.wind_speed_10m),
      windUnit: data.current_units?.wind_speed_10m || 'mph',
      windDirection: current.wind_direction_10m,
      condition: WEATHER_CONDITIONS[current.weather_code] || 'Conditions unknown',
      isDay: current.is_day === 1,
      observedAt: current.time,
      timezone: data.timezone_abbreviation || data.timezone || 'Local time',
    };
  } catch {
    return null;
  }
}

export async function fetchSpecies(location) {
  try {
    if (!Number.isFinite(location?.lat) || !Number.isFinite(location?.lng)) return null;

    const recentYear = new Date().getUTCFullYear() - 5;
    const latitudeRadius = SPECIES_RADIUS_KM / 111.32;
    const longitudeRadius = SPECIES_RADIUS_KM
      / (111.32 * Math.max(Math.cos(location.lat * Math.PI / 180), 0.1));
    const params = new URLSearchParams({
      decimalLatitude: `${location.lat - latitudeRadius},${location.lat + latitudeRadius}`,
      decimalLongitude: `${location.lng - longitudeRadius},${location.lng + longitudeRadius}`,
      year: `${recentYear},*`,
      hasCoordinate: 'true',
      hasGeospatialIssue: 'false',
      limit: '300',
    });
    const data = await fetchJson(`${GBIF_URL}?${params}`);
    if (!Array.isArray(data.results)) return null;

    const speciesByName = new Map();
    const nearbyRecords = data.results.filter((record) => (
      Number.isFinite(record.decimalLatitude)
      && Number.isFinite(record.decimalLongitude)
      && distanceInKm(
        location.lat,
        location.lng,
        record.decimalLatitude,
        record.decimalLongitude,
      ) <= SPECIES_RADIUS_KM
    ));
    nearbyRecords.forEach((record) => {
      const scientificName = record.species || record.scientificName;
      const commonName = record.vernacularName || null;
      if (!scientificName && !commonName) return;

      const key = String(record.speciesKey || scientificName || commonName).toLowerCase();
      const existing = speciesByName.get(key);
      const observedAt = record.eventDate || record.lastInterpreted || null;
      speciesByName.set(key, {
        commonName: commonName || existing?.commonName || null,
        scientificName: scientificName || existing?.scientificName || null,
        occurrences: (existing?.occurrences || 0) + 1,
        lastObserved: !existing?.lastObserved || observedAt > existing.lastObserved
          ? observedAt
          : existing.lastObserved,
      });
    });

    const allSpecies = [...speciesByName.values()]
      .sort((a, b) => b.occurrences - a.occurrences);
    const species = allSpecies.slice(0, 6);
    const leadingSpecies = allSpecies.slice(0, 7);
    const otherOccurrences = allSpecies.slice(7)
      .reduce((total, item) => total + item.occurrences, 0);
    const composition = leadingSpecies.map((item) => ({
      name: item.commonName || item.scientificName,
      scientificName: item.scientificName,
      value: item.occurrences,
    }));
    if (otherOccurrences > 0) {
      composition.push({
        name: 'Other observed species',
        scientificName: null,
        value: otherOccurrences,
      });
    }

    return {
      species,
      mostCommonSpecies: allSpecies[0] || null,
      composition,
      uniqueSpecies: allSpecies.length,
      recordsReviewed: nearbyRecords.length,
      radiusKm: SPECIES_RADIUS_KM,
      fromYear: recentYear,
    };
  } catch {
    return null;
  }
}

export async function fetchWikipediaPreview(searchTerm) {
  try {
    if (!searchTerm || typeof searchTerm !== 'string') return null;

    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: searchTerm,
      gsrlimit: '1',
      prop: 'extracts|pageimages|info',
      exintro: 'true',
      explaintext: 'true',
      exsentences: '3',
      piprop: 'thumbnail',
      pithumbsize: '520',
      inprop: 'url',
      redirects: '1',
      format: 'json',
      origin: '*',
    });
    const data = await fetchJson(`${WIKIPEDIA_URL}?${params}`);
    const page = Object.values(data.query?.pages || {})[0];
    if (!page?.title || !page?.fullurl) return null;

    return {
      title: page.title,
      summary: page.extract || null,
      thumbnailUrl: page.thumbnail?.source || null,
      articleUrl: page.fullurl,
    };
  } catch {
    return null;
  }
}

export async function fetchSpeciesWikipedia(speciesList) {
  try {
    if (!Array.isArray(speciesList) || speciesList.length === 0) return null;
    const results = await Promise.allSettled(speciesList.map(async (species) => ({
      ...species,
      wikipedia: await fetchWikipediaPreview(
        species.scientificName || species.commonName,
      ),
    })));
    return results.map((result, index) => (
      result.status === 'fulfilled'
        ? result.value
        : { ...speciesList[index], wikipedia: null }
    ));
  } catch {
    return null;
  }
}

export async function fetchRegionSummary(location) {
  try {
    if (!location?.name && !location?.region) return null;
    const region = String(location.region || '').trim();
    return await fetchWikipediaPreview(`${location.name || ''} ${region}`.trim());
  } catch {
    return null;
  }
}

export async function fetchConservationStatus(location) {
  try {
    const token = import.meta.env.VITE_IUCN_API_TOKEN;
    if (!token) return null;

    const countryCode = location?.countryCode
      || location?.region?.match(/\b(US|CA)$/)?.[1];
    if (!countryCode) return null;

    const params = new URLSearchParams({ token });
    const data = await fetchJson(`${IUCN_URL}/country/getspecies/${countryCode}?${params}`);
    if (!Array.isArray(data.result)) return null;

    const categoryCounts = data.result.reduce((counts, species) => {
      const category = species.category;
      if (category) counts[category] = (counts[category] || 0) + 1;
      return counts;
    }, {});
    const threatenedCount = ['CR', 'EN', 'VU']
      .reduce((total, category) => total + (categoryCounts[category] || 0), 0);

    return {
      countryCode,
      assessedSpecies: data.result.length,
      threatenedSpecies: threatenedCount,
      categories: categoryCounts,
    };
  } catch {
    return null;
  }
}
