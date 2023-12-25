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

export const MAX_DISPLAY_ZOOM = 20; // Maximum zoom level to display

export const STORAGE_SCALE = 10; // Scale factor for center coordinates storage

// User Marker
export const MARKER_GROUP_SIZE = 160;
export const MARKER_GROUP_HALF_SIZE = MARKER_GROUP_SIZE / 2;
export const MARKER_SIZE = 30;
export const MARKER_SIGHT_SIZE = MARKER_SIZE * 4.61;

// Zoom indicator
// Meters to represent for the scale bar at differet zoom levels
export const SCALE_LENGTH_IN_METERS = new Float32Array([
  3600000, 1800000, 900000, 450000, 250000, 100000, 50000, 30000, 15000, 7000,
  4000, 2000, 1000, 500, 200, 100, 50, 30, 10, 7, 3, 2, 1, 0.5, 0.2, 0.1, 0.05,
]);

// Tile with in meters for zoom levels from 0 to 26 with a step of 0.2
export const TILE_WIDTH_IN_METERS = new Float32Array([
  40075016.686, 34887328.35009887, 30371183.347075414, 26439650.770766363,
  23017052.871843465, 20037508.343, 17443664.175049435, 15185591.673537705,
  13219825.385383181, 11508526.435921732, 10018754.1715, 8721832.087524718,
  7592795.836768852, 6609912.692691591, 5754263.217960864, 5009377.08575,
  4360916.043762359, 3796397.918384426, 3304956.3463457953, 2877131.608980432,
  2504688.542875, 2180458.0218811794, 1898198.959192213, 1652478.1731728972,
  1438565.8044902156, 1252344.2714375, 1090229.0109405897, 949099.4795961065,
  826239.0865864486, 719282.9022451078, 626172.13571875, 545114.5054702949,
  474549.7397980532, 413119.5432932243, 359641.4511225539, 313086.067859375,
  272557.2527351474, 237274.8698990266, 206559.77164661215, 179820.72556127695,
  156543.0339296875, 136278.62636757363, 118637.4349495133, 103279.88582330613,
  89910.36278063848, 78271.51696484374, 68139.31318378681, 59318.71747475665,
  51639.94291165301, 44955.18139031924, 39135.75848242187, 34069.65659189341,
  29659.358737378327, 25819.971455826504, 22477.59069515962, 19567.879241210936,
  17034.828295946703, 14829.679368689163, 12909.985727913252, 11238.79534757981,
  9783.939620605468, 8517.414147973352, 7414.839684344582, 6454.992863956626,
  5619.397673789905, 4891.969810302734, 4258.707073986676, 3707.419842172291,
  3227.496431978313, 2809.6988368949524, 2445.984905151367, 2129.353536993338,
  1853.7099210861454, 1613.7482159891565, 1404.8494184474762,
  1222.9924525756835, 1064.676768496669, 926.8549605430727, 806.8741079945783,
  702.4247092237381, 611.4962262878418, 532.338384248335, 463.4274802715358,
  403.4370539972891, 351.21235461186905, 305.7481131439209, 266.1691921241675,
  231.7137401357679, 201.71852699864456, 175.60617730593452, 152.87405657196044,
  133.08459606208376, 115.85687006788395, 100.85926349932228, 87.80308865296726,
  76.43702828598022, 66.54229803104172, 57.92843503394197, 50.42963174966114,
  43.90154432648363, 38.21851414299011, 33.27114901552086, 28.964217516970987,
  25.21481587483057, 21.950772163241815, 19.109257071495055, 16.63557450776043,
  14.482108758485493, 12.607407937415285, 10.975386081620908, 9.554628535747527,
  8.317787253880216, 7.241054379242747, 6.303703968707643, 5.487693040810454,
  4.777314267873764, 4.158893626940108, 3.6205271896213733, 3.1518519843538213,
  2.743846520405227, 2.388657133936882, 2.079446813470054, 1.8102635948106867,
  1.5759259921769107, 1.3719232602026135, 1.194328566968441, 1.039723406735027,
  0.9051317974053433, 0.7879629960884553, 0.6859616301013067,
  0.5971642834842205,
]);
