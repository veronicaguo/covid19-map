import React from 'react';
import {render} from 'react-dom';
import {StaticMap} from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import {HeatmapLayer} from '@deck.gl/aggregation-layers';

// Set your mapbox token here
const MAPBOX_TOKEN = process.env.MapboxAccessToken; // eslint-disable-line
const DATA_FP = './data/conposcovidloc.geojson';


const json_data = JSON.parse($.getJSON({'url': DATA_FP, 'async': false}).responseText.replace(/\bNaN\b/g, "null"));


// Create a set of all GPS coordinates.
const coordinates = new Set(json_data.features.map(i => i.geometry.coordinates.toString()));

// // Initialize `parsed_data_dict` with coordinates as keys.
var parsed_data_dict = {};
for(const coord of Array.from(coordinates)) {
  parsed_data_dict[coord] = 0;
};

for (const case_i of json_data.features){
  parsed_data_dict[case_i.geometry.coordinates.toString()] += 1;
};

// // Build `parsed_data_array` as heatmap layer input data.
var parsed_data_array = [];
for (const key in parsed_data_dict) {
  const curr_entry = key.split(",").map(val => parseFloat(val));
  curr_entry.push(parsed_data_dict[key]);
  parsed_data_array.push(curr_entry);
};


// Set initial view in Toronto
const INITIAL_VIEW_STATE = {
  longitude: -79.38,
  latitude: 43.65,
  zoom: 7,
  maxZoom: 16,
  pitch: 0,
  bearing: 0
};


// Build map
export default function App({
  data = parsed_data_array,
  intensity = 1,
  threshold = 0.01,
  radiusPixels = 150,
  mapStyle = 'mapbox://styles/mapbox/dark-v9'
}) {
  const layers = [
    new HeatmapLayer({
      data,
      id: 'heatmp-layer',
      pickable: false,
      getPosition: d => [d[0], d[1]],
      getWeight: d => d[2],
      radiusPixels,
      intensity,
      threshold
    })
  ];

  return (
    <DeckGL initialViewState={INITIAL_VIEW_STATE} controller={true} layers={layers}>
      <StaticMap
        reuseMaps
        mapStyle={mapStyle}
        preventStyleDiffing={true}
        mapboxApiAccessToken={MAPBOX_TOKEN}
      />
    </DeckGL>
  );
}

export function renderToDOM(container) {
  render(<App />, container);
}
