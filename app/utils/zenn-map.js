import * as ui from "@zos/ui";
import * as router from "@zos/router";
import {
  onDigitalCrown,
  onKey,
  KEY_SHORTCUT,
  KEY_HOME,
  KEY_EVENT_CLICK,
} from "@zos/interaction";
import { EventBus, px, log } from "@zos/utils";
import { getText } from "@zos/i18n";

import {
  DEBUG,
  DEVICE_HEIGHT,
  DEVICE_WIDTH,
  HALF_HEIGHT,
  TILE_SIZE,
  TILE_GRID_SIZE,
  ZOOM_SPEED_FACTOR,
  PAN_THROTTLING_DELAY,
  ZOOM_THROTTLING_DELAY,
  DOUBLE_CLICK_THRESHOLD,
  LONGPRESS_THRESHOLD,
  NOT_MOVING_THRESHOLD,
  MAX_DISPLAY_ZOOM,
  STORAGE_SCALE,
  MARKER_GROUP_SIZE,
  MARKER_GROUP_HALF_SIZE,
  MARKER_SIZE,
  MARKER_SIGHT_SIZE,
  SCALE_LENGTH_IN_METERS,
  GEO_HISTORY_SIZE,
} from "./globals";
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
import ExponentialSpeedCalculator from "./speed-calculator";
import { zoomDelta, moveZoomButton } from "./zoom-button";

import { GeomType, Feature, Layer } from "./vector-tile-js/vector-tile";

const logger = log.getLogger("zenn-map-zenn-map");

let isRendering = false; // Global Render Indicator
let coordCache = new CoordCache();
let textItems = new Map();

/**
 * Three canvases setup.
 * When panning, the alt canvas should now be off-screen. Move the main canvas along finger movements.
 * On end of user input, move alt canvas to center, toggle main canvas, render on the current main canvas.
 * Then cast the alt canvas back off-screen.
 *
 * When zooming, the alt canvas is off-screen. Directly render new canvas on alt canvas, then move it to center.
 * Toggle main canvas, move alt canvas off-screen.
 */

export class ZennMap {
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

    isRendering = false;
    this.renderStart = null;

    // Caches
    this.tileCache = new TileCache(page, this);
    this.renderCache = new Map();
    this.gridIndex = new GridIndex();
    this.speedCalc = new ExponentialSpeedCalculator();

    // Read center from pmtiles
    if (this.tileCache.center) {
      initialCenter = this.tileCache.center;
      initialZoom = 7.6;
    }

    this.eventBus = new EventBus();

    this.createWidgets(); // Depends on canvas dimensions

    // Set up initial center
    this.zoom = initialZoom;
    this.center = lonLatToPixelCoordinates(initialCenter, STORAGE_SCALE);
    this.initialCenter = { ...this.center };
    this.canvasCenter = { ...this.center };

    this.geoStatus = { status: null, timestamp: Date.now() };
    this.geoHistory = [];
    this._geoLocation = undefined;
    this.followGPS = true; // Update explore button, depends on geoStatus

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
    // Always clear cache upon location updates
    this.renderCache.delete("currentGeoLocation");

    this._geoLocation = lonLatToPixelCoordinates(lonlat, STORAGE_SCALE);
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
      this.updateExploreButton();
      this.geoInterval ||= setInterval(() => this.updateExploreButton(), 5000);
    } else {
      this.geoInterval && clearInterval(this.geoInterval);
      this.geoInterval = undefined;

      this.exploreButton.setProperty(ui.prop.VISIBLE, true);
      this.exploreButtonAnimated.setProperty(ui.prop.VISIBLE, false);
    }
  }

  updateGeoStatus(geoStatus) {
    const { status, lon, lat } = geoStatus;

    if (status) {
      this.geoStatus = geoStatus;
      this.geoHistory.push({ ...geoStatus });
      if (this.geoHistory.length > GEO_HISTORY_SIZE) this.geoHistory.shift();
    }

    if (status === "A") {
      const { speed, isValidSpeed } = this.speedCalc.updateLocation(geoStatus);
      if (isValidSpeed) {
        this.geoLocation = { lon, lat };
        this.speedText.setProperty(
          ui.prop.TEXT,
          `${getText("speed")}\n ${speed.toFixed(1)} km/h`
        );
      }
    }

    if (this.followGPS) this.updateExploreButton();
  }

  updateExploreButton() {
    let status;

    if (this.geoStatus) {
      // Check if status is stale
      const stale = Date.now() - this.geoStatus.timestamp > 10000;
      if (stale) this.geoStatus.status = false;

      status = this.geoStatus.status;
    } else {
      status = false; // Status is false if geoStatus is not found
    }

    this.exploreButton.setProperty(ui.prop.VISIBLE, status === "A");
    this.exploreButtonAnimated.setProperty(ui.prop.VISIBLE, status !== "A");

    const isRunning = this.exploreButtonAnimated.getProperty(
      ui.prop.ANIM_IS_RUNNING
    );

    // Toggle animation if the animation state doesn't match the geo status
    if ((status !== "A" && !isRunning) || (status === "A" && isRunning)) {
      this.exploreButtonAnimated.setProperty(
        ui.prop.ANIM_STATUS,
        isRunning ? ui.anim_status.STOP : ui.anim_status.START
      );
    }
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
    // P.S. Must use coordinates scaled with STORAGE_SCALE when updating center
    if (this.followGPS) {
      this.updateCenter(this.geoLocation, {
        redraw: false,
        moveMarker: false,
      });
    }

    if (this.followGPS && (Math.abs(offsetX) > 40 || Math.abs(offsetY) > 40)) {
      this.updateCenter(this.geoLocation, { redraw: true }); // Must use coordinates scaled with STORAGE_SCALE
      this.markerXY.x = this.canvasW / 2;
      this.markerXY.y = this.canvasH / 2;
    }

    if (!this.followGPS) {
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
    zoom = Math.min(zoom, MAX_DISPLAY_ZOOM);

    this.scaleBar?.clear();
    this.scaleBar?.addLine({
      data: scaleBarCoordinates(zoom),
      count: 4,
    });

    const lengthInMeters = SCALE_LENGTH_IN_METERS[Math.round(zoom)];

    this.zoomText?.setProperty(
      ui.prop.TEXT,
      `${scaleBarLabel(lengthInMeters)}`
    );
  }

  resetZoomRect() {
    this.zoomRect.setProperty(ui.prop.VISIBLE, false);
    this.zoomRect.setProperty(ui.prop.MORE, {
      ...this.zoomRectProps,
    });
  }

  updateZoomRect(
    delta,
    center = { x: DEVICE_WIDTH / 2, y: DEVICE_HEIGHT / 2 }
  ) {
    delta = Math.max(-20, delta);
    delta = Math.min(20, delta);

    const scale = Math.pow(2, delta);
    let size = (DEVICE_HEIGHT / 3) * scale;

    // Define thresholds for zoom
    const minSize = 30; // Minimum size
    const maxSize = DEVICE_HEIGHT - 200; // Maximum size

    // Calculate radius based on zoom level
    let radius;
    if (size <= maxSize) {
      radius = size / 2; // Increase radius as size increases
    } else {
      radius = maxSize / 2;
    }

    // Adjust line width linearly based on zoom level over the threshold
    let lineWidth = 4; // Default line width
    if (size > maxSize) {
      // Increase line width linearly with the size over the threshold
      lineWidth += Math.log((size + maxSize) / maxSize) * 2; // Adjust multiplier as needed
    }

    // Adjust size within constraints
    size = Math.max(minSize, size);
    size = Math.min(maxSize, size);

    const zoomRectProps = {
      ...this.zoomRectProps,
      x: px(center.x - size / 2),
      y: px(center.y - size / 2),
      w: px(size),
      h: px(size),
      radius: px(radius),
      line_width: px(lineWidth),
    };

    this.zoomRect.setProperty(ui.prop.MORE, zoomRectProps);
  }

  createZoomRect() {
    this.zoomRectProps = {
      x: px(DEVICE_WIDTH / 2 - DEVICE_WIDTH / 3 / 2),
      y: px(DEVICE_HEIGHT / 2 - DEVICE_HEIGHT / 3 / 2),
      w: px(DEVICE_WIDTH / 3),
      h: px(DEVICE_HEIGHT / 3),
      radius: 4,
      line_width: 4,
      color: 0xcde5ff,
      enable: false,
    };

    // Create the rectangle
    this.zoomRect = ui.createWidget(ui.widget.STROKE_RECT, this.zoomRectProps);
    this.zoomRect.setProperty(ui.prop.VISIBLE, false);
  }

  animateZoomRect(center, callback = null) {
    this.zoomRect.setProperty(ui.prop.VISIBLE, true);

    const initialWidth = 40;
    const initialHeight = 40;

    const initialX = center.x - initialWidth / 2;
    const initialY = center.y - initialHeight / 2;

    // Animation to increase the size while keeping it centered
    const anim_increaseW = {
      anim_rate: "easeinout",
      anim_duration: 140,
      anim_from: px(initialWidth),
      anim_to: px(initialWidth * 6),
      anim_prop: ui.prop.W,
    };

    const anim_increaseH = {
      anim_rate: "easeinout",
      anim_duration: 140,
      anim_from: px(initialHeight),
      anim_to: px(initialHeight * 6),
      anim_prop: ui.prop.H,
    };

    const anim_moveX = {
      anim_rate: "easeinout",
      anim_duration: 140,
      anim_from: px(initialX),
      anim_to: px(center.x - (initialWidth * 6) / 2), // Adjust X to keep centered after scaling
      anim_prop: ui.prop.X,
    };

    const anim_moveY = {
      anim_rate: "easeinout",
      anim_duration: 140,
      anim_from: px(initialY),
      anim_to: px(center.y - (initialHeight * 6) / 2), // Adjust Y to keep centered after scaling
      anim_prop: ui.prop.Y,
    };

    // Setting up the animation
    this.zoomRect.setProperty(ui.prop.ANIM, {
      anim_steps: [anim_increaseW, anim_increaseH, anim_moveX, anim_moveY],
      anim_fps: 60,
      anim_complete_func: () => {
        this.zoomRect.setProperty(ui.prop.VISIBLE, false);
        if (callback) callback();
      },
    });
  }

  createWidgets() {
    // Zoom rect indicator
    this.createZoomRect();

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
    this.zoomTextProps = {
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

    this.zoomText = ui.createWidget(ui.widget.TEXT, this.zoomTextProps);

    // Create a speed indicator
    this.speedTextProps = {
      x: px(48),
      y: px(DEVICE_HEIGHT / 2 + 50),
      w: px(120),
      h: px(40),
      align_h: ui.align.LEFT,
      align_v: ui.align.CENTER_V,
      text_size: 16,
      color: 0xefefef,
      enable: false,
    };

    this.speedText = ui.createWidget(ui.widget.TEXT, this.speedTextProps);

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
      center_x: px(downloadCenterX),
      center_y: px(downloadCenterY),
      radius: px(36),
      color: 0xebf1ff,
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
      x: px(36 - 46 / 2),
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
        center_x: px(36),
        center_y: px(36),
        radius: px(36),
        color: 0xebf1ff,
        alpha: 80,
      }
    );

    this.exploreButton = this.exploreButtonGroup.createWidget(
      ui.widget.IMG,
      this.exploreButtonProps
    );

    this.exploreButtonAnimated = this.exploreButtonGroup.createWidget(
      ui.widget.IMG_ANIM,
      {
        anim_path: "image/explore-46-anim",
        anim_prefix: "frame",
        anim_ext: "png",
        anim_fps: 22,
        anim_size: 30,
        repeat_count: 0,
        anim_status: ui.anim_status.STOP,
        x: this.exploreButtonProps.x,
        y: this.exploreButtonProps.y,
      }
    );

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
      center_x: px(36),
      center_y: px(36),
      radius: px(36),
      color: 0xebf1ff,
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
      w: px(DEVICE_WIDTH),
      h: px(DEVICE_HEIGHT),
      radius: 0,
      alpha: 0,
      color: 0xffffff,
    };

    this.trackpad = ui.createWidget(ui.widget.FILL_RECT, this.trackpadProps);
  }

  goToMapTransfer() {
    router.replace({ url: "page/gt/map-transfer/index.page" });
  }

  toggleFollowGPS() {
    this.followGPS = !this.followGPS;
    this.updateUserMarker();
  }

  onZoomButtonDown() {
    this.sliderTrack.setProperty(ui.prop.VISIBLE, true);
    this.downloadButton.setProperty(ui.prop.VISIBLE, false);
    this.downloadButtonBg.setProperty(ui.prop.VISIBLE, false);
    this.exploreButtonGroup.setProperty(ui.prop.VISIBLE, false);
    // this.zoomRect.setProperty(ui.prop.VISIBLE, true);
  }

  onZoomButtonMove(e) {
    // When zooming, update the scale bar according to the distance
    // between the current position and the center.
    let { delta, angleDelta } = zoomDelta(e);
    this.updateScaleBar(this.zoom + delta);

    // Update zoom rect
    // this.updateZoomRect(delta);

    moveZoomButton(
      angleDelta,
      this.zoomButtonGroupProps,
      this.zoomButtonGroup,
      this.zoomButtonBgProps,
      this.zoomButtonBg
    );
  }

  onZoomButtonUp(e) {
    this.sliderTrack.setProperty(ui.prop.VISIBLE, false);
    this.downloadButton.setProperty(ui.prop.VISIBLE, true);
    this.downloadButtonBg.setProperty(ui.prop.VISIBLE, true);
    this.exploreButtonGroup.setProperty(ui.prop.VISIBLE, true);
    // this.resetZoomRect();

    // Revert to original zoom button position
    this.zoomButtonGroup.setProperty(ui.prop.MORE, this.zoomButtonGroupProps);
    this.zoomButtonBg.setProperty(ui.prop.MORE, this.zoomButtonBgProps);

    const { delta } = zoomDelta(e);
    this.zoomAndRedraw(delta);
  }

  onPanning(e, isPanning, notMoving) {
    const timeDiff = Date.now() - isPanning;

    if (notMoving) {
      const offset = this.calculateOffset();
      const offsetAcc = Math.abs(offset.x) + Math.abs(offset.y);
      if (offsetAcc > NOT_MOVING_THRESHOLD) notMoving = false;
    }

    // Check for normal panning
    if (!notMoving) {
      this.updateCenter(this.center, { redraw: true });
      return this.updateUserMarker();
    }

    // Check for long press
    if (timeDiff > LONGPRESS_THRESHOLD) return logger.debug("Long press");

    // Check for double click
    if (
      this.lastClickTime &&
      Date.now() - this.lastClickTime < DOUBLE_CLICK_THRESHOLD
    ) {
      // logger.debug("Double click");
      this.lastClickTime = null; // Reset the last click time

      this.animateZoomRect(e, () => {
        const canvasCenter = {
          x: this.canvasW / 2,
          y: this.canvasH / 2,
        };
        const newCenter = this.newCenter(canvasCenter, e);

        this.zoom += 1;
        return this.updateCenter(newCenter, { redraw: true });
      });
    }

    // Wait to confirm if it's just a single click
    setTimeout(() => {
      // If lastClickTime is not updated by a second click, it's a single click
      if (
        this.lastClickTime &&
        Date.now() - this.lastClickTime >= DOUBLE_CLICK_THRESHOLD
      ) {
        // logger.debug("Click");
        this.lastClickTime = null; // Reset the last click time
      }
    }, DOUBLE_CLICK_THRESHOLD);

    this.lastClickTime = Date.now();
  }

  addListeners() {
    let isPanning = false; // Note: clicking is a form of panning where distance and duration is short
    let isGesture = false;
    let isZooming = false; // Zooming with slider button
    let isButton = false;
    let notMoving = true; // Whether the user is pressing still
    let lastPosition = null;
    let dragTrace = { x: [], y: [] };

    this.lastClickTime = null;

    let lastZoomUpdate = null;
    let wheelDegrees = 0;
    let zoomTimeout = null;

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

          const delta = wheelDegrees * ZOOM_SPEED_FACTOR;
          const newZoom = this.zoom + delta;

          this.updateScaleBar(newZoom);
          this.zoomRect.setProperty(ui.prop.VISIBLE, true);
          this.updateZoomRect(delta);

          // If the wheel is still spinning, don't update the zoom level
          if (zoomTimeout) clearTimeout(zoomTimeout);
          zoomTimeout = setTimeout(() => {
            const currentTime = Date.now(); // Throttling
            if (currentTime - lastZoomUpdate < ZOOM_THROTTLING_DELAY) return;

            this.resetZoomRect();

            if (wheelDegrees == 0) return;

            // Update zoom level
            this.zoomAndRedraw(delta);

            // Reset wheel degrees after map redraw
            wheelDegrees = 0;
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

    // Trackpad callbacks
    this.trackpad.addEventListener(ui.event.CLICK_DOWN, (e) => {
      if (isRendering) return;

      // Determine if a button is clicked
      if (this.onAreaClick(e, this.downloadButtonProps))
        return (isButton = "download");

      if (this.onAreaClick(e, this.exploreButtonGroupProps))
        return (isButton = "explore");

      // If no button clicked, move on to drag tracing
      dragTrace.x.push(e.x);
      dragTrace.y.push(e.y);

      // Determine if the user is performing a gesture
      if (
        Math.sqrt((e.x - HALF_HEIGHT) ** 2 + (e.y - HALF_HEIGHT) ** 2) >
        HALF_HEIGHT - 12
      ) {
        isGesture = true;
        return;
      }

      this.toggleAllButtons(false); // Disable all buttons to avoid interference with panning or zooming

      // Determine if the user is pressing the zoom button
      isZooming = this.onAreaClick(e, this.zoomButtonGroupProps);
      if (isZooming) return this.onZoomButtonDown();

      // Otherwise, user is panning
      this.followGPS = false;
      isPanning = Date.now();

      // last position is currently only useful for panning
      lastPosition = { x: e.x, y: e.y };
    });

    this.trackpad.addEventListener(ui.event.MOVE, (e) => {
      if (isRendering) return;
      if (isButton) return; // Do nothing if button

      dragTrace.x.push(e.x);
      dragTrace.y.push(e.y);
      if (isGesture) return; // Do nothing else if gesture

      const currentTime = Date.now();
      this.lastCenterUpdate ||= Date.now();
      if (currentTime - this.lastCenterUpdate < PAN_THROTTLING_DELAY) return;

      // If zooming
      if (isZooming) return this.onZoomButtonMove(e);

      // If panning
      // Update center without immediate rendering
      if (e && lastPosition) {
        const newCenter = this.newCenter(e, lastPosition);
        const offset = this.updateCenter(newCenter, { redraw: false });
        const offsetAcc = Math.abs(offset.x) + Math.abs(offset.y);
        if (notMoving && offsetAcc > NOT_MOVING_THRESHOLD) notMoving = false;
      }

      // If panning, log current position
      this.lastCenterUpdate = currentTime;
      lastPosition = { x: e.x, y: e.y };
    });

    this.trackpad.addEventListener(ui.event.CLICK_UP, (e) => {
      if (isRendering) return;

      // If button
      const downloadClick = this.onAreaClick(e, this.downloadButtonProps);
      if (isButton === "download" && downloadClick) this.goToMapTransfer();

      const exploreClick = this.onAreaClick(e, this.exploreButtonGroupProps);
      if (isButton === "explore" && exploreClick) this.toggleFollowGPS();

      // If gesture
      if (
        isGesture &&
        dragTrace.x[0] > DEVICE_WIDTH * 0.8 &&
        e.x < DEVICE_WIDTH * 0.4
      ) {
        this.goToMapTransfer();
      }

      // If zooming
      if (isZooming) this.onZoomButtonUp(e);

      // If panning
      if (isPanning) this.onPanning(e, isPanning, notMoving);

      this.toggleAllButtons(true); // Restore button functionalities

      isPanning = false;
      isGesture = false;
      isZooming = false;
      isButton = false;
      notMoving = true;
      lastPosition = null;
      dragTrace = { x: [], y: [] };
    });

    this.eventBus.on("render", (clear) => this.nextTile(clear));
  }

  // Determine if the given button is clicked
  onAreaClick(event, buttonProps) {
    const buttonX = buttonProps.x;
    const buttonY = buttonProps.y;
    const buttonW = buttonProps.w;
    const buttonH = buttonProps.h;
    const padding = 18;

    if (
      event.x < buttonX - padding ||
      event.x > buttonX + buttonW + padding ||
      event.y < buttonY - padding ||
      event.y > buttonY + buttonH + padding
    ) {
      return false;
    }

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
  updateCenter(newCenter, opts = { redraw: false, moveMarker: true }) {
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
      if (opts.moveMarker) this.moveUserMarker(offset);
      return offset;
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
    });
  }

  /**
   * Calculate the viewport tiles based on zoom level and canvas dimensions.
   * @returns {Array} Array of tile information.
   */
  viewportTiles() {
    // Canvas dimensions divided by two for center calculation
    const halfCanvasW = this.canvasW / 2;
    const halfCanvasH = this.canvasH / 2;

    // Determine the effective zoom level, capped by maxZoom
    const maxZoom = Math.floor(this.tileCache.maxZoom);
    const zoom = Math.floor(this.zoom);
    const effectiveZoom = this.zoom >= maxZoom + 1 ? maxZoom : zoom;

    // Current center of the canvas
    const canvasCenter = this.getRenderCache("currentCanvasCenter");

    // Calculate the size of each tile
    const tileSize = TILE_SIZE * Math.pow(2, this.zoom - zoom);

    // Determine the viewport boundaries
    const viewBB = new Float32Array([
      canvasCenter.x - halfCanvasW,
      canvasCenter.x + halfCanvasW,
      canvasCenter.y - halfCanvasH,
      canvasCenter.y + halfCanvasH,
    ]);

    // Calculate the start and end indices for tiles
    let startX = Math.floor(viewBB[0] / tileSize);
    let endX = Math.floor(viewBB[1] / tileSize);
    let startY = Math.floor(viewBB[2] / tileSize);
    let endY = Math.floor(viewBB[3] / tileSize);

    if (this.zoom >= maxZoom + 1) {
      const scale = Math.pow(2, zoom - maxZoom);
      startX = Math.floor(startX / scale);
      endX = Math.floor(endX / scale);
      startY = Math.floor(startY / scale);
      endY = Math.floor(endY / scale);
    }

    // Array to store tile information
    const tiles = [];
    const scaledTileSize = tileSize * Math.pow(2, zoom - effectiveZoom);

    // Generate tiles within the calculated indices
    for (let x = startX; x <= endX; x++) {
      let tileX = x * scaledTileSize;

      for (let y = startY; y <= endY; y++) {
        let tileY = y * scaledTileSize;

        // Calculate the bounding box for each tile
        const tileBB = new Float32Array([
          tileX,
          tileX + scaledTileSize,
          tileY,
          tileY + scaledTileSize,
        ]);

        // Add the tile information to the array
        tiles.push({ z: effectiveZoom, x, y, tileBB, viewBB });
      }
    }

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

    for (let [name, item] of textItems.entries()) {
      if (!this.gridIndex.placeText(item)) continue;

      this.textCanvas.drawText({
        x: item.x,
        y: item.y,
        text_size: item.size || size,
        color,
        text: item.text,
      });
    }
  }

  zoomAndRedraw(delta) {
    if (Math.abs(delta) < 0.1) return;

    this.zoom += delta;

    // When zooming, toggle canvas to render on the off-screen canvas
    this.toggleCanvas();
    this.render();

    this.updateUserMarker();
  }

  render(clear = false) {
    if (isRendering) return; // Prevent multiple renders

    // Set render indicators
    isRendering = true;
    this.trackpad.setEnable(false);

    // const startTime = Date.now();

    try {
      this.commitRender(clear);
    } catch (e) {
      logger.error(e);
    }

    isRendering = false;

    // if (DEBUG) {
    //   const timeElapsed = Date.now() - startTime;
    //   logger.debug(`Render started in ${timeElapsed}ms`);
    // }
  }

  commitRender(clear = false) {
    // First, calculate the tiles intersecting with the viewport
    this.queue = this.viewportTiles();
    if (this.queue.length === 0) return;

    // logger.debug(`Queue length: ${this.queue.length}`);

    this.mainCanvas.setPaint({ color: 0xffff00, line_width: 2 });

    const tileSize = this.getRenderCache("currentTileSize");

    coordCache.newCache(tileSize);
    this.gridIndex.clear();
    textItems.clear();

    if (DEBUG) this.renderStart = Date.now();

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
      // const textTimeStart = Date.now();
      this.drawText();
      // if (DEBUG) {
      //   const textTimeElapsed = Date.now() - textTimeStart;
      //   logger.debug(`Text drawn in ${textTimeElapsed}ms`);
      // }

      this.trackpad.setEnable(true);

      if (DEBUG) {
        const timeElapsed = Date.now() - this.renderStart;
        logger.debug(`Render finished in ${timeElapsed}ms`);
        this.renderStart = null;
      }

      return;
    }

    // const getTileStart = Date.now();

    const tileQuery = this.queue.pop();
    logger.debug(`Getting tile ${tileQuery.z} ${tileQuery.x} ${tileQuery.y}`);

    this.tileCache.getTile(tileQuery).then((tileData) => {
      // if (DEBUG) {
      //   const timeElapsed = Date.now() - getTileStart;
      //   logger.debug(
      //     `Tile ${tileQuery.x},${tileQuery.y} loaded in ${timeElapsed}ms`
      //   );
      // }

      this.renderTile(tileData, tileQuery, clear);
    });
  }

  renderTile(tileData, tileQuery, clear = false) {
    if (clear) this.mainCanvas.clear(this.defaultCanvasStyle);

    // Return if no tile data was available
    if (!tileData) return this.eventBus.emit("render", false);

    // const tileTimeStart = Date.now();
    // const stats = {
    //   total: 0,
    //   renderTotal: 0,
    //   [GeomType.POINT]: 0,
    //   [GeomType.LINESTRING]: 0,
    //   [GeomType.POLYGON]: 0,
    // };

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

    // if (DEBUG) {
    //   logger.debug(tileQuery.tileBB, tileQuery.viewBB);
    //   logger.debug(
    //     `Tile ${tileQuery.x},${tileQuery.y} visible: ${visibleSectors}`
    //   );
    // }

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
        // if (DEBUG) stats.total++; // Stats

        const feature = layer.features(j, featureTemp);

        const coverage = feature.coverage();
        if ((coverage & visibleSectors) === 0) continue;

        const minZoom = feature.pmapMinZoom();
        if (this.zoom < minZoom) continue;

        // Load properties
        const name = feature.nameZh() || feature.nameEn();
        const featType = feature.type();
        featPropsTemp["name"] = name;
        featPropsTemp["type"] = featType;
        featPropsTemp["pmap:kind"] = feature.pmapKind();
        featPropsTemp["pmap:min_zoom"] = minZoom;

        const style = styleBuilder
          ? styleBuilder(this.zoom, featPropsTemp) || {}
          : {};

        if (style.visible === false) continue;

        // Stats
        // if (DEBUG) stats.renderTotal++;
        // if (DEBUG) stats[featType]++;

        this.mainCanvas.setPaint({
          color: style["line-color"] || 0xeeeeee,
          line_width: style["line-width"] || 2,
        });

        const geometry = feature.geometryArray();

        if (featType === GeomType.POINT) {
          let point;

          for (const pointStart of parsePoint(geometry)) {
            point = mapPointCoords(geometry, pointStart, coordCache);

            if (name && !textItems.has(name)) {
              const size = style["font-size"] || 20;
              // Store necessary data for later text rendering
              textItems.set(name, {
                size,
                x: point.x + 8, // Placeholder, to be calculated later
                y: point.y - size - 4, // Placeholder, to be calculated later
                text: name,
              });
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

          if (name && !textItems.has(name)) {
            const size = style["font-size"] || 20;
            // Store necessary data for later text rendering
            textItems.set(name, {
              size,
              x: geometry[m] - ((size + 2) * name.length) / 2,
              y: geometry[m + 1] - size / 2,
              text: name,
            });
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

    // if (DEBUG) {
    //   const timeElapsed = Date.now() - tileTimeStart;
    //   logger.debug(
    //     `Tile ${tileQuery.x},${tileQuery.y} rendered in ${timeElapsed}ms`
    //   );
    // }
    // if (DEBUG) logger.debug(JSON.stringify(stats));

    this.eventBus.emit("render", false);
  }
}
