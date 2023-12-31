import * as ui from "@zos/ui";
import { offDigitalCrown } from "@zos/interaction";
import { onGesture, offGesture, GESTURE_RIGHT } from "@zos/interaction";
import { Geolocation, Compass } from "@zos/sensor";
import { log } from "@zos/utils";

import { setScrollLock } from "@zos/page";
import { BasePage } from "@zeppos/zml/base-page";
import "fast-text-encoding";

import {
  CANVAS_STYLE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from "zosLoader:./index.page.[pf].layout.js";

import { DEVICE_WIDTH, DEVICE_HEIGHT } from "../../../utils/globals";
import { ZennMap } from "../../../utils/zenn-map";

// import { geoLocationTest } from "../../../utils/geolocation-test";

const logger = log.getLogger("zenn-map-home");

const geolocation = new Geolocation();
const compass = new Compass();

let canvases, zennMap;

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

      zennMap = new ZennMap(
        this,
        canvases,
        center,
        zoom,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        DEVICE_WIDTH,
        DEVICE_HEIGHT
      );
      zennMap.render();

      // Debug
      // zennMap.geoLocation = {
      //   lon: 121.483619,
      //   lat: 31.241673,
      // };

      const compassCallback = () => {
        if (compass.getStatus()) {
          const angle = compass.getDirectionAngle();
          zennMap.compassAngle = angle;
        }
      };
      compass.onChange(compassCallback);
      compass.start();

      // Geolocation updates
      const geoLocationCallback = () => {
        const status = geolocation.getStatus();
        zennMap.updateGeoStatus(status);

        // return geoLocationTest(zennMap);

        if (status === "A") {
          lat = geolocation.getLatitude();
          lon = geolocation.getLongitude();
          if (typeof lat != "number" || typeof lon != "number") return;

          zennMap.geoLocation = { lon, lat };
        }
      };

      geolocation.start();
      geolocation.onChange(geoLocationCallback);
    },

    onDestroy() {
      logger.debug("page onDestroy invoked");

      zennMap = null;

      compass.offChange();
      compass.stop();

      geolocation.offChange();
      geolocation.stop();

      offDigitalCrown();
      offGesture();
    },
  })
);
