import {
  DEBUG,
  VERSION,
  MEM_TILE_CACHE_SIZE,
  LOCAL_TILE_CACHE_SIZE,
} from "./globals";
import { logger, timer } from "./logger";
import { PMTiles } from "./pmtiles";
import { decodeTile } from "./mvt";

export class TileCache {
  constructor() {
    this.memoryCache = new Map();
    this.mapId = `example-v${VERSION}`;
    // this.pmtiles = new PMTiles("data://download/example.pmtiles");
    this.pmtiles = new PMTiles("assets://map/shanghai-20231024-mini-fbs.pmtiles");
  }

  getTile(z, x, y) {
    const key = `${this.mapId}-${z}-${x}-${y}`;
    let tile = this.memoryCache.get(key);

    if (!tile) {
      tile = this.getTileFromFile(z, x, y);
      this.updateMemoryCache(key, tile);
    }

    return tile;
  }

  updateMemoryCache(key, tile) {
    if (this.memoryCache.size >= MEM_TILE_CACHE_SIZE) {
      const oldestKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(oldestKey);
    }
    this.memoryCache.set(key, tile);
  }

  getTileFromFile(z, x, y) {
    let decompressed, decoded;

    if (DEBUG)
      decompressed = timer(
        () => this.pmtiles.getZxy(z, x, y),
        "getZxy",
        `fetch tile ${z} ${x} ${y}`
      );
    else decompressed = this.pmtiles.getZxy(z, x, y);
    if (!decompressed) return null;

    if (DEBUG)
      decoded = timer(
        decodeTile,
        "decodeTile",
        `decode tile ${z} ${x} ${y}`,
        decompressed
      );
    else decoded = decodeTile(decompressed);

    return decoded;
  }
}
