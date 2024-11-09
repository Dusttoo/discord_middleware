export const MODULE_NAME = "discord-bot-integration";
console.log(`${MODULE_NAME} module loading...`);

import { registerHooks } from "./hooks.js";
import { setupSocket } from "./socket.js";
import { registerSettings } from "./settings.js";

Hooks.once("init", async () => {
  console.log(`${MODULE_NAME} | Initializing module`);

  registerSettings();
});

Hooks.once("ready", () => {
  console.log(`${MODULE_NAME} | Foundry ready, setting up hooks and socket`);

  registerHooks();

  setupSocket();
});