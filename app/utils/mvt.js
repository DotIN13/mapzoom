import * as flatbuffers from "flatbuffers";

import {
  DEBUG,
  VERSION,
  MEM_TILE_CACHE_SIZE,
  LOCAL_TILE_CACHE_SIZE,
} from "./globals";
import { logger, timer } from "./logger";
import { PMTiles } from "./pmtiles";
import { vector_tile } from "./vector-tile-js/vector_tile";

// Decode a decompressed mvt tile
function decodeTile(decompressed) {
  const buf = new flatbuffers.ByteBuffer(new Uint8Array(decompressed));
  const decodedTile = vector_tile.Tile.getRootAsTile(buf);

  const tileObj = DEBUG
    ? timer(firstPass, "parseMvt", undefined, decodedTile)
    : firstPass(decodedTile);

  return tileObj;
}

/******************* Tiles *********************/

function zigzagDecode(n) {
  return (n >> 1) ^ -(n & 1);
}

export function firstPass(decodedTile) {
  const layers = []; // Create layers

  for (let i = 0; i < decodedTile.layersLength(); i++) {
    const layer = decodedTile.layers(i);
    const features = []; // Create feature list of each layer
    const featureTemp = new vector_tile.Feature();

    for (let j = 0; j < layer.featuresLength(); j++) {
      const geometry = parseGeometry(layer.features(j, featureTemp));
      if (geometry) features.push({ geometry });
    }

    if (features.length === 0) continue; // Skip layers with no features

    layers.push({ name: layer.name(), features });
  }
  return { tile: decodeTile, layers };
}

function parseGeometry(feature) {
  let x = 0;
  let y = 0;
  let i = 0;
  let rings = [];
  let ring = [];

  const geometry = feature.geometryArray();

  while (i < feature.geometryLength()) {
    const cmdInt = geometry[i++];
    const cmdId = cmdInt & 0x7;
    const cmdCount = cmdInt >> 3;

    switch (cmdId) {
      case 1: // MoveTo
        if (ring.length) {
          rings.push(ring);
          ring = [];
        }
        for (let j = 0; j < cmdCount; j++) {
          x += zigzagDecode(geometry[i++]);
          y += zigzagDecode(geometry[i++]);
          ring.push([x, y]);
        }
        break;

      case 2: // LineTo
        for (let j = 0; j < cmdCount; j++) {
          x += zigzagDecode(geometry[i++]);
          y += zigzagDecode(geometry[i++]);
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

  // Return null if no coordinates are found
  if (rings.length === 0) return null;

  switch (feature.type()) {
    case 1: // POINT
      return {
        type: rings[0].length === 1 ? "Point" : "MultiPoint",
        coordinates: rings[0].length === 1 ? rings[0][0] : rings[0],
      };
    case 2: // LINESTRING
      return {
        type: rings.length === 1 ? "LineString" : "MultiLineString",
        coordinates: rings.length === 1 ? rings[0] : rings,
      };
    case 3: // POLYGON
      // TODO: Handle polygon/multipolygon distinction based on winding order and nested rings.
      // Simplified here for brevity.
      return {
        type: "Polygon",
        coordinates: rings,
      };
    default:
      // Type UNKNOWN or any other types can be handled here, if necessary.
      return null;
  }
}

// export function transformFeature(feature, layer) {
//   parseGeometry(feature);

//   const keys = layer.keys;
//   const values = layer.values;

//   const feature = {
//     type: "Feature",
//     id: feature.id,
//     properties: {},
//     geometry: feature.geometry,
//   };

//   // Parse tags to properties
//   for (let i = 0; i < feature.tags.length; i += 2) {
//     const keyIndex = feature.tags[i];
//     const valueIndex = feature.tags[i + 1];
//     feature.properties[keys[keyIndex]] = values[valueIndex];
//   }

//   return feature;
// }

export class TileCache {
  constructor() {
    this.memoryCache = new Map();
    this.mapId = `example-v${VERSION}`;
    this.pmtiles = new PMTiles("data://download/example.pmtiles");
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
