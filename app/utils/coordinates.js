import { TILE_SIZE, PRECISION_FACTOR } from "./globals";
import { logger } from "./logger";

export function assets(type) {
  return (path) => type + "/" + path;
}

export function roundToPrecision(number, precision = PRECISION_FACTOR) {
  return Math.round(number * precision) / precision;
}

export function scaleCoordinates(coord, fromZoom, toZoom) {
  return {
    x: coord.x * Math.pow(2, toZoom - fromZoom),
    y: coord.y * Math.pow(2, toZoom - fromZoom),
  };
}

/**
 * Calculate the bounding box of the current viewport based on the given center, zoom level, and canvas dimensions.
 * @param {Object} center - An object representing the {lon, lat} of the center of the viewport.
 * @param {number} zoom - The current zoom level.
 * @param {number} canvasH - The height of the canvas.
 * @param {number} canvasW - The width of the canvas.
 * @returns {Object} The bounding box represented by its minimum and maximum longitudes and latitudes.
 */
export function getBoundingBox(center, zoom, canvasH, canvasW) {
  const metersPerPixel =
    (156543.03 * Math.cos((center.lon * Math.PI) / 180)) / Math.pow(2, zoom);

  const deltaLat = Math.abs((metersPerPixel * canvasH) / (2 * 111325));
  const deltaLon = Math.abs(
    (metersPerPixel * canvasW) /
      (2 * 111325 * Math.cos((center.lon * Math.PI) / 180))
  );

  return {
    minLon: center.lon - deltaLon,
    maxLon: center.lon + deltaLon,
    minLat: center.lat - deltaLat,
    maxLat: center.lat + deltaLat,
  };
}

/**
 * Convert a pixel's x and y coordinates to a geographical [longitude, latitude] based on a given zoom level.
 * @param {number} x - The pixel's x coordinate.
 * @param {number} y - The pixel's y coordinate.
 * @param {number} zoom - The current zoom level.
 * @returns {Object} An object with 'lon' and 'lat' properties representing the geographical coordinates.
 */
export function pixelToLonLat(x, y, zoom) {
  const scale = TILE_SIZE * Math.pow(2, zoom);

  const lon = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

  return { lon, lat };
}

/**
 * Convert a geographical [longitude, latitude] to a pixel's x and y coordinates based on a given zoom level.
 * @param {Object} lonlat - An object with 'lon' and 'lat' properties representing the geographical coordinates.
 * @param {number} zoom - The current zoom level.
 * @returns {Object} An object with 'x' and 'y' properties representing the pixel's coordinates within the canvas.
 */
export function zxyToLonLat(z, x, y) {
  var n = Math.pow(2, z);
  var lon_deg = (x / n) * 360.0 - 180.0;
  var lat_rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  var lat_deg = (lat_rad * 180.0) / Math.PI;

  return { lon: lon_deg, lat: lat_deg };
}

/**
 * Calculate the top-left corner (origin) of the canvas in pixel coordinates.
 * @param {Object} center - An object with 'lon' and 'lat' properties representing the geographical center of the canvas.
 * @param {number} zoom - The current zoom level.
 * @param {number} canvasW - The width of the canvas in pixels.
 * @param {number} canvasH - The height of the canvas in pixels.
 * @returns {Object} An object with 'x' and 'y' properties representing the canvas origin in pixel coordinates.
 */
export function calculateCanvasOrigin(center, zoom, canvasW, canvasH) {
  const scale = TILE_SIZE * Math.pow(2, zoom);

  // Convert the center of the canvas to pixel coordinates
  const centerPixel = {
    x: ((center.lon + 180) / 360) * scale,
    y:
      ((1 -
        Math.log(
          Math.tan(center.lat * (Math.PI / 180)) +
            1 / Math.cos(center.lat * (Math.PI / 180))
        ) /
          Math.PI) /
        2) *
      scale,
  };

  // Calculate the top-left corner (origin) of the canvas in pixel coordinates
  return {
    x: centerPixel.x - canvasW / 2,
    y: centerPixel.y - canvasH / 2,
  };
}

/**
 * Convert a geographical [longitude, latitude] to a pixel's x and y coordinates based on a given zoom level and origin.
 * @param {Object} lonlat - An object with 'lon' and 'lat' properties representing the geographical coordinates.
 * @param {number} zoom - The current zoom level.
 * @returns {Object} An object with 'x' and 'y' properties representing the pixel's coordinates within the canvas.
 */
export function lonLatToPixelCoordinates(lonlat, zoom = 0) {
  const scale = TILE_SIZE * Math.pow(2, zoom);

  const { lon, lat } = lonlat;
  const lat_rad = lat * (Math.PI / 180);
  const mercatorX = (lon + 180) / 360;
  const mercatorY =
    (1 - Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad)) / Math.PI) / 2;

  return {
    x: mercatorX * scale,
    y: mercatorY * scale,
  };
}

export function lonlat(array) {
  return {
    lon: array[0],
    lat: array[1],
  };
}
