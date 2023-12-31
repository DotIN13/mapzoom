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

  if (props["pmap:kind"] === "country") {
    fillColor = 0xffffff;
    visible = true;
  }

  if (props["pmap:kind"] === "region") {
    fillColor = 0xfefefe;
    visible = true;
  }

  if (props["pmap:kind"] === "locality") {
    fillColor = 0xdedede;
    visible = true;
  }

  return { visible, "fill-color": fillColor };
};

const configurePoisStyle = (zoom, props) => {
  return {};
};

const configureRoadsStyle = (zoom, props) => {
  let lineWidth = 2;
  let lineColor = 0x727272;
  if (props["pmap:kind"] === "highway") {
    lineWidth = zoom >= 15 ? 6 : zoom >= 12 ? 4 : zoom >= 10 ? 3 : 2;
    lineColor = 0x808080;
  } else if (props["pmap:kind"] === "major_road") {
    lineWidth = zoom >= 15 ? 6 : zoom >= 12 ? 4 : zoom >= 10 ? 3 : 2;
    lineColor = 0x808080;
  } else if (props["pmap:kind"] === "medium_road") {
    lineWidth = zoom >= 14 ? 5 : zoom >= 12 ? 3 : 2;
    lineColor = 0x727272;
  } else if (props["pmap:kind"] === "minor_road") {
    lineWidth = zoom >= 14 ? 3 : 2;
    lineColor = 0x686868;
  }
  return {
    "line-width": lineWidth,
    "line-color": lineColor,
  };
};

const shanghaiMetroColors = {
  上海地铁1号线: 0xe3022a,
  上海地铁2号线: 0x82bf24,
  上海地铁3号线: 0xfbd601,
  上海地铁4号线: 0x461d85,
  上海地铁5号线: 0x944b9a,
  上海地铁6号线: 0xe20066,
  上海地铁7号线: 0xec6e00,
  上海地铁8号线: 0x0095d9,
  上海地铁9号线: 0x87c9ec,
  上海地铁10号线: 0xc7afd3,
  上海地铁11号线: 0x861a2a,
  上海地铁12号线: 0x00785f,
  上海地铁13号线: 0xe799c0,
  上海地铁14号线: 0x616020,
  上海地铁15号线: 0xcab48f,
  上海地铁16号线: 0x98d1c0,
  上海地铁17号线: 0xbc7970,
  上海地铁18号线: 0xc4984f,
  上海地铁19号线: 0x40924f,
  上海地铁20号线: 0x435b9e,
  上海地铁21号线: 0xd6c677,
  上海地铁23号线: 0xe0815e,
};

const configureTransitStyle = (zoom, props) => {
  // Default color
  let lineColor = 0xf39614;

  if (props["pmap:kind"] == "rail") {
    // Check if the name matches a Shanghai Metro line and assign the corresponding color
    if (props["name"] && shanghaiMetroColors[props["name"]]) {
      lineColor = shanghaiMetroColors[props["name"]];
    }
  }

  if (props["pmap:kind"] == "ferry") {
    lineColor = 0xa2cffe;
  }

  return {
    "line-width": zoom > 15 ? 3 : 2,
    "line-color": lineColor,
    "fill-color": 0xf2efe9,
  };
};

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
