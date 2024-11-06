module.exports.registerSettings = function registerSettings() {
  game.settings.register("discord-bot-integration", "useEnv", {
    name: "Use .env for Development",
    hint: "Enable to load environment variables from a .env file during development.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("discord-bot-integration", "discordApiToken", {
    name: "Discord API Token",
    hint: "Enter the Discord API token for the bot (required for production).",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register("discord-bot-integration", "middlewareUrl", {
    name: "Middleware URL",
    hint: "The URL for your FastAPI middleware that connects to Discord.",
    scope: "world",
    config: true,
    type: String,
    default: "http://localhost:8000",
  });

  game.settings.register("discord-bot-integration", "debugMode", {
    name: "Enable Debug Mode",
    hint: "Enable verbose logging for debugging purposes.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("discord-bot-integration", "notificationChannel", {
    name: "Discord Notification Channel ID",
    hint: "ID of the Discord channel where notifications will be sent.",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });
}
