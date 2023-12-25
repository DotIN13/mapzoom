import * as ui from "@zos/ui";
import * as router from "@zos/router";
import {
  onDigitalCrown,
  onKey,
  KEY_SHORTCUT,
  KEY_HOME,
  KEY_EVENT_CLICK,
} from "@zos/interaction";
import { EventBus, px } from "@zos/utils";

import {
  DEBUG,
  DEVICE_HEIGHT,
  DEVICE_WIDTH,
  HALF_HEIGHT,
  TILE_SIZE,
  TILE_EXTENT,
  TILE_GRID_SIZE,
  ZOOM_SPEED_FACTOR,
  PAN_THROTTLING_DELAY,
  ZOOM_THROTTLING_DELAY,
  MAX_DISPLAY_ZOOM,
  STORAGE_SCALE,
  MARKER_GROUP_SIZE,
  MARKER_GROUP_HALF_SIZE,
  MARKER_SIZE,
  MARKER_SIGHT_SIZE,
  SCALE_LENGTH_IN_METERS,
  TILE_WIDTH_IN_METERS,
} from "./globals";
import { logger } from "./logger";
import { TileCache } from "./tile-cache";
import GridIndex from "./grid-index";
import {
  scaleCoordinates,
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
import { scaleBarCoordinates, scaleBarLabel } from "./scale-bar";
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
    initialCenter,
    initialZoom,
    canvasW = 480,
    canvasH = 480,
    displayW = 480,
    displayH = 480
  ) {
    // Dimensions
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.displayW = displayW;
    this.displayH = displayH;

    // Widgets
    this.canvases = canvases;
    this.mainCanvas = 0;

    // Set up initial user marker location
    this.markerXY = { x: canvasW / 2, y: canvasH / 2 };

    // Caches
    this.tileCache = new TileCache(page, this);
    this.renderCache = new Map();
    this.gridIndex = new GridIndex();

    // Read center from pmtiles
    if (this.tileCache.center) {
      initialCenter = this.tileCache.center;
      initialZoom = 7.6;
    }

    this.eventBus = new EventBus();

    this.createWidgets(); // Depends on canvas dimensions

    this.followGPS = false;
    this.geoLocation = undefined;
    this.geoStatus = { status: null, timestamp: Date.now() };

    // Set up initial center
    this.zoom = initialZoom;
    this.center = lonLatToPixelCoordinates(initialCenter, STORAGE_SCALE);
    this.initialCenter = { ...this.center };
    this.canvasCenter = { ...this.center };

    isRendering = false;

    this.addListeners(); // Depends on this.zoom definition
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
    level = Math.min(MAX_DISPLAY_ZOOM, level);
    this._zoom = level;

    this.updateScaleBar();

    this.renderCache.clear();
  }

  get geoLocation() {
    return this._geoLocation || undefined;
  }

  /**
   * @param {Object} lonlat longitude and latitude
   */
  set geoLocation(lonlat) {
    if (!lonlat) return;
    if (isPanning) return; // Do nothing when panning

    this._geoLocation = lonLatToPixelCoordinates(lonlat, STORAGE_SCALE);

    // Do not draw marker if off-screen
    // halfMarker = this.userMarkerProps.radius / 2;
    // if (markerX < -halfMarker || markerX > this.canvasW + halfMarker) return;

    this.updateUserMarker();
  }

  /**
   * @param {Number} angle compass angle
   */
  set compassAngle(angle) {
    if (!angle) return;

    this.userMarkerSight.setProperty(ui.prop.ANGLE, angle);
  }

  get followGPS() {
    return this._followGPS;
  }

  set followGPS(val) {
    this._followGPS = val;

    const exploreButtonSrc = val
      ? "image/explore-96.png"
      : "image/explore-off-96.png";
    this.exploreButton.setProperty(ui.prop.SRC, exploreButtonSrc);

    if (val) {
      this.updateGeoStatus();
      this.geoInterval ||= setInterval(() => this.updateGeoStatus(), 5000);
    } else {
      this.geoInterval && clearInterval(this.geoInterval);
      this.geoInterval = undefined;

      this.exploreButton.setProperty(ui.prop.VISIBLE, true);
      this.exploreButtonAnimated.setProperty(ui.prop.VISIBLE, false);
    }
  }

  updateGeoStatus(newStatus = null) {
    if (newStatus)
      this.geoStatus = { status: newStatus, timestamp: Date.now() };

    // Check if status is stale
    const stale = this.geoStatus.timestamp - Date.now() > 10000;
    if (!newStatus && stale) this.geoStatus.status = false;

    if (!this.followGPS) return;

    const status = this.geoStatus.status;

    this.exploreButton.setProperty(ui.prop.VISIBLE, status === "A");
    this.exploreButtonAnimated.setProperty(ui.prop.VISIBLE, status !== "A");

    const isRunning = this.exploreButtonAnimated.getProperty(
      ui.prop.ANIM_IS_RUNINNG
    );

    logger.debug(status, isRunning);

    if ((status === "A" && !isRunning) || (status !== "A" && isRunning)) return;

    // Toggle animation if not in the right state
    this.exploreButtonAnimated.setProperty(
      ui.prop.ANIM_STATUS,
      isRunning ? ui.anim_status.STOP : ui.anim_status.START
    );
  }

  // Update markerXY based on current geoLocation and canvas center coordinates,
  // then redraw the user marker.
  updateUserMarker() {
    if (this.geoLocation === undefined) return; // Do nothing if no geolocation is available

    const geoLocation = this.getRenderCache("currentGeoLocation");
    const canvasCenter = this.getRenderCache("currentCanvasCenter");
    const offsetX = geoLocation.x - canvasCenter.x;
    const offsetY = geoLocation.y - canvasCenter.y;

    // Update canvas center when following GPS and the marker offset is exceeding the threshold.
    // In this case, update the canvas and draw marker in the center.
    if (this.followGPS && (Math.abs(offsetX) > 40 || Math.abs(offsetY) > 40)) {
      this.updateCenter(this.geoLocation, { redraw: true }); // Must use coordinates scaled with STORAGE_SCALE
      this.markerXY.x = this.canvasW / 2;
      this.markerXY.y = this.canvasH / 2;
    } else {
      // If the map is not following GPS, or the marker offset is within threshold,
      // update user location marker.
      this.markerXY.x = this.canvasW / 2 + offsetX;
      this.markerXY.y = this.canvasH / 2 + offsetY;
    }

    // logger.debug(this.markerXY.x, this.markerXY.y);

    this.userMarker.setProperty(ui.prop.MORE, {
      ...this.userMarkerProps,
      x: px(this.markerXY.x - MARKER_GROUP_HALF_SIZE),
      y: px(this.markerXY.y - MARKER_GROUP_HALF_SIZE),
      alpha: 240,
    });
  }

  getRenderCache(key) {
    if (this.renderCache.has(key)) return this.renderCache.get(key);

    let val = null;

    if (key == "currentCanvasCenter") {
      val = scaleCoordinates(this.canvasCenter, STORAGE_SCALE, this.zoom);
    }

    if (key == "currentGeoLocation") {
      if (this.geoLocation === undefined) return undefined;

      val = scaleCoordinates(this.geoLocation, STORAGE_SCALE, this.zoom);
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

  updateScaleBar(zoom = null) {
    zoom ||= this.zoom;
    zoom = Math.max(0, zoom);
    zoom = Math.min(zoom, 26);

    this.scaleBar?.clear();
    this.scaleBar?.addLine({
      data: scaleBarCoordinates(zoom),
      count: 4,
    });

    const lengthInMeters = SCALE_LENGTH_IN_METERS[Math.round(zoom)];

    this.zoomIndicator?.setProperty(
      ui.prop.TEXT,
      `${scaleBarLabel(lengthInMeters)}`
    );
  }

  createWidgets() {
    // Create user location marker
    // Initialize the marker outside of the viewport
    this.userMarkerProps = {
      x: px(-MARKER_GROUP_HALF_SIZE),
      y: px(-MARKER_GROUP_HALF_SIZE),
      w: px(MARKER_GROUP_SIZE),
      h: px(MARKER_GROUP_SIZE),
      enable: false,
    };

    this.userMarkerCircleProps = {
      x: px(MARKER_GROUP_HALF_SIZE - MARKER_SIZE / 2),
      y: px(MARKER_GROUP_HALF_SIZE - MARKER_SIZE / 2),
      w: px(MARKER_SIZE),
      h: px(MARKER_SIZE),
      alpha: 240,
      auto_scale: true,
      src: "image/user.png",
      enable: false,
    };

    this.userMarkerSightProps = {
      x: px(MARKER_GROUP_HALF_SIZE - MARKER_SIGHT_SIZE / 2),
      y: px(MARKER_GROUP_HALF_SIZE - MARKER_SIGHT_SIZE / 2),
      w: px(MARKER_SIGHT_SIZE),
      h: px(MARKER_SIGHT_SIZE),
      center_x: px(MARKER_SIGHT_SIZE / 2),
      center_y: px(MARKER_SIGHT_SIZE / 2),
      auto_scale: true,
      src: "image/user-sight.png",
      angle: 0,
      enable: false,
    };

    this.userMarker = ui.createWidget(ui.widget.GROUP, this.userMarkerProps);
    this.userMarkerSight = this.userMarker.createWidget(
      ui.widget.IMG,
      this.userMarkerSightProps
    );
    this.userMarker.createWidget(ui.widget.IMG, this.userMarkerCircleProps);

    // Map scale indicator
    this.scaleBarProps = {
      x: px(35 - 1), // Left margin; substract 1 to avoid clipping
      y: px((DEVICE_HEIGHT - 20) / 2), // Top margin
      w: px(120), // Width
      h: px(20), // Height
      line_color: 0xdedede,
      line_width: 2,
    };

    this.scaleBar = ui.createWidget(
      ui.widget.GRADKIENT_POLYLINE,
      this.scaleBarProps
    );

    // Text indicator below the scale bar
    this.zoomIndicatorProps = {
      x: px(35), // Left margin; same as scale bar
      y: px(DEVICE_HEIGHT / 2 + 10),
      w: px(120),
      h: px(20),
      align_h: ui.align.LEFT,
      align_v: ui.align.CENTER_V,
      text_size: 16,
      color: 0xefefef,
      enable: false,
    };

    this.zoomIndicator = ui.createWidget(
      ui.widget.TEXT,
      this.zoomIndicatorProps
    );

    // Create a sliding arc below all buttons
    const sliderTrackPadding = 85;
    this.sliderTrackProps = {
      x: px(sliderTrackPadding / 2),
      y: px(sliderTrackPadding / 2),
      w: px(480 - sliderTrackPadding),
      h: px(480 - sliderTrackPadding),
      start_angle: -88,
      end_angle: 88,
      color: 0xcde5ff,
      line_width: 14,
    };

    this.sliderTrack = ui.createWidget(ui.widget.ARC, this.sliderTrackProps);
    this.sliderTrack.setProperty(ui.prop.VISIBLE, false); // Slider invisible by default

    // Create Download Button
    const downloadCenterX = Math.sin((30 * Math.PI) / 180) * (240 - 53) + 240;
    const downloadCenterY = Math.cos((30 * Math.PI) / 180) * (240 - 53) + 240;

    this.downloadButtonProps = {
      // Place the download button at 5 o'clock
      x: px(downloadCenterX - 52 / 2 - 1),
      y: px(downloadCenterY - 52 / 2 - 0.5),
      w: px(52),
      h: px(52),
      auto_scale: true,
      src: "image/download-96.png",
      enable: true,
    };

    this.downloadButtonBg = ui.createWidget(ui.widget.CIRCLE, {
      center_x: downloadCenterX,
      center_y: downloadCenterY,
      radius: 36,
      color: 0xEBF1FF,
      alpha: 80,
    });

    this.downloadButton = ui.createWidget(
      ui.widget.IMG,
      this.downloadButtonProps
    );

    // Create Explore Button
    const exploreCenterX = Math.sin((60 * Math.PI) / 180) * (240 - 53) + 240;
    const exploreCenterY = Math.cos((60 * Math.PI) / 180) * (240 - 53) + 240;

    this.exploreButtonGroupProps = {
      x: px(exploreCenterX - 72 / 2),
      y: px(exploreCenterY - 72 / 2),
      w: px(72),
      h: px(72),
      enable: true,
    };

    this.exploreButtonGroup = ui.createWidget(
      ui.widget.GROUP,
      this.exploreButtonGroupProps
    );

    this.exploreButtonProps = {
      // Place the download button at 4 o'clock
      x: px(36 - 46 / 2 - 1),
      y: px(36 - 46 / 2),
      w: px(46),
      h: px(46),
      auto_scale: true,
      src: "image/explore-96.png",
      enable: true,
    };

    this.exploreButtonBg = this.exploreButtonGroup.createWidget(
      ui.widget.CIRCLE,
      {
        center_x: 36,
        center_y: 36,
        radius: 36,
        color: 0xEBF1FF,
        alpha: 80,
      }
    );

    this.exploreButton = this.exploreButtonGroup.createWidget(
      ui.widget.IMG,
      this.exploreButtonProps
    );

    this.exploreButtonAnimated = ui.createWidget(ui.widget.IMG_ANIM, {
      anim_path: "image/explore-46-anim",
      anim_prefix: "frame",
      anim_ext: "png",
      anim_fps: 22,
      anim_size: 30,
      repeat_count: 0,
      anim_status: ui.anim_status.STOP,
      x: this.exploreButtonGroupProps.x + this.exploreButtonProps.x,
      y: this.exploreButtonGroupProps.y + this.exploreButtonProps.y,
    });

    // Zoom button
    // Create Explore Button
    const zoomCenterX = 240 - 53 - 36 + 240;
    const zoomCenterY = 240 - 72 / 2;

    this.zoomButtonGroupProps = {
      x: px(zoomCenterX),
      y: px(zoomCenterY),
      w: px(72),
      h: px(72),
      enable: true,
    };

    this.zoomButtonGroup = ui.createWidget(
      ui.widget.GROUP,
      this.zoomButtonGroupProps
    );

    this.zoomButtonProps = {
      // Place the download button at 4 o'clock
      x: px(36 - 46 / 2 - 0.5),
      y: px(36 - 46 / 2 - 0.5),
      w: px(46),
      h: px(46),
      auto_scale: true,
      src: "image/zoom-96.png",
      enable: false, // No direct interactions with the button
    };

    this.zoomButtonBgProps = {
      center_x: 36,
      center_y: 36,
      radius: 36,
      color: 0xEBF1FF,
      alpha: 80,
    };

    this.zoomButtonBg = this.zoomButtonGroup.createWidget(
      ui.widget.CIRCLE,
      this.zoomButtonBgProps
    );

    this.zoomButton = this.zoomButtonGroup.createWidget(
      ui.widget.IMG,
      this.zoomButtonProps
    );

    // Place trackpad above all other widgets
    this.trackpadProps = {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      radius: 0,
      alpha: 0,
      color: 0xffffff,
    };

    this.trackpad = ui.createWidget(ui.widget.FILL_RECT, this.trackpadProps);
  }

  addListeners() {
    let isPanning = false;
    let isGesture = false;
    let isZooming = false; // Zooming with button
    let lastPosition = null;
    let dragTrace = { x: [], y: [] };

    let lastZoomUpdate = null;
    let wheelDegrees = 0;
    let zoomTimeout = null;

    function zoomDelta(e, zoom) {
      // When finger moving up, y goes smaller, but we need the delta to grow larger
      let delta = -(e.y - DEVICE_HEIGHT / 2) / (DEVICE_HEIGHT / 2 - 35); // Deduct the slider padding
      delta = Math.max(-1, delta);
      delta = Math.min(1, delta);

      const angleDelta = -90 * delta;

      if (delta > 0) {
        delta = (MAX_DISPLAY_ZOOM - zoom) * delta;
      } else {
        delta = zoom * delta;
      }
      return { delta, angleDelta };
    }

    function moveZoomButton(
      angleDelta,
      widgetProps,
      buttonGroup,
      buttonBgProps,
      buttonBg
    ) {
      const circleCenterX = DEVICE_WIDTH / 2; // Center X coordinate of the circle (watch screen)
      const circleCenterY = DEVICE_HEIGHT / 2; // Center Y coordinate of the circle (watch screen)
      const radius = circleCenterX - 53; // Radius of the circle (slightly less than half the screen width)
      const buttonWidth = widgetProps.w; // Width of the button

      // Convert angleDelta from degrees to radians
      const radians = (angleDelta * Math.PI) / 180;

      // Calculate new position of the button
      // We adjust by 90 degrees (Math.PI / 2 radians) to start from the bottom of the screen
      const newX = circleCenterX + radius * Math.cos(radians) - buttonWidth / 2;
      const newY = circleCenterY + radius * Math.sin(radians) - buttonWidth / 2;

      // Update zoom button properties
      buttonGroup.setProperty(ui.prop.MORE, {
        ...widgetProps,
        x: px(newX),
        y: px(newY),
      });

      buttonBg.setProperty(ui.prop.MORE, {
        ...buttonBgProps,
        color: 0x005fae,
        alpha: 200,
      });
    }

    // Handle crown wheel zooming
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
          this.updateScaleBar(newZoom);

          if (zoomTimeout) clearTimeout(zoomTimeout);
          zoomTimeout = setTimeout(() => {
            // If the wheel is still spinning, don't update the zoom level
            if (wheelDegrees == 0) return;

            const currentTime = Date.now();
            if (currentTime - lastZoomUpdate < ZOOM_THROTTLING_DELAY) return;

            wheelDegrees = 0;

            // Update zoom level
            this.zoomAndRedraw(wheelDegrees * ZOOM_SPEED_FACTOR);
          }, ZOOM_THROTTLING_DELAY + 1);
        }
      },
    });

    // Handle shortcut key GPS following
    onKey({
      callback: (key, keyEvent) => {
        if (isRendering) return;

        if (key == KEY_SHORTCUT && keyEvent === KEY_EVENT_CLICK) {
          this.followGPS = true;
          this.updateUserMarker();
          return true;
        }

        return false;
      },
    });

    // Trackpad panning
    this.trackpad.addEventListener(ui.event.CLICK_DOWN, (e) => {
      if (isRendering) return;

      // Determine if a button is clicked
      let res = false;

      res = this.buttonOnClick(e, this.downloadButtonProps, () =>
        router.replace({ url: "page/gt/map-transfer/index.page" })
      );
      if (res) return;

      res = this.buttonOnClick(e, this.exploreButtonGroupProps, () => {
        this.followGPS = !this.followGPS;
        this.updateUserMarker();
      });
      if (res) return;

      // If no button clicked, move on to drag tracing
      dragTrace.x.push(e.x);
      dragTrace.y.push(e.y);

      // Determine if the user is performing a gesture
      if (
        Math.sqrt((e.x - HALF_HEIGHT) ** 2 + (e.y - HALF_HEIGHT) ** 2) >
        HALF_HEIGHT - 30
      ) {
        isGesture = true;
        return;
      }

      this.toggleAllButtons(false); // Disable all buttons to avoid interference with panning or zooming

      // Determine if the user is pressing the zoom button
      isZooming = this.buttonOnClick(e, this.zoomButtonGroupProps, () => {
        this.sliderTrack.setProperty(ui.prop.VISIBLE, true);
        this.downloadButton.setProperty(ui.prop.VISIBLE, false);
        this.downloadButtonBg.setProperty(ui.prop.VISIBLE, false);
        this.exploreButtonGroup.setProperty(ui.prop.VISIBLE, false);
      });
      if (isZooming) return;

      // last position is only useful for panning
      lastPosition = { x: e.x, y: e.y };

      // Otherwise, user is panning
      isPanning = true;
      this.followGPS = false;
    });

    this.trackpad.addEventListener(ui.event.MOVE, (e) => {
      if (isRendering) return;

      dragTrace.x.push(e.x);
      dragTrace.y.push(e.y);
      if (isGesture) return; // Do nothing else if gesture

      const currentTime = Date.now();
      this.lastCenterUpdate ||= Date.now();
      if (currentTime - this.lastCenterUpdate < PAN_THROTTLING_DELAY) return;

      // If zooming
      if (isZooming) {
        // When zooming, update the scale bar according to the distance
        // between the current position and the center.
        let { delta, angleDelta } = zoomDelta(e, this.zoom);
        this.updateScaleBar(this.zoom + delta);
        moveZoomButton(
          angleDelta,
          this.zoomButtonGroupProps,
          this.zoomButtonGroup,
          this.zoomButtonBgProps,
          this.zoomButtonBg
        );
        return;
      }

      // If panning
      // Update center without immediate rendering
      this.updateCenter(this.newCenter(e, lastPosition), { redraw: false });

      // If panning, log current position
      this.lastCenterUpdate = currentTime;
      lastPosition = { x: e.x, y: e.y };
    });

    this.trackpad.addEventListener(ui.event.CLICK_UP, (e) => {
      if (isRendering) return;

      // If gesture
      if (
        isGesture &&
        dragTrace.x[0] > DEVICE_WIDTH * 0.8 &&
        e.x < DEVICE_WIDTH * 0.4
      ) {
        return router.replace({ url: "page/gt/map-transfer/index.page" });
      }

      dragTrace = { x: [], y: [] };

      // If panning
      if (isPanning) {
        this.updateCenter(this.center, { redraw: true });
        this.updateUserMarker();
      }

      // If zooming
      if (isZooming) {
        this.sliderTrack.setProperty(ui.prop.VISIBLE, false);
        this.downloadButton.setProperty(ui.prop.VISIBLE, true);
        this.downloadButtonBg.setProperty(ui.prop.VISIBLE, true);
        this.exploreButtonGroup.setProperty(ui.prop.VISIBLE, true);

        // Revert to original zoom button position
        this.zoomButtonGroup.setProperty(
          ui.prop.MORE,
          this.zoomButtonGroupProps
        );
        this.zoomButtonBg.setProperty(ui.prop.MORE, this.zoomButtonBgProps);

        const { delta } = zoomDelta(e, this.zoom);
        this.zoomAndRedraw(delta);
      }

      this.toggleAllButtons(true); // Restore button functionalities

      isPanning = false;
      isGesture = false;
      isZooming = false;
      lastPosition = null;
    });

    this.eventBus.on("render", (clear) => this.nextTile(clear));
  }

  // Determine if the given button is clicked
  buttonOnClick(event, buttonProps, callback = undefined) {
    const buttonX = buttonProps.x;
    const buttonY = buttonProps.y;
    const buttonW = buttonProps.w;
    const buttonH = buttonProps.h;
    const padding = 10;

    if (
      event.x < buttonX - padding ||
      event.x > buttonX + buttonW + padding ||
      event.y < buttonY - padding ||
      event.y > buttonY + buttonH + padding
    ) {
      return false;
    }

    if (callback) callback();
    return true;
  }

  toggleAllButtons(enable = false) {
    this.downloadButton.setEnable(enable);
    this.exploreButton.setEnable(enable);
  }

  newCenter(moveEvent, lastPosition) {
    let delta = {
      x: moveEvent.x - lastPosition.x,
      y: moveEvent.y - lastPosition.y,
    };
    delta = scaleCoordinates(delta, this.zoom, STORAGE_SCALE);

    return {
      x: this.center.x - delta.x,
      y: this.center.y - delta.y,
    };
  }

  /**
   * Update center based on given Web Mercator pixel coordinates.
   * @param {Object} newCenter - New center coordinates in Web Mercator pixel format, must be scaled with STORAGE_SCALE.
   */
  updateCenter(newCenter, opts = { redraw: false }) {
    if (isRendering) return;

    // The new screen center,
    // offset will be calculated between this and the canvas center
    this.center = newCenter;

    // When updating center during panning,
    // move the canvases and markers and do nothing else.
    if (!opts.redraw) {
      let offset = this.calculateOffset();
      offset = scaleCoordinates(offset, STORAGE_SCALE, this.zoom);
      this.moveCanvas(this.mainCanvas, offset);
      this.moveCanvas(this.textCanvas, offset);
      this.moveUserMarker(offset);
      return;
    }

    // When updating center after panning, initialize a full redraw.
    // Set the canvas center to the current view center.
    this.canvasCenter = { ...newCenter };
    this.renderCache.delete("currentCanvasCenter");

    this.toggleCanvas(); // Render on the other canvas

    // Move the now main canvas to screen center,
    // and keep the alt canvas in its place.
    this.moveCanvas(this.mainCanvas, { x: 0, y: 0 });
    this.render(); // Always clear canvas before full redraw
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
    if (this.geoLocation === undefined) return;

    this.userMarker.setProperty(ui.prop.MORE, {
      ...this.userMarkerProps,
      x: px(this.markerXY.x + offset.x - MARKER_GROUP_HALF_SIZE),
      y: px(this.markerXY.y + offset.y - MARKER_GROUP_HALF_SIZE),
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
      canvasCenter = scaleCoordinates(this.canvasCenter, STORAGE_SCALE, zoom);
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

  zoomAndRedraw(delta) {
    if (Math.abs(delta) < 0.1) return;

    this.zoom += delta;

    // When zooming, toggle canvas to render on the off-screen canvas
    this.toggleCanvas();
    this.render(true);

    this.updateUserMarker();
  }

  render(clear = false) {
    if (isRendering) return; // Prevent multiple renders

    // Set render indicators
    isRendering = true;
    this.trackpad.setEnable(false);
    const startTime = Date.now();

    try {
      this.commitRender(clear);
    } catch (e) {
      logger.error(e);
    }

    isRendering = false;

    const elapsedTime = Date.now() - startTime;
    if (DEBUG) logger.debug(`Render started in ${elapsedTime}ms`);
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

    this.eventBus.emit("render", clear);
  }

  // Eventbus callback, render the next tile in the queue
  nextTile(clear = false) {
    if (this.queue.length === 0) {
      // logger.debug(JSON.stringify(textItems));
      this.outcastCanvas(this.altCanvas);
      this.altCanvas.clear(this.defaultCanvasStyle);
      this.moveCanvas(this.mainCanvas, { x: 0, y: 0 });

      // Draw text after all tiles are rendered
      this.drawText();

      this.trackpad.setEnable(true);
      return;
    }

    const tileQuery = this.queue.pop();
    this.tileCache.getTile(tileQuery).then((tileData) => {
      this.renderTile(tileData, tileQuery, clear);
    });
  }

  renderTile(tileData, tileQuery, clear = false) {
    if (clear) this.mainCanvas.clear(this.defaultCanvasStyle);

    // Return if no tile data was available
    if (!tileData) return this.eventBus.emit("render", false);

    const tileSize = this.getRenderCache("currentTileSize");
    const canvasCenter = this.getRenderCache("currentCanvasCenter");

    const layerTemp = new Layer();
    const featureTemp = new Feature();
    const featPropsTemp = {};

    const visibleSectors = getVisibleSectors(
      tileQuery.tileBB,
      tileQuery.viewBB,
      TILE_GRID_SIZE
    );

    coordCache.baseTile.x =
      tileQuery.x * tileSize - (canvasCenter.x - this.canvasW / 2);
    coordCache.baseTile.y =
      tileQuery.y * tileSize - (canvasCenter.y - this.canvasH / 2);

    // Iterate through features in the decoded tile and draw them
    for (let i = 0; i < tileData.layersLength(); i++) {
      const layer = tileData.layers(i, layerTemp);

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

    this.eventBus.emit("render", false);
  }
}
