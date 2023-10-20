import {
  getBoundingBox,
  calculateCanvasOrigin,
  lonLatToPixel,
  featureIntersects,
  lonlat,
} from "./index.js";
import { logger } from "./logger.js";

const canvasW = 480; // Manually defined canvas width
const canvasH = 480; // Manually defined canvas height

/**
 * Renders features from a GeoJSON on a customized canvas based on the given parameters.
 * @param {Array<number>} center - An array representing the [longitude, latitude] of the map's center.
 * @param {Object} geojson - A GeoJSON object containing the features to be rendered.
 * @param {number} zoom - The current zoom level.
 * @param {Object} canvas - The customized canvas object.
 */
export function drawMap(center, geojson, zoom, canvas) {
  // Usage example:
  // const geojson = { ... };  // Your GeoJSON data here
  // drawMap([longitude, latitude], geojson, zoomLevel, canvas);

  const origin = calculateCanvasOrigin(center, zoom, canvasW, canvasH);

  // Clear previous drawings
  canvas.clear({
    x: 0,
    y: 0,
    w: 480,
    h: 480,
  });

  logger.debug("Canvas cleared.");

  // Get viewport bounding box
  const bbox = getBoundingBox(center, zoom, canvasH, canvasW);

  logger.debug(`Current bbox: ${JSON.stringify(bbox)}`);

  // Set default paint for features
  canvas.setPaint({
    color: 0xff0000,
    line_width: 2, // Default line width
  });

  // Iterate through features in GeoJSON
  geojson.features.forEach((feature) => {
    logger.debug("Iterating through features.");

    if (featureIntersects(feature, bbox)) {
      logger.debug("Feature intersects with current viewport.");

      switch (feature.geometry.type) {
        case "Point":
          logger.debug("Drawing point.");
          const coord = feature.geometry.coordinates;
          const pointPixel = lonLatToPixel(lonlat(coord), zoom, origin);
          canvas.drawPixel({ ...pointPixel, color: 0xffffff });
          break;

        case "MultiPoint":
          logger.debug("Drawing MultiPoint.");
          feature.geometry.coordinates.forEach((coord) => {
            const pointPixel = lonLatToPixel(lonlat(coord), zoom);
            canvas.drawPixel({ ...pointPixel, color: 0xffffff });
          });
          break;

        case "LineString":
          logger.debug("Drawing LineString.");
          const lineCoords = feature.geometry.coordinates.map((coord) =>
            lonLatToPixel(lonlat(coord), zoom, origin)
          );
          canvas.strokePoly({
            data_array: lineCoords,
            color: 0x00ffff,
          });
          break;

        case "MultiLineString":
          logger.debug("Drawing MultiLineString.");
          feature.geometry.coordinates.forEach((line) => {
            const lineCoords = line.map((coord) =>
              lonLatToPixel(lonlat(coord), zoom, origin)
            );
            canvas.strokePoly({
              data_array: lineCoords,
              color: 0x00ffff,
            });
          });
          break;

        case "Polygon":
          logger.debug("Drawing Polygon.");
          // Draw only the outer ring for simplicity, but this can be expanded to handle holes.
          const outerRingCoords = feature.geometry.coordinates[0].map((coord) =>
            lonLatToPixel(lonlat(coord), zoom, origin)
          );
          canvas.strokePoly({
            data_array: outerRingCoords,
            color: 0x00ffff,
          });
          break;

        case "MultiPolygon":
          logger.debug("Drawing MultiPolygon.");

          feature.geometry.coordinates.forEach((polygon) => {
            // Draw only the outer ring of each polygon for simplicity.
            const outerRingCoords = polygon[0].map((coord) =>
              lonLatToPixel(lonlat(coord), zoom, origin)
            );
            canvas.strokePoly({
              data_array: outerRingCoords, // An array of {x, y} canvas coordinates
              color: 0x00ffff,
            });
          });
          break;

        default:
          logger.warn(
            "Unsupported feature type for drawing:",
            feature.geometry.type
          );
          break;
      }
    }
  });
}
