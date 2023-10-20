import * as ui from "@zos/ui";
import { onDigitalCrown, offDigitalCrown, KEY_HOME } from "@zos/interaction";
import { onGesture, offGesture, GESTURE_LEFT } from "@zos/interaction";
import { Geolocation } from "@zos/sensor";

import {
  TEXT_STYLE,
  CANVAS_STYLE,
} from "zosLoader:./index.page.[pf].layout.js";

import { drawMap, Map } from "../../../utils/mapzoom.js";
import { logger } from "../../../utils/logger.js";
import { fetchGeojson } from "../../../utils/index.js";

const geolocation = new Geolocation();

Page({
  onInit() {
    logger.debug("page onInit invoked");
  },
  build() {
    logger.debug("page build invoked");

    onGesture({
      callback: (e) => {
        if (e == GESTURE_LEFT) return true;

        return false;
      },
    });

    // Set default map center and zoom level
    let center = { lon: 121.5, lat: 31.295 };
    let zoom = 14;

    // Create canvas
    const canvas = ui.createWidget(ui.widget.CANVAS, CANVAS_STYLE);

    // Load map resource
    const mapPath = "./map/yp.geojson";
    const geojson = fetchGeojson(mapPath);

    const zoomMap = new Map(geojson, canvas, center, zoom);
    zoomMap.render();

    // Geolocation updates
    const callback = () => {
      if (geolocation.getStatus() === "A") {
        lat = geolocation.getLatitude();
        lon = geolocation.getLongitude();

        if (
          zoomMap.followGPS &&
          typeof lat === "number" &&
          typeof lon === "number"
        ) {
          zoomMap.center = { lon, lat };
          zoomMap.render();
        }
      }
    };

    geolocation.start();
    geolocation.onChange(callback);
  },
  onDestroy() {
    logger.debug("page onDestroy invoked");
    // When not needed for use
    geolocation.offChange();
    geolocation.stop();

    offDigitalCrown();
    offGesture();
  },
});
