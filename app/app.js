import { BaseApp } from "@zeppos/zml/base-app";
import { pauseDropWristScreenOff, resetDropWristScreenOff } from "@zos/display";

App(
  BaseApp({
    globalData: {},
    onCreate() {
      pauseDropWristScreenOff({ duration: 0 });
    },
    onDestroy(opts) {
      resetDropWristScreenOff();
    },
  })
);
