import { openSync, readSync, statSync, O_RDONLY, closeSync } from "@zos/fs";
import { log } from "@zos/utils";

import * as flatbuffers from "flatbuffers";

// import pako from "pako";
// import gzipDecompressor from "./gzip-decompressor";

import { VERSION } from "./globals";
import { PMTiles } from "./pmtiles";
import { Tile } from "./vector-tile-js/vector-tile";

const logger = log.getLogger("zenn-map-tile-cache");

export class TileCache {
  constructor(page, map) {
    this.page = page;
    this.map = map;
    this.mapId = `example-v${VERSION}`;

    const app = getApp();
    const { localStorage } = app._options.globalData;
    const activeMap = localStorage.getItem("active-map") || undefined;
    if (!activeMap) {
      this.pmtiles = null;
      return;
    }

    this.pmtiles = new PMTiles(`data://download/pmtiles/${activeMap}`);
  }

  get maxZoom() {
    return this.pmtiles?.header?.maxZoom || 15;
  }

  validCenter(center) {
    const { lon, lat } = center;
    // Should both be numbers
    return typeof lon === "number" && typeof lat === "number";
  }

  get center() {
    const center = {
      lon: this.pmtiles?.header?.centerLon,
      lat: this.pmtiles?.header?.centerLat,
    };
    if (this.validCenter(center)) return center;

    return null;
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
      if (!this.pmtiles) return resolve(null);

      const data = this.pmtiles.getZxy(z, x, y);
      if (!data) return resolve(null);

      const buf = new flatbuffers.ByteBuffer(data);
      return resolve(Tile.getRootAsTile(buf));
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
