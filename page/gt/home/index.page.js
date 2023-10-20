import * as ui from "@zos/ui";
import { onDigitalCrown, offDigitalCrown, KEY_HOME } from "@zos/interaction";
import { onGesture, offGesture, GESTURE_LEFT } from "@zos/interaction";
import { Geolocation } from "@zos/sensor";

import {
  TEXT_STYLE,
  CANVAS_STYLE,
} from "zosLoader:./index.page.[pf].layout.js";

import { drawMap, updateCenter } from "../../../utils/mapzoom.js";
import { logger } from "../../../utils/logger.js";
import { fetchGeojson } from "../../../utils/index.js";

const geolocation = new Geolocation();

Page({
  onInit() {
    logger.debug("page onInit invoked");
  },
  build() {
    logger.debug("page build invoked");

    // Set default map center and zoom level
    let firstDraw = true;
    let center = { lon: 121.5, lat: 31.295 };
    let zoom = 14;

    // Set default map configuration
    let isMoving = false;
    let followGPS = true;
    let initialPosition = null;
    let lastUpdateTime = Date.now();
    const THROTTLE_DELAY = 50; // Throttle every 50ms
    const DEBOUNCE_DELAY = 300; // Debounce delay of 300ms

    let debounceTimeout = null;

    // Create canvas
    const canvas = ui.createWidget(ui.widget.CANVAS, CANVAS_STYLE);

    // Geolocation updates
    const callback = () => {
      if (geolocation.getStatus() === "A") {
        lat = geolocation.getLatitude();
        lon = geolocation.getLongitude();

        if (followGPS && typeof lat === "number" && typeof lon === "number") {
          center = { lon, lat };
          drawMap(center, geojson, zoom, canvas);
          firstDraw = false;
        }
      }
    };

    geolocation.start();
    geolocation.onChange(callback);

    // Load map resource
    const mapPath = "./map/yp.geojson";
    const geojson = fetchGeojson(mapPath);

    if (firstDraw) drawMap(center, geojson, zoom, canvas);

    onDigitalCrown({
      callback: (key, degree) => {
        logger.debug(`Digital crown callback: ${key}, ${degree}`);
        if (key == KEY_HOME) {
          // KEY_HOME is the Crown wheel
          zoom += degree / Math.abs(degree);
          drawMap(center, geojson, zoom, canvas);
        }
      },
    });

    onGesture({
      callback: (event) => {
        if (event === GESTURE_LEFT) return true; // Intercept default back gesture

        return false;
      },
    });

    const debouncedDraw = () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        drawMap(center, geojson, zoom, canvas); // Assuming drawMap function is available and correctly implemented.
      }, DEBOUNCE_DELAY);
    };

    canvas.addEventListener(ui.event.CLICK_DOWN, function (e) {
      logger.debug("Click down event.");
      isMoving = true;
      initialPosition = { x: e.x, y: e.y };
    });

    canvas.addEventListener(ui.event.CLICK_UP, function (e) {
      logger.debug("Click up event.");
      isMoving = false;
      initialPosition = null;
      debouncedDraw();
    });

    canvas.addEventListener(ui.event.MOVE, function (e) {
      if (!isMoving) return;

      followGPS = false;

      const now = Date.now();
      if (now - lastUpdateTime < THROTTLE_DELAY) return;

      const deltaX = e.x - initialPosition.x;
      const deltaY = e.y - initialPosition.y;

      logger.debug(deltaX, deltaY);

      center = updateCenter(deltaX, deltaY, center, zoom);

      // Reset initial position for the next MOVE event
      initialPosition = { x: e.x, y: e.y };
      lastUpdateTime = now;

      drawMap(center, geojson, zoom, canvas); // Render the canvas during movement
    });
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
