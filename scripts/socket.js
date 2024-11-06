module.exports.setupSocket =  function setupSocket() {
  const MODULE_NAME = "discord-bot-integration";

  game.socket.on(`module.${MODULE_NAME}`, async (data) => {
    debugLog(`Received data from Discord bot:`, data);

    const { action, actorId, requestId } = data;

    switch (action) {
      case "getCharacterStats":
        const stats = await game.discordBotIntegration.getCharacterStats(actorId);
        game.socket.emit(`module.discord-bot-integration`, {
          action: "characterStats",
          requestId,
          stats,
        });
        break;
      case "getCharacterInventory":
        const inventory = await game.discordBotIntegration.getCharacterInventory(actorId);
        game.socket.emit(`module.discord-bot-integration`, {
          action: "characterInventory",
          requestId,
          inventory,
        });
        break;
      case "getCharacterSpells":
        await sendCharacterSpells(actorId, requestId);
        break;
      case "updateCharacterHP":
        const hpChange = payload.hpChange;
        await game.discordBotIntegration.updateCharacterHP(actorId, hpChange, requestId);
        game.socket.emit(`module.discord-bot-integration`, {
          action: "characterHPUpdated",
          requestId,
          newHP,
        });
        break;
      case "updateCharacterCondition":
        await updateCharacterCondition(
          actorId,
          payload.condition,
          payload.add,
          requestId
        );
        break;
      case "updateResource":
        await updateResource(
          actorId,
          payload.resourceName,
          payload.value,
          requestId
        );
        break;
      case "addItemToInventory":
        await addItemToInventory(actorId, payload.itemData, requestId);
        break;
      case "removeItemFromInventory":
        await removeItemFromInventory(actorId, payload.itemId, requestId);
        break;
      case "getItemDetails":
        await getItemDetails(actorId, payload.itemId, requestId);
        break;
      case "rollInitiative":
        await game.discordBotIntegration.rollInitiative(actorId, requestId);
        game.socket.emit(`module.discord-bot-integration`, {
          action: "initiativeRolled",
          requestId,
          actorName: actor.name,
          initiative: actor.initiative,
        });
        break;
      case "turnNotification":
        await sendTurnNotification(requestId);
        break;
      case "combatSummary":
        await sendCombatSummary(requestId);
        break;
      case "rollAttack":
        await rollAttack(actorId, payload.attackData, requestId);
        break;
      case "rollSavingThrow":
        await rollSavingThrow(actorId, payload.saveType, requestId);
        break;
      case "applyDamageOrHealing":
        await applyDamageOrHealing(actorId, payload.amount, requestId);
        break;
      case "rollOnTable":
        await rollOnTable(tableId, requestId);
        break;
      case "generateEncounter":
        await generateRandomEncounter(encounterType, requestId);
        break;
      case "relayChatToDiscord":
        await relayChatToDiscord(message, requestId);
        break;
      case "relayRPCommand":
        await relayRPCommand(characterId, message, requestId);
        break;
      case "castSpell":
        await castSpell(casterId, spellId, targetId, requestId);
        break;
      case "useAbility":
        await useAbility(casterId, abilityId, targetId, requestId);
        break;
      case "viewQuestLog":
        await viewQuestLog(requestId);
        break;
      case "addNote":
        await addNoteToLog(questId, note, requestId);
        break;
      case "queryNpcStats":
        await queryNpcStats(npcId, requestId);
        break;
      case "generateRandomNpc":
        await generateRandomNpc(requestId);
        break;
      case "longRest":
        await handleLongRest(characterId, requestId);
        break;
      case "shortRest":
        await handleShortRest(characterId, requestId);
        break;
      case "startSession":
        await handleSessionStart(sessionData, requestId);
        break;
      case "endSession":
        await handleSessionEnd(sessionData, requestId);
        break;
      case "logSessionNotes":
        await handleLogSessionNotes(logData, requestId);
        break;
      default:
        console.warn(`Unknown action: ${action}`);
    }
  });
}

async function sendCharacterSpells(actorId, requestId) {
  const actor = game.actors.get(actorId);
  if (!actor) {
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

  game.socket.emit(`module.discord-bot-integration`, {
    action: "characterSpells",
    requestId,
    spells,
  });
}

async function updateCharacterHP(actorId, hpChange, requestId) {
  const actor = game.actors.get(actorId);
  if (!actor) {
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  const currentHP = actor.system.attributes.hp.value;
  const newHP = Math.max(0, currentHP + hpChange); 

  await actor.update({ "system.attributes.hp.value": newHP });

  game.socket.emit(`module.discord-bot-integration`, {
    action: "characterHPUpdated",
    requestId,
    newHP,
  });
}

async function updateCharacterCondition(actorId, condition, add, requestId) {
  const actor = game.actors.get(actorId);
  if (!actor) {
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
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  const item = await actor.createEmbeddedDocuments("Item", [itemData]);
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
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  const item = actor.items.get(itemId);
  if (!item) {
    console.warn(`Item with ID ${itemId} not found in inventory`);
    return;
  }

  await item.delete();
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
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  const item = actor.items.get(itemId);
  if (!item) {
    console.warn(`Item with ID ${itemId} not found in inventory`);
    return;
  }

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
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  await actor.rollInitiative();
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
    console.warn("No active combat found");
    return;
  }
  const currentCombatant = combat.combatant;
  await DiscordBotIntegration.templates.renderTurnNotification(currentCombatant.actor);
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
    console.warn("No active combat found");
    return;
  }

  const combatants = combat.combatants.map((combatant) => ({
    name: combatant.actor.name,
    initiative: combatant.initiative,
    id: combatant.actor.id,
  }));

  game.socket.emit(`module.discord-bot-integration`, {
    action: "combatSummary",
    requestId,
    combatants,
  });
}

async function rollAttack(actorId, attackData, requestId) {
  const actor = game.actors.get(actorId);
  if (!actor) {
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  const attackRoll = new Roll(attackData.attackFormula).roll({ async: true });
  const damageRoll = new Roll(attackData.damageFormula).roll({ async: true });

  await attackRoll.toMessage({ flavor: `${actor.name} makes an attack!` });
  await damageRoll.toMessage({ flavor: `${actor.name} deals damage!` });

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
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  const roll = await actor.rollAbilitySave(saveType);
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
    console.warn(`Actor with ID ${actorId} not found`);
    return;
  }

  const currentHP = actor.system.attributes.hp.value;
  const newHP = Math.max(0, currentHP + amount);
  await actor.update({ "system.attributes.hp.value": newHP });

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
    console.warn(`Table with ID ${tableId} not found`);
    return;
  }

  const rollResult = await table.draw();
  const resultText = rollResult.results.map((r) => r.getChatText()).join(", ");

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
    console.warn(`Character with ID ${characterId} not found`);
    return;
  }

  const formattedMessage = `<strong>${character.name}</strong>: ${message}`;
  ChatMessage.create({
    content: formattedMessage,
    speaker: { actor: character },
  });

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
    console.warn(`Caster with ID ${casterId} not found`);
    return;
  }

  const spell = caster.items.get(spellId);
  if (!spell || spell.type !== "spell") {
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
    console.warn(`Caster with ID ${casterId} not found`);
    return;
  }

  const ability = caster.items.get(abilityId);
  if (!ability || ability.type !== "feat") {
    console.warn(`Ability with ID ${abilityId} not found or is not an ability`);
    return;
  }

  const target = game.actors.get(targetId);
  const abilityDescription =
    ability.system.description.value || "No description available";

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
  if (damagePart) {
    const formula = damagePart[0];
    const roll = new Roll(formula).evaluate({ async: false });
    return roll.total;
  }
  return 0;
}

async function viewQuestLog(requestId) {
  const quests = game.journal.contents.filter(
    (entry) => entry.flags.questLog === true
  );
  const questData = quests.map((quest) => ({
    title: quest.name,
    content: quest.data.content, 
    status: quest.flags.status || "In Progress", 
  }));

  const questSummary = questData
    .map(
      (quest) =>
        `**${quest.title}**\nStatus: ${quest.status}\n${quest.content}\n`
    )
    .join("\n---\n");

  game.socket.emit(`module.discord-bot-integration`, {
    action: "questLogResponse",
    requestId,
    questLog: questSummary,
  });
}

async function addNoteToLog(questId, note, requestId) {
  const quest = game.journal.get(questId);
  if (!quest) {
    console.warn(`Quest with ID ${questId} not found`);
    return;
  }

  const updatedContent = quest.data.content + `\n\n**Note:** ${note}`;
  await quest.update({ content: updatedContent });

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

  const randomNpcSummary = `
  **Name**: ${randomNpc.name}\n
  HP: ${randomNpc.hp}, AC: ${randomNpc.ac}\n
  Abilities: STR ${randomNpc.str}, DEX ${randomNpc.dex}, CON ${randomNpc.con}, INT ${randomNpc.int}, WIS ${randomNpc.wis}, CHA ${randomNpc.cha}
  `;

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
    console.warn(`Character with ID ${characterId} not found`);
    return;
  }

  await character.longRest(); 

  const restSummary = `
  **${character.name} has completed a Long Rest**\n
  HP fully restored to ${character.system.attributes.hp.value}/${character.system.attributes.hp.max}\n
  All spell slots and abilities are refreshed.
  `;

  game.socket.emit(`module.discord-bot-integration`, {
    action: "restNotification",
    requestId,
    restSummary,
  });
}

async function handleShortRest(characterId, requestId) {
  const character = game.actors.get(characterId);
  if (!character) {
    console.warn(`Character with ID ${characterId} not found`);
    return;
  }

  await character.shortRest();

  const restSummary = `
  **${character.name} has completed a Short Rest**\n
  HP partially restored based on hit dice. Check abilities and spells for partial recovery.
  `;

  game.socket.emit(`module.discord-bot-integration`, {
    action: "restNotification",
    requestId,
    restSummary,
  });
}

async function handleSessionStart(sessionData, requestId) {
  const { sessionTitle, participants } = sessionData;
  const startTime = new Date().toLocaleString();

  const startMessage = `
  **Session Started: ${sessionTitle}**
  Start Time: ${startTime}
  Participants: ${participants.join(", ")}
  Good luck and enjoy the adventure!
    `;

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

  const endMessage = `
  **Session Ended: ${sessionTitle}**
  End Time: ${endTime}
  Thank you for playing. See you next time!
    `;

  game.socket.emit(`module.discord-bot-integration`, {
    action: "sessionNotification",
    requestId,
    message: endMessage,
    type: "endSession",
  });
}

async function handleLogSessionNotes(logData, requestId) {
  const { sessionTitle, notes } = logData;

  const notesMessage = `
  **Session Notes for ${sessionTitle}:**
  ${notes}
    `;

  game.socket.emit(`module.discord-bot-integration`, {
    action: "sessionNotification",
    requestId,
    message: notesMessage,
    type: "sessionLog",
  });
}
