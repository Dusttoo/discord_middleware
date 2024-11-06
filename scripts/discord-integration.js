const MODULE_NAME = "discord-bot-integration";

console.log(`${MODULE_NAME} module loading...`);

Hooks.once("socketlib.ready", () => {
  console.log(`${MODULE_NAME} socketlib ready`);

  game.socket.on(`module.${MODULE_NAME}`, async (data, ack) => {
    console.log("Received data from Discord bot:", data);

    if (data.action === "getActor") {
      const actor = game.actors.get(data.actorId);
      if (actor) {
        const response = {
          action: "actorData",
          actorData: actor.toJSON(),
          requestId: data.requestId
        };

        if (ack) {
          ack(response);
        }
        
        game.socket.emit(`module.${MODULE_NAME}`, response);
      } else {
        console.warn(`Actor with ID ${data.actorId} not found`);
      }
    }
  });
});

function sendToDiscord(action, data = {}) {
  game.socket.emit(`module.${MODULE_NAME}`, { action, ...data });
}