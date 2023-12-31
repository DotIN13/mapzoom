import * as ui from "@zos/ui";
import { px, log } from "@zos/utils";

import { DEVICE_HEIGHT, DEVICE_WIDTH } from "./globals";

const logger = log.getLogger("zenn-map-zoom-button");

export const zoomDelta = (e) => {
  // When finger moving up, y goes smaller, but we need the delta to grow larger
  let deltaScale = -(e.y - DEVICE_HEIGHT / 2) / (DEVICE_HEIGHT / 2 - 35); // Deduct the slider padding
  deltaScale = Math.max(-1, deltaScale);
  deltaScale = Math.min(1, deltaScale);

  const delta = 5 * deltaScale;
  const angleDelta = -90 * deltaScale;
  return { delta, angleDelta };
};

export const moveZoomButton = (
  angleDelta,
  widgetProps,
  buttonGroup,
  buttonBgProps,
  buttonBg
) => {
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
};
