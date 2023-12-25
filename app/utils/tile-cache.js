import { connectStatus } from "@zos/ble";
import { openSync, readSync, statSync, O_RDONLY, closeSync } from "@zos/fs";

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
  constructor(page, map) {
    this.page = page;
    this.map = map;
    this.mapId = `example-v${VERSION}`;

    const app = getApp();
    const { localStorage } = app._options.globalData;
    const activeMap =
      localStorage.getItem("active-map") || "shanghai_chn_6bd2.pmtiles";

    this.pmtiles = new PMTiles(`data://download/pmtiles/${activeMap}`);
  }

  get maxZoom() {
    return this.pmtiles?.header?.maxZoom || 15;
  }

  getTile(tileQuery) {
    if (false) {
      return this.getTileFromUrl(tileQuery);
    } else {
      return this.getTileFromPmtiles(tileQuery);
    }
  }

  getTileFromPmtiles(tileQuery) {
    const { z, x, y } = tileQuery;

    return new Promise((resolve) => {
      const data = this.pmtiles?.getZxy(z, x, y);
      if (!data) return resolve(null);

      const buf = new flatbuffers.ByteBuffer(data);
      resolve(Tile.getRootAsTile(buf));
    }).catch((e) => logger.warn("Get Tile from PMTiles error", e));
  }

  getTileFromUrl(tileQuery) {
    const { z, x, y } = tileQuery;

    return this.page
      .request({
        method: "GET_TILE",
        params: {
          url: `http://192.168.1.119:8080/shanghai-20231119-mini-fbs/${z}/${x}/${y}.mvt`,
          filePath: `data://${z}-${x}-${y}.mvt`,
        },
      })
      .then((res) => {
        const {
          status,
          data: { filePath },
        } = res;
        if (status !== "success" || !filePath) return null; // Early exit if file transfer failed

        const stats = statSync({ path: filePath });
        if (stats === undefined) logger.warn("Map tile not found.");
        if (stats === undefined) return null;

        const fd = openSync({
          path: filePath,
          flag: O_RDONLY,
        });

        const buffer = new ArrayBuffer(stats.size);

        readSync({
          fd,
          buffer,
          options: { offset: 0, length: stats.size, position: 0 },
        });

        closeSync({ fd });

        const buf = new flatbuffers.ByteBuffer(Buffer.from(buffer));
        return Tile.getRootAsTile(buf);
      })
      .catch((e) => logger.warn("Get Tile from URL error", e));
  }
}
