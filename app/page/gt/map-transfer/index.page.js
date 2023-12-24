import * as ui from "@zos/ui";
import * as router from "@zos/router";
import { px } from "@zos/utils";
import { mkdirSync, readdirSync, renameSync } from "@zos/fs";

import { BasePage } from "@zeppos/zml/base-page";

import { DEVICE_HEIGHT, DEVICE_WIDTH } from "../../../utils/globals";
import { logger } from "../../../utils/logger";

Page(
  BasePage({
    state: {},

    onInit(params) {
      console.log("Map transfer page init invoked.");
      this.downloadParams = params;
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
          `${numProgress}% transferred...`
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
            "Transfer done, finishing..."
          );

          const result = renameSync({
            oldPath: fileHandler.filePath,
            newPath: `data://download/pmtiles/${fileHandler.fileName}`,
          });

          if (result === 0) {
            logger.debug("renameSync success");
            this.textWidget.setProperty(ui.prop.TEXT, "Map download complete.");
          } else {
            this.textWidget.setProperty(
              ui.prop.TEXT,
              "Map download failed, please retry."
            );
          }
        }
      });
    },

    build() {
      console.log("Map transfer page build invoked.");

      const readRes = readdirSync({
        path: "data://download/pmtiles",
      });

      // Create the directory if it does not exist
      if (readRes === undefined) {
        logger.debug("PMTiles directory doesn't exist, creating...");

        const result = mkdirSync({
          path: "data://download/pmtiles",
        });

        logger.debug("mkdirSync", result === 0 ? "success" : "failed");
      }

      this.textWidget = ui.createWidget(ui.widget.TEXT, {
        x: px(72),
        y: px(DEVICE_HEIGHT / 2 - 220 / 2),
        w: px(DEVICE_WIDTH - 2 * 72),
        h: px(220),
        color: 0xffffff,
        text_size: px(32),
        align_h: ui.align.CENTER_H,
        align_v: ui.align.CENTER_V,
        text_style: ui.text_style.WRAP,
        alpha: 0x99,
        enable: false,
        text: "Click the button below to download the example map.",
      });

      // Back button
      const backButton = ui.createWidget(ui.widget.BUTTON, {
        x: px(22),
        y: (DEVICE_HEIGHT - px(32)) / 2,
        w: -1,
        h: -1,
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

      this.textWidget.setProperty(ui.prop.TEXT, "Downloading...");

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
