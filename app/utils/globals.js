import { getDeviceInfo } from "@zos/device";

export const DEBUG = false;
export const VERSION = "1";

export const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = getDeviceInfo();
export const HALF_HEIGHT = DEVICE_HEIGHT / 2;

export const TILE_SIZE = 512;
export const TILE_EXTENT = 4096;
export const TILE_GRID_SIZE = 4;

// Create a precomputed tile projection from TILE_EXTENT to 0..1
export const TILE_PROJECTION = new Float32Array(TILE_EXTENT + 256);

for (let i = 0; i < TILE_EXTENT + 256; i++) {
  TILE_PROJECTION[i] = (i - 128) / TILE_EXTENT;
}

export const TILE_SCALE = TILE_SIZE / TILE_EXTENT;

export const PRECISION_FACTOR = 10;

export const DIR_CACHE_SIZE = 4;
export const MEM_TILE_CACHE_SIZE = 1;
export const LOCAL_TILE_CACHE_SIZE = 50;

export const PAN_SPEED_FACTOR = 1.8; // adjust this value as needed
export const ZOOM_SPEED_FACTOR = 0.035; // adjust this value as needed

export const PAN_THROTTLING_DELAY = 20; // Throttle delay of 20ms
export const ZOOM_THROTTLING_DELAY = 360; // Throttle delay of 360ms

export const STORAGE_SCALE = 10; // Scale factor for center coordinates storage

// User Marker
export const MARKER_GROUP_SIZE = 160;
export const MARKER_GROUP_HALF_SIZE = MARKER_GROUP_SIZE / 2;
export const MARKER_SIZE = 30;
export const MARKER_SIGHT_SIZE = MARKER_SIZE * 4.61;
