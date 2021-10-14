import os

import pandas as pd
import pydeck as pdk

DIR_PATH = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
DATA_FP = os.path.join(DIR_PATH, "data/data_20211011.csv")


data_df = pd.read_csv(DATA_FP)

COLOR_BREWER_BLUE_SCALE = [
    [240, 249, 232],
    [204, 235, 197],
    [168, 221, 181],
    [123, 204, 196],
    [67, 162, 202],
    [8, 104, 172],
]

view = pdk.data_utils.compute_view(data_df[["Reporting_PHU_Longitude", "Reporting_PHU_Latitude"]])
view.zoom = 6

cases = pdk.Layer(
    "HeatmapLayer",
    data=data_df,
    opacity=0.9,
    get_position=["Reporting_PHU_Longitude", "Reporting_PHU_Latitude"],
    aggregation=pdk.types.String("MEAN"),
    color_range=COLOR_BREWER_BLUE_SCALE,
    threshold=1,
    get_weight="weight",
    pickable=True,
)

r = pdk.Deck(
    layers=[cases],
    initial_view_state=view,
    map_provider="mapbox",
    map_style=pdk.map_styles.SATELLITE,
)

r.to_html("heatmap_layer.html")
