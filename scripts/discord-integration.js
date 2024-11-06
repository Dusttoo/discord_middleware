const MODULE_NAME = "discord-bot-integration";

console.log(`${MODULE_NAME} module loading...`);

Hooks.once("socketlib.ready", () => {
  console.log(`${MODULE_NAME} socketlib ready`);

  game.socket.on(`module.${MODULE_NAME}`, async (data) => {
    console.log("Received data from Discord bot:", data);

    if (data.action === "getActor") {
      const actor = game.actors.get(data.actorId);
      if (actor) {
        game.socket.emit(`module.${MODULE_NAME}`, {
          action: "actorData",
          actorData: actor.toJSON(),
          requestId: data.requestId  
        });
      } else {
        console.warn(`Actor with ID ${data.actorId} not found`);
      }
    }
  });
});

function sendToDiscord(action, data = {}) {
  game.socket.emit(`module.${MODULE_NAME}`, { action, ...data });
}

game.modules.get(MODULE_NAME).sendToDiscord = sendToDiscord;