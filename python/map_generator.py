import os
from collections import defaultdict

import pandas as pd
import pydeck as pdk

DIR_PATH = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
DATA_FP = os.path.join(DIR_PATH, "data/data_20211011.csv")

HEADERS = ["Case_Reported_Date", "Reporting_PHU", "Reporting_PHU_Longitude", "Reporting_PHU_Latitude"]


def clean_data(raw_data):
    for header in raw_data:
        if header not in HEADERS:
            del raw_data[header]


def get_phu_coordinates(raw_data):
    all_phu = set(raw_data["Reporting_PHU"].values)
    phu_coordinates = {}

    for idx, row in raw_data.iterrows():
        if row["Reporting_PHU"] not in phu_coordinates:
            phu_coordinates[row["Reporting_PHU"]] = {
                "lat": row["Reporting_PHU_Latitude"],
                "lon": row["Reporting_PHU_Longitude"]
            }

        if all([el in phu_coordinates for el in all_phu]):
            break

    return phu_coordinates


def get_phu_coordinates_df(mapping):
    all_phu_list = list(mapping.keys())
    return pd.DataFrame(
        data={
            "phu": all_phu_list,
            "lat": [mapping[phu]["lat"] for phu in all_phu_list],
            "lon": [mapping[phu]["lon"] for phu in all_phu_list],
        }
    )


def group_data_by_reported_date(raw_data):
    all_dates = set(raw_data["Case_Reported_Date"].values)

    dict_by_date = {
        date: raw_data.loc[raw_data["Case_Reported_Date"] == date]
        for date in all_dates
    }

    return dict_by_date


def group_data_by_phu(raw_data, phu_lat_lon):
    count_by_phu_dict = {}
    for date, df in raw_data.items():
        all_phu_list = list(set(df["Reporting_PHU"].values))
        df_dict = defaultdict(list)
        df_dict["phu"] = all_phu_list

        for phu in all_phu_list:
            df_dict["lon"].append(phu_lat_lon[phu]["lon"])
            df_dict["lat"].append(phu_lat_lon[phu]["lat"])
            df_dict["count"].append(len(df.loc[df["Reporting_PHU"] == phu]))

        count_by_phu_dict[date] = pd.DataFrame(data=df_dict)

    return count_by_phu_dict


data_df = pd.read_csv(DATA_FP)
clean_data(data_df)
phu_lat_lon_mapping = get_phu_coordinates(data_df)
phu_lat_lon_df = get_phu_coordinates_df(phu_lat_lon_mapping)
group_by_date_df = group_data_by_reported_date(data_df)
count_by_phu = group_data_by_phu(group_by_date_df, phu_lat_lon_mapping)

view = pdk.data_utils.compute_view(phu_lat_lon_df[["lon", "lat"]])
view.zoom = 6

cases = pdk.Layer(
    "HeatmapLayer",
    data=count_by_phu["2020-05-05"],
    opacity=0.9,
    get_position=["lon", "lat"],
    aggregation=pdk.types.String("MEAN"),
    threshold=1,
    get_weight="count",
    pickable=True,
)

r = pdk.Deck(
    layers=[cases],
    initial_view_state=view,
)

r.to_html("heatmap_layer.html")
