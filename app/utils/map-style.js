// Define functions to configure line-width, line-color, and fill-color for each layer

const configureBoundariesStyle = (zoom, props) => {
  let lineWidth = 2;
  let lineColor = 0x727272;

  if (props["pmap:kind"] === "county") {
    lineWidth = 3;
    lineColor = 0x727272;
  } else if (props["pmap:kind"] === "locality") {
    lineWidth = 2;
    lineColor = 0x555555;
  }
  return {
    "line-width": lineWidth,
    "line-color": lineColor,
  };
};

const configureBuildingStyle = (zoom, props) => ({
  "line-width": null,
  "line-color": 0x555555,
  "fill-color": 0x454441,
});

const configureEarthStyle = (zoom, props) => ({
  "line-width": null,
  "line-color": 0x555555,
  "fill-color": 0xc7c7c7,
});

const configureLanduseStyle = (zoom, props) => ({
  "line-width": null,
  "line-color": 0x555555,
  "fill-color": 0xe5e0d3,
});

const configureNaturalStyle = (zoom, props) => ({
  "line-width": null,
  "line-color": 0x555555,
  "fill-color": 0xc7c7c7,
});

const configurePhysicalLineStyle = (zoom, props) => {
  let lineWidth = 1;
  if (props["pmap:kind"] === "major_road") {
    lineWidth = zoom >= 14 ? 4 : zoom >= 12 ? 3 : zoom >= 10 ? 2 : 1;
  } else if (props["pmap:kind"] === "medium_road") {
    lineWidth = zoom >= 14 ? 3 : zoom >= 12 ? 2 : 1;
  } else if (props["pmap:kind"] === "minor_road") {
    lineWidth = zoom >= 14 ? 2 : 1;
  }
  return {
    "line-width": lineWidth,
    "line-color": 0x555555,
  };
};

const configurePhysicalPointStyle = (zoom, props) => ({
  "line-width": null,
  "line-color": 0x555555,
  "fill-color": 0xffffff,
});

const configurePlacesStyle = (zoom, props) => {
  let fillColor = null;
  let visible = false;

  if (props["pmap:kind"] === "region" && zoom < 11) {
    fillColor = 0xfefefe;
    visible = true;
  }

  if (props["pmap:kind"] === "locality" && zoom >= 11 && zoom < 13) {
    fillColor = 0xdedede;
    visible = true;
  }

  return { visible, "fill-color": fillColor };
};

const configurePoisStyle = (zoom, props) => {
  let visible = false;

  if (zoom >= props["pmap:min_zoom"]) {
    visible = true;
  }

  return { visible };
};

const configureRoadsStyle = (zoom, props) => {
  let lineWidth = 2;
  let lineColor = 0x727272;
  if (props["pmap:kind"] === "major_road") {
    lineWidth = zoom >= 15 ? 6 : zoom >= 12 ? 4 : zoom >= 10 ? 3 : 2;
    lineColor = 0x868686;
  } else if (props["pmap:kind"] === "medium_road") {
    lineWidth = zoom >= 14 ? 5 : zoom >= 12 ? 3 : 2;
    lineColor = 0x787878;
  } else if (props["pmap:kind"] === "minor_road") {
    lineWidth = zoom >= 14 ? 3 : 2;
    lineColor = 0x727272;
  }
  return {
    "line-width": lineWidth,
    "line-color": lineColor,
  };
};

const configureTransitStyle = (zoom, props) => ({
  "line-width": 1,
  "line-color": 0x555555,
  "fill-color": 0xf2efe9,
});

const configureWaterStyle = (zoom, props) => ({
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
