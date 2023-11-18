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
      const [, action] = req.method.split(".");
      if (action == "map") {
        const { fileUrl = "https://x0.at/FeWi.pmtiles" } = req.params || {};
        const filePath = "data://example.pmtiles";
        const downloadTask = this.downloadFile(encodeURI(fileUrl), filePath);

        downloadTask.onSuccess = (e) => {
          logger.debug(e.filePath, e.tempFilePath, e.statusCode);
          this.transferFile(e.filePath, { type: "pmtiles", name: filePath });
        };

        res(null, { status: "success", data: "" });
        return;
      }

      res(null, { status: "error", message: "unknown action" });
    },
  })
);
