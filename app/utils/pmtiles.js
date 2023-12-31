import {
  openSync,
  openAssetsSync,
  readSync,
  statAssetsSync,
  statSync,
  O_RDONLY,
  closeSync,
} from "@zos/fs";
import { log } from "@zos/utils";

import gzipDecompressor from "./gzip-decompressor";
// import snappyJS from "snappyjs";
// import pako from "pako";

import { DIR_CACHE_SIZE } from "./globals";

const logger = log.getLogger("zenn-map-pmtiles");

const HEADER_SIZE_BYTES = 127; // Or the appropriate header size for PMTiles

function readVarInt(p) {
  let shift = 0;
  let result = 0;
  let byte;

  do {
    byte = p.buf[p.pos++]; // Use the updated readByte function

    result |= (byte & 0x7f) << shift;
    shift += 7;
  } while (byte >= 0x80);

  return result; // Return the result and the number of bytes read
}

function decompress(compressed, compression_type) {
  if (compression_type == 0x05) return snappyJS?.uncompress(compressed);
  if (compression_type == 0x02) {
    // return pako.inflate(compressed);
    return gzipDecompressor.gunzipSync(new Uint8Array(compressed));
  }
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
      `Archive is spec version ${spec_version} but this library supports up to spec version 3.`
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

  const header = bytesToHeader(buffer);

  if (header.specVersion < 3) {
    logger.warn(
      `PMTiles spec version ${header.specVersion} has been deprecated; please see github.com/protomaps/PMTiles for tools to upgrade`
    );
  }

  if (header.maxZoom > 15) {
    logger.warn(
      `PMTiles max zoom level ${header.maxZoom} exceeds the limit of 15`
    );
  }

  return header;
}

export function getHeaderAndRoot(fd) {
  const header = getHeader(fd);

  const rootDir = parseDirectory(
    fd,
    header.rootDirectoryOffset,
    header.rootDirectoryLength,
    header
  );

  return [header, rootDir];
}

function parseDirectory(fd, offset, length, header) {
  const buffer = new ArrayBuffer(length);
  readSync({
    fd: fd,
    buffer: buffer,
    options: { offset: 0, length: length, position: offset },
  });

  const data = decompress(buffer, header.internalCompression);

  const directory = deserializeIndex(data);
  if (directory[0].length === 0) {
    throw new Error("Empty directory.");
  }

  // logger.debug("Read directory complete, length", directory.length);
  return directory;
}

// Use typed arrays for performance, but limited to 32-bit integer tileIds,
// which translate to max zoom 15.
function deserializeIndex(buffer) {
  const p = { buf: new Uint8Array(buffer), pos: 0 };
  const numEntries = readVarInt(p);

  // Separate typed arrays for each field
  const tileIds = new Uint32Array(numEntries);
  const offsets = new Uint32Array(numEntries);
  const lengths = new Uint32Array(numEntries);
  const runLengths = new Uint32Array(numEntries);

  let lastId = 0;
  for (let i = 0; i < numEntries; i++) {
    const v = readVarInt(p);
    tileIds[i] = lastId + v;
    lastId += v;
  }

  for (let i = 0; i < numEntries; i++) {
    runLengths[i] = readVarInt(p);
  }

  for (let i = 0; i < numEntries; i++) {
    lengths[i] = readVarInt(p);
  }

  for (let i = 0; i < numEntries; i++) {
    const v = readVarInt(p);
    offsets[i] = v === 0 && i > 0 ? offsets[i - 1] + lengths[i - 1] : v - 1;
  }

  return [tileIds, offsets, lengths, runLengths];
}

function findTile(entries, tileId) {
  const [tileIds, offsets, lengths, runLengths] = entries;
  let left = 0;
  let right = tileIds.length - 1;

  while (left <= right) {
    const mid = (left + right) >> 1;
    const midTileId = tileIds[mid];

    const difference = tileId - midTileId;

    if (difference > 0) {
      left = mid + 1;
    } else if (difference < 0) {
      right = mid - 1;
    } else {
      return {
        tileId: tileIds[mid],
        offset: offsets[mid],
        length: lengths[mid],
        runLength: runLengths[mid],
      };
    }
  }

  if (
    right >= 0 &&
    (runLengths[right] === 0 || tileId - tileIds[right] < runLengths[right])
  ) {
    return {
      tileId: tileIds[right],
      offset: offsets[right],
      length: lengths[right],
      runLength: runLengths[right],
    };
  }

  return null;
}

export function pmtilesFd(input) {
  // Handle assets:// and data:// paths separately
  let statFunc, openFunc;

  if (input.startsWith("assets://")) {
    input = input.split("assets://")[1];
    statFunc = statAssetsSync;
    openFunc = openAssetsSync;
  } else {
    statFunc = statSync;
    openFunc = openSync;
  }

  const result = statFunc({ path: input });
  if (result === undefined) logger.warn("Map file not found.");
  if (result === undefined) return undefined;

  return openFunc({
    path: input,
    flag: O_RDONLY,
  });
}

export class PMTiles {
  constructor(input) {
    this.fd = pmtilesFd(input);
    if (this.fd === undefined) return undefined;

    this.dirCache = new Map();
    this.dirCacheHits = new Map();

    this.header = getHeader(this.fd);
    this.rootDir = this.getDirectory(
      this.header.rootDirectoryOffset,
      this.header.rootDirectoryLength
    );
  }

  getDirectory(offset, length) {
    const key = `${offset}-${length}`;

    // Set counter
    let counter = 0;
    if (this.dirCacheHits.has(key)) {
      counter = this.dirCacheHits.get(key) + 1;
    }
    this.dirCacheHits.set(key, counter);

    // Early return if cache found
    if (this.dirCache.has(key)) {
      return this.dirCache.get(key);
    }

    const directory = parseDirectory(this.fd, offset, length, this.header);

    // Prune cache if necessary
    if (this.dirCache.size > DIR_CACHE_SIZE) {
      const keyToPrune = this.pruneDirCache();
      if (keyToPrune === key) return directory; // If the current key has lowest hits, do nothing

      if (keyToPrune) this.dirCache.delete(keyToPrune);
    }

    this.dirCache.set(key, directory);
    return directory;
  }

  pruneDirCache() {
    let minHits = Infinity;
    let minHitsKey = null;
    [...this.dirCache.keys(), key].forEach((key) => {
      const hits = this.dirCacheHits.get(key);
      if (hits < minHits) {
        minHits = hits;
        minHitsKey = key;
      }
    });

    if (!minHitsKey) return false;

    logger.debug("Dir cache pruned: ", minHitsKey);
    return minHitsKey;
  }

  getZxy(z, x, y) {
    if (this.fd === undefined) return null;

    const tileId = zxyToTileId(z, x, y);
    // logger.debug("Getting tile: ", tileId);

    // Ensure tile zoom is within the limits defined in the header
    if (z < this.header.minZoom || z > this.header.maxZoom) {
      return undefined;
    }

    let directoryOffset = this.header.rootDirectoryOffset;
    let directoryLength = this.header.rootDirectoryLength;

    for (let depth = 0; depth <= 3; depth++) {
      const directory = this.getDirectory(directoryOffset, directoryLength);
      const entry = findTile(directory, tileId);

      if (!entry || entry.length === 0) return undefined;

      if (entry.runLength > 0) {
        const tileBuffer = new ArrayBuffer(entry.length);
        readSync({
          fd: this.fd,
          buffer: tileBuffer,
          options: {
            offset: 0,
            length: entry.length,
            position: this.header.tileDataOffset + entry.offset,
          },
        });

        // logger.debug("decompressing")

        return decompress(tileBuffer, this.header.tileCompression);
      } else {
        directoryOffset = this.header.leafDirectoryOffset + entry.offset;
        directoryLength = entry.length;
      }
    }

    logger.warn("Maximum directory depth exceeded.");
    return undefined;
  }

  close() {
    closeSync({ fd: this.fd });
  }
}
