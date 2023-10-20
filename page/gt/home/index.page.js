import * as ui from "@zos/ui";
import { assets } from "@zos/utils";
import { openAssetsSync, O_RDONLY, readFileSync } from "@zos/fs";

import {
  TEXT_STYLE,
  CANVAS_STYLE,
} from "zosLoader:./index.page.[pf].layout.js";

import { drawMap } from "../../../utils/mapzoom.js";
import { logger } from "../../../utils/logger.js";

Page({
  onInit() {
    logger.debug("page onInit invoked");
  },
  build() {
    logger.debug("page build invoked");
    const canvas = ui.createWidget(ui.widget.CANVAS, CANVAS_STYLE);
    // const jsonString = readFileSync({
    //   path: "map/yp.geojson",
    //   options: {
    //     encoding: "utf8",
    //   },
    // });
    // console.log(jsonString);
    // const geojson = JSON.parse(jsonString);

    const geojson = {
      type: "FeatureCollection",
      generator: "JOSM",
      bbox: [121.4733, 31.2881, 121.5242, 31.3134],
      features: [
        {
          type: "Feature",
          properties: {
            amenity: "school",
            name: "复旦大学附属中学",
            "name:en": "High School Affiliated to Fudan University",
            type: "multipolygon",
          },
          geometry: {
            type: "MultiPolygon",
            coordinates: [
              [
                [
                  [121.499505, 31.2925229],
                  [121.4992726, 31.2923189],
                  [121.4992873, 31.2921757],
                  [121.5016642, 31.2912406],
                  [121.5028033, 31.2927562],
                  [121.5018161, 31.2931901],
                  [121.501176, 31.2934714],
                  [121.5007572, 31.2926868],
                  [121.5003173, 31.2921642],
                  [121.499505, 31.2925229],
                ],
                [
                  [121.5017959, 31.2942912],
                  [121.5018924, 31.2941078],
                  [121.5019783, 31.294007],
                  [121.5033489, 31.293473],
                  [121.5028983, 31.2928862],
                  [121.5009805, 31.2936403],
                  [121.5014641, 31.2940263],
                  [121.5016744, 31.2941942],
                  [121.5017959, 31.2942912],
                ],
              ],
            ],
          },
        },
      ],
    };

    logger.debug("geojson loaded: ", geojson["type"]);

    drawMap({lon: 121.5, lat: 31.295}, geojson, 16, canvas);
  },
  onDestroy() {
    logger.debug("page onDestroy invoked");
  },
});
