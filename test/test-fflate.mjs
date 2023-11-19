import GzipDecompressor from "./gzip-decompressor.mjs";

// Usage
let decompressor = new GzipDecompressor();
let res = decompressor.gunzipSync(
  new Uint8Array([
    31, 139, 8, 0, 191, 10, 90, 101, 2, 255, 11, 201, 200, 44, 86, 0, 162, 68,
    133, 226, 196, 220, 130, 156, 84, 133, 146, 212, 138, 18, 133, 180, 252, 34,
    133, 244, 170, 204, 2, 133, 228, 252, 220, 130, 162, 212, 226, 226, 204,
    252, 60, 61, 0, 166, 47, 136, 19, 43, 0, 0, 0,
  ])
);

console.log(new TextDecoder().decode(res));
