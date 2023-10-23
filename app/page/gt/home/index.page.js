import * as ui from "@zos/ui";
import { offDigitalCrown } from "@zos/interaction";
import { onGesture, offGesture, GESTURE_RIGHT } from "@zos/interaction";
import { Geolocation } from "@zos/sensor";
import { setScrollLock } from "@zos/page";

import {
  TEXT_STYLE,
  CANVAS_STYLE,
  DEVICE_WIDTH,
  DEVICE_HEIGHT,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from "zosLoader:./index.page.[pf].layout.js";

import { Map } from "../../../utils/mapzoom.js";
import { logger } from "../../../utils/logger.js";
import { lonLatToPixelCoordinates } from "../../../utils/index.js";

const geolocation = new Geolocation();

Page({
  onInit() {
    logger.debug("page onInit invoked");
    setScrollLock({ lock: true });
  },
  build() {
    logger.debug("page build invoked");

    onGesture({
      callback: (e) => {
        if (e == GESTURE_RIGHT) return true; // Intercept swipes to the right

        return false;
      },
    });

    // Set default map center and zoom level
    let center = lonLatToPixelCoordinates({ lon: 121.5, lat: 31.295 }, 10);
    let zoom = 10;

    // Create canvas
    const canvas = ui.createWidget(ui.widget.CANVAS, CANVAS_STYLE);

    const zoomMap = new Map(
      canvas,
      center,
      zoom,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      DEVICE_WIDTH,
      DEVICE_HEIGHT
    );
    zoomMap.render();

    // Geolocation updates
    // const callback = () => {
    //   if (geolocation.getStatus() === "A") {
    //     lat = geolocation.getLatitude();
    //     lon = geolocation.getLongitude();

    //     if (
    //       zoomMap.followGPS &&
    //       typeof lat === "number" &&
    //       typeof lon === "number"
    //     ) {
    //       zoomMap.center = { lon, lat };
    //       zoomMap.render();
    //     }
    //   }
    // };

    // geolocation.start();
    // geolocation.onChange(callback);
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
