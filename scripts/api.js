import { sendToDiscord } from "./socket"; 
const DiscordBotIntegration = {};

DiscordBotIntegration.updateCharacterHP =  async function updateCharacterHP(characterId, newHP) {
  const actor = game.actors.get(characterId);
  if (actor) {
    await actor.update({ "data.attributes.hp.value": newHP });
    return { success: true, message: `HP updated to ${newHP}` };
  }
  return { success: false, message: "Actor not found" };
}
DiscordBotIntegration.rollInitiative =  async function rollInitiative(characterId) {
  const combatant = game.combat?.getCombatantByActorId(characterId);
  if (combatant) {
    await combatant.rollInitiative();
    return { success: true, message: "Initiative rolled" };
  }
  return { success: false, message: "Combatant not found" };
}

DiscordBotIntegration.castSpell =  async function castSpell(characterId, spellId) {
  const actor = game.actors.get(characterId);
  if (actor) {
    const spell = actor.items.get(spellId);
    if (spell) {
      await spell.roll();
      return { success: true, message: `Cast ${spell.name}` };
    }
  }
  return { success: false, message: "Spell or actor not found" };
}

DiscordBotIntegration.getCharacterStats =  async function getCharacterStats(actorId) {
    const actor = game.actors.get(actorId);
    if (!actor) {
      console.warn(`Actor with ID ${actorId} not found`);
      return null;
    }
    await DiscordBotIntegration.templates.renderCharacterStats(actor);

    return {
      name: actor.name,
      hp: actor.system.attributes.hp,
      ac: actor.system.attributes.ac.value,
      abilities: actor.system.abilities,
    };
  }
  
  DiscordBotIntegration.getCharacterInventory =  async function getCharacterInventory(actorId) {
    const actor = game.actors.get(actorId);
    if (!actor) {
      console.warn(`Actor with ID ${actorId} not found`);
      return [];
    }
  
    await DiscordBotIntegration.templates.renderInventory(actor);

    return actor.items
      .filter((item) => ["loot", "equipment", "weapon"].includes(item.type))
      .map((item) => ({
        name: item.name,
        quantity: item.system.quantity,
        equipped: item.system.equipped,
      }));
  }
  
  DiscordBotIntegration.getCharacterSpells =  async function getCharacterSpells(actorId) {
    const actor = game.actors.get(actorId);
    if (!actor) {
      console.warn(`Actor with ID ${actorId} not found`);
      return [];
    }
  
    await DiscordBotIntegration.templates.renderSpellDetails(actor);

    return actor.items
      .filter((item) => item.type === "spell")
      .map((spell) => ({
        name: spell.name,
        level: spell.system.level,
        description: spell.system.description.value,
        uses: spell.system.uses,
      }));
  }

DiscordBotIntegration.rollAttack =  async function rollAttack(actorId, attackData) {
    const actor = game.actors.get(actorId);
    if (!actor) {
      console.warn(`Actor with ID ${actorId} not found`);
      return null;
    }
  
    const attackRoll = new Roll(attackData.attackFormula).roll({ async: true });
    const damageRoll = new Roll(attackData.damageFormula).roll({ async: true });
  
    await attackRoll.toMessage({ flavor: `${actor.name} makes an attack!` });
    await damageRoll.toMessage({ flavor: `${actor.name} deals damage!` });
  
    return {
      attackTotal: attackRoll.total,
      damageTotal: damageRoll.total,
    };
  }
  
  DiscordBotIntegration.applyDamageOrHealing =  async function applyDamageOrHealing(actorId, amount) {
    const actor = game.actors.get(actorId);
    if (!actor) {
      console.warn(`Actor with ID ${actorId} not found`);
      return null;
    }
  
    const currentHP = actor.system.attributes.hp.value;
    const newHP = Math.max(0, currentHP + amount); 
    await actor.update({ "system.attributes.hp.value": newHP });
  
    return newHP;
  }
  
  DiscordBotIntegration.rollSavingThrow =  async function rollSavingThrow(actorId, saveType) {
    const actor = game.actors.get(actorId);
    if (!actor) {
      console.warn(`Actor with ID ${actorId} not found`);
      return null;
    }
  
    const roll = await actor.rollAbilitySave(saveType);
    return roll.total;
  }

DiscordBotIntegration.handleLongRest =  async function handleLongRest(characterId) {
    const character = game.actors.get(characterId);
    if (!character) {
      console.warn(`Character with ID ${characterId} not found`);
      return null;
    }
  
    await character.longRest();
    return character.system.attributes.hp.value;
  }
  
  DiscordBotIntegration.handleShortRest =  async function handleShortRest(characterId) {
    const character = game.actors.get(characterId);
    if (!character) {
      console.warn(`Character with ID ${characterId} not found`);
      return null;
    }
  
    await character.shortRest();
    return character.system.attributes.hp.value;
  }

DiscordBotIntegration.handleError =  function handleError(error) {
  console.error("API Error:", error);
  return { success: false, message: error.message };
}

module.exports = DiscordBotIntegration;
