import {
  openAssetsSync,
  readSync,
  statAssetsSync,
  O_RDONLY,
  closeSync,
} from "@zos/fs";

import pako from "pako";

import { vector_tile } from "./vector_tile";
import { logger } from "./logger";

export function exampleMvt() {
  // Open and stat file outside the loop as we only need to do it once
  const fd = openAssetsSync({
    path: "map/shanghai_10_857_418_minify.mvt",
    flag: O_RDONLY,
  });

  const stat = statAssetsSync({
    path: "map/shanghai_10_857_418_minify.mvt",
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
