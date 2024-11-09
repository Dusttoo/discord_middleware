import { sendToDiscord } from "./socket";
import { debugLog } from "./utils/debuggingUtils";
import { MODULE_NAME } from "./index";
import {
  renderCharacterStats,
  renderInventory,
  renderSpellDetails,
  renderTurnNotification,
} from "./renderTemplates";
debugLog(`${MODULE_NAME} setting up api...`);

export async function getCharacterStats(request) {
  debugLog(`${MODULE_NAME} | getCharacterStats:`, request.actorId);

  if (!game.ready) {
    console.warn(
      `${MODULE_NAME} | Game is not ready. Cannot access actors yet.`
    );
    return { error: "Game is not ready. Please try again shortly." };
  }

  const actor = game.actors.get(request.actorId);
  debugLog(
    `${MODULE_NAME} | Current game.actors Map:`,
    Array.from(game.actors.entries())
  );

  if (!actor) {
    debugLog(
      `${MODULE_NAME} | Actor with ID ${request.actorId} not found`
    );
    console.warn(
      `Actor with ID ${request.actorId} not found in game.actors`
    );
    return { error: `Actor with ID ${request.actorId} not found` };
  }

  const abilities = Object.keys(actor.system.abilities).reduce((acc, key) => {
    acc[key] = {
      value: actor.system.abilities[key].value,
      mod: actor.system.abilities[key].mod,
      dc: actor.system.abilities[key].dc,
    };
    return acc;
  }, {});

  const characterStats = {
    name: actor.name,
    hp: {
      value: actor.system.attributes.hp.value,
      max: actor.system.attributes.hp.max,
      temp: actor.system.attributes.hp.temp || 0,
    },
    ac: actor.system.attributes.ac.value,
    abilities: abilities,
  };

  await renderCharacterStats(actor);

  return characterStats;
}

export async function getCharacterInventory(request) {
  debugLog(`${MODULE_NAME} | getCharacterInventory:`, request.actorId);
  const actor = game.actors.get(request.actorId);
  if (!actor) {
    debugLog(`${MODULE_NAME} | Actor with ID ${request.actorId} not found`);
    console.warn(`Actor with ID ${request.actorId} not found`);
    return [];
  }

  await renderInventory(actor);

  debugLog(`${MODULE_NAME} | getCharacterInventory:`, actor.items);

  return actor.items
    .filter((item) =>
      ["loot", "equipment", "weapon", "consumable", "tool"].includes(item.type)
    )
    .map((item) => ({
      name: item.name,
      quantity: item.system.quantity,
      equipped: item.system.equipped,
    }));
}

export async function getCharacterSpells(request) {
  debugLog(`${MODULE_NAME} | getCharacterSpells:`, request.actorId);
  const actor = game.actors.get(request.actorId);
  if (!actor) {
    debugLog(`${MODULE_NAME} | Actor with ID ${request.actorId} not found`);
    console.warn(`Actor with ID ${request.actorId} not found`);
    return [];
  }

  await renderSpellDetails(actor);
  debugLog(`${MODULE_NAME} | getCharacterSpells:`, actor.items);
  return actor.items
    .filter((item) => item.type === "spell")
    .map((spell) => ({
      name: spell.name,
      level: spell.system.level,
      description: spell.system.description.value,
      uses: spell.system.uses,
    }));
}

export function handleError(error) {
  debugLog(`${MODULE_NAME} | API Error:`, error);
  console.error("API Error:", error);
  return { success: false, message: error.message };
}

export async function sendCharacterSpells(request, requestId) {
  const actor = game.actors.get(request.actorId);
  if (!actor) {
    debugLog(`${MODULE_NAME} | Actor with ID ${request.actorId} not found`);
    console.warn(`Actor with ID ${request.actorId} not found`);
    return;
  }

  const spells = actor.items
    .filter((item) => item.type === "spell")
    .map((spell) => ({
      name: spell.name,
      level: spell.system.level,
      description: spell.system.description.value,
      uses: spell.system.uses,
    }));

  debugLog(`${MODULE_NAME} | sendCharacterSpells:`, request.actorId, spells);

  game.socket.emit(`module.discord-bot-integration`, {
    action: "characterSpells",
    requestId,
    spells,
  });
  return spells;
}

export async function updateCharacterHP(request) {
  const { actorId, hpChange, requestId } = request;
  debugLog(`${MODULE_NAME} | updateCharacterHP:`, actorId, Number(hpChange));

  try {
    const actor = game.actors.get(actorId);
    if (!actor) {
      debugLog(`${MODULE_NAME} | Actor with ID ${actorId} not found`);
      console.warn(`Actor with ID ${actorId} not found`);
      return;
    }

    const currentHP = actor.system.attributes.hp.value;
    const newHP = Math.max(0, currentHP + Number(hpChange));

    await actor.updateSource({ "system.attributes.hp.value": newHP });

    if (actor.sheet?.rendered) {
      actor.sheet.render(true);
    }

    await game.socket.emit("module.discord-bot-integration", {
      action: "characterHPUpdated",
      requestId,
      newHP,
    });

    return newHP;
  } catch (error) {
    console.error(
      `${MODULE_NAME} | Error updating HP for actor ID ${actorId}:`,
      error
    );
  }
}

export async function updateCharacterCondition(request) {
  const { actorId, condition, add, requestId } = request;
  const actor = game.actors.get(actorId);

  if (!actor) {
    debugLog(`${MODULE_NAME} | Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  try {
    // Fetch current active effects
    let existingEffects = actor.effects.map((effect) => effect.label);
    const conditionExists = existingEffects.includes(condition);

    if (add && !conditionExists) {
      // Add the condition if not already present
      await actor.createEmbeddedDocuments("ActiveEffect", [
        {
          label: condition,
          icon: getConditionIcon(condition), // Use helper function for flexible icon assignment
          origin: actor.uuid, // Set origin for more context in the effect
          "flags.core.statusId": condition, // Use status ID flag for consistent identification
          disabled: false,
        },
      ]);
    } else if (!add && conditionExists) {
      // Remove the condition if it exists
      const effect = actor.effects.find((e) => e.label === condition);
      await effect.delete();
    }

    // Refresh effects list after modification
    existingEffects = actor.effects.map((effect) => effect.label);

    debugLog(
      `${MODULE_NAME} | updateCharacterCondition:`,
      actorId,
      condition,
      add
    );

    // Emit socket event for integration
    game.socket.emit(`module.discord-bot-integration`, {
      action: "characterConditionUpdated",
      requestId,
      condition,
      status: add ? "added" : "removed",
    });

    return `${condition} ${add ? "added" : "removed"}`;
  } catch (error) {
    console.error(
      `${MODULE_NAME} | Error updating condition for actor ID ${actorId}:`,
      error
    );
    throw error;
  }
}

function getConditionIcon(condition) {
  const conditionIcons = {
    Poisoned: "icons/svg/status/poison.svg",
    Stunned: "icons/svg/status/stun.svg",
    Blinded: "icons/svg/status/blind.svg",
    // Add other conditions and their icons as needed
  };
  return conditionIcons[condition] || "icons/svg/status/default.svg"; // Fallback to a default icon
}

export async function updateResource(request) {
  const { actorId, resourceName, value, requestId } = request;
  const actor = game.actors.get(actorId);
  if (!actor) {
    debugLog(`${MODULE_NAME} | Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  const resources = actor.system.resources;
  if (resources[resourceName]) {
    await actor.update({ [`system.resources.${resourceName}.value`]: value });
  } else {
    console.warn(`Resource ${resourceName} not found for actor ${actorId}`);
    return `Resource ${resourceName} not found for actor ${actorId}`;
  }

  debugLog(`${MODULE_NAME} | updateResource:`, actorId, resourceName, value);

  game.socket.emit(`module.discord-bot-integration`, {
    action: "characterResourceUpdated",
    requestId,
    resourceName,
    newValue: value,
  });

  return `${resourceName} updated to ${value}`;
}

export async function addItemToInventory(request) {
  const { actorId, itemData, requestId } = request;
  const actor = game.actors.get(actorId);

  if (!actor) {
    debugLog(`${MODULE_NAME} | Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  // Check for an existing item with the same name
  const existingItem = actor.items.find((i) => i.name === itemData.name);

  if (existingItem) {
    // Stack quantity if the item already exists
    const newQuantity =
      (existingItem.system.quantity || 1) + (itemData.system.quantity || 1);
    await existingItem.update({ "system.quantity": newQuantity });

    debugLog(
      `${MODULE_NAME} | Updated quantity of existing item:`,
      existingItem.id,
      newQuantity
    );

    game.socket.emit(`module.discord-bot-integration`, {
      action: "itemQuantityUpdated",
      requestId,
      itemId: existingItem.id,
      itemName: existingItem.name,
      newQuantity,
    });

    return existingItem;
  } else {
    // Try adding a new item to the actor's inventory
    try {
      const createdItems = await actor.createEmbeddedDocuments("Item", [itemData]);

      if (createdItems.length > 0) {
        const newItem = createdItems[0]; // Access the first item created

        debugLog(`${MODULE_NAME} | addItemToInventory:`, actor.id, itemData, newItem);

        game.socket.emit(`module.discord-bot-integration`, {
          action: "itemAddedToInventory",
          requestId,
          itemId: newItem.id,
          itemName: newItem.name,
        });

        return newItem;
      } else {
        console.warn(`${MODULE_NAME} | Failed to add item to inventory for actor ${actorId}`);
        return null;
      }
    } catch (error) {
      console.error(`Error adding item to inventory:`, error);
      debugLog(`${MODULE_NAME} | Error adding item to inventory:`, error);
      return null;
    }
  }
}

export async function removeItemFromInventory(request) {
  const { actorId, itemId, requestId, quantity = 1 } = request;
  const actor = game.actors.get(actorId);

  if (!actor) {
    debugLog(`${MODULE_NAME} | Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  const item = actor.items.get(itemId);
  if (!item) {
    console.warn(`Item with ID ${itemId} not found in inventory`);
    return;
  }

  const currentQuantity = item.system.quantity || 1;

  if (currentQuantity > quantity) {
    const newQuantity = currentQuantity - quantity;
    await item.update({ "system.quantity": newQuantity });
    debugLog(`${MODULE_NAME} | Updated quantity of item:`, itemId, newQuantity);

    game.socket.emit(`module.discord-bot-integration`, {
      action: "itemQuantityUpdated",
      requestId,
      itemId,
      itemName: item.name,
      newQuantity,
    });

    return item;
  } else {
    await item.delete();
    debugLog(`${MODULE_NAME} | removeItemFromInventory:`, actorId, itemId);

    game.socket.emit(`module.discord-bot-integration`, {
      action: "itemRemovedFromInventory",
      requestId,
      itemId,
      itemName: item.name,
    });

    return `Item ${item.name} removed from inventory`;
  }
}

export async function getItemDetails(request) {
  const { actorId, itemId, requestId } = request;
  const actor = game.actors.get(actorId);
  if (!actor) {
    debugLog(`${MODULE_NAME} | Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  const item = actor.items.get(itemId);
  if (!item) {
    console.warn(`Item with ID ${itemId} not found in inventory`);
    return;
  }

  debugLog(`${MODULE_NAME} | getItemDetails:`, actorId, itemId);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "itemDetails",
    requestId,
    itemDetails: {
      name: item.name,
      description: item.system.description.value,
      quantity: item.system.quantity,
      weight: item.system.weight,
      effects: item.system.effects,
    },
  });
  return item;
}

export async function rollInitiative(request) {
  const { requestId, actorId } = request;
  const actor = game.actors.get(actorId);

  if (!actor) {
    debugLog(`${MODULE_NAME} | Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  // Ensure the actor is part of the combat
  if (!game.combat) {
    debugLog(`${MODULE_NAME} | No active combat encounter found`);
    return `No active combat encounter found.`;
  }

  // Find or create a combatant for this actor in the current combat encounter
  let combatant = game.combat.combatants.find((c) => c.actorId === actorId);
  if (!combatant) {
    try {
      await game.combat.createEmbeddedDocuments("Combatant", [{ actorId }]);
      combatant = game.combat.combatants.find((c) => c.actorId === actorId);
      debugLog(`${MODULE_NAME} | Combatant added:`, combatant);
    } catch (error) {
      console.error(`${MODULE_NAME} | Error adding combatant:`, error);
      return `Failed to add ${actor.name} to combat.`;
    }
  }

  // Roll initiative for the actor
  await actor.rollInitiative();

  // Retry mechanism to fetch updated initiative
  let initiative = undefined;
  let retries = 0;
  while (initiative === undefined && retries < 5) {
    await new Promise((resolve) => setTimeout(resolve, 100)); // Delay for 100ms
    initiative = game.combat.combatants.find((c) => c.actorId === actorId)?.initiative;
    retries++;
  }

  debugLog(
    `${MODULE_NAME} | rollInitiative:`,
    actorId,
    initiative,
    combatant?.id
  );

  // Emit socket event with the initiative result
  game.socket.emit(`module.discord-bot-integration`, {
    action: "initiativeRolled",
    requestId,
    actorName: actor.name,
    initiative: initiative,
  });

  return `Initiative rolled for ${actor.name} with result: ${initiative ?? "unavailable"}`;
}

export async function sendTurnNotification(request) {
  const { requestId } = request;
  const combat = game.combats.active;
  debugLog(`${MODULE_NAME} | sendTurnNotification - combat:`, game.combats);
  if (!combat) {
    debugLog(`${MODULE_NAME} | No active combat found`);
    console.warn("No active combat found");
    return;
  }
  const currentCombatant = combat.combatant;
  renderTurnNotification(currentCombatant.actor);
  debugLog(
    `${MODULE_NAME} | sendTurnNotification:`,
    currentCombatant.actor.name
  );
  if (currentCombatant) {
    game.socket.emit(`module.discord-bot-integration`, {
      action: "turnNotification",
      requestId,
      combatantName: currentCombatant.actor.name,
      combatantId: currentCombatant.actor.id,
    });
  }
  return `Turn notification sent for ${currentCombatant.actor.name}`;
}

export async function sendCombatSummary(requestId) {
  const combat = game.combats.active;
  if (!combat) {
    debugLog(`${MODULE_NAME} | No active combat found`);
    console.warn("No active combat found");
    return `No active combat found`;
  }

  const combatants = combat.combatants.map((combatant) => ({
    name: combatant.actor.name,
    initiative: combatant.initiative,
    id: combatant.actor.id,
  }));

  debugLog(`${MODULE_NAME} | sendCombatSummary:`, combatants);

  game.socket.emit(`module.discord-bot-integration`, {
    action: "combatSummary",
    requestId,
    combatants,
  });

  return combatants;
}

export async function rollAttack(request) {
  const { requestId, actorId, targetId } = request;
  const attacker = game.actors.get(actorId);
  const target = game.actors.get(targetId);

  if (!attacker) {
    console.warn(`Attacker with ID ${actorId} not found`);
    return `Attacker with ID ${actorId} not found`;
  }
  if (!target) {
    console.warn(`Target with ID ${targetId} not found`);
    return `Target with ID ${targetId} not found`;
  }

  try {
    const rollData = attacker.getRollData();
    const attackFormula = `1d20 + @abilities.str.mod`;
    const attackRoll = await new Roll(attackFormula, rollData).evaluate();
    const targetAC = target.system.attributes.ac.value;
    const isCritHit = attackRoll.total === 20;
    const isCritMiss = attackRoll.total === 1;

    let messageContent = `${attacker.name} rolls an attack of ${attackRoll.total} against ${target.name} (AC: ${targetAC}).`;

    const baseDamageFormula = `1d8 + @abilities.str.mod`;
    const damageFormula = isCritHit
      ? `2 * (${baseDamageFormula})`
      : baseDamageFormula;
    const damageRoll = await new Roll(damageFormula, rollData).evaluate();
    let finalDamage = Math.max(damageRoll.total, 1);

    if (isCritHit) {
      messageContent += ` Critical hit! ${attacker.name} deals ${finalDamage} damage to ${target.name}.`;

      if (damageRoll) {
        await damageRoll.toMessage({
          speaker: ChatMessage.getSpeaker({ actor: attacker }),
          flavor: `${attacker.name}'s critical hit damage!`,
        });
      }

      // Apply damage to the target
      const targetCurrentHP = target.system.attributes.hp.value;
      const targetNewHP = Math.max(0, targetCurrentHP - finalDamage);
      await target.update({ "system.attributes.hp.value": targetNewHP });

      game.socket.emit(`module.discord-bot-integration`, {
        action: "attackResult",
        requestId,
        actorName: attacker.name,
        targetName: target.name,
        attackTotal: attackRoll.total,
        damageTotal: finalDamage,
        isHit: true,
        isCritHit: true,
      });
    } else if (isCritMiss) {
      const fumbleEvent = getFumbleEvent();
      messageContent += ` Critical miss! ${attacker.name} fumbles: ${fumbleEvent.message}`;

      if (fumbleEvent.attackerDamage) {
        const currentHP = attacker.system.attributes.hp.value;
        const newHP = Math.max(0, currentHP - fumbleEvent.attackerDamage);
        await attacker.update({ "system.attributes.hp.value": newHP });
        messageContent += ` ${attacker.name} takes ${fumbleEvent.attackerDamage} damage due to the fumble.`;
      }

      game.socket.emit(`module.discord-bot-integration`, {
        action: "attackResult",
        requestId,
        actorName: attacker.name,
        targetName: target.name,
        attackTotal: attackRoll.total,
        isHit: false,
        isCritMiss: true,
        fumbleEvent: fumbleEvent.message,
        attackerDamage: fumbleEvent.attackerDamage || 0,
      });
    } else {
      const isHit = attackRoll.total >= targetAC;
      if (isHit) {
        messageContent += ` It's a hit! ${attacker.name} deals ${finalDamage} damage to ${target.name}.`;

        if (damageRoll) {
          await damageRoll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: attacker }),
            flavor: `${attacker.name} deals damage!`,
          });
        }

        // Apply damage to the target
        const targetCurrentHP = target.system.attributes.hp.value;
        const targetNewHP = Math.max(0, targetCurrentHP - finalDamage);
        await target.update({ "system.attributes.hp.value": targetNewHP });

        game.socket.emit(`module.discord-bot-integration`, {
          action: "attackResult",
          requestId,
          actorName: attacker.name,
          targetName: target.name,
          attackTotal: attackRoll.total,
          damageTotal: finalDamage,
          isHit,
        });
      } else {
        messageContent += ` The attack misses!`;
        game.socket.emit(`module.discord-bot-integration`, {
          action: "attackResult",
          requestId,
          actorName: attacker.name,
          targetName: target.name,
          attackTotal: attackRoll.total,
          isHit: false,
        });
      }
    }

    if (attackRoll) {
      await attackRoll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: attacker }),
        flavor: messageContent,
      });
    }

    return messageContent;
  } catch (error) {
    console.error(`Error during enhanced attack roll:`, error);
    return `Error during attack roll: ${error.message}`;
  }
}

// Enhanced fumble event structure
function getFumbleEvent() {
  const fumbleEvents = [
    { message: "You slip and fall prone.", attackerDamage: 0 },
    { message: "You drop your weapon!", attackerDamage: 0 },
    {
      message: "You injure yourself slightly, taking 1 point of damage.",
      attackerDamage: 1,
    },
    { message: "You swing wildly, hitting an ally nearby.", attackerDamage: 0 },
    {
      message:
        "You are disoriented, and your next attack roll is at disadvantage.",
      attackerDamage: 0,
    },
  ];
  return fumbleEvents[Math.floor(Math.random() * fumbleEvents.length)];
}

export async function rollSavingThrow(request) {
  const { requestId, saveType, actorId, dc } = request;
  const actor = game.actors.get(actorId);
  if (!actor) {
    console.warn(`Actor with ID ${actorId} not found`);
    return `${MODULE_NAME} | Actor with ID ${actorId} not found`;
  }

  const rollData = actor.getRollData();
  let saveBonus;
  let formula;
  let saveName;
  
  if (rollData.abilities[saveType]) {
    saveBonus = rollData.abilities[saveType].save;
    formula = `1d20 + ${saveBonus}`;
    saveName = saveType.toUpperCase();
  } else if (rollData.skills[saveType]) {
    saveBonus = rollData.skills[saveType].total;
    formula = `1d20 + ${saveBonus}`;
    saveName = rollData.skills[saveType].ability.toUpperCase() + " (" + saveType + ")";
  } else {
    console.warn(`Unknown save type: ${saveType}`);
    return `${MODULE_NAME} | Unknown save type: ${saveType}`;
  }

  const roll = await new Roll(formula, rollData).evaluate({ async: true });
  const isCritSuccess = roll.total === 20;
  const isCritFailure = roll.total === 1;

  let messageContent = `${actor.name} makes a ${saveName} saving throw. Result: ${roll.total}`;

  // Determine success or failure if a DC is provided
  let success = null;
  if (dc !== undefined) {
    success = roll.total >= dc;
    messageContent += success
      ? ` - Success! (DC: ${dc})`
      : ` - Failure. (DC: ${dc})`;
  }

  // Add critical success/failure messaging
  if (isCritSuccess) {
    messageContent += " **Critical Success!**";
  } else if (isCritFailure) {
    messageContent += " **Critical Failure!**";
  }

  // Emit the result to Discord or frontend via socket with more detail
  game.socket.emit(`module.discord-bot-integration`, {
    action: "savingThrowResult",
    requestId,
    actorName: actor.name,
    saveType: saveName,
    result: roll.total,
    isCritSuccess,
    isCritFailure,
    dc,
    success,
  });

  // Post the message to chat
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: messageContent,
  });

  return messageContent;
}

export async function applyDamageOrHealing(request) {
  const { requestId, actorId, amount } = request;
  const actor = game.actors.get(actorId);
  if (!actor) {
    console.warn(`${MODULE_NAME} | Actor with ID ${actorId} not found`);
    return `${MODULE_NAME} | Actor with ID ${actorId} not found`;
  }

  const currentHP = actor.system.attributes.hp.value;
  const maxHP = actor.system.attributes.hp.max;
  let newHP;

  let actionType;
  if (amount < 0) {
    actionType = "damage";
    newHP = Math.max(0, currentHP + amount); 
  } else {
    actionType = "healing";
    newHP = Math.min(maxHP, currentHP + amount); 
  }

  // Update actor's HP
  await actor.update({ "system.attributes.hp.value": newHP });

  // Log and emit the result
  const changeType = actionType === "damage" ? "Damage" : "Healing";
  console.log(`${MODULE_NAME} | ${changeType} applied: ${Math.abs(amount)}. New HP: ${newHP}`);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "hpUpdated",
    requestId,
    actorName: actor.name,
    currentHP: newHP,
    maxHP,
    changeType: actionType,
    changeAmount: Math.abs(amount),
  });

  // Display a message in Foundry VTT chat
  const chatMessage = `${actor.name} ${actionType === "damage" ? "takes" : "receives"} ${Math.abs(amount)} ${actionType} and now has ${newHP}/${maxHP} HP.`;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: chatMessage,
  });

  return chatMessage;
}

export async function rollOnTable(request) {
  const { requestId, tableId } = request;
  debugLog(`${MODULE_NAME} | rollOnTable:`, tableId);
  const table = game.tables.get(tableId);
  if (!table) {
    debugLog(`${MODULE_NAME} | Table with ID ${tableId} not found`);
    console.warn(`Table with ID ${tableId} not found`);
    return;
  }

  const rollResult = await table.draw();
  const resultText = rollResult.results.map((r) => r.getChatText()).join(", ");

  debugLog(`${MODULE_NAME} | rollOnTable:`, tableId, resultText);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "tableRollResult",
    requestId,
    tableName: table.name,
    result: resultText,
  });

  return resultText;
}

export async function generateRandomEncounter(request) {
  const { requestId, encounterType } = request;
  const encounters = {
    forest: ["Wolf", "Goblin Scout", "Bandit"],
    dungeon: ["Skeleton", "Zombie", "Giant Spider"],
    town: ["Thief", "Guard Patrol", "Pickpocket"],
  };

  const encounterList = encounters[encounterType] || [];
  const randomEncounter =
    encounterList.length > 0
      ? encounterList[Math.floor(Math.random() * encounterList.length)]
      : "Nothing found";

  debugLog(
    `${MODULE_NAME} | generateRandomEncounter:`,
    encounterType,
    randomEncounter
  );
  game.socket.emit(`module.discord-bot-integration`, {
    action: "randomEncounterResult",
    requestId,
    encounterType,
    encounter: randomEncounter,
  });
  return randomEncounter;
}

export async function relayChatToDiscord(message, requestId) {
  debugLog(`${MODULE_NAME} | Relaying message to Discord2: ${message}`);

  game.socket.emit(`module.discord-bot-integration`, {
    action: "chatRelayToDiscord",
    requestId,
    message,
  });
}

export async function relayRPCommand(request) {
  const { requestId, characterId, message } = request;
  const character = game.actors.get(characterId);
  if (!character) {
    debugLog(`${MODULE_NAME} | Character with ID ${characterId} not found`);
    console.warn(`Character with ID ${characterId} not found`);
    return;
  }

  const formattedMessage = `<strong>${character.name}</strong>: ${message}`;
  ChatMessage.create({
    content: formattedMessage,
    speaker: { actor: character },
  });

  debugLog(`${MODULE_NAME} | Relaying message to Discord3: ${message}`);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "rpCommandRelay",
    requestId,
    characterName: character.name,
    message,
  });
}

export async function castSpell(request) {
  const { requestId, casterId, spellId, targetId } = request;
  const caster = game.actors.get(casterId);
  debugLog(`${MODULE_NAME} | castSpell:`, casterId, spellId, targetId);

  if (!caster) {
    debugLog(`${MODULE_NAME} | Caster with ID ${casterId} not found`);
    console.warn(`Caster with ID ${casterId} not found`);
    return;
  }

  const spell = caster.items.get(spellId);
  if (!spell || spell.type !== "spell") {
    debugLog(
      `${MODULE_NAME} | Spell with ID ${spellId} not found or is not a spell`
    );
    console.warn(`Spell with ID ${spellId} not found or is not a spell`);
    return;
  }

  const target = game.actors.get(targetId);
  const spellDescription =
    spell.system.description.value || "No description available";

  ChatMessage.create({
    content: `<strong>${caster.name}</strong> casts <strong>${spell.name}</strong> on <strong>${
      target ? target.name : "Unknown Target"
    }</strong><br>${spellDescription}`,
    speaker: { actor: caster },
  });

  game.socket.emit(`module.discord-bot-integration`, {
    action: "spellCastNotification",
    requestId,
    casterName: caster.name,
    spellName: spell.name,
    targetName: target ? target.name : "Unknown Target",
    description: spellDescription,
  });

  // Apply spell effects
  await applySpellEffects(spell, caster, target);
  return `${caster.name} casts ${spell.name} on ${target ? target.name : "Unknown Target"}`;
}

export async function applySpellEffects(spell, caster, target) {
  if (!target) return;

  const spellEffects = spell.system.damage?.parts || [];
  const healingEffect = spellEffects.find((part) => part[1] === "healing");
  const damageEffect = spellEffects.find((part) => part[1] === "damage");

  if (healingEffect) {
    const healingAmount = calculateSpellEffect(healingEffect, caster);
    await target.update({
      "system.attributes.hp.value": Math.min(
        target.system.attributes.hp.max,
        target.system.attributes.hp.value + healingAmount
      ),
    });
    debugLog(`${MODULE_NAME} | Healing applied: ${healingAmount}. New HP: ${target.system.attributes.hp.value}`);

    game.socket.emit(`module.discord-bot-integration`, {
      action: "spellEffectApplied",
      casterName: caster.name,
      effect: `heals ${target.name} for ${healingAmount} HP`,
    });
  }

  if (damageEffect) {
    const damageAmount = calculateSpellEffect(damageEffect, caster);
    const savingThrow = spell.system.save?.dc ? await rollSavingThrow(target, spell.system.save.dc) : null;
    const isSaveSuccessful = savingThrow && savingThrow.total >= spell.system.save.dc;

    const finalDamage = isSaveSuccessful ? Math.floor(damageAmount / 2) : damageAmount;
    await target.update({
      "system.attributes.hp.value": Math.max(0, target.system.attributes.hp.value - finalDamage),
    });

    debugLog(`${MODULE_NAME} | Damage applied: ${finalDamage}. New HP: ${target.system.attributes.hp.value}`);
    game.socket.emit(`module.discord-bot-integration`, {
      action: "spellEffectApplied",
      casterName: caster.name,
      effect: `deals ${finalDamage} damage to ${target.name}${isSaveSuccessful ? " (half due to successful save)" : ""}`,
    });

    ChatMessage.create({
      content: `${target.name} ${isSaveSuccessful ? "saves partially" : "fails to save"} against ${
        spell.name
      } and takes ${finalDamage} damage.`,
    });
  }

  // Apply conditions if present
  if (spell.system.duration && spell.system.duration.units === "condition") {
    const condition = spell.system.duration.value;
    target.createEmbeddedDocuments("ActiveEffect", [
      {
        label: condition,
        icon: spell.img,
        origin: caster.uuid,
        changes: [{ key: "flags.conditions", mode: 0, value: condition }],
      },
    ]);

    debugLog(`${MODULE_NAME} | Condition applied: ${condition}`);
    game.socket.emit(`module.discord-bot-integration`, {
      action: "conditionApplied",
      targetName: target.name,
      condition,
    });

    ChatMessage.create({
      content: `${target.name} is now affected by ${condition} from ${spell.name}.`,
    });
  }
}

function calculateSpellEffect(effect, caster) {
  const [formula, type] = effect;
  const roll = new Roll(formula, caster.getRollData()).evaluate({ async: false });
  debugLog(`${MODULE_NAME} | Spell effect formula: ${formula}, type: ${type}, roll: ${roll.total}`);
  return roll.total;
}

export async function useAbility(request) {
  const { casterId, abilityId, targetId, requestId } = request;
  debugLog(`${MODULE_NAME} | useAbility:`, request);
  const caster = game.actors.get(casterId);
  
  if (!caster) {
    debugLog(`${MODULE_NAME} | Caster with ID ${casterId} not found`);
    console.warn(`Caster with ID ${casterId} not found`);
    return;
  }

  const ability = caster.items.get(abilityId);
  if (!ability || ability.type !== "feat") {
    debugLog(
      `${MODULE_NAME} | Ability with ID ${abilityId} not found or is not an ability`
    );
    console.warn(`Ability with ID ${abilityId} not found or is not an ability`);
    return;
  }

  const target = game.actors.get(targetId) || caster; // Use caster as fallback target
  const abilityDescription = ability.system.description.value || "No description available";

  const hasLimitedUses = ability.system.uses?.value > 0;
  if (hasLimitedUses && ability.system.uses.value <= 0) {
    const msg = `${caster.name} cannot use ${ability.name}, no charges left!`;
    ChatMessage.create({ content: msg });
    return msg;
  }

  ChatMessage.create({
    content: `<strong>${caster.name}</strong> uses <strong>${
      ability.name
    }</strong> on <strong>${
      target ? target.name : "Unknown Target"
    }</strong><br>${abilityDescription}`,
    speaker: { actor: caster },
  });


  await applyAbilityEffects(ability, caster, target);

  if (hasLimitedUses) {
    await ability.update({ "system.uses.value": ability.system.uses.value - 1 });
  }

  game.socket.emit(`module.discord-bot-integration`, {
    action: "abilityUseNotification",
    requestId,
    casterName: caster.name,
    abilityName: ability.name,
    targetName: target ? target.name : "Unknown Target",
    description: abilityDescription,
  });

  debugLog(`${MODULE_NAME} | Ability used: ${ability.name} on ${target ? target.name : "Unknown Target"}`);
  return `Ability used: ${ability.name} on ${target ? target.name : "Unknown Target"}`;
}

export async function applyAbilityEffects(ability, caster, target) {
  debugLog(`${MODULE_NAME} | applyAbilityEffects:`, ability, caster, target);
  const healingEffect = ability.system.damage?.parts.find(
    (part) => part[1] === "healing"
  );
  if (healingEffect) {
    const healingAmount = calculateEffectValue(healingEffect, caster);
    await target.update({
      "system.attributes.hp.value": Math.min(
        target.system.attributes.hp.max,
        target.system.attributes.hp.value + healingAmount
      ),
    });
    debugLog(`${MODULE_NAME} | Healing applied: ${healingAmount} HP to ${target.name}`);
    ChatMessage.create({
      content: `${target.name} is healed for ${healingAmount} HP by ${caster.name}'s ${ability.name}.`,
    });
  }

  const damageEffect = ability.system.damage?.parts.find(
    (part) => part[1] === "damage"
  );
  if (damageEffect) {
    const damageAmount = calculateEffectValue(damageEffect, caster);
    await target.update({
      "system.attributes.hp.value": Math.max(
        0,
        target.system.attributes.hp.value - damageAmount
      ),
    });
    debugLog(`${MODULE_NAME} | Damage applied: ${damageAmount} damage to ${target.name}`);
    ChatMessage.create({
      content: `${target.name} takes ${damageAmount} damage from ${caster.name}'s ${ability.name}.`,
    });
  }

  const conditionEffect = ability.system.duration?.units === "condition";
  if (conditionEffect) {
    const condition = ability.system.duration.value;
    await target.createEmbeddedDocuments("ActiveEffect", [
      {
        label: condition,
        icon: ability.img,
        origin: caster.uuid,
        changes: [{ key: "flags.conditions", mode: 0, value: condition }],
      },
    ]);
    debugLog(`${MODULE_NAME} | Condition applied: ${condition} to ${target.name}`);
    ChatMessage.create({
      content: `${target.name} is affected by ${condition} from ${caster.name}'s ${ability.name}.`,
    });
  }
}

function calculateEffectValue(effect, caster) {
  const [formula, type] = effect;
  const roll = new Roll(formula, caster.getRollData()).evaluate({ async: false });
  debugLog(`${MODULE_NAME} | Effect formula: ${formula}, type: ${type}, roll: ${roll.total}`);
  return roll.total;
}

export async function viewQuestLog(request) {
  debugLog(`${MODULE_NAME} | viewQuestLog:`, request);
  const requestId = request.id;
  
  // Retrieve all quests flagged as part of the quest log
  const quests = game.journal.contents.filter((entry) => entry.flags.questLog === true);
  
  if (!quests.length) {
    debugLog(`${MODULE_NAME} | viewQuestLog: No quests found.`);
    game.socket.emit(`module.discord-bot-integration`, {
      action: "questLogResponse",
      requestId,
      questLog: "No quests available in the quest log.",
    });
    return "No quests available in the quest log.";
  }

  const questData = quests.map((quest) => ({
    title: quest.name,
    content: quest.data.content,
    status: quest.flags.status || "In Progress",
    objectives: quest.flags.objectives || [],   // Array of quest objectives if available
    rewards: quest.flags.rewards || "Unknown",  // Rewards if specified in flags
    difficulty: quest.flags.difficulty || "Normal", // Difficulty if specified
    questGiver: quest.flags.questGiver || "Unknown" // NPC quest-giver
  }));

  // Categorize quests by their status
  const categorizedQuests = {
    InProgress: questData.filter((q) => q.status === "In Progress"),
    Completed: questData.filter((q) => q.status === "Completed"),
    Failed: questData.filter((q) => q.status === "Failed"),
  };

  const formatQuestEntry = (quest) => {
    const objectives = quest.objectives.length
      ? quest.objectives.map((obj, idx) => `  ${idx + 1}. ${obj.description} (${obj.completed ? "✓" : "✗"})`).join("\n")
      : "No objectives listed.";

    return `**${quest.title}**\nStatus: ${quest.status}\nDifficulty: ${quest.difficulty}\nQuest Giver: ${quest.questGiver}\nRewards: ${quest.rewards}\nObjectives:\n${objectives}\n\n${quest.content}`;
  };

  // Construct the summary for each category and add section headers
  const questSummary = [
    `### **Quest Log** ###\n`,
    `--- In Progress ---\n${categorizedQuests.InProgress.map(formatQuestEntry).join("\n\n---\n")}`,
    `--- Completed ---\n${categorizedQuests.Completed.map(formatQuestEntry).join("\n\n---\n")}`,
    `--- Failed ---\n${categorizedQuests.Failed.map(formatQuestEntry).join("\n\n---\n")}`,
  ].join("\n\n");

  debugLog(`${MODULE_NAME} | viewQuestLogQuestSummary:`, questSummary);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "questLogResponse",
    requestId,
    questLog: questSummary,
  });

  return questData;
}

export async function updateQuestStatus(request) {
  debugLog(`${MODULE_NAME} | updateQuestStatus:`, request);
  const { requestId, questId, newStatus } = request;
  const quest = game.journal.get(questId);

  if (!quest || !quest.flags.questLog) {
    console.warn(`Quest with ID ${questId} not found or is not a quest log entry`);
    return `Quest with ID ${questId} not found or is not part of the quest log.`;
  }

  // Update the quest status
  const updatedFlags = {
    ...quest.flags,
    status: newStatus,
  };
  await quest.update({ flags: updatedFlags });

  debugLog(`${MODULE_NAME} | Quest status updated:`, quest.name, newStatus);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "questStatusUpdated",
    requestId,
    questName: quest.name,
    newStatus,
  });

  return `Quest "${quest.name}" status updated to "${newStatus}".`;
}

export async function updateQuestObjective(request) {
  const { requestId, questId, objectiveIndex } = request;
  const quest = game.journal.get(questId);

  if (!quest || !quest.flags.questLog) {
    console.warn(`Quest with ID ${questId} not found or is not a quest log entry`);
    return `Quest with ID ${questId} not found or is not part of the quest log.`;
  }

  const objectives = quest.flags.objectives || [];
  if (objectiveIndex >= objectives.length || objectiveIndex < 0) {
    console.warn(`Objective index ${objectiveIndex} is out of bounds`);
    return `Objective index ${objectiveIndex} is out of bounds for quest "${quest.name}".`;
  }

  objectives[objectiveIndex].completed = true;
  await quest.update({ "flags.objectives": objectives });

  debugLog(`${MODULE_NAME} | Quest objective updated:`, quest.name, objectives[objectiveIndex].description);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "questObjectiveUpdated",
    requestId,
    questName: quest.name,
    objective: objectives[objectiveIndex].description,
  });

  return `Objective "${objectives[objectiveIndex].description}" marked as completed in quest "${quest.name}".`;
}

export async function addNoteToLog(request) {
  debugLog(`${MODULE_NAME} | addNoteToLog:`, request);
  const { questId, note, requestId } = request;
  const quest = game.journal.get(questId);
  if (!quest) {
    debugLog(`${MODULE_NAME} | Quest with ID ${questId} not found`);
    console.warn(`Quest with ID ${questId} not found`);
    return `Quest with ID ${questId} not found.`;
  }

  const updatedContent = quest.data.content + `\n\n**Note:** ${note}`;

  await quest.update({ content: updatedContent });

  debugLog(`${MODULE_NAME} | addNoteToLog:`, quest, updatedContent);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "noteAddedConfirmation",
    requestId,
    questTitle: quest.name,
    note,
  });

  return `Note "${note}" added to quest "${quest.name}".`;
}

export async function queryNpcStats(request) {
  debugLog(`${MODULE_NAME} | queryNpcStats:`, request);
  const { npcId, requestId } = request;
  const npc = game.actors.get(npcId);
  if (!npc) {
    debugLog(`${MODULE_NAME} | NPC with ID ${npcId} not found`);
    console.warn(`NPC with ID ${npcId} not found`);
    return;
  }

  const npcStats = {
    name: npc.name,
    hp: npc.system.attributes.hp.value,
    ac: npc.system.attributes.ac.value,
    abilities: {
      str: npc.system.abilities.str.value,
      dex: npc.system.abilities.dex.value,
      con: npc.system.abilities.con.value,
      int: npc.system.abilities.int.value,
      wis: npc.system.abilities.wis.value,
      cha: npc.system.abilities.cha.value,
    },
  };

  debugLog(`${MODULE_NAME} | queryNpcStats:`, npcStats);

  const npcSummary = `
  **${npcStats.name}**\n
  HP: ${npcStats.hp}, AC: ${npcStats.ac}\n
  STR: ${npcStats.abilities.str}, DEX: ${npcStats.abilities.dex}, CON: ${npcStats.abilities.con}\n
  INT: ${npcStats.abilities.int}, WIS: ${npcStats.abilities.wis}, CHA: ${npcStats.abilities.cha}
  `;

  game.socket.emit(`module.discord-bot-integration`, {
    action: "npcStatsResponse",
    requestId,
    npcSummary,
  });

  return npcStats
}

export async function generateRandomNpc(request) {
  const randomNpc = await createRandomNpc();
  debugLog(`${MODULE_NAME} | generateRandomNpc:`, randomNpc);

  const requestId = request.id;
  const randomNpcSummary = `
  **Name**: ${randomNpc.name}\n
  HP: ${randomNpc.hp}, AC: ${randomNpc.ac}\n
  Abilities: STR ${randomNpc.str}, DEX ${randomNpc.dex}, CON ${randomNpc.con}, INT ${randomNpc.int}, WIS ${randomNpc.wis}, CHA ${randomNpc.cha}
  `;

  debugLog(`${MODULE_NAME} | generateRandomNpcSummary:`, randomNpcSummary);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "randomNpcResponse",
    requestId,
    randomNpcSummary,
  });

  return randomNpc
}

export async function createRandomNpc() {
  const names = ["Orc Warrior", "Goblin Shaman", "Bandit Leader", "Dire Wolf"];
  const name = names[Math.floor(Math.random() * names.length)];
  const hp = Math.floor(Math.random() * 30) + 20;
  const ac = Math.floor(Math.random() * 6) + 10;
  const abilities = {
    str: Math.floor(Math.random() * 8) + 10,
    dex: Math.floor(Math.random() * 8) + 10,
    con: Math.floor(Math.random() * 8) + 10,
    int: Math.floor(Math.random() * 8) + 8,
    wis: Math.floor(Math.random() * 8) + 8,
    cha: Math.floor(Math.random() * 8) + 8,
  };
  debugLog(`${MODULE_NAME} | createRandomNpc:`, name, hp, ac, abilities);

  return {
    name,
    hp,
    ac,
    ...abilities,
  };
}

export async function handleLongRest(request) {
  const { characterId, requestId } = request;
  const character = game.actors.get(characterId);

  if (!character) {
    debugLog(`${MODULE_NAME} | Character with ID ${characterId} not found`);
    console.warn(`Character with ID ${characterId} not found`);
    return;
  }

  // Perform a long rest directly without showing the dialog
  await character.longRest({ dialog: false, chat: false });

  const restSummary = `
  **${character.name} has completed a Long Rest**\n
  HP fully restored to ${character.system.attributes.hp.value}/${character.system.attributes.hp.max}\n
  All spell slots and abilities are refreshed.
  `;

  debugLog(`${MODULE_NAME} | handleLongRest:`, restSummary);

  // Emit the rest summary to Discord or other integrated services
  game.socket.emit(`module.discord-bot-integration`, {
    action: "restNotification",
    requestId,
    restSummary,
  });

  return restSummary;
}

export async function handleShortRest(request) {
  const { characterId, requestId } = request;
  debugLog(`${MODULE_NAME} | handleShortRest:`, characterId, requestId);
  const character = game.actors.get(characterId);
  if (!character) {
    debugLog(`${MODULE_NAME} | Character with ID ${characterId} not found`);
    console.warn(`Character with ID ${characterId} not found`);
    return;
  }

  await character.shortRest({ dialog: false, chat: false });

  const restSummary = `
  **${character.name} has completed a Short Rest**\n
  HP partially restored based on hit dice. Check abilities and spells for partial recovery.
  `;

  debugLog(`${MODULE_NAME} | handleShortRest:`, restSummary);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "restNotification",
    requestId,
    restSummary,
  });

  return restSummary
}

export async function handleSessionStart(request) {
  const { sessionData, requestId } = request;
  const { sessionTitle, participants } = sessionData;
  const startTime = new Date().toLocaleString();

  debugLog(
    `${MODULE_NAME} | handleSessionStart:`,
    sessionTitle,
    startTime,
    participants
  );
  const startMessage = `
  **Session Started: ${sessionTitle}**
  Start Time: ${startTime}
  Participants: ${participants.join(", ")}
  Good luck and enjoy the adventure!
    `;

  debugLog(`${MODULE_NAME} | startMessage:`, startMessage);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "sessionNotification",
    requestId,
    message: startMessage,
    type: "startSession",
  });
  return startMessage
}

export async function handleSessionEnd(request) {
  debugLog(`${MODULE_NAME} | handleSessionEnd:`, request);
  const { sessionData, requestId } = request;
  const { sessionTitle } = sessionData;
  const endTime = new Date().toLocaleString();

  debugLog(`${MODULE_NAME} | handleSessionEnd:`, sessionTitle, endTime);
  const endMessage = `
  **Session Ended: ${sessionTitle}**
  End Time: ${endTime}
  Thank you for playing. See you next time!
    `;

  debugLog(`${MODULE_NAME} | endMessage:`, endMessage);

  game.socket.emit(`module.discord-bot-integration`, {
    action: "sessionNotification",
    requestId,
    message: endMessage,
    type: "endSession",
  });
  return endMessage
}

export async function handleLogSessionNotes(request) {
  const { logData, requestId } = request;
  const { sessionTitle, notes } = logData;

  debugLog(`${MODULE_NAME} | handleLogSessionNotes:`, sessionTitle, notes);
  const notesMessage = `
  **Session Notes for ${sessionTitle}:**
  ${notes}
    `;

  debugLog(`${MODULE_NAME} | notesMessage:`, notesMessage);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "sessionNotification",
    requestId,
    message: notesMessage,
    type: "sessionLog",
  });
  return notesMessage
}
