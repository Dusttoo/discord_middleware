import { MODULE_NAME } from "./index.js";
import { debugLog } from "./utils/debuggingUtils";
export function registerHooks() {
  
    Hooks.on("updateActor", (actor, data, options, userId) => {
      debugLog(`${MODULE_NAME} | Actor updated: ${actor.name}`);
      game.socket.emit(`module.${MODULE_NAME}`, {
        action: "actorUpdated",
        actorId: actor.id,
        actorData: actor.toJSON(),
      });
    });
  
    Hooks.on("createItem", (item, options, userId) => {
      debugLog(`${MODULE_NAME} | Item created: ${item.name}`);
      const actor = item.parent;
      if (actor) {
        debugLog(`${MODULE_NAME} | Item added to ${actor.name}'s inventory: ${item.name}`);
        game.socket.emit(`module.${MODULE_NAME}`, {
          action: "itemAdded",
          actorId: actor.id,
          itemData: item.toJSON(),
        });
      }
    });
  
    Hooks.on("deleteItem", (item, options, userId) => {
      debugLog(`${MODULE_NAME} | Item deleted: ${item.name}`);
      const actor = item.parent;
      if (actor) {
        debugLog(`${MODULE_NAME} | Item removed from ${actor.name}'s inventory: ${item.name}`);
        game.socket.emit(`module.${MODULE_NAME}`, {
          action: "itemRemoved",
          actorId: actor.id,
          itemId: item.id,
        });
      }
    });
  
    Hooks.on("updateCombat", (combat, data, options, userId) => {
      const combatantsData = combat.combatants.map((combatant) => ({
        id: combatant.id,
        name: combatant.name,
        initiative: combatant.initiative,
        hp: combatant.actor?.system.attributes.hp.value, 
        statusEffects: combatant.actor?.effects.map(effect => effect.label), 
      }));
      debugLog(`${MODULE_NAME} | Combat updated: Combat ID ${combat.id}`);
      const currentCombatant = combat.combatant.actor.name;
      game.socket.emit(`module.${MODULE_NAME}`, {
        action: "combatUpdated",
        combatId: combat.id,
        round: combat.round,
        turn: combat.turn,
        combatants: combatantsData,
        currentCombatant
      });
    });
    
    Hooks.on("combatTurn", (combat) => {
      const currentCombatant = combat.combatant;
      if (currentCombatant) {
        debugLog(`${MODULE_NAME} | Turn notification for: ${currentCombatant.actor.name}`);
        
        game.socket.emit(`module.${MODULE_NAME}`, {
          action: "turnNotification",
          combatantName: currentCombatant.actor.name,
          combatantId: currentCombatant.actor.id,
          initiative: currentCombatant.initiative,
          round: combat.round,
          turn: combat.turn,
        });
      }
    });
  
    Hooks.on("createChatMessage", (chatMessage, options, userId) => {
      const message = chatMessage.system.content; 
      debugLog(`${MODULE_NAME} | Relaying message to Discord1: ${message}`);
      game.socket.emit(`module.${MODULE_NAME}`, {
        action: "chatRelayToDiscord",
        message,
      });
    });
  
    Hooks.on("useItem", (item, options) => {
      debugLog(`${MODULE_NAME} | Item used: ${item.name}`);
      const actor = item.actor;
      if (actor && (item.type === "spell" || item.type === "feat")) {
        debugLog(`${MODULE_NAME} | Spell or ability used: ${item.name}`);
        game.socket.emit(`module.${MODULE_NAME}`, {
          action: item.type === "spell" ? "spellUsed" : "abilityUsed",
          casterName: actor.name,
          itemName: item.name,
          description: item.data.data.description.value,
        });
      }
    });
  
    Hooks.on("restComplete", (actor, restData) => {
      debugLog(`${MODULE_NAME} | Rest completed: ${actor.name}`);
      const restType = restData.longRest ? "longRest" : "shortRest";
      debugLog(`${MODULE_NAME} | ${actor.name} completed a ${restType}`);
      game.socket.emit(`module.${MODULE_NAME}`, {
        action: restType,
        actorId: actor.id,
        actorName: actor.name,
      });
    });

  debugLog(`${MODULE_NAME} hooks registered`);

  }