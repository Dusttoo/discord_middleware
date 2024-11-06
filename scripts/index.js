const MODULE_NAME = "discord-bot-integration";
console.log(`${MODULE_NAME} module loading...`);

Hooks.once("init", function () {
  console.log("Initializing Discord Bot Integration module");

  if (typeof registerSettings === "function") registerSettings();
  if (typeof registerHooks === "function") registerHooks();
  if (typeof setupSocket === "function") setupSocket();

  game.discordBotIntegration = DiscordBotIntegration || {};

  console.log(`${MODULE_NAME} initialized.`);
});

Hooks.once("ready", () => {
  console.log(`${MODULE_NAME} ready.`);
});