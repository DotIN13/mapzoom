import * as ui from "@zos/ui";
import {
  onDigitalCrown,
  onKey,
  KEY_DOWN,
  KEY_HOME,
  KEY_EVENT_CLICK,
} from "@zos/interaction";

import { logger } from "./logger";
import { exampleMvt, transformFeature } from "./idx-map.js";

const TILE_SIZE = 512;
const TILE_EXTENT = 4096;

const PAN_SPEED_FACTOR = 1.8; // adjust this value as needed
const ZOOM_SPEED_FACTOR = 0.5; // adjust this value as needed

const THROTTLING_DELAY = 40; // Throttle delay of 50ms

export class Map {
  constructor(
    canvas,
    initialCenter,
    initialZoom,
    canvasW = 480,
    canvasH = 480,
    displayW = 480,
    displayH = 480
  ) {
    this.canvas = canvas;
    this.center = initialCenter;
    this.zoom = initialZoom;
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.displayW = displayW;
    this.displayH = displayH;
    this.canvasCenter = { ...initialCenter };

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

    const fill_rect = ui.createWidget(ui.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: this.displayW,
      h: this.displayH,
      radius: 0,
      alpha: 0,
      color: 0xffffff,
    });

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

    fill_rect.addEventListener(ui.event.CLICK_DOWN, (e) => {
      isDragging = true;
      this.followGPS = false;
      lastPosition = { x: e.x, y: e.y };
    });

    fill_rect.addEventListener(ui.event.CLICK_UP, (e) => {
      isDragging = false;
      lastPosition = null;
      this.updateCenter(this.center, { redraw: true });
    });

    fill_rect.addEventListener(ui.event.MOVE, (e) => {
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

    logger.debug(startTileX, startTileY, endTileX, endTileY);

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
   * @param {number} baseWorldX - Base world X coordinate for the tile's top-left corner.
   * @param {number} baseWorldY - Base world Y coordinate for the tile's top-left corner.
   * @returns {Object} - The interpolated coordinates { x, y } in canvas space.
   */
  featureToCanvasCoordinates(coord, baseWorldX, baseWorldY) {
    if (coord.length !== 2) throw new Error("Invalid coordinate.");

    // Translate world coordinates to our canvas space, taking the canvas center into account
    const canvasX =
      baseWorldX +
      (coord[0] / TILE_EXTENT) * TILE_SIZE -
      (this.canvasCenter.x - this.canvasW / 2);
    const canvasY =
      baseWorldY +
      (coord[1] / TILE_EXTENT) * TILE_SIZE -
      (this.canvasCenter.y - this.canvasH / 2);

    return { x: canvasX, y: canvasY };
  }

  render() {
    if (this.isRendering) return; // Prevent multiple renders

    this.isRendering = true;

    // First, calculate the tiles intersecting with the viewport
    const tiles = this.calculateViewportTiles();

    logger.debug(tiles.length, "tiles found.");

    // Clear canvas before drawing
    this.canvas.clear(this.defaultCanvasStyle);

    this.canvas.setPaint({
      color: 0xffff00,
      line_width: 2,
    });

    // Background color for debugging purpose
    // this.canvas.drawRect({
    //   x1: 0,
    //   y1: 0,
    //   x2: this.canvasW,
    //   y2: this.canvasH,
    //   color: 0x292900,
    // });

    // For each tile, interpolate the pixel coordinates of the features and draw them on the canvas.
    tiles.forEach((tile) => {
      const range = getTileByteRange(tile); // Get the byte range of the tile in the PMTiles file

      if (!range) return;

      logger.debug("Drawing tile: ", tile.x, tile.y);

      // Convert the byte range to decoded mvt json
      const decodedTile = decodeMVT(range); // This is a placeholder. The actual decodeMVT function needs to be implemented.

      const baseWorldX = tile.x * TILE_SIZE;
      const baseWorldY = tile.y * TILE_SIZE;

      // Iterate through features in the decoded tile and draw them
      decodedTile.layers.forEach((layer) => {
        // logger.debug(layer.name);
        layer.features.forEach((feature) => {
          feature = transformFeature(feature, layer);
          // logger.debug(JSON.stringify(feature.properties.name));

          switch (feature.geometry.type) {
            case "Point":
              const pointCoord = this.featureToCanvasCoordinates(
                feature.geometry.coordinates,
                baseWorldX,
                baseWorldY
              );
              this.canvas.drawPixel({ ...pointCoord, color: 0xffffff });
              break;

            case "MultiPoint":
              feature.geometry.coordinates.forEach((coord) => {
                const pointCoord = this.featureToCanvasCoordinates(
                  coord,
                  baseWorldX,
                  baseWorldY
                );
                this.canvas.drawPixel({ ...pointCoord, color: 0xffffff });
              });
              break;

            case "LineString":
              const lineCoords = feature.geometry.coordinates.map((coord) =>
                this.featureToCanvasCoordinates(coord, baseWorldX, baseWorldY)
              );
              this.canvas.strokePoly({
                data_array: lineCoords,
                color: 0x00ff22,
              });
              break;

            case "MultiLineString":
              feature.geometry.coordinates.forEach((line) => {
                const lineCoords = line.map((coord) =>
                  this.featureToCanvasCoordinates(coord, baseWorldX, baseWorldY)
                );
                this.canvas.strokePoly({
                  data_array: lineCoords,
                  color: 0x444444,
                });
              });
              break;

            case "Polygon":
              // Only draw the outer ring. If inner rings (holes) are present, they need to be considered differently.
              const outerRingCoords = feature.geometry.coordinates[0].map(
                (coord) =>
                  this.featureToCanvasCoordinates(coord, baseWorldX, baseWorldY)
              );
              this.canvas.strokePoly({
                data_array: outerRingCoords,
                color: 0x3499ff,
              }); // Or fillPoly if you want filled polygons
              break;

            case "MultiPolygon":
              feature.geometry.coordinates.forEach((polygon) => {
                const outerRingCoords = polygon[0].map((coord) =>
                  this.featureToCanvasCoordinates(coord, baseWorldX, baseWorldY)
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
        });
      });
    });

    this.isRendering = false;
  }
}

/**
 * Map a tile to its byte range in a PMTiles file.
 * @param {Object} tile - Tile coordinates.
 * @returns {Object} - Tile with its byte range.
 */
function getTileByteRange(tile) {
  if (!(tile.x == 857 && tile.y == 418)) return null;

  // Fetch or look up the byte range for the given tile in the PMTiles file.
  // This function is a placeholder and will need actual logic to determine the byte range.
  const byteRange = {}; // TODO: Placeholder for the byte range logic.

  return {
    ...tile,
    byteRange: byteRange,
  };
}

// Placeholder function for decoding MVT
function decodeMVT(byteRange) {
  // Convert the byte range to decoded mvt json.
  // Placeholder function. Actual decoding needs to be done here.
  return exampleMvt();
}
