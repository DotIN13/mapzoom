import * as router from "@zos/router";
import { pauseDropWristScreenOff, resetDropWristScreenOff } from "@zos/display";
import { LocalStorage } from "@zos/storage";
import { rmSync } from "@zos/fs";
import { BaseApp } from "@zeppos/zml/base-app";

import { logger } from "./utils/logger";

const localStorage = new LocalStorage();

App(
  BaseApp({
    globalData: {
      localStorage,
    },
    onCreate() {
      pauseDropWristScreenOff({ duration: 0 });
    },
    onCall(req) {
      let { method, params } = req;

      // logger.debug(method)

      // On DOWNLOAD_MAP, directly navigate to map-transfer page
      if (method === "DOWNLOAD_MAP") {
        router.replace({
          url: "page/gt/map-transfer/index.page",
          params,
        });
      }

      if (method === "ACTIVATE_MAP") {
        try {
          params = JSON.parse(params);
        } catch (err) {
          logger.error(err);
        }

        localStorage.setItem("active-map", params.filename);
      }

      if (method === "DELETE_MAP") {
        try {
          params = JSON.parse(params);
        } catch (err) {
          logger.error(err);
        }

        const result = rmSync({
          path: `data://download/pmtiles/${params.filename}`,
        });

        logger.debug("rmSync", result === 0 ? "success" : "failed");
      }
    },
    onDestroy(opts) {
      resetDropWristScreenOff();
    },
  })
);
