import { sendToDiscord } from "./socket";
import { debugLog } from "./utils/debuggingUtils";

export async function updateCharacterHP(characterId, newHP) {
  debugLog(`updateCharacterHP:`, characterId, newHP);
  const actor = game.actors.get(characterId);
  if (actor) {
    await actor.update({ "data.attributes.hp.value": newHP });
    debugLog(`HP updated to ${newHP}`);
    return { success: true, message: `HP updated to ${newHP}` };
  } else {
    debugLog(`Actor with ID ${characterId} not found`);
    console.warn(`Actor with ID ${characterId} not found`);
    return { success: false, message: "Actor not found" };
  }
}
export async function rollInitiative(characterId) {
  debugLog(`rollInitiative:`, characterId);
  const combatant = game.combat?.getCombatantByActorId(characterId);
  if (combatant) {
    await combatant.rollInitiative();
    debugLog("Initiative rolled");
    return { success: true, message: "Initiative rolled" };
  } else {
    debugLog(`Combatant with ID ${characterId} not found`);
    console.warn(`Combatant with ID ${characterId} not found`);
    return { success: false, message: "Combatant not found" };
  }
}

export async function castSpell(characterId, spellId) {
  debugLog(`castSpell:`, characterId, spellId);
  const actor = game.actors.get(characterId);
  if (actor) {
    const spell = actor.items.get(spellId);
    if (spell) {
      await spell.roll();
      debugLog(`Spell ${spell.name} cast`);
      return { success: true, message: `Cast ${spell.name}` };
    } else {
      debugLog(`Spell with ID ${spellId} not found`);
      console.warn(`Spell with ID ${spellId} not found`);
      return { success: false, message: "Spell not found" };
    }
  } else {
    debugLog(`Actor with ID ${characterId} not found`);
    console.warn(`Actor with ID ${characterId} not found`);
    return { success: false, message: "Actor not found" };
  }
}

export async function getCharacterStats(actorId) {
  debugLog(`getCharacterStats:`, actorId);
  const actor = game.actors.get(actorId);
  if (!actor) {
    debugLog(`Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
    return null;
  }
  await renderCharacterStats(actor);

  debugLog(`getCharacterStats:`, {
    name: actor.name,
    hp: actor.system.attributes.hp,
    ac: actor.system.attributes.ac.value,
    abilities: actor.system.abilities,
  });
  return {
    name: actor.name,
    hp: actor.system.attributes.hp,
    ac: actor.system.attributes.ac.value,
    abilities: actor.system.abilities,
  };
}

export async function getCharacterInventory(actorId) {
  debugLog(`getCharacterInventory:`, actorId);
  const actor = game.actors.get(actorId);
  if (!actor) {
    debugLog(`Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
    return [];
  }

  await renderInventory(actor);

  debugLog(`getCharacterInventory:`, actor.items);

  return actor.items
    .filter((item) => ["loot", "equipment", "weapon"].includes(item.type))
    .map((item) => ({
      name: item.name,
      quantity: item.system.quantity,
      equipped: item.system.equipped,
    }));
}

export async function getCharacterSpells(actorId) {
  debugLog(`getCharacterSpells:`, actorId);
  const actor = game.actors.get(actorId);
  if (!actor) {
    debugLog(`Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
    return [];
  }

  await renderSpellDetails(actor);
  debugLog(`getCharacterSpells:`, actor.items);
  return actor.items
    .filter((item) => item.type === "spell")
    .map((spell) => ({
      name: spell.name,
      level: spell.system.level,
      description: spell.system.description.value,
      uses: spell.system.uses,
    }));
}


export async function rollAttack(actorId, attackData) {
  debugLog(`rollAttack:`, actorId, attackData);
  const actor = game.actors.get(actorId);
  if (!actor) {
    debugLog(`Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
    return null;
  }

  const attackRoll = new Roll(attackData.attackFormula).roll({ async: true });
  const damageRoll = new Roll(attackData.damageFormula).roll({ async: true });

  await attackRoll.toMessage({ flavor: `${actor.name} makes an attack!` });
  await damageRoll.toMessage({ flavor: `${actor.name} deals damage!` });

  debugLog(`rollAttack:`, actorId, attackRoll.total, damageRoll.total);
  return {
    attackTotal: attackRoll.total,
    damageTotal: damageRoll.total,
  };
}

export async function applyDamageOrHealing(actorId, amount) {
  debugLog(`applyDamageOrHealing:`, actorId, amount);
  const actor = game.actors.get(actorId);
  if (!actor) {
    debugLog(`Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
    return null;
  }

  const currentHP = actor.system.attributes.hp.value;
  const newHP = Math.max(0, currentHP + amount);
  await actor.update({ "system.attributes.hp.value": newHP });

  debugLog(`applyDamageOrHealing:`, actorId, newHP);
  return newHP;
}

export async function rollSavingThrow(actorId, saveType) {
  debugLog(`rollSavingThrow:`, actorId, saveType);
  const actor = game.actors.get(actorId);
  if (!actor) {
    debugLog(`Actor with ID ${actorId} not found`);
    console.warn(`Actor with ID ${actorId} not found`);
    return null;
  }

  const roll = await actor.rollAbilitySave(saveType);
  debugLog(`rollSavingThrow:`, actorId, saveType, roll.total);
  return roll.total;
}

export async function handleLongRest(characterId) {
  debugLog(`handleLongRest:`, characterId);
  const character = game.actors.get(characterId);
  if (!character) {
    debugLog(`Character with ID ${characterId} not found`);
    console.warn(`Character with ID ${characterId} not found`);
    return null;
  }

  await character.longRest();
  debugLog(`handleLongRest:`, character.system.attributes.hp.value);
  return character.system.attributes.hp.value;
}

export async function handleShortRest(characterId) {
  debugLog(`handleShortRest:`, characterId);
  const character = game.actors.get(characterId);
  if (!character) {
    debugLog(`Character with ID ${characterId} not found`);
    console.warn(`Character with ID ${characterId} not found`);
    return null;
  }

  await character.shortRest();
  debugLog(`handleShortRest:`, character.system.attributes.hp.value);
  return character.system.attributes.hp.value;
}

export function handleError(error) {
  debugLog("API Error:", error);
  console.error("API Error:", error);
  return { success: false, message: error.message };
}
