import * as ui from "@zos/ui";
import { offDigitalCrown } from "@zos/interaction";
import { onGesture, offGesture, GESTURE_RIGHT } from "@zos/interaction";
import { Geolocation } from "@zos/sensor";
import { setScrollLock } from "@zos/page";

import {
  TEXT_STYLE,
  CANVAS_STYLE,
  TRACKPAD_STYLE,
  FRAMETIME_COUNTER_STYLE,
  DEVICE_WIDTH,
  DEVICE_HEIGHT,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from "zosLoader:./index.page.[pf].layout.js";

import { ZoomMap } from "../../../utils/mapzoom.js";
import { logger } from "../../../utils/logger.js";
import { lonLatToPixelCoordinates } from "../../../utils/coordinates.js";

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
    const trackpad = ui.createWidget(ui.widget.FILL_RECT, TRACKPAD_STYLE);
    const frametimeCounter = ui.createWidget(
      ui.widget.TEXT,
      FRAMETIME_COUNTER_STYLE
    );

    const zoomMap = new ZoomMap(
      canvas,
      trackpad,
      frametimeCounter,
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
    //       zoomZoomMap.followGPS &&
    //       typeof lat === "number" &&
    //       typeof lon === "number"
    //     ) {
    //       zoomZoomMap.center = { lon, lat };
    //       zoomZoomMap.render();
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
