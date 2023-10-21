const fs = require('fs');

const geojson = JSON.parse(fs.readFileSync('map/yp-full.geojson', 'utf8'));
const features = geojson.features;

// const indexStream = fs.createWriteStream('features.idx');
// const featureStream = fs.createWriteStream('features.dat');

let currentOffset = 0;

features.forEach((feature) => {
    const featureStr = JSON.stringify(feature) + '\n';
    const featureBuffer = Buffer.from(featureStr);

    // Write the current byte offset to the index file as a 4-byte integer
    const offsetBuffer = Buffer.alloc(4);
    offsetBuffer.writeUInt32LE(currentOffset);
    // indexStream.write(offsetBuffer);

    // Write the GeoJSON feature to the data file
    // featureStream.write(featureBuffer);

    // Update the byte offset
    currentOffset += featureBuffer.length;
    console.log(currentOffset)
});

indexStream.end();
featureStream.end();
