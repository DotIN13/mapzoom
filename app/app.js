import * as router from "@zos/router";
import { pauseDropWristScreenOff, resetDropWristScreenOff } from "@zos/display";
import { LocalStorage } from "@zos/storage";
import { showToast } from "@zos/interaction";
import { getText } from "@zos/i18n";
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

      // Hack for a bug in the current implementation of @zeppos/zml,
      // where calls are not received if the device haven't requested first.
      this.request({
        method: "INIT_COMMS",
      }).catch((err) => {
        logger.error(err);
      });
    },
    onCall(req) {
      let { method, params } = req;

      logger.debug("Receive call:", method);

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

        showToast({
          content: getText(
            result === 0 ? "mapDeleteSuccess" : "mapDeleteFailed"
          ),
        });

        logger.debug(
          "Delete",
          params.filename,
          result === 0 ? "success" : "failed"
        );
      }
    },
    onDestroy() {
      resetDropWristScreenOff();
    },
  })
);
