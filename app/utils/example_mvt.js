import {
  openAssetsSync,
  readSync,
  statAssetsSync,
  O_RDONLY,
  closeSync,
} from "@zos/fs";

import * as flatbuffers from "flatbuffers";

import { logger } from "./logger";
import { vector_tile } from "./vector-tile-js/vector_tile";
import { firstPass } from "./mvt";

export function exampleMvt() {
  const mvtFilePath = "map/shanghai_15_27437_13396_fbs.mvt";

  // Open and stat file outside the loop as we only need to do it once
  const fd = openAssetsSync({
    path: mvtFilePath,
    flag: O_RDONLY,
  });

  const stat = statAssetsSync({
    path: mvtFilePath,
  });

  let buffer = new ArrayBuffer(stat.size);

  // Benchmark start time
  const startTime = Date.now();

  // Read the file
  readSync({ fd, buffer });
  closeSync({ fd });

  // logger.debug("readSync done");

  const buf = new flatbuffers.ByteBuffer(new Uint8Array(buffer));

  // Decode
  const decodedTile = vector_tile.Tile.getRootAsTile(buf);
  const tileObj = firstPass(decodedTile);

  // Benchmark end time
  const endTime = Date.now();

  const elapsedTime = endTime - startTime; // in seconds
  logger.debug(`Decoded MVT in ${elapsedTime.toFixed(2)}ms.`);

  return tileObj;
}
