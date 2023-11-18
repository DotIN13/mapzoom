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
import { TileCache } from "./tile-cache";
import {
  scaleCoordinates,
  roundToPrecision,
  lonLatToPixelCoordinates,
} from "./coordinates";
import { mapStyle } from "./map-style";
import { parsePoint, parseLineString, parsePolygon } from "./geometry";
import { CoordCache } from "./coord-cache";
import { GeomType, Feature, Layer } from "./vector-tile-js/vector-tile";

let isRendering = false; // Global Render Indicator
let coordCache = new CoordCache();

function mapPointCoords(geometry, begin, cache) {
  let x = cache.cache[geometry[begin] + 128];
  let y = cache.cache[geometry[begin + 1] + 128];

  if (isNaN(x)) x = (geometry[begin] / TILE_EXTENT) * cache.tileSize;
  if (isNaN(y)) y = (geometry[begin + 1] / TILE_EXTENT) * cache.tileSize;

  return { x: x + cache.baseTile.x, y: y + cache.baseTile.y };
}

function mapLineStringCoords(geometry, range, cache) {
  const [i, j] = range;

  for (let k = i; k < j; k += 2) {
    let x = cache.cache[geometry[k] + 128];
    let y = cache.cache[geometry[k + 1] + 128];

    if (isNaN(x)) x = (geometry[k] / TILE_EXTENT) * cache.tileSize;
    if (isNaN(y)) y = (geometry[k + 1] / TILE_EXTENT) * cache.tileSize;

    geometry[k] = x + cache.baseTile.x;
    geometry[k + 1] = y + cache.baseTile.y;
  }
}

function mapPolygonCoords(geometry, range, cache) {
  const [i, j] = range;

  let ring = [];

  for (let k = i; k < j; k += 2) {
    let x = cache.cache[geometry[k] + 128];
    let y = cache.cache[geometry[k + 1] + 128];

    if (isNaN(x)) x = (geometry[k] / TILE_EXTENT) * cache.tileSize;
    if (isNaN(y)) y = (geometry[k + 1] / TILE_EXTENT) * cache.tileSize;

    ring.push({ x: x + cache.baseTile.x, y: y + cache.baseTile.y });
  }

  return ring;
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
        HALF_HEIGHT - 30
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

    const quadrantSize = this.getRenderCache("currentTileSize") / 2;

    const startQX = Math.floor(startX / quadrantSize);
    const startQY = Math.floor(startY / quadrantSize);
    const endQX = Math.floor(endX / quadrantSize);
    const endQY = Math.floor(endY / quadrantSize);

    const tiles = {};
    // Hardcoded to 4 quadrants per tile
    for (let qX = startQX; qX <= endQX; qX++) {
      for (let qY = startQY; qY <= endQY; qY++) {
        const x = Math.floor(qX / 2);
        const y = Math.floor(qY / 2);
        const key = `${x}-${y}`;
        tiles[key] ||= { x, y, quadrants: 0 };

        const id = (qX % 2) + (qY % 2) * 2;
        tiles[key].quadrants |= 1 << (4 - id - 1);
      }
    }

    return Object.values(tiles);
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

  drawDebugBackground() {
    this.canvas.drawRect({
      x1: 0,
      y1: 0,
      x2: this.canvasW,
      y2: this.canvasH,
      color: 0x292900,
    });
  }

  // Debug: draw tile bounding box
  drawDebugBoundingBox() {
    const tileSize = this.getRenderCache("currentTileSize");
    this.canvas.strokeRect({
      x1: coordCache.baseTile.x,
      y1: coordCache.baseTile.y,
      x2: coordCache.baseTile.x + tileSize,
      y2: coordCache.baseTile.y + tileSize,
      color: 0xffee00,
    });
  }

  drawText(coord, text, textSet, size = 20, color = 0xfefefe) {
    if (!text) return;
    if (textSet.has(text)) return;

    textSet.add(text);

    this.canvas.drawText({
      x: coord.x - (size * text.length) / 2,
      y: coord.y,
      text_size: size,
      color,
      text,
    });
  }

  commitRender() {
    // First, calculate the tiles intersecting with the viewport
    const tiles = this.viewportTiles();

    // Clear canvas before drawing
    this.canvas.clear(this.defaultCanvasStyle);
    this.canvas.setPaint({ color: 0xffff00, line_width: 2 });

    // Background color for debugging purpose
    // this.drawDebugBackground();

    const tileSize = this.getRenderCache("currentTileSize");
    const canvasCenter = this.getRenderCache("currentCanvasCenter");
    coordCache.newCache(tileSize);

    const textSet = new Set();

    const tileZ = Math.floor(this.zoom);

    const layerTemp = new Layer();
    const featureTemp = new Feature();
    const featPropsTemp = {};

    // For each tile, interpolate the pixel coordinates of the features and draw them on the canvas.
    for (const tile of tiles) {
      // Get tile from cache or PMTiles file
      const tileObj = this.tileCache.getTile(tileZ, tile.x, tile.y);
      if (!tileObj) continue;

      coordCache.baseTile.x =
        tile.x * tileSize - (canvasCenter.x - this.canvasW / 2);
      coordCache.baseTile.y =
        tile.y * tileSize - (canvasCenter.y - this.canvasH / 2);

      // Iterate through features in the decoded tile and draw them
      for (let i = 0; i < tileObj.layersLength(); i++) {
        const layer = tileObj.layers(i, layerTemp);

        const layerName = layer.name();
        const styleBuilder = mapStyle[layerName];

        // Iterate through features in the layer
        for (let j = 0; j < layer.featuresLength(); j++) {
          const feature = layer.features(j, featureTemp);

          const coverage = feature.coverage();
          if ((coverage & tile.quadrants) === 0) continue;

          featPropsTemp["name"] = feature.name() || feature.nameEn();
          featPropsTemp["pmap:kind"] = feature.pmapKind();
          featPropsTemp["pmap:min_zoom"] = feature.pmapMinZoom();
          const featType = feature.type();
          featPropsTemp["type"] = featType;

          const style = styleBuilder
            ? styleBuilder(this.zoom, featPropsTemp)
            : {};

          this.canvas.setPaint({
            color: style["line-color"] || 0xeeeeee,
            line_width: style["line-width"] || 2,
          });

          const geometry = feature.geometryArray();

          if (featType === GeomType.POINT) {
            for (const pointStart of parsePoint(geometry)) {
              const point = mapPointCoords(geometry, pointStart, coordCache);
              this.canvas.drawCircle({
                center_x: point.x,
                center_y: point.y,
                radius: style["circle-radius"] || 4,
                color: style["fill-color"] || 0xdedede,
              });
            }
            continue;
          }

          if (featType === GeomType.LINESTRING) {
            for (const lineRange of parseLineString(geometry)) {
              mapLineStringCoords(geometry, lineRange, coordCache);
              for (let k = lineRange[0]; k < lineRange[1] - 2; k += 2) {
                this.canvas.drawLine({
                  x1: geometry[k],
                  y1: geometry[k + 1],
                  x2: geometry[k + 2],
                  y2: geometry[k + 3],
                  color: style["line-color"] || 0x444444,
                });
              }
            }
            continue;
          }

          if (featType === GeomType.POLYGON) {
            for (const { ringRange, isExterior } of parsePolygon(geometry)) {
              const coords = mapPolygonCoords(geometry, ringRange, coordCache);
              this.canvas.drawPoly({
                data_array: coords,
                color: style["fill-color"] || 0x3499ff,
              });
            }
            continue;
          }

          logger.warn(`Unsupported feature type: ${featType}`);
        }
      }
    }
  }
}
