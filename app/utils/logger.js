import { log } from "@zos/utils";

export const logger = log.getLogger("mapzoom");

export const timer = (func, funcName, purpose = undefined, ...args) => {
  const start = Date.now();
  const result = func(...args);
  const end = Date.now();
  logger.info(
    `Function ${funcName} took ${end - start} ms to ${purpose || "run"}.`
  );
  return result;
};
