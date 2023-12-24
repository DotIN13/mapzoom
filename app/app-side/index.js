import { BaseSideService } from "@zeppos/zml/base-side";

import { fileDownloadModule } from "./file-download-module";
import { fileTransferModule } from "./file-transfer-module";

const logger = Logger.getLogger("message-app-side");

AppSideService(
  BaseSideService({
    ...fileDownloadModule,
    ...fileTransferModule,
    onInit() {
      logger.log("app side service invoke onInit");
    },
    onRun() {
      logger.log("app side service invoke onRun");
    },
    onDestroy() {
      logger.log("app side service invoke onDestroy");
    },
    onReceivedFile(file) {
      logger.log(`received file: ${file}`);
    },
    onSettingsChange({ key, newValue, oldValue }) {
      // logger.log(key, newValue);
      if (!newValue) return;

      if (key === "download") {
        settings.settingsStorage.removeItem(key);

        this.call({
          method: "DOWNLOAD_MAP",
          params: newValue,
        });
      }

      if (key === "activate") {
        settings.settingsStorage.removeItem(key);

        this.call({
          method: "ACTIVATE_MAP",
          params: newValue,
        });
      }

      if (key === "delete") {
        settings.settingsStorage.removeItem(key);

        this.call({
          method: "DELETE_MAP",
          params: newValue,
        });
      }
    },
    async onRequest(req, res) {
      const { method: action, params } = req;

      if (action == "GET_MAP") {
        let mapEntry, url, filePath;

        try {
          mapEntry = JSON.parse(params);

          const { filename } = mapEntry;
          filePath = `data://pmtiles/${filename}`;

          // Fetch OSS file url
          const res = await fetch({
            url: `https://mapzoom.wannaexpresso.com/api/download-map?filePath=${filename}`,
            // url: `http://localhost:3000/api/download-map?filePath=${filename}`,
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Origin: "https://zepp-os.zepp.com",
            },
          });
          const resJSON = await res.json();
          if (resJSON.status !== "success")
            throw Error("Unable to fetch file URL", res.message);

          url = resJSON.url;
        } catch (err) {
          logger.error(err);
          return res(null, { status: "error", message: err });
        }

        const downloadTask = this.downloadFile(url, filePath);

        downloadTask.onSuccess = (e) => {
          // logger.debug(e.filePath, e.tempFilePath, e.statusCode);

          // Respond with error if no 200 OK was received
          if (e.statusCode !== 200) {
            return res(null, {
              status: "error",
              data: { filePath: null },
            });
          }

          this.transferFile(e.filePath, {
            type: "application/vnd.pmtiles",
            name: filePath,
          });
        };

        return res(null, { status: "success", data: "" });
      }

      if (action == "GET_TILE") {
        const { url, filePath } = params;
        const downloadTask = this.downloadFile(encodeURI(url), filePath, 6000);

        downloadTask.onFail = (e) => {
          res(null, {
            status: "error",
            data: { filePath: null },
          });
        };

        downloadTask.onSuccess = (e) => {
          // logger.debug(e.filePath, e.tempFilePath, e.statusCode);

          // Respond with error if no 200 OK was received
          if (e.statusCode !== 200) {
            return res(null, {
              status: "error",
              data: { filePath: null },
            });
          }

          const transferTask = this.transferFile(e.filePath, {
            type: "application/octet-stream",
            name: filePath,
          });

          transferTask.on("change", (e) => {
            if (e.target.readyState === "transferred") {
              res(null, {
                status: "success",
                data: { filePath: e.target.filePath },
              });
            }
          });
        };

        return;
      }

      res(null, { status: "error", message: "Unknown action" });
    },
  })
);
