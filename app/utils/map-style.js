// Define functions to configure line-width, line-color, and fill-color for each layer

const configureBoundariesStyle = (zoom, feature) => ({
  "line-width": 2,
  "line-color": 0x555555,
});

const configureBuildingStyle = (zoom, feature) => ({
  "line-width": null,
  "line-color": 0x555555,
  "fill-color": 0x454441,
});

const configureEarthStyle = (zoom, feature) => ({
  "line-width": null,
  "line-color": 0x555555,
  "fill-color": 0xc7c7c7,
});

const configureLanduseStyle = (zoom, feature) => ({
  "line-width": null,
  "line-color": 0x555555,
  "fill-color": 0xe5e0d3,
});

const configureNaturalStyle = (zoom, feature) => ({
  "line-width": null,
  "line-color": 0x555555,
  "fill-color": 0xc7c7c7,
});

const configurePhysicalLineStyle = (zoom, feature) => {
  let lineWidth = 1;
  if (feature.properties["pmap:kind"] === "major_road") {
    lineWidth = zoom >= 14 ? 4 : zoom >= 12 ? 3 : zoom >= 10 ? 2 : 1;
  } else if (feature.properties["pmap:kind"] === "medium_road") {
    lineWidth = zoom >= 14 ? 3 : zoom >= 12 ? 2 : 1;
  } else if (feature.properties["pmap:kind"] === "minor_road") {
    lineWidth = zoom >= 14 ? 2 : 1;
  }
  return {
    "line-width": lineWidth,
    "line-color": 0x555555,
  };
};

const configurePhysicalPointStyle = (zoom, feature) => ({
  "line-width": null,
  "line-color": 0x555555,
  "fill-color": 0xffffff,
});

const configurePlacesStyle = (zoom, feature) => ({
  "line-width": null,
  "line-color": 0x555555,
  "fill-color": 0xdedede,
  "circle-radius": 3,
});

const configurePoisStyle = (zoom, feature) => ({
  "line-width": null,
  "line-color": 0x555555,
  "fill-color": 0xf2efe9,
  "circle-radius": 4,
});

const configureRoadsStyle = (zoom, feature) => {
  let lineWidth = 2;
  if (feature.properties["pmap:kind"] === "major_road") {
    lineWidth = zoom >= 14 ? 8 : zoom >= 12 ? 6 : zoom >= 10 ? 4 : 3;
  } else if (feature.properties["pmap:kind"] === "medium_road") {
    lineWidth = zoom >= 14 ? 5 : zoom >= 12 ? 3 : 2;
  } else if (feature.properties["pmap:kind"] === "minor_road") {
    lineWidth = zoom >= 14 ? 3 : 2;
  }
  return {
    "line-width": lineWidth,
    "line-color": 0x727272,
  };
};

const configureTransitStyle = (zoom, feature) => ({
  "line-width": 1,
  "line-color": 0x555555,
  "fill-color": 0xf2efe9,
});

const configureWaterStyle = (zoom, feature) => ({
  "line-width": null,
  "line-color": 0x555555,
  "fill-color": 0x2c4773,
});

// Export base map style object with layer configurations
export const mapStyle = {
  boundaries: configureBoundariesStyle,
  buildings: configureBuildingStyle,
  earth: configureEarthStyle,
  landuse: configureLanduseStyle,
  natural: configureNaturalStyle,
  physical_line: configurePhysicalLineStyle,
  physical_point: configurePhysicalPointStyle,
  places: configurePlacesStyle,
  pois: configurePoisStyle,
  roads: configureRoadsStyle,
  transit: configureTransitStyle,
  water: configureWaterStyle,
};
