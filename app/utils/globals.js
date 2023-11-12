import { getDeviceInfo } from "@zos/device";

export const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = getDeviceInfo();

export const TILE_SIZE = 512;
export const TILE_EXTENT = 4096;

export const TILE_SCALE = TILE_SIZE / TILE_EXTENT;

export const PRECISION_FACTOR = 10;

export const DIR_CACHE_SIZE = 5;
export const TILE_CACHE_SIZE = 4;

export const PAN_SPEED_FACTOR = 1.8; // adjust this value as needed
export const ZOOM_SPEED_FACTOR = 0.1; // adjust this value as needed

export const PAN_THROTTLING_DELAY = 20; // Throttle delay of 50ms
export const ZOOM_THROTTLING_DELAY = 360; // Throttle delay of 500ms

export const CENTER_STORAGE_SCALE = 10; // Scale factor for center coordinates storage