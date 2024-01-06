import { TILE_EXTENT, TILE_BLEED } from "./globals";

/******************* Tiles *********************/

function zigzagDecode(n) {
  return (n >> 1) ^ -(n & 1);
}

// Generator function for parsing points
export function parsePoint(geometry) {
  let i = 1;
  const length = geometry.length;
  const result = { value: undefined, done: false };

  return {
    next: function () {
      if (i < length) {
        result.value = i; // Return point start index
        i += 2;
      } else {
        result.done = true;
        result.value = undefined;
      }
      return result;
    },
    [Symbol.iterator]: function () {
      return this;
    },
  };
}

// Generator function for parsing line strings
export function parseLineString(geometry) {
  let i = 0;
  const length = geometry.length;
  const result = { value: undefined, done: false };

  return {
    next: function () {
      if (i < length) {
        // Time to start a new line
        const cmd_int = geometry[i++];
        const count = cmd_int >> 1;

        result.value = [i, i + count * 2];
        i += count * 2;
        return result;
      }
      result.done = true;
      result.value = undefined;
      return result;
    },
    [Symbol.iterator]: function () {
      return this;
    },
  };
}

// Generator function for parsing polygons
export function parsePolygon(geometry) {
  let i = 0;
  const length = geometry.length;
  const result = { value: undefined, done: false };

  return {
    next: function () {
      if (i < length) {
        const cmd_int = geometry[i++];
        const count = cmd_int >> 1;

        const ringRange = [i, i + count * 2];
        i += count * 2;
        result.value = { ringRange, isExterior: (cmd_int & 1) === 0 };
      } else {
        result.done = true;
        result.value = undefined;
      }
      return result;
    },
    [Symbol.iterator]: function () {
      return this;
    },
  };
}

export function mapPointCoords(geometry, begin, cache) {
  let x = cache.cache[geometry[begin] + TILE_BLEED];
  let y = cache.cache[geometry[begin + 1] + TILE_BLEED];

  if (isNaN(x)) x = (geometry[begin] / TILE_EXTENT) * cache.tileSize;
  if (isNaN(y)) y = (geometry[begin + 1] / TILE_EXTENT) * cache.tileSize;

  return { x: x + cache.baseTile.x, y: y + cache.baseTile.y };
}

export function mapLineStringCoords(geometry, range, cache) {
  const [i, j] = range;

  for (let k = i; k < j; k += 2) {
    let x = cache.cache[geometry[k] + TILE_BLEED];
    let y = cache.cache[geometry[k + 1] + TILE_BLEED];

    if (isNaN(x)) x = (geometry[k] / TILE_EXTENT) * cache.tileSize;
    if (isNaN(y)) y = (geometry[k + 1] / TILE_EXTENT) * cache.tileSize;

    geometry[k] = x + cache.baseTile.x;
    geometry[k + 1] = y + cache.baseTile.y;
  }
}

export function mapPolygonCoords(geometry, range, cache) {
  const [i, j] = range;

  let ring = [];

  for (let k = i; k < j; k += 2) {
    let x = cache.cache[geometry[k] + TILE_BLEED];
    let y = cache.cache[geometry[k + 1] + TILE_BLEED];

    if (isNaN(x)) x = (geometry[k] / TILE_EXTENT) * cache.tileSize;
    if (isNaN(y)) y = (geometry[k + 1] / TILE_EXTENT) * cache.tileSize;

    ring.push({ x: x + cache.baseTile.x, y: y + cache.baseTile.y });
  }

  return ring;
}
