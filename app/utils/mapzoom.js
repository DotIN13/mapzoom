import * as ui from "@zos/ui";
import {
  onDigitalCrown,
  onKey,
  KEY_DOWN,
  KEY_HOME,
  KEY_EVENT_CLICK,
} from "@zos/interaction";

import {
  TILE_SIZE,
  TILE_EXTENT,
  CACHE_SIZE,
  PAN_SPEED_FACTOR,
  ZOOM_SPEED_FACTOR,
  THROTTLING_DELAY,
} from "./globals";
import { logger } from "./logger";
import { TileCache } from "./mvt";

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

    this.center = initialCenter;
    this.zoom = initialZoom;
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.displayW = displayW;
    this.displayH = displayH;
    this.canvasCenter = { ...initialCenter };

    this.tileCache = new TileCache();

    this.isRendering = false;

    this.initListeners();
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
    level = Math.max(0, level);
    level = Math.min(20, level);
    this._zoom = level;
  }

  initListeners() {
    let isDragging = false;
    let lastPosition = null;

    onDigitalCrown({
      callback: (key, degree) => {
        logger.debug(`Digital crown callback: ${key}, ${degree}`);
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
      lastPosition = null;
      this.updateCenter(this.center, { redraw: true });
    });

    this.trackpad.addEventListener(ui.event.MOVE, (e) => {
      if (!isDragging || !lastPosition) return;

      // logger.debug("MOVE");

      const currentTime = Date.now();
      // Throttle updates to 25 times per second
      if (currentTime - this.lastCenterUpdate < THROTTLING_DELAY) return;

      const deltaX = e.x - lastPosition.x;
      const deltaY = e.y - lastPosition.y;

      const newCenter = {
        x: this.center.x - deltaX,
        y: this.center.y - deltaY,
      };
      this.updateCenter(newCenter, { redraw: false }); // Update center without immediate rendering

      lastPosition = { x: e.x, y: e.y };

      this.lastCenterUpdate = currentTime;
    });
  }

  /**
   * Update center based on given Web Mercator pixel coordinates.
   * @param {Object} newCenter - New center coordinates in Web Mercator pixel format.
   */
  updateCenter(newCenter, opts = { redraw: false }) {
    this.center = newCenter;

    const offset = this.calculateOffset();
    if (!opts.redraw) return this.moveCanvas(offset);

    this.canvasCenter = { ...newCenter };
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
    logger.debug(
      "Calculating viewport tiles, center: ",
      this.center,
      this.canvasCenter
    );

    const halfCanvasW = this.canvasW / 2;
    const halfCanvasH = this.canvasH / 2;

    const startX = this.canvasCenter.x - halfCanvasW;
    const startY = this.canvasCenter.y - halfCanvasH;

    const endX = this.canvasCenter.x + halfCanvasW;
    const endY = this.canvasCenter.y + halfCanvasH;

    const startTileX = Math.floor(startX / TILE_SIZE);
    const startTileY = Math.floor(startY / TILE_SIZE);
    const endTileX = Math.floor(endX / TILE_SIZE);
    const endTileY = Math.floor(endY / TILE_SIZE);

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
  featureToCanvasCoordinates(coord, baseTileX, baseTileY) {
    // Translate world coordinates to our canvas space, taking the canvas center into account
    return { x: baseTileX + coord[0], y: baseTileY + coord[1] };
  }

  /**
   * Filters out coordinates based on their relation to the canvas.
   * @param {Array} coordinates - An array of {x, y} objects representing coordinates.
   * @param {string} geometryType - Type of the feature ('Point', 'MultiPoint', 'LineString', etc.).
   * @returns {Array} - An array of {x, y} objects to be drawn on the canvas.
   */
  filterCanvasCoordinates(coordinates, geometryType) {
    return coordinates;

    // Object to cache the results of canvas boundary checks
    const cache = {};

    // Check if a point is within the canvas boundaries and cache the result
    const isInsideCanvas = (arr, index) => {
      // Return cached result if available
      if (index in cache) return cache[index];

      const point = arr[index];
      const result =
        point.x >= 0 &&
        point.x <= this.canvasW &&
        point.y >= 0 &&
        point.y <= this.canvasH;

      // Store the result in the cache
      cache[index] = result;

      return result;
    };

    // If it's Point/MultiPoint, simply return coordinates inside the canvas
    if (geometryType === "Point" || geometryType === "MultiPoint") {
      return coordinates.filter((coord, index) =>
        isInsideCanvas(coordinates, index)
      );
    }

    // For other feature types
    return coordinates.filter((_, index, arr) => {
      // Always keep the coordinate if it's inside the canvas
      if (isInsideCanvas(arr, index)) return true;

      // If it's the first coordinate, only check the next one
      if (index === 0) return isInsideCanvas(arr, index + 1);

      // If it's the last coordinate, only check the previous one
      if (index === arr.length - 1) return isInsideCanvas(arr, index - 1);

      // For coordinates in between, if both neighbors are outside the canvas, drop the coordinate
      return isInsideCanvas(arr, index - 1) || isInsideCanvas(arr, index + 1);
    });
  }

  render() {
    if (this.isRendering) return; // Prevent multiple renders

    this.isRendering = true;
    const startTime = Date.now();

    // First, calculate the tiles intersecting with the viewport
    const tiles = this.calculateViewportTiles();
    logger.debug(tiles.length, "tiles found.");

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
      logger.debug("Drawing tile: ", tile.x, tile.y);

      // Convert the byte range to decoded mvt json
      const decodedTile = this.tileCache.getTile(
        Math.floor(this.zoom),
        tile.x,
        tile.y
      );

      if (!decodedTile) continue;

      const baseTileX =
        tile.x * TILE_SIZE - (this.canvasCenter.x - this.canvasW / 2);
      const baseTileY =
        tile.y * TILE_SIZE - (this.canvasCenter.y - this.canvasH / 2);

      // Iterate through features in the decoded tile and draw them
      for (const layer of decodedTile.layers) {
        // logger.debug(layer.name);

        // Iterate through features in the layer
        for (let feature of layer.features) {
          // logger.debug(JSON.stringify(feature.properties.name));

          const geoType = feature.geometry.type;
          switch (geoType) {
            case "Point":
              let pointCoord = this.featureToCanvasCoordinates(
                feature.geometry.coordinates,
                baseTileX,
                baseTileY
              );
              pointCoord = this.filterCanvasCoordinates(pointCoord, geoType);
              this.canvas.drawPixel({ ...pointCoord, color: 0xffffff });
              break;

            case "MultiPoint":
              feature.geometry.coordinates.forEach((coord) => {
                let pointCoord = this.featureToCanvasCoordinates(
                  coord,
                  baseTileX,
                  baseTileY
                );
                pointCoord = this.filterCanvasCoordinates(pointCoord, geoType);
                this.canvas.drawPixel({ ...pointCoord, color: 0xffffff });
              });
              break;

            case "LineString":
              let lineCoords = feature.geometry.coordinates.map((coord) =>
                this.featureToCanvasCoordinates(coord, baseTileX, baseTileY)
              );
              lineCoords = this.filterCanvasCoordinates(lineCoords, geoType);
              this.canvas.strokePoly({
                data_array: lineCoords,
                color: 0x00ff22,
              });
              break;

            case "MultiLineString":
              feature.geometry.coordinates.forEach((line) => {
                let lineCoords = line.map((coord) =>
                  this.featureToCanvasCoordinates(coord, baseTileX, baseTileY)
                );
                lineCoords = this.filterCanvasCoordinates(lineCoords, geoType);
                this.canvas.strokePoly({
                  data_array: lineCoords,
                  color: 0x444444,
                });
              });
              break;

            case "Polygon":
              // Only draw the outer ring. If inner rings (holes) are present, they need to be considered differently.
              let outerRingCoords = feature.geometry.coordinates[0].map(
                (coord) =>
                  this.featureToCanvasCoordinates(coord, baseTileX, baseTileY)
              );
              outerRingCoords = this.filterCanvasCoordinates(
                outerRingCoords,
                geoType
              );
              this.canvas.strokePoly({
                data_array: outerRingCoords,
                color: 0x3499ff,
              }); // Or fillPoly if you want filled polygons
              break;

            case "MultiPolygon":
              feature.geometry.coordinates.forEach((polygon) => {
                let outerRingCoords = polygon[0].map((coord) =>
                  this.featureToCanvasCoordinates(coord, baseTileX, baseTileY)
                );
                outerRingCoords = this.filterCanvasCoordinates(
                  outerRingCoords,
                  geoType
                );
                this.canvas.strokePoly({
                  data_array: outerRingCoords,
                  color: 0x00ff99,
                }); // Or fillPoly for filled polygons
              });
              break;

            default:
              console.warn(
                `Unsupported feature type: ${feature.geometry.type}`
              );
          }
        }
      }
    }

    this.isRendering = false;

    const elapsedTime = Date.now() - startTime;
    logger.debug("Render time: ", elapsedTime, "ms");
    this.frametimeCounter.setProperty(ui.prop.TEXT, `${elapsedTime}ms`);
  }
}
