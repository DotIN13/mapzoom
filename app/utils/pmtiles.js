import {
  openAssetsSync,
  readSync,
  statAssetsSync,
  O_RDONLY,
  closeSync,
} from "@zos/fs";

import pako from "pako";

import { TILE_SIZE, TILE_EXTENT, TILE_SCALE, CACHE_SIZE } from "./globals";
import { logger } from "./logger";
import { roundToPrecision } from "./coordinates";
import { vector_tile } from "./vector_tile";

const HEADER_SIZE_BYTES = 127; // Or the appropriate header size for PMTiles

function readByte(fd, position) {
  const buffer = new ArrayBuffer(1); // Since we're reading just one byte
  const view = new Uint8Array(buffer);

  readSync({
    fd: fd,
    buffer: buffer,
    options: {
      offset: 0, // We're always writing to the start of this small buffer
      length: 1, // Just one byte
      position: position,
    },
  });

  return view[0]; // Return the byte
}

function readVarInt(fd, x) {
  let shift = 0;
  let result = 0;
  let byte;

  do {
    byte = readByte(fd, x++);

    result |= (byte & 0x7f) << shift;
    shift += 7;
  } while (byte >= 0x80);

  return result;
}

function decompress(compressed, compression_type) {
  if (compression_type == 0x05) return snappyJS?.uncompress(compressed);
  if (compression_type == 0x02) return pako?.decompress(compressed);
  if (compression_type == 0x01) return compressed;
}

function getUint64(v, offset) {
  const wh = v.getUint32(offset + 4, true);
  const wl = v.getUint32(offset, true);
  return wh * Math.pow(2, 32) + wl;
}

const tzValues = [
  0, 1, 5, 21, 85, 341, 1365, 5461, 21845, 87381, 349525, 1398101, 5592405,
  22369621, 89478485, 357913941, 1431655765, 5726623061, 22906492245,
  91625968981, 366503875925, 1466015503701, 5864062014805, 23456248059221,
  93824992236885, 375299968947541, 1501199875790165,
];

function rotate(n, xy, rx, ry) {
  if (ry === 0) {
    if (rx === 1) {
      xy[0] = n - 1 - xy[0];
      xy[1] = n - 1 - xy[1];
    }

    // Swap x and y
    let temp = xy[0];
    xy[0] = xy[1];
    xy[1] = temp;
  }
}

function zxyToTileId(z, x, y) {
  // Ensure zoom level does not exceed the max safe number limit
  if (z > 26) {
    throw Error("Tile zoom level exceeds max safe number limit (26)");
  }

  // Ensure x and y coordinates are within the bounds of the zoom level
  const maxCoordAtZoom = Math.pow(2, z) - 1;
  if (x > maxCoordAtZoom || y > maxCoordAtZoom) {
    throw Error("tile x/y outside zoom level bounds");
  }

  // Base value accumulated for the zoom level
  const baseValue = tzValues[z];

  // Size of the tile grid at the current zoom level
  const gridSize = Math.pow(2, z);

  // Initialize the Morton code accumulator and positional values
  let mortonCode = 0;
  let relativeX = 0;
  let relativeY = 0;
  let d = 0;
  const position = [x, y];
  let gridHalfSize = gridSize / 2;

  // Compute the Morton code for the provided x and y coordinates
  while (gridHalfSize > 0) {
    relativeX = (position[0] & gridHalfSize) > 0 ? 1 : 0;
    relativeY = (position[1] & gridHalfSize) > 0 ? 1 : 0;

    d += gridHalfSize * gridHalfSize * ((3 * relativeX) ^ relativeY);

    // Adjust the x and y coordinates based on the relativeX and relativeY values
    rotate(gridHalfSize, position, relativeX, relativeY);

    gridHalfSize = gridHalfSize / 2;
  }

  // Combine the base value with the Morton code to get the tile ID
  mortonCode = baseValue + d;

  return mortonCode;
}

function bytesToHeader(bytes) {
  const v = new DataView(bytes);

  // Ensure magic number matches PMTiles format
  if (v.getUint16(0, true) !== 0x4d50) {
    throw new Error("Wrong magic number for PMTiles archive");
  }

  const spec_version = v.getUint8(7);
  if (spec_version > 3) {
    throw Error(
      `Archive is spec version ${spec_version} but this library supports up to spec version 3`
    );
  }

  return {
    specVersion: spec_version,
    rootDirectoryOffset: getUint64(v, 8),
    rootDirectoryLength: getUint64(v, 16),
    jsonMetadataOffset: getUint64(v, 24),
    jsonMetadataLength: getUint64(v, 32),
    leafDirectoryOffset: getUint64(v, 40),
    leafDirectoryLength: getUint64(v, 48),
    tileDataOffset: getUint64(v, 56),
    tileDataLength: getUint64(v, 64),
    numAddressedTiles: getUint64(v, 72),
    numTileEntries: getUint64(v, 80),
    numTileContents: getUint64(v, 88),
    clustered: v.getUint8(96) === 1,
    internalCompression: v.getUint8(97),
    tileCompression: v.getUint8(98),
    tileType: v.getUint8(99),
    minZoom: v.getUint8(100),
    maxZoom: v.getUint8(101),
    minLon: v.getInt32(102, true) / 10000000,
    minLat: v.getInt32(106, true) / 10000000,
    maxLon: v.getInt32(110, true) / 10000000,
    maxLat: v.getInt32(114, true) / 10000000,
    centerZoom: v.getUint8(118),
    centerLon: v.getInt32(119, true) / 10000000,
    centerLat: v.getInt32(123, true) / 10000000,
  };
}

function getHeader(fd) {
  const buffer = new ArrayBuffer(HEADER_SIZE_BYTES);
  readSync({
    fd,
    buffer,
    options: { offset: 0, length: HEADER_SIZE_BYTES, position: 0 },
  });
  return bytesToHeader(buffer);
}

function getHeaderAndRoot(fd) {
  const header = getHeader(fd);

  if (header.specVersion < 3) {
    console.warn(
      `PMTiles spec version ${header.specVersion} has been deprecated; please see github.com/protomaps/PMTiles for tools to upgrade`
    );
  }

  const rootDirDataLength = header.rootDirectoryLength;
  const rootDirData = new ArrayBuffer(rootDirDataLength);
  readSync({
    fd,
    buffer: rootDirData,
    options: {
      offset: 0,
      length: rootDirDataLength,
      position: header.rootDirectoryOffset,
    },
  });

  const decompressedRootDirData = decompress(
    rootDirData,
    header.internalCompression
  );
  const rootDir = deserializeIndex(decompressedRootDirData); // Assuming you have a function `deserializeIndex` that parses the decompressed data

  return [header, rootDir];
}

function deserializeIndex(buffer) {
  const p = { buf: new Uint8Array(buffer), pos: 0 };
  const numEntries = readVarInt(p);

  const entries = [];

  let lastId = 0;
  for (let i = 0; i < numEntries; i++) {
    const v = readVarInt(p);
    entries.push({ tileId: lastId + v, offset: 0, length: 0, runLength: 1 });
    lastId += v;
  }

  for (let i = 0; i < numEntries; i++) {
    entries[i].runLength = readVarInt(p);
  }

  for (let i = 0; i < numEntries; i++) {
    entries[i].length = readVarInt(p);
  }

  for (let i = 0; i < numEntries; i++) {
    const v = readVarInt(p);
    if (v === 0 && i > 0) {
      entries[i].offset = entries[i - 1].offset + entries[i - 1].length;
    } else {
      entries[i].offset = v - 1;
    }
  }

  return entries;
}

function getDirectory(fd, offset, length, header) {
  const buffer = new ArrayBuffer(length);
  readSync({
    fd: fd,
    buffer: buffer,
    options: { offset: 0, length: length, position: offset },
  });

  const data = decompress(buffer, header.internalCompression);
  const directory = deserializeIndex(data);
  if (directory.length === 0) {
    throw new Error("Empty directory is invalid");
  }

  return directory;
}

function findTile(entries, tileId) {
  let left = 0;
  let right = entries.length - 1;

  while (left <= right) {
    const mid = (left + right) >> 1;
    const difference = tileId - entries[mid].tileId;

    if (difference > 0) {
      left = mid + 1;
    } else if (difference < 0) {
      right = mid - 1;
    } else {
      return entries[mid];
    }
  }

  // At this point, left > right
  if (right >= 0) {
    if (entries[right].runLength === 0) {
      return entries[right];
    }
    if (tileId - entries[right].tileId < entries[right].runLength) {
      return entries[right];
    }
  }

  return null;
}

export function getZxy(fd, z, x, y) {
  const tileId = zxyToTileId(z, x, y);
  const header = getHeader(fd);

  // Ensure tile zoom is within the limits defined in the header
  if (z < header.minZoom || z > header.maxZoom) {
    return undefined;
  }

  let directoryOffset = header.rootDirectoryOffset;
  let directoryLength = header.rootDirectoryLength;

  for (let depth = 0; depth <= 3; depth++) {
    const directory = getDirectory(
      fd,
      directoryOffset,
      directoryLength,
      header
    );
    const entry = findTile(directory, tileId);

    if (entry) {
      if (entry.runLength > 0) {
        const tileBuffer = new ArrayBuffer(entry.length);
        readSync({
          fd,
          buffer: tileBuffer,
          options: {
            offset: 0,
            length: entry.length,
            position: header.tileDataOffset + entry.offset,
          },
        });
        return decompress(tileBuffer, header.tileCompression);
      } else {
        directoryOffset = header.leafDirectoryOffset + entry.offset;
        directoryLength = entry.length;
      }
    } else {
      return undefined;
    }
  }

  throw Error("Maximum directory depth exceeded");
}

export function pmtilesFd(input) {
  return openAssetsSync({
    path: input,
    flag: O_RDONLY,
  });
}
