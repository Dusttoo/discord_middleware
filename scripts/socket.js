import { debugLog } from "./utils/debuggingUtils";
export function setupSocket() {
  const MODULE_NAME = "discord-bot-integration";

  game.socket.on(`module.${MODULE_NAME}`, async (data) => {
    debugLog(`Received data from Discord bot:`, data);
    if (Array.isArray(data) && data.length > 1) {
      const moduleName = data[0];
      const payload = data[1];
      debugLog(`Received data from Discord bot:`, moduleName, payload);
      if (moduleName === `module.${MODULE_NAME}` && payload) {
        const { action, actorId, requestId } = payload;
        switch (action) {
          case "getCharacterStats":
            debugLog(`getCharacterStats:`, actorId);
            const stats = await getCharacterStats(actorId);
            game.socket.emit(`module.discord-bot-integration`, {
              action: "characterStats",
              requestId,
              stats,
            });
            break;
          case "getCharacterInventory":
            debugLog(`getCharacterInventory:`, actorId);
            const inventory = await getCharacterInventory(actorId);
            game.socket.emit(`module.discord-bot-integration`, {
              action: "characterInventory",
              requestId,
              inventory,
            });
            break;
          case "getCharacterSpells":
            debugLog(`getCharacterSpells:`, actorId);
            await sendCharacterSpells(actorId, requestId);
            break;
          case "updateCharacterHP":
            debugLog(`updateCharacterHP:`, actorId);
            const hpChange = payload.hpChange;
            await updateCharacterHP(actorId, hpChange, requestId);
            game.socket.emit(`module.discord-bot-integration`, {
              action: "characterHPUpdated",
              requestId,
              newHP,
            });
            break;
          case "updateCharacterCondition":
            debugLog(`updateCharacterCondition:`, actorId);
            await updateCharacterCondition(
              actorId,
              payload.condition,
              payload.add,
              requestId
            );
            break;
          case "updateResource":
            debugLog(`updateResource:`, actorId);
            await updateResource(
              actorId,
              payload.resourceName,
              payload.value,
              requestId
            );
            break;
          case "addItemToInventory":
            debugLog(`addItemToInventory:`, actorId);
            await addItemToInventory(actorId, payload.itemData, requestId);
            break;
          case "removeItemFromInventory":
            debugLog(`removeItemFromInventory:`, actorId);
            await removeItemFromInventory(actorId, payload.itemId, requestId);
            break;
          case "getItemDetails":
            debugLog(`getItemDetails:`, actorId);
            await getItemDetails(actorId, payload.itemId, requestId);
            break;
          case "rollInitiative":
            debugLog(`rollInitiative:`, actorId);
            await rollInitiative(actorId, requestId);
            game.socket.emit(`module.discord-bot-integration`, {
              action: "initiativeRolled",
              requestId,
              actorName: actor.name,
              initiative: actor.initiative,
            });
            break;
          case "turnNotification":
            debugLog(`turnNotification:`, actorId);
            await sendTurnNotification(requestId);
            break;
          case "combatSummary":
            debugLog(`combatSummary:`, actorId);
            await sendCombatSummary(requestId);
            break;
          case "rollAttack":
            debugLog(`rollAttack:`, actorId);
            await rollAttack(actorId, payload.attackData, requestId);
            break;
          case "rollSavingThrow":
            debugLog(`rollSavingThrow:`, actorId);
            await rollSavingThrow(actorId, payload.saveType, requestId);
            break;
          case "applyDamageOrHealing":
            debugLog(`applyDamageOrHealing:`, actorId);
            await applyDamageOrHealing(actorId, payload.amount, requestId);
            break;
          case "rollOnTable":
            debugLog(`rollOnTable:`, actorId);
            await rollOnTable(tableId, requestId);
            break;
          case "generateEncounter":
            debugLog(`generateEncounter:`, actorId);
            await generateRandomEncounter(encounterType, requestId);
            break;
          case "relayChatToDiscord":
            debugLog(`relayChatToDiscord:`, actorId, payload.message);
            await relayChatToDiscord(message, requestId);
            break;
          case "relayRPCommand":
            debugLog(`relayRPCommand:`, actorId, payload.message);
            await relayRPCommand(characterId, message, requestId);
            break;
          case "castSpell":
            debugLog(`castSpell:`, actorId, payload.spellId, payload.targetId);
            await castSpell(casterId, spellId, targetId, requestId);
            break;
          case "useAbility":
            debugLog(
              `useAbility:`,
              actorId,
              payload.abilityId,
              payload.targetId
            );
            await useAbility(casterId, abilityId, targetId, requestId);
            break;
          case "viewQuestLog":
            debugLog(`viewQuestLog:`, actorId);
            await viewQuestLog(requestId);
            break;
          case "addNote":
            debugLog(`addNote:`, actorId, payload.note);
            await addNoteToLog(questId, note, requestId);
            break;
          case "queryNpcStats":
            debugLog(`queryNpcStats:`, actorId, payload.npcId);
            await queryNpcStats(npcId, requestId);
            break;
          case "generateRandomNpc":
            debugLog(`generateRandomNpc:`, actorId);
            await generateRandomNpc(requestId);
            break;
          case "longRest":
            debugLog(`longRest:`, actorId);
            await handleLongRest(characterId, requestId);
            break;
          case "shortRest":
            debugLog(`shortRest:`, actorId);
            await handleShortRest(characterId, requestId);
            break;
          case "startSession":
            debugLog(`startSession:`, actorId);
            await handleSessionStart(sessionData, requestId);
            break;
          case "endSession":
            debugLog(`endSession:`, actorId);
            await handleSessionEnd(sessionData, requestId);
            break;
          case "logSessionNotes":
            debugLog(`logSessionNotes:`, actorId);
            await handleLogSessionNotes(logData, requestId);
            break;
          default:
            debugLog(`Unknown action: ${action}`);
            console.warn(`Unknown action: ${action}`);
        }
      }
    } else {
      console.warn("Received data in unexpected format:", data);
    }
  });
}

async function sendCharacterSpells(actorId, requestId) {
  const actor = game.actors.get(actorId);
  if (!actor) {
    debugLog(`Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
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

  debugLog(`sendCharacterSpells:`, actorId, spells);

  game.socket.emit(`module.discord-bot-integration`, {
    action: "characterSpells",
    requestId,
    spells,
  });
}

async function updateCharacterHP(actorId, hpChange, requestId) {
  const actor = game.actors.get(actorId);
  if (!actor) {
    debugLog(`Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  const currentHP = actor.system.attributes.hp.value;
  const newHP = Math.max(0, currentHP + hpChange);

  await actor.update({ "system.attributes.hp.value": newHP });

  debugLog(`updateCharacterHP:`, actorId, newHP);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "characterHPUpdated",
    requestId,
    newHP,
  });
}

async function updateCharacterCondition(actorId, condition, add, requestId) {
  const actor = game.actors.get(actorId);
  if (!actor) {
    debugLog(`Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  const existingEffects = actor.effects.map((effect) => effect.label);
  const conditionExists = existingEffects.includes(condition);

  if (add && !conditionExists) {
    await actor.createEmbeddedDocuments("ActiveEffect", [
      { label: condition, icon: "icons/svg/status/poison.svg" },
    ]);
  } else if (!add && conditionExists) {
    const effect = actor.effects.find((e) => e.label === condition);
    await effect.delete();
  }

  debugLog(`updateCharacterCondition:`, actorId, condition, add);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "characterConditionUpdated",
    requestId,
    condition,
    status: add ? "added" : "removed",
  });
}

async function updateResource(actorId, resourceName, value, requestId) {
  const actor = game.actors.get(actorId);
  if (!actor) {
    debugLog(`Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  const resources = actor.system.resources;
  if (resources[resourceName]) {
    await actor.update({ [`system.resources.${resourceName}.value`]: value });
  } else {
    console.warn(`Resource ${resourceName} not found for actor ${actorId}`);
    return;
  }

  debugLog(`updateResource:`, actorId, resourceName, value);

  game.socket.emit(`module.discord-bot-integration`, {
    action: "characterResourceUpdated",
    requestId,
    resourceName,
    newValue: value,
  });
}

async function addItemToInventory(actorId, itemData, requestId) {
  const actor = game.actors.get(actorId);
  if (!actor) {
    debugLog(`Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  const item = await actor.createEmbeddedDocuments("Item", [itemData]);
  debugLog(`addItemToInventory:`, actorId, item[0].id);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "itemAddedToInventory",
    requestId,
    itemId: item[0].id,
    itemName: item[0].name,
  });
}

async function removeItemFromInventory(actorId, itemId, requestId) {
  const actor = game.actors.get(actorId);
  if (!actor) {
    debugLog(`Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  const item = actor.items.get(itemId);
  if (!item) {
    console.warn(`Item with ID ${itemId} not found in inventory`);
    return;
  }

  await item.delete();

  debugLog(`removeItemFromInventory:`, actorId, itemId);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "itemRemovedFromInventory",
    requestId,
    itemId,
    itemName: item.name,
  });
}

async function getItemDetails(actorId, itemId, requestId) {
  const actor = game.actors.get(actorId);
  if (!actor) {
    debugLog(`Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  const item = actor.items.get(itemId);
  if (!item) {
    console.warn(`Item with ID ${itemId} not found in inventory`);
    return;
  }

  debugLog(`getItemDetails:`, actorId, itemId);
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
}

async function rollInitiative(actorId, requestId) {
  const actor = game.actors.get(actorId);
  if (!actor) {
    debugLog(`Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  await actor.rollInitiative();

  debugLog(`rollInitiative:`, actorId);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "initiativeRolled",
    requestId,
    actorName: actor.name,
    initiative: actor.initiative,
  });
}

async function sendTurnNotification(requestId) {
  const combat = game.combats.active;
  if (!combat) {
    debugLog("No active combat found");
    console.warn("No active combat found");
    return;
  }
  const currentCombatant = combat.combatant;
  renderTurnNotification(currentCombatant.actor);
  debugLog("sendTurnNotification:", currentCombatant.actor.name);
  if (currentCombatant) {
    game.socket.emit(`module.discord-bot-integration`, {
      action: "turnNotification",
      requestId,
      combatantName: currentCombatant.actor.name,
      combatantId: currentCombatant.actor.id,
    });
  }
}

async function sendCombatSummary(requestId) {
  const combat = game.combats.active;
  if (!combat) {
    debugLog("No active combat found");
    console.warn("No active combat found");
    return;
  }

  const combatants = combat.combatants.map((combatant) => ({
    name: combatant.actor.name,
    initiative: combatant.initiative,
    id: combatant.actor.id,
  }));

  debugLog("sendCombatSummary:", combatants);

  game.socket.emit(`module.discord-bot-integration`, {
    action: "combatSummary",
    requestId,
    combatants,
  });
}

async function rollAttack(actorId, attackData, requestId) {
  const actor = game.actors.get(actorId);
  if (!actor) {
    debugLog(`Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  const attackRoll = new Roll(attackData.attackFormula).roll({ async: true });
  const damageRoll = new Roll(attackData.damageFormula).roll({ async: true });

  await attackRoll.toMessage({ flavor: `${actor.name} makes an attack!` });
  await damageRoll.toMessage({ flavor: `${actor.name} deals damage!` });

  debugLog(`rollAttack:`, actorId, attackRoll.total, damageRoll.total);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "attackResult",
    requestId,
    actorName: actor.name,
    attackTotal: attackRoll.total,
    damageTotal: damageRoll.total,
  });
}

async function rollSavingThrow(actorId, saveType, requestId) {
  const actor = game.actors.get(actorId);
  if (!actor) {
    debugLog(`Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  const roll = await actor.rollAbilitySave(saveType);

  debugLog(`rollSavingThrow:`, actorId, saveType, roll.total);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "savingThrowResult",
    requestId,
    actorName: actor.name,
    saveType,
    result: roll.total,
  });
}

async function applyDamageOrHealing(actorId, amount, requestId) {
  const actor = game.actors.get(actorId);
  if (!actor) {
    debugLog(`Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  const currentHP = actor.system.attributes.hp.value;
  const newHP = Math.max(0, currentHP + amount);
  await actor.update({ "system.attributes.hp.value": newHP });

  debugLog(`applyDamageOrHealing:`, actorId, newHP);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "hpUpdated",
    requestId,
    actorName: actor.name,
    newHP,
  });
}

async function rollOnTable(tableId, requestId) {
  const table = game.tables.get(tableId);
  if (!table) {
    debugLog(`Table with ID ${tableId} not found`);
    console.warn(`Table with ID ${tableId} not found`);
    return;
  }

  const rollResult = await table.draw();
  const resultText = rollResult.results.map((r) => r.getChatText()).join(", ");

  debugLog(`rollOnTable:`, tableId, resultText);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "tableRollResult",
    requestId,
    tableName: table.name,
    result: resultText,
  });
}

async function generateRandomEncounter(encounterType, requestId) {
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

  debugLog(`generateRandomEncounter:`, encounterType, randomEncounter);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "randomEncounterResult",
    requestId,
    encounterType,
    encounter: randomEncounter,
  });
}

async function relayChatToDiscord(message, requestId) {
  debugLog(`Relaying message to Discord: ${message}`);

  game.socket.emit(`module.discord-bot-integration`, {
    action: "chatRelayToDiscord",
    requestId,
    message,
  });
}

async function relayRPCommand(characterId, message, requestId) {
  const character = game.actors.get(characterId);
  if (!character) {
    debugLog(`Character with ID ${characterId} not found`);
    console.warn(`Character with ID ${characterId} not found`);
    return;
  }

  const formattedMessage = `<strong>${character.name}</strong>: ${message}`;
  ChatMessage.create({
    content: formattedMessage,
    speaker: { actor: character },
  });

  debugLog(`Relaying message to Discord: ${message}`);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "rpCommandRelay",
    requestId,
    characterName: character.name,
    message,
  });
}

async function castSpell(casterId, spellId, targetId, requestId) {
  const caster = game.actors.get(casterId);
  if (!caster) {
    debugLog(`Caster with ID ${casterId} not found`);
    console.warn(`Caster with ID ${casterId} not found`);
    return;
  }

  const spell = caster.items.get(spellId);
  if (!spell || spell.type !== "spell") {
    debugLog(`Spell with ID ${spellId} not found or is not a spell`);
    console.warn(`Spell with ID ${spellId} not found or is not a spell`);
    return;
  }

  const target = game.actors.get(targetId);
  const spellDescription =
    spell.system.description.value || "No description available";

  ChatMessage.create({
    content: `<strong>${caster.name}</strong> casts <strong>${
      spell.name
    }</strong> on <strong>${
      target ? target.name : "Unknown Target"
    }</strong><br>${spellDescription}`,
    speaker: { actor: caster },
  });

  debugLog(`castSpell:`, casterId, spellId, targetId);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "spellCastNotification",
    requestId,
    casterName: caster.name,
    spellName: spell.name,
    targetName: target ? target.name : "Unknown Target",
    description: spellDescription,
  });

  applySpellEffects(spell, caster, target);
}

async function applySpellEffects(spell, caster, target) {
  if (!target) return;

  if (
    spell.system.damage &&
    spell.system.damage.parts.some((part) => part[1] === "healing")
  ) {
    debugLog(`applySpellEffects:`, spell, caster, target);
    const healingAmount = calculateSpellEffect(spell);
    target.update({
      "system.attributes.hp.value": Math.min(
        target.system.attributes.hp.max,
        target.system.attributes.hp.value + healingAmount
      ),
    });

    game.socket.emit(`module.discord-bot-integration`, {
      action: "spellEffectApplied",
      casterName: caster.name,
      effect: `heals ${target.name} for ${healingAmount} HP`,
    });
  }
}

async function useAbility(casterId, abilityId, targetId, requestId) {
  const caster = game.actors.get(casterId);
  if (!caster) {
    debugLog(`Caster with ID ${casterId} not found`);
    console.warn(`Caster with ID ${casterId} not found`);
    return;
  }

  const ability = caster.items.get(abilityId);
  if (!ability || ability.type !== "feat") {
    debugLog(`Ability with ID ${abilityId} not found or is not an ability`);
    console.warn(`Ability with ID ${abilityId} not found or is not an ability`);
    return;
  }

  const target = game.actors.get(targetId);
  const abilityDescription =
    ability.system.description.value || "No description available";

  debugLog(`useAbility:`, casterId, abilityId, targetId);
  ChatMessage.create({
    content: `<strong>${caster.name}</strong> uses <strong>${
      ability.name
    }</strong> on <strong>${
      target ? target.name : "Unknown Target"
    }</strong><br>${abilityDescription}`,
    speaker: { actor: caster },
  });

  game.socket.emit(`module.discord-bot-integration`, {
    action: "abilityUseNotification",
    requestId,
    casterName: caster.name,
    abilityName: ability.name,
    targetName: target ? target.name : "Unknown Target",
    description: abilityDescription,
  });
}

function calculateSpellEffect(spell) {
  const damagePart = spell.system.damage.parts.find(
    (part) => part[1] === "healing"
  );
  debugLog(`calculateSpellEffect:`, spell, damagePart);
  if (damagePart) {
    const formula = damagePart[0];
    const roll = new Roll(formula).evaluate({ async: false });
    debugLog(`calculateSpellEffect:`, roll.total);
    return roll.total;
  }
  debugLog("No healing part found in spell", spell);
  return 0;
}

async function viewQuestLog(requestId) {
  const quests = game.journal.contents.filter(
    (entry) => entry.flags.questLog === true
  );
  debugLog(`viewQuestLogQuests:`, quests);
  const questData = quests.map((quest) => ({
    title: quest.name,
    content: quest.data.content,
    status: quest.flags.status || "In Progress",
  }));
  debugLog(`viewQuestLogQuestData:`, questData);
  const questSummary = questData
    .map(
      (quest) =>
        `**${quest.title}**\nStatus: ${quest.status}\n${quest.content}\n`
    )
    .join("\n---\n");

  debugLog(`viewQuestLogQuestSummary:`, questSummary);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "questLogResponse",
    requestId,
    questLog: questSummary,
  });
}

async function addNoteToLog(questId, note, requestId) {
  const quest = game.journal.get(questId);
  if (!quest) {
    debugLog(`Quest with ID ${questId} not found`);
    console.warn(`Quest with ID ${questId} not found`);
    return;
  }

  const updatedContent = quest.data.content + `\n\n**Note:** ${note}`;
  await quest.update({ content: updatedContent });

  debugLog(`addNoteToLog:`, quest, updatedContent);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "noteAddedConfirmation",
    requestId,
    questTitle: quest.name,
    note,
  });
}

async function queryNpcStats(npcId, requestId) {
  const npc = game.actors.get(npcId);
  if (!npc) {
    debugLog(`NPC with ID ${npcId} not found`);
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

  debugLog(`queryNpcStats:`, npcStats);

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
}

async function generateRandomNpc(requestId) {
  const randomNpc = await createRandomNpc();
  debugLog(`generateRandomNpc:`, randomNpc);
  const randomNpcSummary = `
  **Name**: ${randomNpc.name}\n
  HP: ${randomNpc.hp}, AC: ${randomNpc.ac}\n
  Abilities: STR ${randomNpc.str}, DEX ${randomNpc.dex}, CON ${randomNpc.con}, INT ${randomNpc.int}, WIS ${randomNpc.wis}, CHA ${randomNpc.cha}
  `;

  debugLog(`generateRandomNpcSummary:`, randomNpcSummary);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "randomNpcResponse",
    requestId,
    randomNpcSummary,
  });
}

async function createRandomNpc() {
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
  debugLog(`createRandomNpc:`, name, hp, ac, abilities);

  return {
    name,
    hp,
    ac,
    ...abilities,
  };
}

async function handleLongRest(characterId, requestId) {
  const character = game.actors.get(characterId);
  if (!character) {
    debugLog(`Character with ID ${characterId} not found`);
    console.warn(`Character with ID ${characterId} not found`);
    return;
  }

  await character.longRest();

  const restSummary = `
  **${character.name} has completed a Long Rest**\n
  HP fully restored to ${character.system.attributes.hp.value}/${character.system.attributes.hp.max}\n
  All spell slots and abilities are refreshed.
  `;

  debugLog(`handleLongRest:`, restSummary);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "restNotification",
    requestId,
    restSummary,
  });
}

async function handleShortRest(characterId, requestId) {
  const character = game.actors.get(characterId);
  if (!character) {
    debugLog(`Character with ID ${characterId} not found`);
    console.warn(`Character with ID ${characterId} not found`);
    return;
  }

  await character.shortRest();

  const restSummary = `
  **${character.name} has completed a Short Rest**\n
  HP partially restored based on hit dice. Check abilities and spells for partial recovery.
  `;

  debugLog(`handleShortRest:`, restSummary);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "restNotification",
    requestId,
    restSummary,
  });
}

async function handleSessionStart(sessionData, requestId) {
  const { sessionTitle, participants } = sessionData;
  const startTime = new Date().toLocaleString();

  debugLog(`handleSessionStart:`, sessionTitle, startTime, participants);
  const startMessage = `
  **Session Started: ${sessionTitle}**
  Start Time: ${startTime}
  Participants: ${participants.join(", ")}
  Good luck and enjoy the adventure!
    `;

  debugLog(`startMessage:`, startMessage);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "sessionNotification",
    requestId,
    message: startMessage,
    type: "startSession",
  });
}

async function handleSessionEnd(sessionData, requestId) {
  const { sessionTitle } = sessionData;
  const endTime = new Date().toLocaleString();

  debugLog(`handleSessionEnd:`, sessionTitle, endTime);
  const endMessage = `
  **Session Ended: ${sessionTitle}**
  End Time: ${endTime}
  Thank you for playing. See you next time!
    `;

  debugLog(`endMessage:`, endMessage);

  game.socket.emit(`module.discord-bot-integration`, {
    action: "sessionNotification",
    requestId,
    message: endMessage,
    type: "endSession",
  });
}

async function handleLogSessionNotes(logData, requestId) {
  const { sessionTitle, notes } = logData;

  debugLog(`handleLogSessionNotes:`, sessionTitle, notes);
  const notesMessage = `
  **Session Notes for ${sessionTitle}:**
  ${notes}
    `;

  debugLog(`notesMessage:`, notesMessage);
  game.socket.emit(`module.discord-bot-integration`, {
    action: "sessionNotification",
    requestId,
    message: notesMessage,
    type: "sessionLog",
  });
}
