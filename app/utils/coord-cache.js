import { TILE_EXTENT, TILE_BLEED, TILE_PROJECTION } from "./globals";

export class CoordCache {
  constructor() {
    this.cache = undefined;

    this.tileSize = undefined;
    this.baseTile = { x: undefined, y: undefined };
  }

  newCache(tileSize) {
    if (this.tileSize === tileSize) return; // Do nothing if zoom level hasn't changed

    this.cache = new Float32Array(TILE_EXTENT + TILE_BLEED * 2);
    this.cache.set(TILE_PROJECTION);
    for (let i = 0; i < this.cache.length; i++) {
      this.cache[i] *= tileSize;
    }

    this.tileSize = tileSize;
  }
}
