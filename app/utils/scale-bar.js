import { px } from "@zos/utils";

import { TILE_SIZE, SCALE_LENGTH_IN_METERS, TILE_WIDTH_IN_METERS } from "./globals";

export const scaleBarCoordinates = (zoomLevel) => {
  const tileWidthInMeters = TILE_WIDTH_IN_METERS[Math.round(zoomLevel * 5)];
  const scaleLengthInMeters = SCALE_LENGTH_IN_METERS[Math.round(zoomLevel)];

  // Calculate the length of the scale bar in pixels
  const scaleLengthInPixels =
    (scaleLengthInMeters / tileWidthInMeters) * TILE_SIZE;

  // Calculate the start and end points of the scale bar within the polyline widget
  const endX = scaleLengthInPixels + 1; // Start at 1 to avoid clipping

  // Generate the line data for the scale bar
  return [
    { x: px(1), y: px(4) },
    { x: px(1), y: px(10) },
    { x: px(endX), y: px(10) },
    { x: px(endX), y: px(4) },
  ];
};

export const scaleBarLabel = (lengthInMeters) => {
  // Check if the length is greater than or equal to 1000 meters (1 kilometer)
  if (lengthInMeters >= 1000) {
    // Convert to kilometers and round to the nearest whole number
    const lengthInKilometers = Math.round(lengthInMeters / 1000);
    return `${lengthInKilometers} km`;
  } else {
    // For lengths less than 1000 meters, round to the nearest whole number and use meters
    return `${lengthInMeters} m`;
  }
};
