export function registerHooks() {
    const MODULE_NAME = "discord-bot-integration";
  
    // Actor Updates (e.g., HP, Inventory)
    Hooks.on("updateActor", (actor, data, options, userId) => {
      console.log(`Actor updated: ${actor.name}`);
      game.socket.emit(`module.${MODULE_NAME}`, {
        action: "actorUpdated",
        actorId: actor.id,
        actorData: actor.toJSON(),
      });
    });
  
    // Actor Item Updates (Inventory or Equipment changes)
    Hooks.on("createItem", (item, options, userId) => {
      const actor = item.parent;
      if (actor) {
        console.log(`Item added to ${actor.name}'s inventory: ${item.name}`);
        game.socket.emit(`module.${MODULE_NAME}`, {
          action: "itemAdded",
          actorId: actor.id,
          itemData: item.toJSON(),
        });
      }
    });
  
    Hooks.on("deleteItem", (item, options, userId) => {
      const actor = item.parent;
      if (actor) {
        console.log(`Item removed from ${actor.name}'s inventory: ${item.name}`);
        game.socket.emit(`module.${MODULE_NAME}`, {
          action: "itemRemoved",
          actorId: actor.id,
          itemId: item.id,
        });
      }
    });
  
    // Combat Tracking Hooks (e.g., Initiative, Turn Tracking)
    Hooks.on("updateCombat", (combat, data, options, userId) => {
      console.log(`Combat updated: Combat ID ${combat.id}`);
      game.socket.emit(`module.${MODULE_NAME}`, {
        action: "combatUpdated",
        combatants: combat.combatants.map(c => ({
          id: c.id,
          name: c.name,
          initiative: c.initiative
        })),
      });
    });
  
    // Combat Turn Notification
    Hooks.on("combatTurn", (combat, turnData) => {
      const currentCombatant = combat.combatant;
      if (currentCombatant) {
        console.log(`Turn notification for: ${currentCombatant.actor.name}`);
        game.socket.emit(`module.${MODULE_NAME}`, {
          action: "turnNotification",
          combatantName: currentCombatant.actor.name,
          combatantId: currentCombatant.actor.id,
        });
      }
    });
  
    // Chat Message Relay
    Hooks.on("createChatMessage", (chatMessage, options, userId) => {
      const message = chatMessage.data.content;
      console.log(`Relaying message to Discord: ${message}`);
      game.socket.emit(`module.${MODULE_NAME}`, {
        action: "chatRelayToDiscord",
        message,
      });
    });
  
    // Spell and Ability Usage
    Hooks.on("useItem", (item, options) => {
      const actor = item.actor;
      if (actor && (item.type === "spell" || item.type === "feat")) {
        console.log(`Spell or ability used: ${item.name}`);
        game.socket.emit(`module.${MODULE_NAME}`, {
          action: item.type === "spell" ? "spellUsed" : "abilityUsed",
          casterName: actor.name,
          itemName: item.name,
          description: item.data.data.description.value,
        });
      }
    });
  
    // Long Rest and Short Rest Hooks
    Hooks.on("restComplete", (actor, restData) => {
      const restType = restData.longRest ? "longRest" : "shortRest";
      console.log(`${actor.name} completed a ${restType}`);
      game.socket.emit(`module.${MODULE_NAME}`, {
        action: restType,
        actorId: actor.id,
        actorName: actor.name,
      });
    });
  }