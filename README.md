# WildSignal

A dark, cinematic globe for exploring a curated global network of public wild-animal and natural-habitat cameras.

## Current build

The cinematic globe, public-camera experience, and live-data detail panel are implemented:

- Interactive 3D globe with orbit and zoom controls
- Camera coverage highlighted dynamically across 18 selected countries
- 18 North American regional markers with an explicitly labeled sample signal legend
- 50 distinct public-camera records with pulsing pink markers
- A 2.4-second camera swoosh followed by a full-screen feed experience
- Provider-published YouTube embeds, refreshing official images, and honest source-only or seasonal fallbacks
- Live Open-Meteo weather and recent GBIF occurrence records for every camera coordinate
- Wikipedia article previews for recorded species and camera-region context
- Interactive 3D chart of the taxonomic mix represented in the retrieved GBIF sample
- Optional IUCN national conservation context when a token and supported country response are available
- Correct northern, southern, eastern, and western coordinate labels
- Responsive desktop and mobile presentation

The regional signal categories remain sample visualization data and are labeled `Sample`. Open-Meteo, GBIF, and available IUCN results are labeled `Live`; Wikipedia summaries are labeled by source. Camera status is labeled independently as `Live video`, `Refreshes every N sec`, `Seasonal`, or `Official source only`. One unavailable camera or API never blocks the other sections.

## Run locally

```bash
npm install
npm run dev
```

On Windows systems that block PowerShell script shims, use:

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

IUCN is optional. Copy `.env.example` to `.env`, add a free token as `VITE_IUCN_API_TOKEN`, and restart the development server. Since Vite browser variables are visible to visitors, use a demo-scoped token and review IUCN's terms before deployment.

## Global camera inventory

The global expansion adds 24 records. Two legacy managed-facility entries—the International Wolf Center enclosure and Homosassa wildlife-park camera—were removed so the complete 50-camera inventory follows the wild-only rule.

- Asia: Jigokudani wild snow monkeys and Izumi cranes in Japan; Qinghai Lake birds and the Dafeng milu reserve in China; Hallasan alpine habitat CCTV in South Korea.
- Europe: Loch Arkaig ospreys in the United Kingdom; Alutaguse brown bears in Estonia; Lake Saimaa ospreys in Finland; Nieuw Land spoonbills in the Netherlands; and wild saker falcons in Romania.
- Africa: Mpala wildlife in Kenya; Tembe elephants in South Africa; the Namib Desert waterhole in Namibia; and the Kuzuma elephant corridor in Botswana.
- Oceania: northern royal albatross, Oamaru little penguins, and the seasonal kakapo nest camera in New Zealand; wild platypus, Phillip Island little penguins, and Sydney sea-eagles in Australia.
- South America: Magellanic penguins, imperial cormorants, and southern giant petrels with Rewilding Argentina; plus cloud-forest hummingbirds in Ecuador.

The selected countries are the United States, Canada, Japan, China, South Korea, United Kingdom, Estonia, Finland, Netherlands, Romania, Kenya, South Africa, Namibia, Botswana, New Zealand, Australia, Argentina, and Ecuador.

## Minimal structure

```text
src/
  components/CoverageGlobe.jsx    # globe rendering and dynamic country styling
  components/CameraExperience.jsx # full-screen public-camera player
  components/DetailPanel.jsx      # independent live-data sections
  components/TaxonomyPie3D.jsx    # interactive sampled-occurrence chart
  data/cameraLocations.js         # curated, credited global camera records
  data/monitoringLocations.js     # prototype US/Canada sample markers
  lib/api.js                      # normalized, failure-safe API clients
  App.jsx                         # page composition
  main.jsx                        # React entry point
  styles.css                      # cinematic UI and responsive layout
```

## Data honesty and wild-only standard

Country boundaries come from the bundled `world-atlas` dataset. Monitoring marker locations and their category labels are prototype/sample data; the UI says so.

Camera pins are a separate layer of public webcams from government agencies, national parks, nature reserves, research programs, and conservation organizations. No zoo, aquarium, rehabilitation enclosure, private trail camera, scraped stream, proxy, or rebroadcast was added in the global expansion. Habitat cameras such as Hallasan are described as habitat views with incidental wildlife sightings rather than guaranteed animal feeds.

WildSignal embeds media only where a provider-published reusable player or image endpoint is known. Providers that use changing player IDs, cookie-gated players, non-embeddable iframes, or their own web viewers are labeled `Official source only`. Those pins still receive the same cinematic zoom, weather, GBIF species sample, Wikipedia previews, 3D occurrence chart, and optional IUCN rail as playable North American cameras.

Seasonal and archived material is never relabeled as live. The Netherlands 2026 nesting season is marked ended; Rewilding Argentina and kakapo records are marked seasonal/highlights when their live season has ended. Exact sensitive nest locations are represented with provider-published or deliberately coarse coordinates.

Species rankings and the 3D composition chart are calculated only from recent nearby GBIF occurrence records returned for that click. “Most represented” means the species appearing most often in that retrieved sample. It does not establish local population abundance, genetic makeup, ecosystem health, or a complete biodiversity inventory; observation effort and data availability can strongly bias the result. Wikipedia previews provide accessible background context, not scientific monitoring evidence.

The retained North American sources were last checked on August 16, 2026. The 24 global additions and their wild/source classifications were checked on August 17, 2026. Upstream availability, seasonal programming, embed permission, and player identifiers can change, so re-check official source links before recording or presenting a demo.
