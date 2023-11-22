import GzipDecompressor from "./gzip-decompressor.mjs";
import * as flatbuffers from "flatbuffers";

import { vector_tile } from "./vector-tile-js/vector_tile.js";

const gzipDecompressor = new GzipDecompressor();

const [z, x, y] = [10, 857, 417];
fetch(
  `http://192.168.5.121:8080/tiles/shanghai-20231119-mini-fbs/${z}/${x}/${y}.mvt`,
  {
    headers: {
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "upgrade-insecure-requests": "1",
    },
    referrerPolicy: "strict-origin-when-cross-origin",
    body: null,
    method: "GET",
  }
)
  .then((res) => res.arrayBuffer())
  .then((res) => {
    const bytes = Buffer.from(res);
    console.log("length: ", bytes.byteLength);
    console.log(bytes);

    const buf = new flatbuffers.ByteBuffer(bytes);
    const tile = vector_tile.Tile.getRootAsTile(buf);

    console.log(tile.layersLength())
  });


  // let data = [];

  // // A chunk of data has been received.
  // resp.on('data', (chunk) => {
  //   data.push(chunk);
  // });

  // // The whole response has been received.
  // resp.on('end', () => {
  //   let buffer = Buffer.concat(data);
  //   // Now `buffer` contains the whole binary data
  // });