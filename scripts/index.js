const MODULE_NAME = "discord-bot-integration";
console.log(`${MODULE_NAME} module loading...`);

const DiscordBotIntegration = {};

function debugLog(message, ...optionalParams) {
  const debugMode = game.settings.get("discord-bot-integration", "debugMode");
  if (debugMode) {
    console.log(`[Discord Bot Integration Debug] ${message}`, ...optionalParams);
  }
}

Hooks.once("init", function () {
  console.log("Initializing Discord Bot Integration module");

  require("./settings.js").registerSettings();

  game.discordBotIntegration = DiscordBotIntegration;

  console.log(`${MODULE_NAME} initialized.`);
});

Hooks.once("ready", () => {
  console.log(`${MODULE_NAME} ready.`);
  require("./hooks.js").registerHooks(); 
  require("./socket.js").setupSocket();
});