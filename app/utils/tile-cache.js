import * as flatbuffers from "flatbuffers";

import {
  DEBUG,
  VERSION,
  MEM_TILE_CACHE_SIZE,
  LOCAL_TILE_CACHE_SIZE,
} from "./globals";
import { logger, timer } from "./logger";
import { PMTiles } from "./pmtiles";
import { Tile } from "./vector-tile-js/vector-tile";

export class TileCache {
  constructor() {
    this.mapId = `example-v${VERSION}`;
    this.pmtiles = new PMTiles("data://download/example.pmtiles");
    // this.pmtiles = new PMTiles("assets://map/shanghai-20231119-mini-fbs.pmtiles");
  }

  getTile(z, x, y) {
    let decompressed;

    if (DEBUG)
      decompressed = timer(
        () => this.pmtiles.getZxy(z, x, y),
        "getZxy",
        `fetch tile ${z} ${x} ${y}`
      );
    else decompressed = this.pmtiles.getZxy(z, x, y);
    if (!decompressed) return null;

    const buf = new flatbuffers.ByteBuffer(decompressed);
    return Tile.getRootAsTile(buf);
  }
}
