import {
  openAssetsSync,
  readSync,
  statAssetsSync,
  O_RDONLY,
  closeSync,
} from "@zos/fs";

import pako from "pako";

import {
  TILE_SIZE,
  TILE_EXTENT,
  TILE_SCALE,
  CACHE_SIZE,
} from "./globals";
import { logger } from "./logger";
import { roundToPrecision } from "./coordinates";
import { vector_tile } from "./vector_tile";


function readByte(fd, position) {
  const buffer = new ArrayBuffer(1); // Since we're reading just one byte
  const view = new Uint8Array(buffer);

  readSync({
    fd: fd,
    buffer: buffer,
    options: {
      offset: 0,       // We're always writing to the start of this small buffer
      length: 1,       // Just one byte
      position: position
    },
  });

  return view[0];     // Return the byte
}

function readVarInt(fd, x) {
  let shift = 0;
  let result = 0;
  let byte;

  do {
    byte = readByte(fd, x++);

    result |= (byte & 0x7F) << shift;
    shift += 7;
  } while (byte >= 0x80);

  return result;
}



export function exampleMvt() {
  // Open and stat file outside the loop as we only need to do it once
  const fd = openAssetsSync({
    path: "map/shanghai_10_857_418.mvt",
    flag: O_RDONLY,
  });

  const stat = statAssetsSync({
    path: "map/shanghai_10_857_418.mvt",
  });

  const buffer = new ArrayBuffer(stat.size);

  // Benchmark start time
  const startTime = Date.now();

  // Read the file
  readSync({ fd, buffer });
  closeSync({ fd });
  // logger.debug("readSync done");

  // Decompress
  const inflated = pako.inflate(Buffer.from(buffer));
  // logger.debug("Inflate done");

  // Decode
  const decodedTile = vector_tile.Tile.decode(inflated);
  firstPass(decodedTile);
  // logger.debug(mvtData.layers[0].name);

  // Benchmark end time
  const endTime = Date.now();

  const elapsedTime = endTime - startTime; // in seconds
  logger.debug(`Decoded MVT in ${elapsedTime.toFixed(2)}ms.`);

  return decodedTile;
}

/******************* Tiles *********************/

function zigzagDecode(n) {
  return (n >> 1) ^ -(n & 1);
}

function projectTileExtent(x, y) {
  return [x / TILE_EXTENT, y / TILE_EXTENT];
}

export function firstPass(decodedTile) {
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
          ring.push(projectTileExtent(x, y));
        }
        break;

      case 2: // LineTo
        for (let j = 0; j < cmdCount; j++) {
          x += zigzagDecode(rawFeature.geometry[i++]);
          y += zigzagDecode(rawFeature.geometry[i++]);
          ring.push(projectTileExtent(x, y));
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

export class TileCache {
  constructor() {
    this.cache = new Map();
  }

  getTile(z, x, y) {
    const key = `${z}-${x}-${y}`;
    if (this.cache.has(key)) return this.cache.get(key);

    // Fetch tile from PMTiles file
    const tile = this.fetchTile(z, x, y);
    if (tile) this.setTile(z, x, y, tile);
    return tile;
  }

  setTile(z, x, y, tile) {
    if (this.cache.size > CACHE_SIZE) {
      // Evict the first tile in the cache
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const key = `${z}-${x}-${y}`;
    this.cache.set(key, tile);
  }

  fetchTile(z, x, y) {
    if (!(z == 10 && x == 857 && y == 418)) return null;

    return exampleMvt(); // TODO: Implement tile retrieval from PMTiles file
  }
}
