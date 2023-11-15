import * as flatbuffers from "flatbuffers";

import { DEBUG, VERSION } from "./globals";
import { logger, timer } from "./logger";
import { vector_tile } from "./vector-tile-js/vector_tile";

// Decode a decompressed mvt tile
export function decodeTile(decompressed) {
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
  const featureTemp = new vector_tile.Feature();

  for (let i = 0; i < decodedTile.layersLength(); i++) {
    const layer = decodedTile.layers(i);
    const features = []; // Create feature list of each layer

    for (let j = 0; j < layer.featuresLength(); j++) {
      const feature = layer.features(j, featureTemp);

      const geometry = parseGeometry(feature);
      const properties = parseProperties(feature, layer);
      if (geometry) features.push({ geometry, properties });
    }

    if (features.length === 0) continue; // Skip layers with no features

    layers.push({ name: layer.name(), features });
  }
  return layers;
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

export function parseProperties(feature, layer) {
  const props = new Set(["name", "name:zh"]);
  const properties = {};
  const tags = feature.tagsArray();

  // Parse tags to properties
  for (let i = 0; i < feature.tagsLength(); i += 2) {
    const keyIndex = tags[i];
    const valueIndex = tags[i + 1];
    const key = layer.keys(keyIndex);

    if (props.delete(key))
      properties[key] = layer.values(valueIndex).stringValue();

    if (props.size === 0) return properties;
  }

  return properties;
}
