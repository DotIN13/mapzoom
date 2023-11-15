import * as ui from "@zos/ui";
import { getText } from "@zos/i18n";
import { getDeviceInfo } from "@zos/device";
import { px } from "@zos/utils";

import { DEVICE_WIDTH, DEVICE_HEIGHT } from "../../../utils/globals";

export const CANVAS_HEIGHT = DEVICE_HEIGHT;
export const CANVAS_WIDTH = DEVICE_WIDTH;

export const TEXT_STYLE = {
  text: getText("appName"),
  x: px(42),
  y: px(200),
  w: DEVICE_WIDTH - px(42) * 2,
  h: px(100),

  color: 0xffffff,
  text_size: px(36),
  align_h: ui.align.CENTER_H,
  align_v: ui.align.CENTER_V,
  text_style: ui.text_style.WRAP,
};

export const TRACKPAD_STYLE = {
  x: 0,
  y: 0,
  w: DEVICE_WIDTH,
  h: DEVICE_HEIGHT,
  radius: 0,
  alpha: 0,
  color: 0xffffff,
};

export const FRAMETIME_COUNTER_STYLE = {
  x: 0,
  y: DEVICE_HEIGHT - 50,
  w: DEVICE_WIDTH,
  h: 20,
  align_h: ui.align.CENTER_H,
  align_v: ui.align.CENTER_V,
  text_size: 20,
  color: 0xffffff,
  enable: false,
};

export const CANVAS_STYLE = {
  x: DEVICE_WIDTH / 2 - CANVAS_WIDTH / 2,
  y: DEVICE_HEIGHT / 2 - CANVAS_HEIGHT / 2,
  w: DEVICE_WIDTH,
  h: DEVICE_HEIGHT,
  enable: false,
};
