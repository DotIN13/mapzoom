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
  CACHE_SIZE,
  PAN_SPEED_FACTOR,
  ZOOM_SPEED_FACTOR,
  THROTTLING_DELAY,
} from "./globals";
import { logger } from "./logger";
import { vector_tile } from "./vector_tile";

// function getOffsetByIndex(fdIdx, index) {
//   // Pass fdIdx to avoid reading the file multiple times
//   const offsetBuffer = new ArrayBuffer(4); // 4-byte integer for offset
//   readSync({
//     fd: fdIdx,
//     buffer: offsetBuffer,
//     options: { offset: 0, length: 4, position: index * 4 },
//   });

//   const view = new DataView(offsetBuffer);
//   const offset = view.getUint32(0, true); // Little-endian

//   logger.debug("Read offset at index ", index, offset);

//   return offset;
// }

// function getFeatureByOffset(fdDat, start, length) {
//   const featureBuffer = new ArrayBuffer(length);
//   readSync({
//     fd: fdDat,
//     buffer: featureBuffer,
//     options: { offset: 0, length: length, position: start },
//   });

//   // Convert the ArrayBuffer back to a regular string and parse it as JSON
//   const featureData = Buffer.from(featureBuffer).toString("utf8");

//   logger.debug(featureData);

//   const geojson = JSON.parse(featureData.trim());

//   logger.debug("Parsing success.");

//   return geojson;
// }

// function gatherFeaturesByIndex(idxPath, fdIdx, fdDat) {
//   const allFeatures = [];

//   // Assuming we can determine the size of the index file:
//   const idxStat = statAssetsSync({ path: idxPath });
//   if (idxStat === undefined) {
//     throw new Error(
//       `Index file fsStat is undefined. It's probably corrupted or empty.`
//     );
//   }
//   if (idxStat.size % 4 !== 0) {
//     throw new Error(
//       `Index file size is not a multiple of 4. It's probably corrupted.`
//     );
//   }

//   const numberOfIndexes = idxStat.size / 4; // Each offset is 4 bytes

//   for (let i = 0; i < 200; i++) {
//     try {
//       const start = getOffsetByIndex(fdIdx, i);
//       const end =
//         i < numberOfIndexes - 1
//           ? getOffsetByIndex(fdIdx, i + 1) - 1 // Minus 1 to get the end of the current feature
//           : idxStat.size - 1;
//       const length = end - start; // If there's no 'end', then it means it's the last feature.

//       logger.debug("Reading by ", start, end, length);

//       const feature = getFeatureByOffset(fdDat, start, length);
//       allFeatures.push(feature);
//     } catch (error) {
//       logger.error(`Error reading feature at index ${i}: ${error.message}`);
//     }
//   }

//   return allFeatures;
// }

// export function readAllFeatures(idxPath, datPath) {
//   const fdIdx = openAssetsSync({
//     path: idxPath,
//     flag: O_RDONLY,
//   });

//   const fdDat = openAssetsSync({
//     path: datPath,
//     flag: O_RDONLY,
//   });

//   let allFeatures = null;

//   try {
//     allFeatures = gatherFeaturesByIndex(idxPath, fdIdx, fdDat);
//   } catch (error) {
//     logger.error(error.message);
//   }

//   logger.debug(
//     Array.from(new Set(allFeatures.map((feature) => feature.geometry.type)))
//   );

//   // Close the file descriptor
//   closeSync({ fd: fdIdx });
//   closeSync({ fd: fdDat });

//   return allFeatures;
// }

// // For each rawFeature of each layer,
// // replace rawFeature geometry property
// // with coordinates relative to real tile size
// // stored in ArrayBuffer.
// function precompileTile(decodedTile, tileSize) {
//   decodedTile.layers.forEach((layer) => {
//     layer.features.forEach((feature) => {
//       const geometry = feature.geometry;
//       const type = geometry.type;
//       const coords = geometry.coordinates;

//       switch (type) {
//         case 1: // Point
//           geometry.coordinates = [
//             (coords[0] * tileSize) / 4096,
//             (coords[1] * tileSize) / 4096,
//           ];
//           break;
//         case 2: // LineString
//         case 3: // Polygon
//           coords.forEach((ring, i) => {
//             ring.forEach((coord, j) => {
//               coords[i][j] = [
//                 (coord[0] * tileSize) / 4096,
//                 (coord[1] * tileSize) / 4096,
//               ];
//             });
//           });
//           break;
//         default:
//           break;
//       }
//     });
//   });
// }

// export function extractGeometries(decodedTile) {
//   // For each rawFeature, extract geometry and collect them in a single ArrayBuffer.
//   // Keep the start and end offsets of geometries in its geometry property.
//   const geometries = [];
//   decodedTile.layers.forEach((layer) => {
//     layer.features.forEach((feature) => {
//       const geometry = feature.geometry;
//       const type = geometry.type;
//       const coords = geometry.coordinates;

//       let geometryStart = geometries.length;
//       switch (type) {
//         case 1: // Point
//           geometries.push(coords[0], coords[1]);
//           break;
//         case 2: // LineString
//         case 3: // Polygon
//           coords.forEach((ring) => {
//             ring.forEach((coord) => {
//               geometries.push(coord[0], coord[1]);
//             });
//           });
//           break;
//         default:
//           break;
//       }
//       feature.geometry = {
//         type,
//         start: geometryStart,
//         end: geometries.length,
//       };
//     });
//   });
//   return new Float32Array(geometries);
// }

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
  return [(x / TILE_EXTENT) * TILE_SIZE, (y / TILE_EXTENT) * TILE_SIZE];
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
    logger.debug("Create");
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
