import * as ui from "@zos/ui";
import { offDigitalCrown } from "@zos/interaction";
import { onGesture, offGesture, GESTURE_RIGHT } from "@zos/interaction";
import { Geolocation } from "@zos/sensor";
import { setScrollLock } from "@zos/page";
import "fast-text-encoding";

import {
  TEXT_STYLE,
  CANVAS_STYLE,
  TRACKPAD_STYLE,
  FRAMETIME_COUNTER_STYLE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from "zosLoader:./index.page.[pf].layout.js";

import { DEVICE_WIDTH, DEVICE_HEIGHT } from "../../../utils/globals";
import { ZoomMap } from "../../../utils/mapzoom";
import { logger } from "../../../utils/logger";

const geolocation = new Geolocation();
let canvas, trackpad, frametimeCounter, zoomMap;

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
    const center = { lon: 121.5, lat: 31.295 };
    const zoom = 10;

    // Create canvas
    canvas = ui.createWidget(ui.widget.CANVAS, CANVAS_STYLE);
    trackpad = ui.createWidget(ui.widget.FILL_RECT, TRACKPAD_STYLE);
    frametimeCounter = ui.createWidget(ui.widget.TEXT, FRAMETIME_COUNTER_STYLE);

    zoomMap = new ZoomMap(
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
    const callback = () => {
      if (geolocation.getStatus() === "A") {
        lat = geolocation.getLatitude();
        lon = geolocation.getLongitude();
        if (typeof lat != "number" || typeof lon != "number") return;

        zoomMap.geoLocation = { lon, lat };
      }
    };

    geolocation.start();
    geolocation.onChange(callback);
  },
  onDestroy() {
    logger.debug("page onDestroy invoked");

    zoomMap = null;

    geolocation.offChange();
    geolocation.stop();

    offDigitalCrown();
    offGesture();
  },
});
