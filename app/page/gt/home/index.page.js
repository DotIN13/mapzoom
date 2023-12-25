import * as ui from "@zos/ui";
import { offDigitalCrown } from "@zos/interaction";
import { onGesture, offGesture, GESTURE_RIGHT } from "@zos/interaction";
import { Geolocation, Compass } from "@zos/sensor";

import { setScrollLock } from "@zos/page";
import { BasePage } from "@zeppos/zml/base-page";
import "fast-text-encoding";

import {
  CANVAS_STYLE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from "zosLoader:./index.page.[pf].layout.js";

import { DEVICE_WIDTH, DEVICE_HEIGHT } from "../../../utils/globals";
import { ZoomMap } from "../../../utils/mapzoom";
import { logger } from "../../../utils/logger";

const geolocation = new Geolocation();
const compass = new Compass();

let canvases, zoomMap;

Page(
  BasePage({
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
      const zoom = 0.0;

      // Create canvas
      canvases = [
        ui.createWidget(ui.widget.CANVAS, CANVAS_STYLE),
        ui.createWidget(ui.widget.CANVAS, CANVAS_STYLE),
        ui.createWidget(ui.widget.CANVAS, CANVAS_STYLE), // Text layer
      ];

      zoomMap = new ZoomMap(
        this,
        canvases,
        center,
        zoom,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        DEVICE_WIDTH,
        DEVICE_HEIGHT
      );
      zoomMap.render();

      // Debug
      // zoomMap.geoLocation = {
      //   lon: 121.48328974565532,
      //   lat: 31.047363611358993,
      // };

      const compassCallback = () => {
        if (compass.getStatus()) {
          const angle = compass.getDirectionAngle();
          zoomMap.compassAngle = angle;
        }
      };
      compass.onChange(compassCallback);
      compass.start();

      // Geolocation updates
      const geoLocationCallback = () => {
        const status = geolocation.getStatus();
        zoomMap.updateGeoStatus(status);

        if (status === "A") {
          lat = geolocation.getLatitude();
          lon = geolocation.getLongitude();
          if (typeof lat != "number" || typeof lon != "number") return;

          zoomMap.geoLocation = { lon, lat };
        }
      };

      geolocation.start();
      geolocation.onChange(geoLocationCallback);
    },

    onDestroy() {
      logger.debug("page onDestroy invoked");

      zoomMap = null;

      compass.offChange();
      compass.stop();

      geolocation.offChange();
      geolocation.stop();

      offDigitalCrown();
      offGesture();
    },
  })
);
