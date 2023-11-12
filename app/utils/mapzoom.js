import * as ui from "@zos/ui";
import {
  onDigitalCrown,
  onKey,
  KEY_DOWN,
  KEY_HOME,
  KEY_EVENT_CLICK,
} from "@zos/interaction";

import {
  DEVICE_HEIGHT,
  DEVICE_WIDTH,
  TILE_SIZE,
  TILE_EXTENT,
  TILE_CACHE_SIZE,
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

function scaleCoordinates(coord, fromZoom, toZoom) {
  return {
    x: coord.x * Math.pow(2, toZoom - fromZoom),
    y: coord.y * Math.pow(2, toZoom - fromZoom),
  };
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
    this.canvasCenter = { ...this.center };

    this.tileCache = new TileCache();
    this.renderCache = new Map();

    this.zoom = initialZoom;
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.displayW = displayW;
    this.displayH = displayH;

    this.isRendering = false;

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

  bindWidgets() {
    let isDragging = false;
    let lastPosition = null;

    let lastZoomUpdate = null;
    let wheelDegrees = 0;
    let zoomTimeout = null;

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
    };
    this.userMarker = ui.createWidget(ui.widget.CIRCLE, this.userMarkerProps);
    this.userMarker.setEnable(false); // Disable marker interactions

    onDigitalCrown({
      callback: (key, degree) => {
        // logger.debug(`Digital crown callback: ${key}, ${degree}`);

        if (key == KEY_HOME) {
          const currentTime = Date.now();

          lastZoomUpdate = currentTime;

          // KEY_HOME is the Crown wheel
          logger.debug("Crown wheel: ", key, degree);
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

    // onKey({
    //   callback: (key, keyEvent) => {
    //     logger.debug(`Key callback: ${key}`);
    //     if (key == KEY_DOWN && keyEvent === KEY_EVENT_CLICK) {
    //       // Debugging only
    //       this.center = { lon: 121.5, lat: 31.295 };
    //       this.zoom = 14;
    //       this.followGPS = false;
    //       this.render();
    //       return true;
    //     }

    //     return false;
    //   },
    // });

    this.trackpad.addEventListener(ui.event.CLICK_DOWN, (e) => {
      isDragging = true;
      this.followGPS = false;
      lastPosition = { x: e.x, y: e.y };
    });

    this.trackpad.addEventListener(ui.event.CLICK_UP, (e) => {
      isDragging = false;
      this.updateCenter(this.center, { redraw: true });
      lastPosition = null;
    });

    this.trackpad.addEventListener(ui.event.MOVE, (e) => {
      if (!isDragging || !lastPosition) return;

      const currentTime = Date.now();
      if (currentTime - this.lastCenterUpdate < PAN_THROTTLING_DELAY) return;

      this.updateCenter(this.newCenter(e, lastPosition), { redraw: false }); // Update center without immediate rendering

      this.lastCenterUpdate = currentTime;
      lastPosition = { x: e.x, y: e.y };
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
  calculateViewportTiles() {
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

  /**
   * Interpolates the coordinates of a feature from tile space to canvas space.
   *
   * @param {Array} coord - The original coordinates of the feature in the tile [x, y].
   * @param {number} baseTileX - Base world X coordinate for the tile's top-left corner.
   * @param {number} baseTileY - Base world Y coordinate for the tile's top-left corner.
   * @returns {Object} - The interpolated coordinates { x, y } in canvas space.
   */
  featureToCanvasCoordinates(coord, baseTileX, baseTileY, currentTileSize) {
    // Translate world coordinates to our canvas space, taking the canvas center into account.
    // Always make sure the cached coordinates in this function are rounded
    // to the precision defined in global constants to achieve better performance.
    return {
      x: baseTileX + coord[0] * currentTileSize,
      y: baseTileY + coord[1] * currentTileSize,
    };
  }

  // /**
  //  * Filters out coordinates based on their relation to the canvas.
  //  * @param {Array} coordinates - An array of {x, y} objects representing coordinates.
  //  * @param {string} geometryType - Type of the feature ('Point', 'MultiPoint', 'LineString', etc.).
  //  * @returns {Array} - An array of {x, y} objects to be drawn on the canvas.
  //  */
  // filterCanvasCoordinates(coordinates, geometryType) {
  //   // Object to cache the results of canvas boundary checks
  //   const cache = {};

  //   // Check if a point is within the canvas boundaries and cache the result
  //   const isInsideCanvas = (arr, index) => {
  //     // Return cached result if available
  //     if (index in cache) return cache[index];

  //     const point = arr[index];
  //     const result =
  //       point.x >= 0 &&
  //       point.x <= this.canvasW &&
  //       point.y >= 0 &&
  //       point.y <= this.canvasH;

  //     // Store the result in the cache
  //     cache[index] = result;

  //     return result;
  //   };

  //   // If it's Point/MultiPoint, simply return coordinates inside the canvas
  //   if (geometryType === "Point" || geometryType === "MultiPoint") {
  //     return coordinates.filter((coord, index) =>
  //       isInsideCanvas(coordinates, index)
  //     );
  //   }

  //   // For other feature types
  //   return coordinates.filter((_, index, arr) => {
  //     // Always keep the coordinate if it's inside the canvas
  //     if (isInsideCanvas(arr, index)) return true;

  //     // If it's the first coordinate, only check the next one
  //     if (index === 0) return isInsideCanvas(arr, index + 1);

  //     // If it's the last coordinate, only check the previous one
  //     if (index === arr.length - 1) return isInsideCanvas(arr, index - 1);

  //     // For coordinates in between, if both neighbors are outside the canvas, drop the coordinate
  //     return isInsideCanvas(arr, index - 1) || isInsideCanvas(arr, index + 1);
  //   });
  // }

  render() {
    if (this.isRendering) return; // Prevent multiple renders

    // Set render indicators
    this.isRendering = true;

    const startTime = Date.now();

    // First, calculate the tiles intersecting with the viewport
    const tiles = this.calculateViewportTiles();
    logger.info(tiles.length, "tiles to render.");

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

    // For each tile, interpolate the pixel coordinates of the features and draw them on the canvas.
    for (const tile of tiles) {
      // Convert the byte range to decoded mvt json
      const decodedTile = this.tileCache.getTile(
        Math.floor(this.zoom),
        tile.x,
        tile.y
      );

      if (!decodedTile) continue;

      const currentTileSize = this.getRenderCache("currentTileSize");
      const currentCanvasCenter = this.getRenderCache("currentCanvasCenter");

      let baseTileX =
        tile.x * currentTileSize - (currentCanvasCenter.x - this.canvasW / 2);

      let baseTileY =
        tile.y * currentTileSize - (currentCanvasCenter.y - this.canvasH / 2);

      // Iterate through features in the decoded tile and draw them
      for (const layer of decodedTile.layers) {
        // logger.debug(layer.name);

        // Iterate through features in the layer
        for (let feature of layer.features) {
          // logger.debug(JSON.stringify(feature.properties.name));

          const geoType = feature.geometry.type;

          if (geoType === "Point") {
            let pointCoord = this.featureToCanvasCoordinates(
              feature.geometry.coordinates,
              baseTileX,
              baseTileY,
              currentTileSize
            );
            this.canvas.drawCircle({
              center_x: pointCoord.x,
              center_y: pointCoord.y,
              radius: 4,
              color: 0xf2f233,
            });
            continue;
          }

          if (geoType === "MultiPoint") {
            for (const coord of feature.geometry.coordinates) {
              let pointCoord = this.featureToCanvasCoordinates(
                coord,
                baseTileX,
                baseTileY,
                currentTileSize
              );
              this.canvas.drawCircle({
                center_x: pointCoord.x,
                center_y: pointCoord.y,
                radius: 4,
                color: 0xf2f233,
              });
            }
            continue;
          }

          if (geoType === "LineString") {
            let lineCoords = feature.geometry.coordinates.map((coord) =>
              this.featureToCanvasCoordinates(
                coord,
                baseTileX,
                baseTileY,
                currentTileSize
              )
            );
            this.canvas.strokePoly({
              data_array: lineCoords,
              color: 0x00ff22,
            });
            continue;
          }

          if (geoType === "MultiLineString") {
            for (const line of feature.geometry.coordinates) {
              let lineCoords = line.map((coord) =>
                this.featureToCanvasCoordinates(
                  coord,
                  baseTileX,
                  baseTileY,
                  currentTileSize
                )
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
            let outerRingCoords = feature.geometry.coordinates[0].map((coord) =>
              this.featureToCanvasCoordinates(
                coord,
                baseTileX,
                baseTileY,
                currentTileSize
              )
            );
            this.canvas.strokePoly({
              data_array: outerRingCoords,
              color: 0x3499ff,
            }); // Or fillPoly if you want filled polygons

            // Draw inner rings (holes) if present
            for (let i = 1; i < feature.geometry.coordinates.length; i++) {
              let innerRingCoords = feature.geometry.coordinates[i].map(
                (coord) =>
                  this.featureToCanvasCoordinates(
                    coord,
                    baseTileX,
                    baseTileY,
                    currentTileSize
                  )
              );
              this.canvas.strokePoly({
                data_array: innerRingCoords,
                color: 0x3499ff,
              }); // Use a different color if you want to distinguish holes
            }
            continue;
          }

          if (geoType === "MultiPolygon") {
            for (const polygon of feature.geometry.coordinates) {
              // Draw the outer ring of each polygon
              let outerRingCoords = polygon[0].map((coord) =>
                this.featureToCanvasCoordinates(
                  coord,
                  baseTileX,
                  baseTileY,
                  currentTileSize
                )
              );
              this.canvas.strokePoly({
                data_array: outerRingCoords,
                color: 0x00ff99,
              }); // Or fillPoly for filled polygons

              // Draw inner rings (holes) of each polygon if present
              for (let i = 1; i < polygon.length; i++) {
                let innerRingCoords = polygon[i].map((coord) =>
                  this.featureToCanvasCoordinates(
                    coord,
                    baseTileX,
                    baseTileY,
                    currentTileSize
                  )
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

    this.isRendering = false;

    const elapsedTime = Date.now() - startTime;
    logger.info("Render time: ", elapsedTime, "ms");
    this.frametimeCounter.setProperty(ui.prop.TEXT, `${elapsedTime}ms`);
  }
}
