const fs = require("fs");

function getFeatureByIndex(index, callback) {
  const offsetBuffer = Buffer.alloc(4);
  const fd = fs.openSync("test/yp.idx", "r");

  const idxStat = fs.fstatSync(fd);
  const feature_length = Math.floor(idxStat.size / 4);

  // Read the 4-byte integer from the index file for the given index
  fs.readSync(fd, offsetBuffer, 0, 4, index * 4);
  const start = offsetBuffer.readUInt32LE(0);

  fs.readSync(fd, offsetBuffer, 0, 4, (index + 1) * 4);
  const end =
    index < feature_length - 1
      ? offsetBuffer.readUInt32LE(0) - 1
      : undefined;

  fs.closeSync(fd);

  console.log("Reading: ", start, end)

  // Read the feature from the data file using the byte offset
  const readStream = fs.createReadStream("./test/yp.dat", {
    start,
    end,
  });
  let featureData = "";

  readStream.on("data", (chunk) => {
    featureData += chunk;
  });


  readStream.on("end", () => {
    console.log("Data: ", featureData);
    callback(JSON.parse(featureData.trim()));
  });

  readStream.on("error", (err) => {
    console.error("Error reading feature:", err);
  });
}

function callback(feature) {
  console.log("Feature:", feature);
}

getFeatureByIndex(52, callback);
