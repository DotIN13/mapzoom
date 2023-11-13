import { LocalStorage } from "@zos/storage";

import {
  DEBUG,
  VERSION,
  MEM_TILE_CACHE_SIZE,
  LOCAL_TILE_CACHE_SIZE,
} from "./globals";
import { logger, timer } from "./logger";
import { vector_tile } from "./vector_tile";
import { PMTiles } from "./pmtiles";

const localStorage = new LocalStorage();

// Decode a decompressed mvt tile
function decodeTile(decompressed) {
  // Decode
  const decodedTile = vector_tile.Tile.decode(decompressed);
  if (DEBUG) timer(firstPass, "parseMvt", undefined, decodedTile);
  if (!DEBUG) firstPass(decodedTile);

  return decodedTile;
}

/******************* Tiles *********************/

function zigzagDecode(n) {
  return (n >> 1) ^ -(n & 1);
}

function firstPass(decodedTile) {
  for (const layer of decodedTile.layers) {
    for (const rawFeature of layer.features) {
      parseGeometry(rawFeature);
    }
  }
}

export function parseGeometry(rawFeature) {
  let x = 0;
  let y = 0;
  let i = 0;
  let rings = [];
  let ring = [];

  while (i < rawFeature.geometry.length) {
    const cmdInt = rawFeature.geometry[i++];
    const cmdId = cmdInt & 0x7;
    const cmdCount = cmdInt >> 3;

    switch (cmdId) {
      case 1: // MoveTo
        if (ring.length) {
          rings.push(ring);
          ring = [];
        }
        for (let j = 0; j < cmdCount; j++) {
          x += zigzagDecode(rawFeature.geometry[i++]);
          y += zigzagDecode(rawFeature.geometry[i++]);
          ring.push([x, y]);
        }
        break;

      case 2: // LineTo
        for (let j = 0; j < cmdCount; j++) {
          x += zigzagDecode(rawFeature.geometry[i++]);
          y += zigzagDecode(rawFeature.geometry[i++]);
          ring.push([x, y]);
        }
        break;

      case 7: // ClosePath
        if (ring.length) {
          ring.push(ring[0]); // Close the ring
          rings.push(ring);
          ring = [];
        }
        break;
    }
  }

  if (ring.length) rings.push(ring);

  switch (rawFeature.type) {
    case 1: // POINT
      rawFeature.geometry = {
        type: rings[0].length === 1 ? "Point" : "MultiPoint",
        coordinates: rings[0].length === 1 ? rings[0][0] : rings[0],
      };
      break;
    case 2: // LINESTRING
      rawFeature.geometry = {
        type: rings.length === 1 ? "LineString" : "MultiLineString",
        coordinates: rings.length === 1 ? rings[0] : rings,
      };
      break;
    case 3: // POLYGON
      // TODO: Handle polygon/multipolygon distinction based on winding order and nested rings.
      // Simplified here for brevity.
      rawFeature.geometry = {
        type: "Polygon",
        coordinates: rings,
      };
      break;
    default:
      // Type UNKNOWN or any other types can be handled here, if necessary.
      break;
  }
}

// export function transformFeature(rawFeature, layer) {
//   parseGeometry(rawFeature);

//   const keys = layer.keys;
//   const values = layer.values;

//   const feature = {
//     type: "Feature",
//     id: rawFeature.id,
//     properties: {},
//     geometry: rawFeature.geometry,
//   };

//   // Parse tags to properties
//   for (let i = 0; i < rawFeature.tags.length; i += 2) {
//     const keyIndex = rawFeature.tags[i];
//     const valueIndex = rawFeature.tags[i + 1];
//     feature.properties[keys[keyIndex]] = values[valueIndex];
//   }

//   return feature;
// }

const MEMORY_CACHE_SIZE = 50;
const STORAGE_CACHE_SIZE = 100;

export class TileCache {
  constructor() {
    this.mapId = `shanghai-20231024-mini-v${VERSION}`;
    this.memoryCache = new Map();
    this.localStorageKeys = localStorage.getItem(this.mapId, []);
    this.pmtiles = new PMTiles("map/shanghai-20231024-mini.pmtiles");
  }

  getTile(z, x, y) {
    const key = `${this.mapId}-${z}-${x}-${y}`;
    let tile = this.getTileFromCache(key);

    if (!tile) {
      tile = this.getTileFromFile(z, x, y);
      this.updateCaches(key, tile);
    }

    return tile;
  }

  getTileFromCache(key) {
    let tile = this.memoryCache.get(key);
    if (tile) return tile;

    tile = this.getTileFromLocalStorage(key);
    if (tile) {
      this.updateMemoryCache(key, tile); // Update memory cache with the recently used item
    }

    return tile;
  }

  updateCaches(key, tile) {
    this.updateMemoryCache(key, tile);
    this.updateLocalStorage(key, tile);
  }

  getTileFromLocalStorage(key) {
    const tile = localStorage.getItem(key);
    if (tile) {
      this.localStorageKeys = this.localStorageKeys.filter((k) => k !== key);
      this.localStorageKeys.push(key);
      localStorage.getItem(this.mapId, this.localStorageKeys);
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

  updateLocalStorage(key, tile) {
    if (this.localStorageKeys.length >= LOCAL_TILE_CACHE_SIZE) {
      const oldestKey = this.localStorageKeys.shift();
      localStorage.removeItem(oldestKey);
    }
    localStorage.setItem(key, tile);
    this.localStorageKeys.push(key);
    localStorage.getItem(this.mapId, this.localStorageKeys);
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
