import {
  openAssetsSync,
  readSync,
  statAssetsSync,
  O_RDONLY,
  closeSync,
} from "@zos/fs";

import pako from "pako";

import { logger } from "./logger";
import { vector_tile } from "./vector_tile";

function getOffsetByIndex(fdIdx, index) {
  // Pass fdIdx to avoid reading the file multiple times
  const offsetBuffer = new ArrayBuffer(4); // 4-byte integer for offset
  readSync({
    fd: fdIdx,
    buffer: offsetBuffer,
    options: { offset: 0, length: 4, position: index * 4 },
  });

  const view = new DataView(offsetBuffer);
  const offset = view.getUint32(0, true); // Little-endian

  logger.debug("Read offset at index ", index, offset);

  return offset;
}

function getFeatureByOffset(fdDat, start, length) {
  const featureBuffer = new ArrayBuffer(length);
  readSync({
    fd: fdDat,
    buffer: featureBuffer,
    options: { offset: 0, length: length, position: start },
  });

  // Convert the ArrayBuffer back to a regular string and parse it as JSON
  const featureData = Buffer.from(featureBuffer).toString("utf8");

  logger.debug(featureData);

  const geojson = JSON.parse(featureData.trim());

  logger.debug("Parsing success.");

  return geojson;
}

function gatherFeaturesByIndex(idxPath, fdIdx, fdDat) {
  const allFeatures = [];

  // Assuming we can determine the size of the index file:
  const idxStat = statAssetsSync({ path: idxPath });
  if (idxStat === undefined) {
    throw new Error(
      `Index file fsStat is undefined. It's probably corrupted or empty.`
    );
  }
  if (idxStat.size % 4 !== 0) {
    throw new Error(
      `Index file size is not a multiple of 4. It's probably corrupted.`
    );
  }

  const numberOfIndexes = idxStat.size / 4; // Each offset is 4 bytes

  for (let i = 0; i < 200; i++) {
    try {
      const start = getOffsetByIndex(fdIdx, i);
      const end =
        i < numberOfIndexes - 1
          ? getOffsetByIndex(fdIdx, i + 1) - 1 // Minus 1 to get the end of the current feature
          : idxStat.size - 1;
      const length = end - start; // If there's no 'end', then it means it's the last feature.

      logger.debug("Reading by ", start, end, length);

      const feature = getFeatureByOffset(fdDat, start, length);
      allFeatures.push(feature);
    } catch (error) {
      logger.error(`Error reading feature at index ${i}: ${error.message}`);
    }
  }

  return allFeatures;
}

export function readAllFeatures(idxPath, datPath) {
  const fdIdx = openAssetsSync({
    path: idxPath,
    flag: O_RDONLY,
  });

  const fdDat = openAssetsSync({
    path: datPath,
    flag: O_RDONLY,
  });

  let allFeatures = null;

  try {
    allFeatures = gatherFeaturesByIndex(idxPath, fdIdx, fdDat);
  } catch (error) {
    logger.error(error.message);
  }

  logger.debug(
    Array.from(new Set(allFeatures.map((feature) => feature.geometry.type)))
  );

  // Close the file descriptor
  closeSync({ fd: fdIdx });
  closeSync({ fd: fdDat });

  return allFeatures;
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
  logger.debug("readSync done");

  // Decompress
  const inflated = pako.inflate(Buffer.from(buffer));
  logger.debug("Inflate done");

  // Decode
  const mvtData = vector_tile.Tile.decode(inflated);
  logger.debug(mvtData.layers[0].name);

  // Benchmark end time
  const endTime = Date.now();

  const elapsedTime = (endTime - startTime) / 1000; // in seconds

  logger.debug(`Decoded MVT in ${elapsedTime.toFixed(2)} seconds.`);

  return mvtData;
}

export function transformFeature(rawFeature, layer) {
  const keys = layer.keys;
  const values = layer.values;

  function zigzagDecode(n) {
    return (n >> 1) ^ -(n & 1);
  }

  const feature = {
    type: "Feature",
    id: rawFeature.id,
    properties: {},
    geometry: {
      type: null,
      coordinates: [],
    },
  };

  // Parse tags to properties
  for (let i = 0; i < rawFeature.tags.length; i += 2) {
    const keyIndex = rawFeature.tags[i];
    const valueIndex = rawFeature.tags[i + 1];
    feature.properties[keys[keyIndex]] = values[valueIndex];
  }

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
      feature.geometry.type = rings[0].length === 1 ? "Point" : "MultiPoint";
      feature.geometry.coordinates =
        rings[0].length === 1 ? rings[0][0] : rings[0];
      break;
    case 2: // LINESTRING
      feature.geometry.type =
        rings.length === 1 ? "LineString" : "MultiLineString";
      feature.geometry.coordinates = rings.length === 1 ? rings[0] : rings;
      break;
    case 3: // POLYGON
      // TODO: Handle polygon/multipolygon distinction based on winding order and nested rings.
      // Simplified here for brevity.
      feature.geometry.type = "Polygon";
      feature.geometry.coordinates = rings;
      break;
    default:
      // Type UNKNOWN or any other types can be handled here, if necessary.
      break;
  }

  return feature;
}
