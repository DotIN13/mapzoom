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
    async onRequest(req, res) {
      const { method: action, params } = req;

      if (action == "GET_MAP") {
        const { fileUrl = "https://x0.at/qDOu.pmtiles" } = params || {};
        const filePath = "data://example.pmtiles";
        const downloadTask = this.downloadFile(encodeURI(fileUrl), filePath);

        downloadTask.onSuccess = (e) => {
          // logger.debug(e.filePath, e.tempFilePath, e.statusCode);
          this.transferFile(e.filePath, { type: "pmtiles", name: filePath });
        };

        res(null, { status: "success", data: "" });
        return;
      }

      if (action == "GET_TILE") {
        const { url } = params || {};

        fetch({
          url,
          method: "GET",
          headers: {
            "Content-Type": "application/x-protobuf",
            "Accept-Encoding": "gzip",
          },
        })
          .then((resp) => resp.arrayBuffer())
          .then((resp) => {
            resp = Buffer.from(resp);
            logger.log("Tile data size:", resp.length);

            res(null, resp);
          })
          .catch((e) => {
            logger.warn(e.message);

            return res(null, {
              status: "error",
              message: e.message,
            });
          });

        return;
      }

      res(null, { status: "error", message: "unknown action" });
    },
  })
);
