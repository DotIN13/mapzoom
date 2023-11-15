import * as ui from "@zos/ui";
import * as router from "@zos/router";
import { px } from "@zos/utils";
import { renameSync, readdirSync } from "@zos/fs";

import { BasePage } from "@zeppos/zml/base-page";

import { DEVICE_HEIGHT, DEVICE_WIDTH } from "../../../utils/globals";
import { logger } from "../../../utils/logger";

Page(
  BasePage({
    state: {},

    onInit() {},

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
          this.textWidget.setProperty(ui.prop.TEXT, "Map download success.");
        }
      });
    },

    build() {
      console.log("Map transfer page init invoked.");

      this.textWidget = ui.createWidget(ui.widget.TEXT, {
        x: px(56),
        y: px(100),
        w: DEVICE_WIDTH - 2 * px(56),
        h: px(220),
        color: 0xffffff,
        text_size: px(36),
        align_h: ui.align.CENTER_H,
        align_v: ui.align.CENTER_V,
        text_style: ui.text_style.WRAP,
        alpha: 0x99,
        enable: false,
        text: "Click the button below to download the example map.",
      });

      // Back button
      const imgButton = ui.createWidget(ui.widget.BUTTON, {
        x: 22,
        y: (DEVICE_HEIGHT - 32) / 2,
        w: -1,
        h: -1,
        normal_src: "image/left-arrow.png",
        press_src: "image/left-arrow.png",
        click_func: () => {
          router.replace({ url: "page/gt/home/index.page" });
        },
      });

      const downloadButtom = ui.createWidget(ui.widget.BUTTON, {
        x: (DEVICE_WIDTH - 100) / 2,
        y: DEVICE_HEIGHT - 32,
        w: 100,
        h: 32,
        normal_src: "image/left-arrow.png",
        press_src: "image/left-arrow.png",
        click_func: () => {
          this.textWidget.setProperty(ui.prop.TEXT, "Downloading...");

          this.request({
            method: "download.map",
          }).catch((e) => {
            logger.error(e);
            this.textWidget.setProperty(ui.prop.TEXT, "Download error.");
          });
        },
      });
    },

    onDestroy() {
      console.log("page onDestroy invoked.");
    },
  })
);
