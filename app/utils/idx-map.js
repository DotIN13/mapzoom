import {
  openAssetsSync,
  readSync,
  statAssetsSync,
  O_RDONLY,
  closeSync,
} from "@zos/fs";

import { logger } from "./logger";

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

  logger.debug(Array.from(new Set(allFeatures.map((feature) => feature.geometry.type))));

  // Close the file descriptor
  closeSync({ fd: fdIdx });
  closeSync({ fd: fdDat });

  return allFeatures;
}
