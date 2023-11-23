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
  TILE_GRID_SIZE,
  ZOOM_SPEED_FACTOR,
  PAN_THROTTLING_DELAY,
  ZOOM_THROTTLING_DELAY,
  CENTER_STORAGE_SCALE,
} from "./globals";
import { logger } from "./logger";
import { TileCache } from "./tile-cache";
import GridIndex from "./grid-index";
import {
  scaleCoordinates,
  roundToPrecision,
  lonLatToPixelCoordinates,
  getVisibleSectors,
} from "./coordinates";
import { mapStyle } from "./map-style";
import {
  parsePoint,
  parseLineString,
  parsePolygon,
  mapPointCoords,
  mapLineStringCoords,
  mapPolygonCoords,
} from "./geometry";
import { CoordCache } from "./coord-cache";
import { GeomType, Feature, Layer } from "./vector-tile-js/vector-tile";

let isRendering = false; // Global Render Indicator
let coordCache = new CoordCache();
let textItems = {};

/**
 * Three canvases setup.
 * When panning, the alt canvas should now be off-screen. Move the main canvas along finger movements.
 * On end of user input, move alt canvas to center, toggle main canvas, render on the current main canvas.
 * Then cast the alt canvas back off-screen.
 *
 * When zooming, the alt canvas is off-screen. Directly render new canvas on alt canvas, then move it to center.
 * Toggle main canvas, move alt canvas off-screen.
 */

export class ZoomMap {
  constructor(
    page,
    canvases,
    trackpad,
    frametimeCounter,
    initialCenter,
    initialZoom,
    canvasW = 480,
    canvasH = 480,
    displayW = 480,
    displayH = 480
  ) {
    this.canvases = canvases;
    this.mainCanvas = 0;

    this.tileCache = new TileCache(page);
    this.renderCache = new Map();
    this.gridIndex = new GridIndex();

    this.trackpad = trackpad;
    this.frametimeCounter = frametimeCounter;
    this.createWidgets();

    this.followGPS = false;
    this.geoLocation = null;

    // Set up initial center
    this.zoom = initialZoom;
    this.center = lonLatToPixelCoordinates(initialCenter, CENTER_STORAGE_SCALE);
    this.initialCenter = { ...this.center };
    this.canvasCenter = { ...this.center };

    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.displayW = displayW;
    this.displayH = displayH;

    isRendering = false;

    this.bindWidgets();
  }

  get mainCanvas() {
    return this.canvases[this._canvasIndex];
  }

  get altCanvas() {
    return this.canvases[this._canvasIndex === 0 ? 1 : 0];
  }

  get textCanvas() {
    return this.canvases[2];
  }

  set mainCanvas(val) {
    this._canvasIndex = val;
  }

  toggleCanvas() {
    this.mainCanvas = this._canvasIndex === 0 ? 1 : 0;
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
    return this._geoLocation || null;
  }

  /**
   * @param {Object} lonlat longitude and latitude
   */
  set geoLocation(lonlat) {
    if (!lonlat) return;

    this._geoLocation = lonLatToPixelCoordinates(lonlat, this.zoom);

    const canvasCenter = this.getRenderCache("currentCanvasCenter");
    const offsetX = this._geoLocation.x - canvasCenter.x;
    const offsetY = this._geoLocation.y - canvasCenter.y;

    // Update user location marker
    const markerX = this.canvasW / 2 + offsetX;
    const markerY = this.canvasH / 2 + offsetY;

    // Update canvas center if following GPS
    if (this.followGPS && (Math.abs(offsetX) > 40 || Math.abs(offsetY) > 40)) {
      this.updateCenter(this._geoLocation, { redraw: true });
    }

    // Do not draw marker if off-screen
    // halfMarker = this.userMarkerProps.radius / 2;
    // if (markerX < -halfMarker || markerX > this.canvasW + halfMarker) return;

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

    if (key == "currentCanvasCenter") {
      val = scaleCoordinates(
        this.canvasCenter,
        CENTER_STORAGE_SCALE,
        this.zoom
      );
    }

    if (key == "currentTileSize") {
      const maxZoom = this.tileCache.maxZoom;
      const tileZoom =
        this.zoom > maxZoom ? Math.floor(maxZoom) : Math.floor(this.zoom);

      val = TILE_SIZE * Math.pow(2, this.zoom - tileZoom);
    }

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

            // When zooming in, toggle canvas to render on the off-screen canvas
            this.toggleCanvas();
            this.render(true);
          }, ZOOM_THROTTLING_DELAY + 1);
        }
      },
    });

    onKey({
      callback: (key, keyEvent) => {
        if (isRendering) return;

        if (key == KEY_SHORTCUT && keyEvent === KEY_EVENT_CLICK) {
          this.followGPS = true;
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

      // Update center without immediate rendering
      this.updateCenter(this.newCenter(e, lastPosition), { redraw: false });

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

    // During panning, move both main and text canvas
    if (!opts.redraw) {
      let offset = this.calculateOffset();
      offset = scaleCoordinates(offset, CENTER_STORAGE_SCALE, this.zoom);
      this.moveCanvas(this.mainCanvas, offset);
      this.moveCanvas(this.textCanvas, offset);
      this.moveUserMarker(offset);
      return;
    }

    // After panning, initialize a redraw
    this.canvasCenter = { ...newCenter };
    this.renderCache.delete("currentCanvasCenter");

    this.toggleCanvas(); // Render on the other canvas
    this.moveCanvas(this.mainCanvas, { x: 0, y: 0 }); // Move the now main canvas to screen center
    this.render();

    // Keep the alt canvas in its original location
  }

  outcastCanvas(canvas) {
    this.moveCanvas(canvas, { x: -DEVICE_WIDTH, y: -DEVICE_HEIGHT });
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

  moveCanvas(canvas, offset) {
    const originalX = this.displayH / 2 - this.canvasH / 2;
    const originalY = this.displayW / 2 - this.canvasW / 2;

    canvas.setProperty(ui.prop.MORE, {
      x: originalX + offset.x,
      y: originalY + offset.y,
      w: this.canvasW,
      h: this.canvasH,
    });
  }

  moveUserMarker(offset) {
    if (this.geoLocation === null) return;

    this.userMarker.setProperty(ui.prop.MORE, {
      ...this.userMarkerProps,
      center_x: this.geoLocation.x + offset.x,
      center_y: this.geoLocation.y + offset.y,
      alpha: 240,
    });
  }

  /**
   * Calculate the tiles covering the viewport based on the center pixel.
   * @returns {Array} - An array of tiles covering the viewport.
   */
  viewportTiles() {
    let canvasCenter, tileSize, z;
    const maxZoom = this.tileCache.maxZoom;
    const halfCanvasW = this.canvasW / 2;
    const halfCanvasH = this.canvasH / 2;

    // Adjust zoom and center based on maxZoom
    if (this.zoom > maxZoom) {
      const tail = this.zoom - Math.floor(this.zoom);
      const zoom = maxZoom + tail;
      canvasCenter = scaleCoordinates(
        this.canvasCenter,
        CENTER_STORAGE_SCALE,
        zoom
      );
      tileSize = TILE_SIZE * Math.pow(2, tail);
      z = Math.floor(maxZoom);
    } else {
      canvasCenter = this.getRenderCache("currentCanvasCenter");
      tileSize = this.getRenderCache("currentTileSize");
      z = Math.floor(this.zoom);
    }

    // Calculate view boundaries
    const viewBB = new Float32Array([
      canvasCenter.x - halfCanvasW,
      canvasCenter.x + halfCanvasW,
      canvasCenter.y - halfCanvasH,
      canvasCenter.y + halfCanvasH,
    ]);

    // Determine tile range
    const startX = Math.floor(viewBB[0] / tileSize);
    const endX = Math.floor(viewBB[1] / tileSize);
    const startY = Math.floor(viewBB[2] / tileSize);
    const endY = Math.floor(viewBB[3] / tileSize);

    const tiles = [];
    let tileX = startX * tileSize;

    for (let x = startX; x <= endX; x++) {
      let tileY = startY * tileSize;

      for (let y = startY; y <= endY; y++) {
        const tileBB = new Float32Array([
          tileX,
          tileX + tileSize, // X bounds
          tileY,
          tileY + tileSize, // Y bounds
        ]);
        tiles.push({ z, x, y, tileBB, viewBB });
        tileY += tileSize;
      }

      tileX += tileSize;
    }

    // logger.debug(JSON.stringify(tiles));

    return tiles;
  }

  drawDebugBackground() {
    this.mainCanvas.drawRect({
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
    this.mainCanvas.strokeRect({
      x1: coordCache.baseTile.x,
      y1: coordCache.baseTile.y,
      x2: coordCache.baseTile.x + tileSize,
      y2: coordCache.baseTile.y + tileSize,
      color: 0xffee00,
    });
  }

  drawText(size = 20, color = 0xfefefe) {
    this.moveCanvas(this.textCanvas, { x: 0, y: 0 });
    this.textCanvas.clear(this.defaultCanvasStyle);

    for (const [text, item] of Object.entries(textItems)) {
      this.textCanvas.drawText({
        x: item.coord.x,
        y: item.coord.y,
        text_size: size,
        color,
        text,
      });
    }
  }

  render(clear = false) {
    if (isRendering) return; // Prevent multiple renders

    // Set render indicators
    isRendering = true;
    const startTime = Date.now();

    try {
      this.commitRender(clear);
    } catch (e) {
      logger.error(e);
    }

    isRendering = false;

    const elapsedTime = Date.now() - startTime;
    this.frametimeCounter.setProperty(ui.prop.TEXT, `${elapsedTime}ms`);
  }

  commitRender(clear = false) {
    // First, calculate the tiles intersecting with the viewport
    this.queue = this.viewportTiles();
    if (this.queue.length === 0) return;

    this.mainCanvas.setPaint({ color: 0xffff00, line_width: 2 });

    const tileSize = this.getRenderCache("currentTileSize");

    coordCache.newCache(tileSize);
    this.gridIndex.clear();
    textItems = {};

    this.renderNextTile(clear);
  }

  renderNextTile(clear = false) {
    const tile = this.queue.pop(); // Render tiles from the queue

    // Draw text after all tiles are rendered
    if (tile === undefined) {
      // logger.debug(JSON.stringify(textItems));
      this.outcastCanvas(this.altCanvas);
      this.altCanvas.clear(this.defaultCanvasStyle);
      this.moveCanvas(this.mainCanvas, { x: 0, y: 0 });

      this.drawText();
      return;
    }

    if (clear) this.mainCanvas.clear(this.defaultCanvasStyle);

    // If there is a tile to render
    this.tileCache.getTile(tile.z, tile.x, tile.y).then((tileObj) => {
      if (!tileObj) return this.renderNextTile(false);

      const tileSize = this.getRenderCache("currentTileSize");
      const canvasCenter = this.getRenderCache("currentCanvasCenter");

      const layerTemp = new Layer();
      const featureTemp = new Feature();
      const featPropsTemp = {};

      const visibleSectors = getVisibleSectors(
        tile.tileBB,
        tile.viewBB,
        TILE_GRID_SIZE
      );

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
          if ((coverage & visibleSectors) === 0) continue;

          // Load properties
          const name = feature.name() || feature.nameEn();
          featPropsTemp["name"] = name;

          const featType = feature.type();
          featPropsTemp["type"] = featType;

          featPropsTemp["pmap:kind"] = feature.pmapKind();
          featPropsTemp["pmap:min_zoom"] = feature.pmapMinZoom();

          const style = styleBuilder
            ? styleBuilder(this.zoom, featPropsTemp)
            : {};

          if (style.visible === false) continue;

          this.mainCanvas.setPaint({
            color: style["line-color"] || 0xeeeeee,
            line_width: style["line-width"] || 2,
          });

          const geometry = feature.geometryArray();

          if (featType === GeomType.POINT) {
            let point, textX, textY;

            for (const pointStart of parsePoint(geometry)) {
              point = mapPointCoords(geometry, pointStart, coordCache);

              const size = style["font-size"] || 20;
              textX = point.x + 8;
              textY = point.y - size - 4;
              if (!this.gridIndex.placeText(name, textX, textY, size)) continue;

              if (name && !(name in textItems)) {
                textItems[name] = {
                  coord: { x: textX, y: textY },
                };
              }

              this.mainCanvas.drawCircle({
                center_x: point.x,
                center_y: point.y,
                radius: style["circle-radius"] || 4,
                color: style["fill-color"] || 0xdedede,
              });
            }

            continue;
          }

          if (featType === GeomType.LINESTRING) {
            const mid = Math.floor(geometry.length / 3);
            let m = Infinity;

            for (const lineRange of parseLineString(geometry)) {
              mapLineStringCoords(geometry, lineRange, coordCache);

              for (let k = lineRange[0]; k < lineRange[1] - 2; k += 2) {
                if (k - mid < m) m = k;

                this.mainCanvas.drawLine({
                  x1: geometry[k],
                  y1: geometry[k + 1],
                  x2: geometry[k + 2],
                  y2: geometry[k + 3],
                  color: style["line-color"] || 0x444444,
                });
              }
            }

            if (name && !(name in textItems)) {
              const size = style["font-size"] || 20;
              const textX = geometry[m] - (size * name.length) / 2;
              const textY = geometry[m + 1];

              if (this.gridIndex.placeText(name, textX, textY, size))
                textItems[name] = {
                  coord: {
                    x: textX,
                    y: textY,
                  },
                };
            }

            continue;
          }

          if (featType === GeomType.POLYGON) {
            for (const { ringRange, isExterior } of parsePolygon(geometry)) {
              const coords = mapPolygonCoords(geometry, ringRange, coordCache);
              this.mainCanvas.drawPoly({
                data_array: coords,
                color: style["fill-color"] || 0x3499ff,
              });
            }
            continue;
          }

          logger.warn(`Unsupported feature type: ${featType}`);
        }
      }

      tileObj = null;

      // Move on to the next tile
      return this.renderNextTile(false);
    });
  }
}
