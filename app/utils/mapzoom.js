import * as ui from "@zos/ui";
import * as router from "@zos/router";
import {
  onDigitalCrown,
  offDigitalCrown,
  onKey,
  KEY_DOWN,
  KEY_SHORTCUT,
  KEY_HOME,
  KEY_EVENT_CLICK,
} from "@zos/interaction";

import {
  DEVICE_HEIGHT,
  DEVICE_WIDTH,
  HALF_HEIGHT,
  TILE_SIZE,
  TILE_EXTENT,
  TILE_PROJECTION,
  PAN_SPEED_FACTOR,
  ZOOM_SPEED_FACTOR,
  PAN_THROTTLING_DELAY,
  ZOOM_THROTTLING_DELAY,
  PRECISION_FACTOR,
  CENTER_STORAGE_SCALE,
} from "./globals";
import { logger } from "./logger";
import { TileCache } from "./mvt";
import { roundToPrecision, lonLatToPixelCoordinates } from "./coordinates";

let isRendering = false; // Global Render Indicator

function scaleCoordinates(coord, fromZoom, toZoom) {
  return {
    x: coord.x * Math.pow(2, toZoom - fromZoom),
    y: coord.y * Math.pow(2, toZoom - fromZoom),
  };
}

/**
 * Build a coordinate cache for a given tile size.
 * @param {Number} tileSize - Tile size in pixels.
 * @returns {Object} - A coordinate cache object.
 */
function buildCoordCache(tileSize) {
  const cache = new Float32Array(TILE_EXTENT + 256);
  cache.set(TILE_PROJECTION);

  for (let i = 0; i < TILE_EXTENT + 256; i++) {
    cache[i] *= tileSize;
  }
  return { cache, tileSize };
}

/**
 * Get the pixel coordinates of a given MVT tile coordinates pair.
 * @param {Array} xy - A MVT tile coordinates pair, usually in [0, 4096].
 * @param {Object} coordCache - A coordinate cache object.
 * @returns {Object} - Pixel coordinates {x, y}.
 */
function getCoordCache(xy, coordCache) {
  let x = coordCache.cache[xy[0] + 128] + coordCache.baseTileX;
  let y = coordCache.cache[xy[1] + 128] + coordCache.baseTileY;

  if (!(isNaN(x) || isNaN(y))) return { x, y };

  // logger.debug("Coordinates cache missed.");

  x = (xy[0] / TILE_EXTENT) * coordCache.tileSize + coordCache.baseTileX;
  y = (xy[1] / TILE_EXTENT) * coordCache.tileSize + coordCache.baseTileY;
  return { x, y };
}

export class ZoomMap {
  constructor(
    canvas,
    trackpad,
    frametimeCounter,
    initialCenter,
    initialZoom,
    canvasW = 480,
    canvasH = 480,
    displayW = 480,
    displayH = 480
  ) {
    this.canvas = canvas;
    this.trackpad = trackpad;
    this.frametimeCounter = frametimeCounter;

    this.followGPS = false;
    this.geoLocation = null;

    // Set up initial center and zoom level
    this.center = lonLatToPixelCoordinates(initialCenter, CENTER_STORAGE_SCALE);
    this.initialCenter = { ...this.center };
    this.canvasCenter = { ...this.center };

    this.tileCache = new TileCache();
    this.renderCache = new Map();

    this.zoom = initialZoom;
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.displayW = displayW;
    this.displayH = displayH;

    isRendering = false;

    this.createWidgets();
    this.bindWidgets();
  }

  get defaultCanvasStyle() {
    return {
      x: this.displayW / 2 - this.canvasW / 2,
      y: this.displayH / 2 - this.canvasH / 2,
      w: this.canvasW,
      h: this.canvasH,
    };
  }

  get zoom() {
    return this._zoom;
  }

  set zoom(level) {
    if (typeof level !== "number") throw new Error("Invalid zoom level.");
    if (this._zoom == level) return;

    level = Math.max(0, level);
    level = Math.min(20, level);
    this._zoom = level;

    this.zoomIndicator?.setProperty(
      ui.prop.TEXT,
      `z${roundToPrecision(level)}`
    );

    this.renderCache.clear();
  }

  get geoLocation() {
    return this._geoLocation;
  }

  /**
   * @param {Object} lonlat longitude and latitude
   */
  set geoLocation(lonlat) {
    if (!lonlat) return;

    this._geoLocation = lonlat;
    const newCenter = lonLatToPixelCoordinates(lonlat, this.zoom);

    // Update canvas center if following GPS
    if (this.followGPS) this.updateCenter(newCenter, { redraw: true });

    // Update user location marker
    const canvasCenter = this.getRenderCache("currentCanvasCenter");
    markerX = newCenter.x - (canvasCenter.x - this.canvasW / 2);
    markerY = newCenter.y - (canvasCenter.y - this.canvasH / 2);

    // logger.debug(lonlat.lon, lonlat.lat, markerX, markerY);
    halfMarker = this.userMarkerProps.radius / 2;
    if (markerX < -halfMarker || markerX > this.canvasW + halfMarker) return;

    this.userMarker.setProperty(ui.prop.MORE, {
      ...this.userMarkerProps,
      center_x: markerX,
      center_y: markerY,
      alpha: 240,
    });
  }

  getRenderCache(key) {
    if (this.renderCache.has(key)) return this.renderCache.get(key);

    let val = null;
    if (key == "currentCanvasCenter")
      val = scaleCoordinates(
        this.canvasCenter,
        CENTER_STORAGE_SCALE,
        this.zoom
      );
    if (key == "currentTileSize")
      val = TILE_SIZE * Math.pow(2, this.zoom - Math.floor(this.zoom));

    if (val === null) throw new Error(`Invalid cache key: ${key}`);

    this.renderCache.set(key, val);
    return val;
  }

  createWidgets() {
    this.zoomIndicatorProps = {
      x: 0,
      y: DEVICE_HEIGHT - 80,
      w: DEVICE_WIDTH,
      h: 20,
      align_h: ui.align.CENTER_H,
      align_v: ui.align.CENTER_V,
      text_size: 20,
      text: `z${roundToPrecision(this.zoom)}`,
      color: 0xffffff,
      enable: false,
    };
    this.zoomIndicator = ui.createWidget(
      ui.widget.TEXT,
      this.zoomIndicatorProps
    );

    // Create user location marker
    this.userMarkerProps = {
      center_x: 240,
      center_y: 240,
      radius: 10,
      color: 0xea4335,
      alpha: 0,
      enable: false,
    };
    this.userMarker = ui.createWidget(ui.widget.CIRCLE, this.userMarkerProps);
  }

  bindWidgets() {
    let isDragging = false;
    let isGesture = false;
    let lastPosition = null;
    let dragTrace = { x: [], y: [] };

    let lastZoomUpdate = null;
    let wheelDegrees = 0;
    let zoomTimeout = null;

    onDigitalCrown({
      callback: (key, degree) => {
        if (isRendering) return;

        // logger.debug(`Digital crown callback: ${key}, ${degree}.`);

        if (key == KEY_HOME) {
          const currentTime = Date.now();

          lastZoomUpdate = currentTime;

          // KEY_HOME is the Crown wheel
          wheelDegrees -= degree; // degree is negative when rolling up

          const newZoom = this.zoom + wheelDegrees * ZOOM_SPEED_FACTOR;
          this.zoomIndicator.setProperty(
            ui.prop.TEXT,
            `z${roundToPrecision(newZoom)}`
          );

          if (zoomTimeout) clearTimeout(zoomTimeout);
          zoomTimeout = setTimeout(() => {
            // If the wheel is still spinning, don't update the zoom level
            if (wheelDegrees == 0) return;

            const currentTime = Date.now();
            if (currentTime - lastZoomUpdate < ZOOM_THROTTLING_DELAY) return;

            // Update zoom level
            this.zoom += wheelDegrees * ZOOM_SPEED_FACTOR;
            wheelDegrees = 0;

            this.render();
          }, ZOOM_THROTTLING_DELAY + 1);
        }
      },
    });

    onKey({
      callback: (key, keyEvent) => {
        if (isRendering) return;

        if (key == KEY_SHORTCUT && keyEvent === KEY_EVENT_CLICK) {
          this.updateCenter(this.initialCenter, { redraw: true });
          return true;
        }

        return false;
      },
    });

    this.trackpad.addEventListener(ui.event.CLICK_DOWN, (e) => {
      if (isRendering) return;

      isDragging = true;

      dragTrace.x.push(e.x);
      dragTrace.y.push(e.y);
      if (
        Math.sqrt((e.x - HALF_HEIGHT) ** 2 + (e.y - HALF_HEIGHT) ** 2) >
        HALF_HEIGHT - 10
      ) {
        isGesture = true;
        return;
      }

      this.followGPS = false;
      lastPosition = { x: e.x, y: e.y };
    });

    this.trackpad.addEventListener(ui.event.MOVE, (e) => {
      if (isRendering) return;
      if (!isDragging || !lastPosition) return;

      dragTrace.x.push(e.x);
      dragTrace.y.push(e.y);
      if (isGesture) return;

      const currentTime = Date.now();
      if (currentTime - this.lastCenterUpdate < PAN_THROTTLING_DELAY) return;

      this.updateCenter(this.newCenter(e, lastPosition), { redraw: false }); // Update center without immediate rendering

      this.lastCenterUpdate = currentTime;
      lastPosition = { x: e.x, y: e.y };
    });

    this.trackpad.addEventListener(ui.event.CLICK_UP, (e) => {
      if (isRendering) return;

      if (
        isGesture &&
        dragTrace.x[0] > DEVICE_WIDTH * 0.8 &&
        e.x < DEVICE_WIDTH * 0.4
      ) {
        router.replace({ url: "page/gt/map-transfer/index.page" });
        return;
      }

      dragTrace = { x: [], y: [] };

      isDragging = false;
      isGesture = false;
      this.updateCenter(this.center, { redraw: true });
      lastPosition = null;
    });
  }

  newCenter(moveEvent, lastPosition) {
    let delta = {
      x: moveEvent.x - lastPosition.x,
      y: moveEvent.y - lastPosition.y,
    };
    delta = scaleCoordinates(delta, this.zoom, CENTER_STORAGE_SCALE);

    return {
      x: this.center.x - delta.x,
      y: this.center.y - delta.y,
    };
  }

  /**
   * Update center based on given Web Mercator pixel coordinates.
   * @param {Object} newCenter - New center coordinates in Web Mercator pixel format.
   */
  updateCenter(newCenter, opts = { redraw: false }) {
    if (isRendering) return;

    this.center = newCenter;

    if (!opts.redraw) {
      let offset = this.calculateOffset();
      offset = scaleCoordinates(offset, CENTER_STORAGE_SCALE, this.zoom);
      return this.moveCanvas(offset);
    }

    this.canvasCenter = { ...newCenter };
    this.renderCache.delete("currentCanvasCenter");
    this.render();
    this.moveCanvas({ x: 0, y: 0 });
  }

  /**
   * Calculate the offset between the canvas center and the display center.
   * @returns {Object} - Offset in pixels {x, y}.
   */
  calculateOffset() {
    return {
      x: this.canvasCenter.x - this.center.x,
      y: this.canvasCenter.y - this.center.y,
    };
  }

  moveCanvas(offset) {
    originalX = this.displayH / 2 - this.canvasH / 2;
    originalY = this.displayW / 2 - this.canvasW / 2;

    this.canvas.setProperty(ui.prop.MORE, {
      x: originalX + offset.x,
      y: originalY + offset.y,
      w: this.canvasW,
      h: this.canvasH,
    });
  }

  /**
   * Calculate the tiles covering the viewport based on the center pixel.
   * @returns {Array} - An array of tiles covering the viewport.
   */
  viewportTiles() {
    const halfCanvasW = this.canvasW / 2;
    const halfCanvasH = this.canvasH / 2;

    const currentCanvasCenter = this.getRenderCache("currentCanvasCenter");

    const startX = currentCanvasCenter.x - halfCanvasW;
    const startY = currentCanvasCenter.y - halfCanvasH;

    const endX = currentCanvasCenter.x + halfCanvasW;
    const endY = currentCanvasCenter.y + halfCanvasH;

    const currentTileSize = this.getRenderCache("currentTileSize");

    const startTileX = Math.floor(startX / currentTileSize);
    const startTileY = Math.floor(startY / currentTileSize);
    const endTileX = Math.floor(endX / currentTileSize);
    const endTileY = Math.floor(endY / currentTileSize);

    const tiles = [];
    for (let x = startTileX; x <= endTileX; x++) {
      for (let y = startTileY; y <= endTileY; y++) {
        tiles.push({ x: x, y: y });
      }
    }
    return tiles;
  }

  render() {
    if (isRendering) return; // Prevent multiple renders

    // Set render indicators
    isRendering = true;
    const startTime = Date.now();

    try {
      this.commitRender();
    } catch (e) {
      logger.error(e);
    }

    isRendering = false;

    const elapsedTime = Date.now() - startTime;
    this.frametimeCounter.setProperty(ui.prop.TEXT, `${elapsedTime}ms`);
  }

  commitRender() {
    // First, calculate the tiles intersecting with the viewport
    const tiles = this.viewportTiles();
    // logger.info(tiles.length, "tiles to render.");

    this.canvas.setPaint({
      color: 0xffff00,
      line_width: 2,
    });
    // Clear canvas before drawing
    this.canvas.clear(this.defaultCanvasStyle);

    // Background color for debugging purpose
    // this.canvas.drawRect({
    //   x1: 0,
    //   y1: 0,
    //   x2: this.canvasW,
    //   y2: this.canvasH,
    //   color: 0x292900,
    // });

    const currentTileSize = this.getRenderCache("currentTileSize");
    const currentCanvasCenter = this.getRenderCache("currentCanvasCenter");

    const coordCache = buildCoordCache(currentTileSize);

    // For each tile, interpolate the pixel coordinates of the features and draw them on the canvas.
    for (const tile of tiles) {
      // Convert the byte range to decoded mvt json
      const tileObj = this.tileCache.getTile(
        Math.floor(this.zoom),
        tile.x,
        tile.y
      );

      if (!tileObj) continue;

      coordCache.baseTileX =
        tile.x * currentTileSize - (currentCanvasCenter.x - this.canvasW / 2);

      coordCache.baseTileY =
        tile.y * currentTileSize - (currentCanvasCenter.y - this.canvasH / 2);

      // Iterate through features in the decoded tile and draw them
      for (const layer of tileObj.layers) {
        // Iterate through features in the layer
        for (let feature of layer.features) {
          // logger.debug(JSON.stringify(feature.properties.name));

          const { type: geoType, coordinates: featCoords } = feature.geometry;

          if (geoType === "Point") {
            let pointCoord = getCoordCache(featCoords, coordCache);
            this.canvas.drawCircle({
              center_x: pointCoord.x,
              center_y: pointCoord.y,
              radius: 4,
              color: 0xdedede,
            });
            continue;
          }

          if (geoType === "MultiPoint") {
            for (const coord of featCoords) {
              let pointCoord = getCoordCache(coord, coordCache);
              this.canvas.drawCircle({
                center_x: pointCoord.x,
                center_y: pointCoord.y,
                radius: 4,
                color: 0xdedede,
              });
            }
            continue;
          }

          if (geoType === "LineString") {
            let lineCoords = featCoords.map((coord) =>
              getCoordCache(coord, coordCache)
            );
            this.canvas.strokePoly({
              data_array: lineCoords,
              color: 0x00ff22,
            });
            continue;
          }

          if (geoType === "MultiLineString") {
            for (const line of featCoords) {
              let lineCoords = line.map((coord) =>
                getCoordCache(coord, coordCache)
              );
              this.canvas.strokePoly({
                data_array: lineCoords,
                color: 0x444444,
              });
            }
            continue;
          }

          if (geoType === "Polygon") {
            // Draw the outer ring
            let outerRingCoords = featCoords[0].map((coord) =>
              getCoordCache(coord, coordCache)
            );
            this.canvas.strokePoly({
              data_array: outerRingCoords,
              color: 0x3499ff,
            }); // Or fillPoly if you want filled polygons

            // Draw inner rings (holes) if present
            for (let i = 1; i < featCoords.length; i++) {
              let innerRingCoords = featCoords[i].map((coord) =>
                getCoordCache(coord, coordCache)
              );
              this.canvas.strokePoly({
                data_array: innerRingCoords,
                color: 0x3499ff,
              }); // Use a different color if you want to distinguish holes
            }
            continue;
          }

          if (geoType === "MultiPolygon") {
            for (const polygon of featCoords) {
              // Draw the outer ring of each polygon
              let outerRingCoords = polygon[0].map((coord) =>
                getCoordCache(coord, coordCache)
              );
              this.canvas.strokePoly({
                data_array: outerRingCoords,
                color: 0x00ff99,
              }); // Or fillPoly for filled polygons

              // Draw inner rings (holes) of each polygon if present
              for (let i = 1; i < polygon.length; i++) {
                let innerRingCoords = polygon[i].map((coord) =>
                  getCoordCache(coord, coordCache)
                );
                this.canvas.strokePoly({
                  data_array: innerRingCoords,
                  color: 0x00ff99,
                }); // Use a different color for holes if desired
              }
            }
            continue;
          }

          logger.warn(`Unsupported feature type: ${feature.geometry.type}`);
        }
      }
    }
  }
}
