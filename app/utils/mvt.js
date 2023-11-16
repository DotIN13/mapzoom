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
    const keys = [];
    for (let k = 0; k < layer.keysLength(); k++) {
      keys.push(layer.keys(k));
    }
    const features = []; // Create feature list of each layer

    for (let j = 0; j < layer.featuresLength(); j++) {
      const feature = layer.features(j, featureTemp);

      const featureType = feature.type();
      const coordinates = parseGeometry(feature, featureType);
      if (coordinates) {
        const properties = parseProperties(feature, keys, layer);
        features.push({ type: featureType, coordinates, properties });
      }
    }

    if (features.length === 0) continue; // Skip layers with no features

    layers.push({ name: layer.name(), features });
  }
  return layers;
}

function parseGeometry(feature, featureType) {
  const geometry = feature.geometryArray();

  if (featureType === vector_tile.GeomType.POINT) {
    return parsePoint(geometry)
  }

  if (featureType === vector_tile.GeomType.LINESTRING) {
    return parseLineString(geometry);
  }

  if (featureType === vector_tile.GeomType.POLYGON) {
    return parsePolygon(geometry);
  }
}

// feature type Point and MultiPoint: [cmd_int, x1, y1, x2, y2, ...].
// cmd_int = (id) | (coord_count << 1)
function parsePoint(geometry) {
  let coordinates = [];
  for (let i = 1; i < geometry.length; i += 2) {
    coordinates.push([geometry[i], geometry[i + 1]]);
  }
  return coordinates;
}

// LineString and MultiLineString: [cmd_int, x1, y1, x2, y2, cmd_int, x1, y1, x2, y2, ...].
function parseLineString(geometry) {
  let lines = [];
  let i = 0;
  while (i < geometry.length) {
    let cmd_int = geometry[i++];
    let count = cmd_int >> 1; // Extract count from cmd_int
    let line = [];
    for (let j = 0; j < count; j++) {
      line.push([geometry[i], geometry[i + 1]]);
      i += 2;
    }
    lines.push(line);
  }
  return lines;
}

// Polygon includes feature type Polygon and MultiPolygon:
// [cmd_int, x1, y1, x2, y2, ..., x1, y1, cmd_int, x1, y1, x2, y2, ..., x1, y1].
function parsePolygon(geometry) {
  let polygons = [];
  let currentPolygon = [];
  let i = 0;

  while (i < geometry.length) {
    let cmd_int = geometry[i++];
    let count = cmd_int >> 1; // Extract count from cmd_int
    let ring = [];

    for (let j = 0; j < count; j++) {
      ring.push([geometry[i], geometry[i + 1]]);
      i += 2;
    }

    if ((cmd_int & 1) === 0) {
      // Start of a new polygon
      if (currentPolygon.length > 0) polygons.push(currentPolygon);
      currentPolygon = [ring];
    } else {
      // Interior ring of the current polygon
      currentPolygon.push(ring);
    }
  }
  if (currentPolygon.length > 0) polygons.push(currentPolygon);

  return polygons;
}

export function parseProperties(feature, keys, layer) {
  const props = new Set(["name", "name:en"]);
  const properties = {};
  const tags = feature.tagsArray();

  for (let i = 0; i < tags.length; i += 2) {
    const key = keys[tags[i]];

    if (props.delete(key)) {
      let value = layer.values(tags[i + 1]);
      const valueType = value.tagType();

      if (valueType === vector_tile.TagType.STRING) {
        properties[key] = value.stringValue();
      }
    }

    if (props.size === 0) return properties;
  }

  return properties;
}
