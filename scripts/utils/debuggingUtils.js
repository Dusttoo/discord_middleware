export function debugLog(message, ...optionalParams) {
    const debugMode = game.settings.get(MODULE_NAME, "debugMode"); 
    if (debugMode) {
      console.log(`[${MODULE_NAME} Debug] ${message}`, ...optionalParams);
    } else {
        console.log("[Discord Bot Integration] Debug mode is disabled.");
    }
  }