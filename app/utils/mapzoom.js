import * as ui from "@zos/ui";
import {
  onDigitalCrown,
  onKey,
  KEY_DOWN,
  KEY_HOME,
  KEY_EVENT_CLICK,
} from "@zos/interaction";

import {
  getBoundingBox,
  calculateCanvasOrigin,
  lonLatToPixel,
  featureIntersects,
  lonlat,
} from "./index.js";
import { logger } from "./logger.js";

const canvasW = 480; // Manually defined canvas width
const canvasH = 480; // Manually defined canvas height

const PAN_SPEED_FACTOR = 1.8; // adjust this value as needed
const ZOOM_SPEED_FACTOR = 0.5; // adjust this value as needed

const THROTTLING_DELAY = 40; // Throttle delay of 50ms

/**
 * A class representing a map object.
 * @param {Object} geojson - A GeoJSON object containing the features to be rendered.
 * @param {Object} canvas - The customized canvas object.
 * @param {Object} initialCenter - An object representing the {lon, lat} of the map's initial center.
 * @param {number} initialZoom - The initial zoom level.
 * @param {number} canvasW - The width of the canvas.
 * @param {number} canvasH - The height of the canvas.
 */
export class Map {
  constructor(
    geojson,
    canvas,
    initialCenter,
    initialZoom,
    canvasW = 480,
    canvasH = 480
  ) {
    this.geojson = geojson;
    this.canvas = canvas;
    this.center = initialCenter;
    this.zoom = initialZoom;
    this.canvasW = canvasW;
    this.canvasH = canvasH;

    // Variables for throttling and debouncing
    this.lastRendered = Date.now();
    this.isWaiting = false;
    this.lastCenterUpdate = Date.now();
    this.lastZoomUpdate = Date.now();
    this.followGPS = true;

    this.initListeners();
  }

  // Getters
  get geojson() {
    return this._geojson;
  }

  get center() {
    return this._center;
  }

  get zoom() {
    return this._zoom;
  }

  get canvasW() {
    return this._canvasW;
  }

  get canvasH() {
    return this._canvasH;
  }

  // Setters
  set geojson(data) {
    this._geojson = data;
  }

  set center(coords) {
    this._center = coords;
  }

  set zoom(level) {
    level = Math.max(0, level);
    level = Math.min(20, level);
    this._zoom = level;
  }

  set canvasW(width) {
    this._canvasW = width;
  }

  set canvasH(height) {
    this._canvasH = height;
  }

  initListeners() {
    let isDragging = false;
    let lastPosition = null;

    onDigitalCrown({
      callback: (key, degree) => {
        // logger.debug(`Digital crown callback: ${key}, ${degree}`);
        if (key == KEY_HOME) {
          const currentTime = Date.now();
          // Throttle updates to 25 times per second
          if (currentTime - this.lastZoomUpdate < THROTTLING_DELAY) return;

          // KEY_HOME is the Crown wheel
          logger.debug("Crown wheel: ", key, degree);
          this.zoom += (degree / Math.abs(degree)) * ZOOM_SPEED_FACTOR;
          this.render();

          this.lastZoomUpdate = currentTime;
        }
      },
    });

    onKey({
      callback: (key, keyEvent) => {
        // logger.debug(`Key callback: ${key}`);
        if (key == KEY_DOWN && keyEvent === KEY_EVENT_CLICK) {
          // Debugging only
          this.center = { lon: 121.5, lat: 31.295 };
          this.zoom = 14;
          this.followGPS = false;
          this.render();
          return true;
        }

        return false;
      },
    });

    this.canvas.addEventListener(ui.event.CLICK_DOWN, (e) => {
      isDragging = true;
      this.followGPS = false;
      lastPosition = { x: e.x, y: e.y };
    });

    this.canvas.addEventListener(ui.event.CLICK_UP, (e) => {
      isDragging = false;
      lastPosition = null;
      this.render(); // We ensure to render the final state after the user stops dragging.
    });

    this.canvas.addEventListener(ui.event.MOVE, (e) => {
      if (!isDragging || !lastPosition) return;

      const currentTime = Date.now();
      // Throttle updates to 25 times per second
      if (currentTime - this.lastCenterUpdate < THROTTLING_DELAY) return;

      const deltaX = e.x - lastPosition.x;
      const deltaY = e.y - lastPosition.y;
      this.updateCenter(deltaX, deltaY); // Update center without immediate rendering

      lastPosition = { x: e.x, y: e.y };
      this.render();

      this.lastCenterUpdate = currentTime;
    });
  }

  // Calculate updated center based on move input
  updateCenter(deltaX, deltaY) {
    const lonDelta =
      (deltaX * PAN_SPEED_FACTOR) /
      (this.canvasW / 360) /
      Math.pow(2, this.zoom);
    const latDelta =
      (deltaY * PAN_SPEED_FACTOR) /
      (this.canvasH / 180) /
      Math.pow(2, this.zoom);

    const newLon = this.center.lon - lonDelta;
    const newLat = this.center.lat + latDelta;

    // Ensure the values are within the allowed ranges
    const boundedLat = Math.min(Math.max(newLat, -90), 90);
    const boundedLon = ((newLon + 180) % 360) - 180; // Wrap-around for longitude

    this.center = { lon: boundedLon, lat: boundedLat };
  }

  // Render the map based on the current state
  render() {
    // If the renderer is already waiting for the next render, then skip this render request.
    if (this.isWaiting) return;

    this.isWaiting = true;

    setTimeout(() => {
      drawMap(this.geojson, this.canvas, this.center, this.zoom);
      this.isWaiting = false;
    }, 40); // Debounce the rendering to max 10 times per second
  }
}

/**
 * Renders features from a GeoJSON on a customized canvas based on the given parameters.
 * @param {Object} geojson - A GeoJSON object containing the features to be rendered.
 * @param {Object} canvas - The customized canvas object.
 * @param {Object} center - An object representing the {lon, lat} of the map's center.
 * @param {number} zoom - The current zoom level.
 */
export function drawMap(geojson, canvas, center, zoom) {
  // Usage example:
  // const geojson = { ... };  // Your GeoJSON data here
  // drawMap([longitude, latitude], geojson, zoomLevel, canvas);

  const origin = calculateCanvasOrigin(center, zoom, canvasW, canvasH);

  // Clear previous drawings
  canvas.clear({
    x: 0,
    y: 0,
    w: 480,
    h: 480,
  });

  // logger.debug("Canvas cleared.");

  // Get viewport bounding box
  const bbox = getBoundingBox(center, zoom, canvasH, canvasW);

  // logger.debug(`Drawing map in bbox: ${JSON.stringify(bbox)}`);

  // Set default paint for features
  canvas.setPaint({
    color: 0xff0000,
    line_width: 2, // Default line width
  });

  // Iterate through features in GeoJSON
  geojson.forEach((feature) => {
    // logger.debug("Processing feature: ", feature.geometry.type);

    if (featureIntersects(feature, bbox)) {
      // logger.debug("Feature intersects with current viewport.");

      switch (feature.geometry.type) {
        case "Point":
          // logger.debug("Drawing point.");
          const coord = feature.geometry.coordinates;
          const pointPixel = lonLatToPixel(lonlat(coord), zoom, origin);
          canvas.drawPixel({ ...pointPixel, color: 0xffffff });
          break;

        case "MultiPoint":
          // logger.debug("Drawing MultiPoint.");
          feature.geometry.coordinates.forEach((coord) => {
            const pointPixel = lonLatToPixel(lonlat(coord), zoom);
            canvas.drawPixel({ ...pointPixel, color: 0xffffff });
          });
          break;

        case "LineString":
          // logger.debug("Drawing LineString.");
          const lineCoords = feature.geometry.coordinates.map((coord) =>
            lonLatToPixel(lonlat(coord), zoom, origin)
          );
          canvas.strokePoly({
            data_array: lineCoords,
            color: 0x00ff00,
          });

          break;

        case "MultiLineString":
          // logger.debug("Drawing MultiLineString.");
          feature.geometry.coordinates.forEach((line) => {
            const lineCoords = line.map((coord) =>
              lonLatToPixel(lonlat(coord), zoom, origin)
            );
            canvas.strokePoly({
              data_array: lineCoords,
              color: 0x00ff00,
            });
          });
          break;

        case "Polygon":
          // logger.debug("Drawing Polygon.");
          // Draw only the outer ring for simplicity, but this can be expanded to handle holes.
          const outerRingCoords = feature.geometry.coordinates[0].map((coord) =>
            lonLatToPixel(lonlat(coord), zoom, origin)
          );
          canvas.strokePoly({
            data_array: outerRingCoords,
            color: 0x00ffff,
          });
          break;

        case "MultiPolygon":
          // logger.debug("Drawing MultiPolygon.");

          feature.geometry.coordinates.forEach((polygon) => {
            // Draw only the outer ring of each polygon for simplicity.
            const outerRingCoords = polygon[0].map((coord) =>
              lonLatToPixel(lonlat(coord), zoom, origin)
            );
            canvas.strokePoly({
              data_array: outerRingCoords, // An array of {x, y} canvas coordinates
              color: 0x00ffff,
            });
          });
          break;

        default:
          logger.warn(
            "Unsupported feature type for drawing:",
            feature.geometry.type
          );
          break;
      }
    }
  });

  // logger.debug("Canvas update complete.");
}
