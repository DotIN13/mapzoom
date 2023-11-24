import { connectStatus } from "@zos/ble";

import * as flatbuffers from "flatbuffers";

// import pako from "pako";
// import gzipDecompressor from "./gzip-decompressor";

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
  constructor(page) {
    this.page = page;
    this.mapId = `example-v${VERSION}`;
    this.pmtiles = new PMTiles("data://download/example.pmtiles");
    // this.pmtiles = new PMTiles("assets://map/shanghai-20231119-mini-fbs.pmtiles");
  }

  get maxZoom() {
    return this.pmtiles?.header?.maxZoom || 15;
  }

  getTile(z, x, y) {
    let decompressed;

    if (connectStatus()) {
      decompressed = this.getTileFromUrl(z, x, y);
    } else {
      decompressed = new Promise((resolve) =>
        resolve(this.pmtiles.getZxy(z, x, y))
      );
    }

    return decompressed.then((data) => {
      if (!data) return null;

      const buf = new flatbuffers.ByteBuffer(data);
      return Tile.getRootAsTile(buf);
    });
  }

  getTileFromUrl(z, x, y) {
    return this.page
      .request({
        method: "GET_TILE",
        params: {
          url: `http://192.168.5.121:8080/tiles/shanghai-20231119-mini-fbs/${z}/${x}/${y}.mvt`,
        },
      })
      .then((res) => {
        if (res.status === "error") throw Error(res.message);

        return Buffer.from(res);
      })
      .catch((e) => logger.warn(e));
  }
}
