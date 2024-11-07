import { debugLog } from "./utils/debuggingUtils";
export function registerHooks() {
    const MODULE_NAME = "discord-bot-integration";
  
    Hooks.on("updateActor", (actor, data, options, userId) => {
      debugLog(`Actor updated: ${actor.name}`);
      game.socket.emit(`module.${MODULE_NAME}`, {
        action: "actorUpdated",
        actorId: actor.id,
        actorData: actor.toJSON(),
      });
    });
  
    Hooks.on("createItem", (item, options, userId) => {
      debugLog(`Item created: ${item.name}`);
      const actor = item.parent;
      if (actor) {
        debugLog(`Item added to ${actor.name}'s inventory: ${item.name}`);
        game.socket.emit(`module.${MODULE_NAME}`, {
          action: "itemAdded",
          actorId: actor.id,
          itemData: item.toJSON(),
        });
      }
    });
  
    Hooks.on("deleteItem", (item, options, userId) => {
      debugLog(`Item deleted: ${item.name}`);
      const actor = item.parent;
      if (actor) {
        debugLog(`Item removed from ${actor.name}'s inventory: ${item.name}`);
        game.socket.emit(`module.${MODULE_NAME}`, {
          action: "itemRemoved",
          actorId: actor.id,
          itemId: item.id,
        });
      }
    });
  
    Hooks.on("updateCombat", (combat, data, options, userId) => {
      debugLog(`Combat updated: Combat ID ${combat.id}`);
      game.socket.emit(`module.${MODULE_NAME}`, {
        action: "combatUpdated",
        combatants: combat.combatants.map(c => ({
          id: c.id,
          name: c.name,
          initiative: c.initiative
        })),
      });
    });
  
    Hooks.on("combatTurn", (combat, turnData) => {
      debugLog(`Combat turn: ${turnData.turn}`);
      const currentCombatant = combat.combatant;
      if (currentCombatant) {
        debugLog(`Turn notification for: ${currentCombatant.actor.name}`);
        game.socket.emit(`module.${MODULE_NAME}`, {
          action: "turnNotification",
          combatantName: currentCombatant.actor.name,
          combatantId: currentCombatant.actor.id,
        });
      }
    });
  
    Hooks.on("createChatMessage", (chatMessage, options, userId) => {
      const message = chatMessage.data.content;
      debugLog(`Relaying message to Discord: ${message}`);
      game.socket.emit(`module.${MODULE_NAME}`, {
        action: "chatRelayToDiscord",
        message,
      });
    });
  
    Hooks.on("useItem", (item, options) => {
      debugLog(`Item used: ${item.name}`);
      const actor = item.actor;
      if (actor && (item.type === "spell" || item.type === "feat")) {
        debugLog(`Spell or ability used: ${item.name}`);
        game.socket.emit(`module.${MODULE_NAME}`, {
          action: item.type === "spell" ? "spellUsed" : "abilityUsed",
          casterName: actor.name,
          itemName: item.name,
          description: item.data.data.description.value,
        });
      }
    });
  
    Hooks.on("restComplete", (actor, restData) => {
      debugLog(`Rest completed: ${actor.name}`);
      const restType = restData.longRest ? "longRest" : "shortRest";
      debugLog(`${actor.name} completed a ${restType}`);
      game.socket.emit(`module.${MODULE_NAME}`, {
        action: restType,
        actorId: actor.id,
        actorName: actor.name,
      });
    });
  }