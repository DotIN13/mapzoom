import * as ui from "@zos/ui";
import {
  onDigitalCrown,
  onKey,
  KEY_DOWN,
  KEY_HOME,
  KEY_EVENT_CLICK,
} from "@zos/interaction";

import { logger } from "./logger.js";

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
    canvasW = 640,
    canvasH = 640,
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

    // this.canvas.addEventListener(ui.event.CLICK_DOWN, (e) => {
    //   isDragging = true;
    //   this.followGPS = false;
    //   lastPosition = { x: e.x, y: e.y };
    // });

    // this.canvas.addEventListener(ui.event.CLICK_UP, (e) => {
    //   isDragging = false;
    //   lastPosition = null;
    //   this.render(); // We ensure to render the final state after the user stops dragging.
    // });

    // this.canvas.addEventListener(ui.event.MOVE, (e) => {
    //   if (!isDragging || !lastPosition) return;

    //   const currentTime = Date.now();
    //   // Throttle updates to 25 times per second
    //   if (currentTime - this.lastCenterUpdate < THROTTLING_DELAY) return;

    //   const deltaX = e.x - lastPosition.x;
    //   const deltaY = e.y - lastPosition.y;
    //   this.updateCenter(deltaX, deltaY); // Update center without immediate rendering

    //   lastPosition = { x: e.x, y: e.y };
    //   this.render();

    //   this.lastCenterUpdate = currentTime;
    // });
  }

  /**
   * Update center based on given Web Mercator pixel coordinates.
   * @param {Object} newCenter - New center coordinates in Web Mercator pixel format.
   */
  updateCenter(newCenter) {
    this.center = newCenter;

    const offset = this.calculateOffset();
    if (this.needsRedraw(offset)) {
      this.canvasCenter = { ...newCenter };
      this.moveCanvas({ x: 0, y: 0 });
      this.render();
    } else {
      this.moveCanvas(offset);
    }
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

  /**
   * Determine if the canvas needs to be redrawn.
   * @param {Object} offset - Offset in pixels {x, y}.
   * @returns {boolean} - Returns true if the canvas needs to be redrawn.
   */
  needsRedraw(offset) {
    return (
      Math.abs(offset.x) > this.canvasW - this.displayW ||
      Math.abs(offset.y) > this.canvasH - this.displayH
    );
  }

  modeCanvas(offset) {
    originalX = this.displayH / 2 - this.canvasH / 2;
    originalY = this.displayW / 2 - this.canvasW / 2;

    this.canvas.setProperty(ui.prop.x, originalX + offset.x);
    this.canvas.setProperty(ui.prop.y, originalY + offset.y);
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
    // First, calculate the tiles intersecting with the viewport
    const tiles = this.calculateViewportTiles();

    logger.debug(tiles.length, "tiles found.");

    // Clear canvas before drawing
    this.canvas.clear(this.defaultCanvasStyle);

    this.canvas.setPaint({
      color: 0xff0000,
      line_width: 2,
    });

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
      Object.entries(decodedTile).forEach(([_layer_name, layer]) => {
        layer.features.forEach((feature) => {
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
                color: 0x00ff00,
              });
              break;

            case "MultiLineString":
              feature.geometry.coordinates.forEach((line) => {
                const lineCoords = line.map((coord) =>
                  this.featureToCanvasCoordinates(coord, baseWorldX, baseWorldY)
                );
                this.canvas.strokePoly({
                  data_array: lineCoords,
                  color: 0x00ff00,
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
                color: 0x00ffff,
              }); // Or fillPoly if you want filled polygons
              break;

            case "MultiPolygon":
              feature.geometry.coordinates.forEach((polygon) => {
                const outerRingCoords = polygon[0].map((coord) =>
                  this.featureToCanvasCoordinates(coord, baseWorldX, baseWorldY)
                );
                this.canvas.strokePoly({
                  data_array: outerRingCoords,
                  color: 0x00ffff,
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
  return {
    layer: {
      features: [
        {
          geometry: {
            type: "MultiLineString",
            coordinates: [
              [
                [522.0, 2540.0],
                [468.0, 2463.0],
                [232.0, 2397.0],
                [-15.0, 2475.0],
                [-64.0, 2565.0],
              ],
              [
                [303.0, 1448.0],
                [356.0, 1517.0],
                [118.0, 1965.0],
                [12.0, 2073.0],
                [-64.0, 1987.0],
              ],
              [
                [303.0, 1448.0],
                [234.0, 1487.0],
                [75.0, 1370.0],
                [22.0, 1402.0],
                [-64.0, 1382.0],
              ],
              [
                [484.0, -64.0],
                [489.0, 156.0],
                [559.0, 169.0],
                [569.0, 111.0],
                [690.0, 144.0],
                [748.0, 178.0],
                [745.0, 221.0],
                [814.0, 244.0],
                [792.0, 298.0],
                [830.0, 362.0],
                [923.0, 375.0],
                [803.0, 673.0],
                [672.0, 654.0],
                [641.0, 758.0],
                [740.0, 811.0],
                [678.0, 847.0],
                [700.0, 892.0],
                [621.0, 960.0],
                [410.0, 1440.0],
                [303.0, 1448.0],
              ],
              [
                [499.0, 3321.0],
                [548.0, 3307.0],
                [564.0, 3362.0],
                [640.0, 3343.0],
                [661.0, 3399.0],
                [797.0, 3429.0],
                [750.0, 3303.0],
                [884.0, 3242.0],
                [1023.0, 3249.0],
                [1059.0, 3314.0],
                [1177.0, 3316.0],
                [1163.0, 3270.0],
                [1289.0, 3198.0],
                [1237.0, 3091.0],
                [1314.0, 3073.0],
                [1302.0, 3021.0],
                [1366.0, 3023.0],
                [1362.0, 2985.0],
                [1465.0, 2916.0],
                [1532.0, 2989.0],
              ],
              [
                [499.0, 3321.0],
                [380.0, 3225.0],
                [412.0, 3180.0],
                [452.0, 3198.0],
                [519.0, 3010.0],
                [695.0, 3012.0],
                [762.0, 2958.0],
                [787.0, 2994.0],
                [841.0, 2983.0],
                [852.0, 2936.0],
                [771.0, 2951.0],
                [793.0, 2846.0],
                [841.0, 2812.0],
                [1017.0, 2814.0],
                [956.0, 2632.0],
                [870.0, 2672.0],
                [816.0, 2562.0],
                [729.0, 2575.0],
                [706.0, 2533.0],
              ],
              [
                [499.0, 3321.0],
                [436.0, 3409.0],
                [494.0, 3440.0],
                [579.0, 3624.0],
                [632.0, 3620.0],
                [646.0, 3680.0],
                [602.0, 3675.0],
                [627.0, 3720.0],
                [559.0, 3844.0],
                [613.0, 3887.0],
                [591.0, 3962.0],
                [457.0, 4031.0],
                [455.0, 4088.0],
                [511.0, 4106.0],
                [527.0, 4160.0],
              ],
              [
                [522.0, 2540.0],
                [606.0, 2443.0],
                [548.0, 2368.0],
                [606.0, 2348.0],
                [533.0, 2255.0],
                [518.0, 1928.0],
                [447.0, 1886.0],
                [563.0, 1723.0],
                [637.0, 1788.0],
                [737.0, 1793.0],
                [752.0, 1839.0],
                [821.0, 1824.0],
                [1150.0, 1917.0],
                [1386.0, 1906.0],
              ],
              [
                [706.0, 2533.0],
                [609.0, 2630.0],
                [602.0, 2573.0],
                [522.0, 2540.0],
              ],
              [
                [1559.0, 2425.0],
                [1475.0, 2370.0],
                [1414.0, 2414.0],
                [1418.0, 2352.0],
                [1241.0, 2310.0],
                [1228.0, 2276.0],
                [931.0, 2298.0],
                [782.0, 2391.0],
                [706.0, 2533.0],
              ],
              [
                [1386.0, 1906.0],
                [1477.0, 1905.0],
                [1488.0, 1967.0],
                [1680.0, 2081.0],
                [1649.0, 2178.0],
                [1698.0, 2224.0],
              ],
              [
                [2000.0, 835.0],
                [1968.0, 697.0],
                [1852.0, 683.0],
                [1774.0, 753.0],
                [1842.0, 771.0],
                [1840.0, 867.0],
                [1680.0, 827.0],
                [1654.0, 850.0],
                [1693.0, 933.0],
                [1664.0, 1061.0],
                [1490.0, 1035.0],
                [1270.0, 1512.0],
                [1175.0, 1477.0],
                [1140.0, 1600.0],
                [1183.0, 1616.0],
                [1175.0, 1725.0],
                [1414.0, 1803.0],
                [1386.0, 1906.0],
              ],
              [
                [2036.0, 3608.0],
                [2001.0, 3681.0],
                [1797.0, 3620.0],
                [1780.0, 3666.0],
                [1631.0, 3673.0],
                [1604.0, 3439.0],
                [1546.0, 3433.0],
                [1553.0, 3370.0],
                [1455.0, 3307.0],
                [1467.0, 3267.0],
                [1515.0, 3265.0],
                [1532.0, 2989.0],
              ],
              [
                [1559.0, 2425.0],
                [1600.0, 2506.0],
                [1822.0, 2616.0],
                [1839.0, 2740.0],
                [1733.0, 2947.0],
                [1587.0, 3047.0],
                [1532.0, 2989.0],
              ],
              [
                [1698.0, 2224.0],
                [1652.0, 2367.0],
                [1577.0, 2341.0],
                [1559.0, 2425.0],
              ],
              [
                [1698.0, 2224.0],
                [1912.0, 2302.0],
              ],
              [
                [1912.0, 2302.0],
                [1965.0, 2068.0],
                [2017.0, 2089.0],
                [2059.0, 1907.0],
                [2131.0, 1868.0],
              ],
              [
                [2207.0, 2600.0],
                [2057.0, 2563.0],
                [1973.0, 2591.0],
                [2031.0, 2378.0],
                [1901.0, 2353.0],
                [1912.0, 2302.0],
              ],
              [
                [3095.0, -64.0],
                [3041.0, -4.0],
                [2949.0, -45.0],
                [2959.0, 152.0],
                [3065.0, 218.0],
                [3023.0, 232.0],
                [3094.0, 290.0],
                [3075.0, 309.0],
                [3294.0, 401.0],
                [3126.0, 450.0],
                [3034.0, 404.0],
                [2994.0, 432.0],
                [2970.0, 487.0],
                [3011.0, 534.0],
                [3194.0, 575.0],
                [3186.0, 625.0],
                [3137.0, 638.0],
                [3084.0, 848.0],
                [2981.0, 845.0],
                [2988.0, 815.0],
                [2939.0, 800.0],
                [2902.0, 887.0],
                [2849.0, 855.0],
                [2816.0, 912.0],
                [2694.0, 918.0],
                [2688.0, 878.0],
                [2578.0, 875.0],
                [2539.0, 961.0],
                [2481.0, 949.0],
                [2468.0, 880.0],
                [2423.0, 868.0],
                [2389.0, 959.0],
                [2322.0, 922.0],
                [2280.0, 1006.0],
                [2143.0, 906.0],
                [2171.0, 803.0],
                [2137.0, 795.0],
                [2107.0, 865.0],
                [2073.0, 805.0],
                [2000.0, 835.0],
              ],
              [
                [2131.0, 1868.0],
                [2004.0, 1751.0],
                [2053.0, 1485.0],
                [1904.0, 1284.0],
                [1938.0, 1170.0],
                [2055.0, 1012.0],
                [2053.0, 920.0],
                [2000.0, 835.0],
              ],
              [
                [2235.0, 3548.0],
                [2234.0, 3592.0],
                [2036.0, 3608.0],
              ],
              [
                [2207.0, 2600.0],
                [2176.0, 2827.0],
                [1960.0, 3079.0],
                [1939.0, 3253.0],
                [1988.0, 3345.0],
                [1980.0, 3472.0],
                [2028.0, 3477.0],
                [2036.0, 3608.0],
              ],
              [
                [2344.0, 2603.0],
                [2342.0, 2504.0],
                [2488.0, 2349.0],
                [2526.0, 2223.0],
                [2362.0, 1946.0],
                [2131.0, 1868.0],
              ],
              [
                [2344.0, 2603.0],
                [2257.0, 2632.0],
                [2207.0, 2600.0],
              ],
              [
                [2235.0, 3548.0],
                [2367.0, 3548.0],
                [2361.0, 3710.0],
                [2394.0, 3738.0],
                [2332.0, 3812.0],
                [2472.0, 4020.0],
                [2612.0, 3948.0],
                [2703.0, 4034.0],
              ],
              [
                [2599.0, 2673.0],
                [2613.0, 2736.0],
                [2481.0, 2928.0],
                [2482.0, 2989.0],
                [2366.0, 3069.0],
                [2362.0, 3174.0],
                [2437.0, 3250.0],
                [2420.0, 3318.0],
                [2290.0, 3292.0],
                [2235.0, 3548.0],
              ],
              [
                [2599.0, 2673.0],
                [2481.0, 2669.0],
                [2344.0, 2603.0],
              ],
              [
                [2518.0, 4160.0],
                [2703.0, 4034.0],
              ],
              [
                [2703.0, 4034.0],
                [2994.0, 3912.0],
                [3099.0, 3810.0],
                [3129.0, 3420.0],
                [3214.0, 3129.0],
                [3155.0, 2982.0],
                [2896.0, 2749.0],
                [2757.0, 2680.0],
                [2599.0, 2673.0],
              ],
            ],
          },
          properties: { "pmap:min_admin_level": 6 },
          id: 35185005096485,
          type: "Feature",
        },
      ],
    },
  };
}
