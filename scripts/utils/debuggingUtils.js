import { MODULE_NAME } from "../index.js";
export function debugLog(message, ...optionalParams) {
  if (!game || !game.settings) {
    console.warn(`[${MODULE_NAME} Debug] Game settings not available`);
    return;
  }
  const debugMode = game.settings.get(MODULE_NAME, "debugMode");
  if (debugMode) {
    console.log(`[${MODULE_NAME} Debug] ${message}`, ...optionalParams);
  } else {
    console.log("[Discord Bot Integration] Debug mode is disabled.");
  }
}
