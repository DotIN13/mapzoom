import { gettext as getText } from "i18n";

AppSettingsPage({
  state: {
    maps: {}, // assuming this is loaded with the initial map data
    props: {},
  },
  downloadMap(mapKey) {
    // Logic to download/update the map file
    const mapEntry = this.state.maps[mapKey];
    mapEntry.downloaded = true;
    mapEntry.localFilename = mapEntry.filename;
    mapEntry.localCreatedAt = mapEntry.createdAt;
    mapEntry.localVersion = mapEntry.version;

    // Send download instructions to the side service
    this.state.props.settingsStorage.setItem(
      "download",
      JSON.stringify(this.state.maps[mapKey])
    );

    this.setActiveMap(mapKey);
    this.setItem();
  },
  deleteMap(mapKey) {
    // Logic to delete the map file
    this.state.maps[mapKey].downloaded = false;

    // Send delete instructions to the side service
    this.state.props.settingsStorage.setItem(
      "delete",
      JSON.stringify(this.state.maps[mapKey])
    );
    this.setItem();
  },
  setActiveMap(mapKey) {
    // Set the selected map as active and others as inactive
    Object.keys(this.state.maps).forEach((key) => {
      this.state.maps[key].active = key === mapKey;
    });

    // Send activation instructions to the side service
    this.state.props.settingsStorage.setItem(
      "activate",
      JSON.stringify(this.state.maps[mapKey])
    );
    this.setItem();
  },
  setItem() {
    // Filter and keep only the maps that are downloaded
    const filteredMaps = Object.fromEntries(
      Object.entries(this.state.maps).filter(
        ([_, mapDetails]) => mapDetails.downloaded
      )
    );

    // Convert the filtered maps object to a string
    const newString = JSON.stringify(filteredMaps);

    // Update the settings storage with the stringified maps
    this.state.props.settingsStorage.setItem("maps", newString);
  },
  setState(props) {
    this.state.props = props;
  },
  // Merge local and remote map list
  async initState() {
    // Only do this once when the settings is opened
    if (this.initialized) return;

    this.initialized = true;

    const localData = this.state.props.settingsStorage.getItem("maps");
    const localMaps = localData ? JSON.parse(localData) : {};

    let onlineMaps = {};
    try {
      const res = await fetch(
        "https://mapzoom.wannaexpresso.com/api/list-maps"
      );
      const resJson = await res.json();
      onlineMaps = resJson.maps;
    } catch (err) {
      console.log("Downloaded online map entries error", err);
    }

    console.log("Downloaded online map entries success", onlineMaps);

    this.state.maps = mergeMaps(onlineMaps, localMaps);
    this.setItem();
  },
  // build is called everytime the state is modified
  build(props) {
    this.setState(props);

    // The build function is called when settings is opened.
    // Then the state update in this function will call build again to draw the merged map list.
    this.initState();

    const heiti =
      '-apple-system, "Noto Sans", "Helvetica Neue", Helvetica, "Nimbus Sans L", Arial, "Liberation Sans", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Source Han Sans SC", "Source Han Sans CN", "Microsoft YaHei", "Wenquanyi Micro Hei", "WenQuanYi Zen Hei", "ST Heiti", SimHei, "WenQuanYi Zen Hei Sharp", sans-serif';

    const contentItems = [
      View(
        {
          style: {
            fontWeight: "bold",
            fontSize: "24px",
            color: "#007aff",
            margin: "20px 0",
            fontFamily: heiti,
          },
        },
        [getText("appName")]
      ),
    ];

    Object.entries(this.state.maps).forEach(([mapKey, mapDetails]) => {
      contentItems.push(
        View(
          {
            style: {
              padding: "10px",
              borderBottom: "1px solid #ccc",
              backgroundColor: "white",
              fontFamily: heiti,
            },
          },
          [
            // Row Container
            View(
              {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 10px",
                },
              },
              [
                // Map Name
                Text(
                  {
                    style: {
                      fontWeight: "bold",
                      fontSize: "15px",
                      marginBottom: "0",
                    },
                  },
                  [getText(mapDetails.location)]
                ),
                View(
                  {
                    style: {
                      display: "flex",
                      justifyContent: "end",
                      alignItems: "center",
                      gap: "10px",
                    },
                  },
                  [
                    // Download/Update button
                    !mapDetails.downloaded &&
                      Button({
                        label: getText("download"),
                        style: iosButtonStyle(
                          mapDetails.downloaded ? "primary" : "default"
                        ),
                        onClick: () => this.downloadMap(mapKey),
                      }),
                    mapDetails.downloaded &&
                      mapDetails.updateAvailable &&
                      Button({
                        label: getText("update"),
                        style: iosButtonStyle(
                          mapDetails.downloaded ? "primary" : "default"
                        ),
                        onClick: () => this.downloadMap(mapKey),
                      }),
                    // Delete button
                    mapDetails.downloaded &&
                      Button({
                        label: getText("delete"),
                        style: iosButtonStyle("destructive"),
                        onClick: () => this.deleteMap(mapKey),
                      }),
                    // Set Active button
                    mapDetails.downloaded &&
                      Button({
                        label: mapDetails.active ? "Using" : "Use",
                        style: iosButtonStyle("default"),
                        onClick: () =>
                          !mapDetails.active && this.setActiveMap(mapKey),
                      }),
                  ]
                ),
              ]
            ),
          ]
        )
      );
    });

    contentItems.push(
      View(
        {
          style: {
            fontSize: "12px",
            color: "#8e8e93",
            margin: "20px 5px",
          },
        },
        [getText("downloadInstructions")]
      )
    );

    return View({ style: { padding: "20px", backgroundColor: "#efeff4" } }, [
      ...contentItems,
    ]);
  },
});

function iosButtonStyle(type) {
  const baseStyle = {
    fontSize: "14px",
    borderRadius: "15px",
    padding: "3px 15px",
    textAlign: "center",
    margin: "0",
  };

  switch (type) {
    case "primary":
      return { ...baseStyle, backgroundColor: "#007aff", color: "white" };
    case "destructive":
      return { ...baseStyle, backgroundColor: "#ff3b30", color: "white" };
    default:
      return { ...baseStyle, backgroundColor: "#f7f7f7", color: "#007aff" };
  }
}

function mergeMaps(onlineMaps, localMaps) {
  // Iterate over each entry in the local maps object
  Object.entries(localMaps).forEach(([key, localMap]) => {
    // Check if the map already exists in the online maps object
    if (onlineMaps[key]) {
      // Map exists online, merge local data
      onlineMaps[key].downloaded = localMap.downloaded;
      onlineMaps[key].active = localMap.active;
      onlineMaps[key].localFilename = localMap.localFilename;
      onlineMaps[key].localCreatedAt = localMap.localCreatedAt;
      onlineMaps[key].localVersion = localMap.localVersion;

      // Compare versions to check for updates
      if (onlineMaps[key].version !== localMap.localVersion) {
        onlineMaps[key].updateAvailable = true;
      } else {
        onlineMaps[key].updateAvailable = false;
      }
    } else {
      // Map doesn't exist online, add the local map to the online maps object
      onlineMaps[key] = localMap;
    }
  });

  return onlineMaps;
}
