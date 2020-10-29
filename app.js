import React, {useState} from 'react';
import {render} from 'react-dom';
import {StaticMap} from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import {HeatmapLayer} from '@deck.gl/aggregation-layers';
import {DataFilterExtension} from '@deck.gl/extensions';
import RangeInput from './range-input';
import {useMemo} from 'react';

// Set your mapbox token here
const MAPBOX_TOKEN = process.env.MapboxAccessToken; // eslint-disable-line
const DATA_FP = './data/conposcovidloc.geojson';

const json_data = JSON.parse($.getJSON({'url': DATA_FP, 'async': false}).responseText.replace(/\bNaN\b/g, "null"));


// Create a set of all GPS coordinates.
const coordinates = new Set(json_data.features.map(i => i.geometry.coordinates.toString()));
const dates = new Set(json_data.features.map(i => 
  (i.properties.Case_Reported_Date ? i.properties.Case_Reported_Date : i.properties.Test_Reported_Date)
  ));


// Initialize `parsed_data_time_dict` with dates as keys.
var parsed_data_time_dict = {};
for(const coord of Array.from(coordinates)) {
  parsed_data_time_dict[coord] = {};
  for(const date of Array.from(dates)) {
    parsed_data_time_dict[coord][date] = 0;
  };
};

for (const case_i of json_data.features){
  if (!case_i.properties.Case_Reported_Date) {
    parsed_data_time_dict[case_i.geometry.coordinates.toString()][case_i.properties.Test_Reported_Date] += 1;
  } else {
    parsed_data_time_dict[case_i.geometry.coordinates.toString()][case_i.properties.Case_Reported_Date] += 1;
  }
};



// Build `parsed_data_array` as heatmap layer input data.
var parsed_data_array = [];
for (const coord in parsed_data_time_dict) {
  for (const time in parsed_data_time_dict[coord]) {
    const curr_entry = {
      timestamp: new Date(`${time} UTC`).getTime(),
      longitude: Number(coord.split(",").map(val => parseFloat(val))[0]),
      latitude: Number(coord.split(",").map(val => parseFloat(val))[1]),
      numberCases: Number(parsed_data_time_dict[coord][time]),
    }
    parsed_data_array.push(curr_entry);
  };
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

const MS_PER_DAY = 8.64e7;

const dataFilter = new DataFilterExtension({
  filterSize: 1,
  // Enable for higher precision, e.g. 1 second granularity
  // See DataFilterExtension documentation for how to pick precision
  fp64: false
});

function formatLabel(t) {
  const date = new Date(t);
  return `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}`;
}

function getTimeRange(data) {
  if (!data) {
    return null;
  }
  return data.reduce(
    (range, d) => {
      const t = d.timestamp;
      range[0] = Math.min(range[0], t);
      range[1] = Math.max(range[1], t);
      return range;
    },
    [Infinity, -Infinity]
  );
}

function getTooltip({object}) {
  return (
    object &&
    `\
    Time: ${new Date(object.timestamp).toUTCString()}
    NumberCases: ${object.numberCases}
    `
  );
}


// Build map
export default function App({
  data = parsed_data_array,
  intensity = 1,
  threshold = 0.01,
  radiusPixels = 150,
  mapStyle = 'mapbox://styles/mapbox/light-v9'
}) {
  const [filter, setFilter] = useState(null);

  const timeRange = useMemo(() => getTimeRange(data), [data]);
  const filterValue = filter || timeRange;

  const layers = [
    new HeatmapLayer({
      data,
      id: 'covid19-ontario',
      getPosition: d => [d.longitude, d.latitude],
      getWeight: d => d.numberCases,
      radiusPixels,
      intensity,
      threshold,

      getFilterValue: d => d.timestamp,
      filterRange: [filterValue[0], filterValue[1]],
      filterSoftRange: [
        filterValue[0] * 0.9 + filterValue[1] * 0.1,
        filterValue[0] * 0.1 + filterValue[1] * 0.9
      ],
      extensions: [dataFilter],

      pickable: true
    })
  ];

  return (
    <>
      <DeckGL 
        initialViewState={INITIAL_VIEW_STATE} 
        controller={true} 
        layers={layers}
        getTooltip={getTooltip}
      >
        <StaticMap
          reuseMaps
          mapStyle={mapStyle}
          preventStyleDiffing={true}
          mapboxApiAccessToken={MAPBOX_TOKEN}
        />
      </DeckGL>

      {timeRange && (
        <RangeInput
          min={timeRange[0]}
          max={timeRange[1]}
          value={filterValue}
          animationSpeed={MS_PER_DAY}
          formatLabel={formatLabel}
          onChange={setFilter}
        />
      )}
    </>
  );
}

export function renderToDOM(container) {
  render(<App />, container);
}
