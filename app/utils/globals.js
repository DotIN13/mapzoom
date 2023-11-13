import { getDeviceInfo } from "@zos/device";

export const DEBUG = false;
export const VERSION = "1";

export const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = getDeviceInfo();

export const TILE_SIZE = 512;
export const TILE_EXTENT = 4096;

// Create a precomputed tile projection from TILE_EXTENT to 0..1
export const TILE_PROJECTION = new Float32Array(TILE_EXTENT + 256);

for (let i = 0; i < TILE_EXTENT + 256; i++) {
  TILE_PROJECTION[i] = (i - 128) / TILE_EXTENT;
}

export const TILE_SCALE = TILE_SIZE / TILE_EXTENT;

export const PRECISION_FACTOR = 10;

export const DIR_CACHE_SIZE = 6;
export const MEM_TILE_CACHE_SIZE = 2;
export const LOCAL_TILE_CACHE_SIZE = 50;

export const PAN_SPEED_FACTOR = 1.8; // adjust this value as needed
export const ZOOM_SPEED_FACTOR = 0.05; // adjust this value as needed

export const PAN_THROTTLING_DELAY = 20; // Throttle delay of 20ms
export const ZOOM_THROTTLING_DELAY = 360; // Throttle delay of 360ms

export const CENTER_STORAGE_SCALE = 10; // Scale factor for center coordinates storage
