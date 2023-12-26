import * as ui from "@zos/ui";
import * as router from "@zos/router";
import { px } from "@zos/utils";
import { mkdirSync, readdirSync, renameSync } from "@zos/fs";
import { getText } from "@zos/i18n";

import { BasePage } from "@zeppos/zml/base-page";

import { DEVICE_HEIGHT, DEVICE_WIDTH } from "../../../utils/globals";
import { logger } from "../../../utils/logger";

Page(
  BasePage({
    state: {},

    onInit(params) {
      console.log("Map transfer page init invoked.");
      this.downloadParams = params === "undefined" ? undefined : params;
    },

    onReceivedFile(fileHandler) {
      logger.debug("File received %s", fileHandler.toString());

      fileHandler.on("progress", (progress) => {
        const { loadedSize: loaded, fileSize: total } = progress.data;
        const numProgress =
          loaded === total ? 100 : Math.floor((loaded * 100) / total);
        logger.debug("File progress: ", numProgress);
        this.textWidget.setProperty(
          ui.prop.TEXT,
          `${numProgress}% ${getText("transferred")}...`
        );
        if (numProgress === 100) {
          logger.debug("Complete.");
        }
      });

      fileHandler.on("change", (event) => {
        logger.debug("File status: ", event.data.readyState);
        if (event.data.readyState === "transferred") {
          logger.debug(
            "Transfer success: ",
            fileHandler.filePath,
            "File name: ",
            fileHandler.fileName
          );

          this.textWidget.setProperty(
            ui.prop.TEXT,
            getText("mapTransferFinishing")
          );

          const mkdirResult = this.createMapDir();
          if (!mkdirResult)
            return this.textWidget.setProperty(
              ui.prop.TEXT,
              getText("mapDownloadFailed")
            );

          const renameResult = renameSync({
            oldPath: fileHandler.filePath,
            newPath: `data://download/pmtiles/${fileHandler.fileName}`,
          });
          if (renameResult !== 0)
            return this.textWidget.setProperty(
              ui.prop.TEXT,
              getText("mapDownloadFailed")
            );

          logger.debug("renameSync success");
          this.textWidget.setProperty(
            ui.prop.TEXT,
            getText("mapDownloadComplete")
          );
        }
      });
    },

    createMapDir() {
      const readRes = readdirSync({
        path: "data://download/pmtiles",
      });
      if (readRes === 0) return true;

      // Create the directory if it does not exist
      logger.debug("PMTiles directory doesn't exist, creating...");
      const result = mkdirSync({
        path: "data://download/pmtiles",
      });
      logger.debug("mkdirSync", result === 0 ? "success" : "failed");
      if (result === 0) return true;

      return false;
    },

    build() {
      console.log("Map transfer page build invoked.");

      this.createMapDir();

      this.textWidget = ui.createWidget(ui.widget.TEXT, {
        x: px(80),
        y: px(DEVICE_HEIGHT / 2 - 220 / 2),
        w: px(DEVICE_WIDTH - 2 * 80),
        h: px(220),
        color: 0xffffff,
        text_size: px(32),
        align_h: ui.align.CENTER_H,
        align_v: ui.align.CENTER_V,
        text_style: ui.text_style.WRAP,
        alpha: 0x99,
        enable: false,
        text: getText("mapTransferIntro"),
      });

      // Back button
      const backButton = ui.createWidget(ui.widget.BUTTON, {
        x: px(22),
        y: px((DEVICE_HEIGHT - 64) / 2),
        w: px(64),
        h: px(64),
        normal_src: "image/left-arrow.png",
        press_src: "image/left-arrow.png",
        click_func: () => {
          router.replace({ url: "page/gt/home/index.page" });
        },
      });

      // const downloadButtom = ui.createWidget(ui.widget.BUTTON, {
      //   x: (DEVICE_WIDTH - px(200)) / 2,
      //   y: DEVICE_HEIGHT - px(128),
      //   w: px(200),
      //   h: px(60),
      //   radius: px(30),
      //   normal_color: 0x00315e,
      //   press_color: 0xa5c8ff,
      //   text: "Download",
      //   click_func: () => {
      //     this.textWidget.setProperty(ui.prop.TEXT, "Downloading...");

      //     this.request({
      //       method: "GET_MAP",
      //     }).catch((e) => {
      //       logger.error(e);
      //       this.textWidget.setProperty(ui.prop.TEXT, "Download error.");
      //     });
      //   },
      // });

      // Do nothing if no download tasks were assigned
      if (!this.downloadParams || this.downloadParams === "") return;

      this.textWidget.setProperty(ui.prop.TEXT, getText("mapDownloading"));

      this.request({
        method: "GET_MAP",
        params: this.downloadParams,
      }).catch((err) => {
        logger.error(err);
        this.textWidget.setProperty(ui.prop.TEXT, "Download error.");
      });
    },

    onDestroy() {
      console.log("page onDestroy invoked.");
    },
  })
);
