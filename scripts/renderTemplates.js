export async function renderCharacterStats(actor) {
    const templatePath = "modules/discord-bot-integration/templates/character-stats.html";
    const characterData = {
      name: actor.name,
      hp: actor.system.attributes.hp.value,
      maxHp: actor.system.attributes.hp.max,
      ac: actor.system.attributes.ac.value,
      abilities: actor.system.abilities,
    };
    const htmlContent = await renderTemplate(templatePath, characterData);
    ChatMessage.create({ content: htmlContent, whisper: ChatMessage.getWhisperRecipients("GM") });
  }
  
  export async function renderInventory(actor) {
    const templatePath = "modules/discord-bot-integration/templates/inventory.html";
    const inventoryData = {
      inventory: actor.items.map(item => ({
        name: item.name,
        quantity: item.system.quantity || 1,
        equipped: item.system.equipped || false,
      })),
    };
    const htmlContent = await renderTemplate(templatePath, inventoryData);
    ChatMessage.create({ content: htmlContent, whisper: ChatMessage.getWhisperRecipients("GM") });
  }
  
  export async function renderSpellDetails(actor, spellId) {
    const spell = actor.items.get(spellId);
    if (!spell || spell.type !== "spell") return;
  
    const templatePath = "modules/discord-bot-integration/templates/spell-details.html";
    const spellData = {
      name: spell.name,
      level: spell.system.level,
      description: spell.system.description.value,
      uses: spell.system.uses,
    };
    const htmlContent = await renderTemplate(templatePath, spellData);
    ChatMessage.create({ content: htmlContent, whisper: ChatMessage.getWhisperRecipients("GM") });
  }
  
  export async function renderTurnNotification(actor) {
    const templatePath = "modules/discord-bot-integration/templates/turn-notification.html";
    const turnData = {
      combatantName: actor.name,
      currentHp: actor.system.attributes.hp.value,
      maxHp: actor.system.attributes.hp.max,
      ac: actor.system.attributes.ac.value,
    };
    const htmlContent = await renderTemplate(templatePath, turnData);
    ChatMessage.create({ content: htmlContent });
  }