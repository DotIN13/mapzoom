// Ensure you're using Node.js 17.5.0 or later for the global fetch function

import geojsonvt from "geojson-vt";
import fs from "fs";

const key = process.env["AMAP_API_KEY"]; // Replace with your actual API key
const origin = "121.715730,31.037945"; // Replace with actual origin coordinates
const destination = "121.353584,31.251449"; // Replace with actual destination coordinates
const show_fields = "navi,cost,polyline";

const url = `https://restapi.amap.com/v5/direction/bicycling?key=${key}&origin=${origin}&destination=${destination}&show_fields=${show_fields}`;

function toGeoJSON(amapResponse) {
  const features = amapResponse.steps.map((step) => {
    const coordinates = step.polyline.split(";").map((point) => {
      const [lon, lat] = point.split(",").map(Number);
      return [lon, lat]; // GeoJSON uses [longitude, latitude] format
    });

    return {
      type: "Feature",
      properties: {
        distance: step.step_distance,
        instruction: step.instruction,
        orientation: step.orientation,
        road_name: step.road_name,
      },
      geometry: {
        type: "LineString",
        coordinates: coordinates,
      },
    };
  });

  return {
    type: "FeatureCollection",
    features: features,
  };
}

function saveGeoJSONToFile(geoJSON, filename) {
  const data = JSON.stringify(geoJSON, null, 2); // Pretty-print the JSON

  fs.writeFile(filename, data, "utf8", function (err) {
    if (err) {
      console.log("An error occurred while writing JSON to file.");
      return console.log(err);
    }

    console.log(`GeoJSON data has been saved to ${filename}`);
  });
}

fetch(url)
  .then((response) => response.json())
  .then((data) => {
    const geoJSON = toGeoJSON(data.route.paths[0]);
    saveGeoJSONToFile(geoJSON, "amap.geojson")

    // build an initial index of tiles
    const tileIndex = geojsonvt(geoJSON, {
      maxZoom: 14,
      indexMaxZoom: 14,
      indexMaxPoints: 0
    });

    // request a particular tile
    // show an array of tile coordinates created so far
    for (let coord of tileIndex.tileCoords) {
      const tile = tileIndex.getTile(coord.z, coord.x, coord.y);
      if (tile.features.length > 0) {
        console.log(tile.features);
      }
    }
  })
  .catch((error) => {
    console.error("Error fetching data:", error);
  });
