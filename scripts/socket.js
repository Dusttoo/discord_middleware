import { debugLog } from "./utils/debuggingUtils";
import { MODULE_NAME } from "./index.js";
import * as socket from "./api.js";

export class SocketHandler {
  constructor() {
    this.functions = new Map();
    this.requests = new Map();
    this.name = `module.${MODULE_NAME}`;
    console.log(`${MODULE_NAME} this.name:`, this.name);

    game.socket.on(this.name, this._received.bind(this));

    this.register("updateCharacterHP", socket.updateCharacterHP);
    this.register("rollInitiative", socket.rollInitiative);
    this.register("castSpell", socket.castSpell);
    this.register("getCharacterStats", socket.getCharacterStats);
    this.register("getCharacterInventory", socket.getCharacterInventory);
    this.register("getCharacterSpells", socket.getCharacterSpells);
    this.register("rollAttack", socket.rollAttack);
    this.register("applyDamageOrHealing", socket.applyDamageOrHealing);
    this.register("rollSavingThrow", socket.rollSavingThrow);
    this.register("handleLongRest", socket.handleLongRest);
    this.register("handleShortRest", socket.handleShortRest);
    this.register("sendCharacterSpells", socket.sendCharacterSpells);
    this.register("updateCharacterCondition", socket.updateCharacterCondition);
    this.register("updateResource", socket.updateResource);
    this.register("addItemToInventory", socket.addItemToInventory);
    this.register("removeItemFromInventory", socket.removeItemFromInventory);
    this.register("getItemDetails", socket.getItemDetails);
    this.register("sendTurnNotification", socket.sendTurnNotification);
    this.register("sendCombatSummary", socket.sendCombatSummary);
    this.register("rollOnTable", socket.rollOnTable);
    this.register("generateRandomEncounter", socket.generateRandomEncounter);
    this.register("relayChatToDiscord", socket.relayChatToDiscord);
    this.register("relayRPCommand", socket.relayRPCommand);
    this.register("useAbility", socket.useAbility);
    this.register("viewQuestLog", socket.viewQuestLog);
    this.register("addNoteToLog", socket.addNoteToLog);
    this.register("queryNpcStats", socket.queryNpcStats);
    this.register("generateRandomNpc", socket.generateRandomNpc);
    this.register("handleSessionStart", socket.handleSessionStart);
    this.register("handleSessionEnd", socket.handleSessionEnd);
    this.register("handleLogSessionNotes", socket.handleLogSessionNotes);
    this.register("updateQuestStatus", socket.updateQuestStatus);
    this.register("updateQuestObjective", socket.updateQuestObjective);
  }

  register(name, func) {
    if (this.functions.has(name)) {
      debugLog(`${MODULE_NAME} | Function '${name}' is already registered, skipping duplicate.`);
    } else {
      debugLog(`${MODULE_NAME} | Registering function '${name}'...`);
      this.functions.set(name, func);
    }
  }

  async _receiveRequest(message, senderId) {
    const { action, requestId, ...payload } = message;
    const func = this.functions.get(action);
  
    if (!func) {
      debugLog(`${MODULE_NAME} | No function registered for action '${action}'`);
      return;
    }
  
    try {
      const result = await func(payload);
      debugLog(`Success executing '${action}':`, result);
  
      game.socket.emit(this.name, {
        action: `${action}Result`,
        requestId,  
        type: "RESPONSE",  
        result,  
      });
    } catch (error) {
      debugLog(`${MODULE_NAME} | Error executing '${action}':`, error);
      game.socket.emit(this.name, {
        action: `${action}Result`,
        requestId,
        type: "RESPONSE",
        error: error.message,  
      });
    }
  }

  _receiveResponse(message, senderId) {
    const { id, result, type } = message;
    const request = this.requests.get(id);
    if (!request) return;

    if (type === "RESULT") {
      debugLog(`${MODULE_NAME} | Success executing '${request.functionName}':`, result);
      request.resolve(result);
    } else {
      debugLog(`${MODULE_NAME} | Error executing '${request.functionName}':`, result);
      request.reject(new Error(`Error executing '${request.functionName}'. Check GM console for details.`));
    }
    this.requests.delete(id);
  }

  _received(message, senderId) {
    if (message.type === "REQUEST") {
      debugLog(`${MODULE_NAME} | Received request:`, message);
      this._receiveRequest(message, senderId);
    } else {
      debugLog(`${MODULE_NAME} | Received response:`, message);
      this._receiveResponse(message, senderId);
    }
  }

  _sendRequest(functionName, args, recipient) {
    const message = { functionName, args, recipient, type: "REQUEST", id: foundry.utils.randomID() };
    const promise = new Promise((resolve, reject) => this.requests.set(message.id, { functionName, resolve, reject }));

    debugLog(`${MODULE_NAME} | Sending request:`, message);
    game.socket.emit(this.name, message);
    return promise;
  }

  async executeAsGM(functionName, ...args) {
    const func = this.functions.get(functionName);
    if (game.user.isGM) return func(...args);
    debugLog(`${MODULE_NAME} | Executing '${functionName}' as GM:`, args);
    return this._sendRequest(functionName, args, "GM");
  }
}

export function setupSocket() {
  globalThis.SocketHandler = new SocketHandler();
  debugLog(`${MODULE_NAME} | Socket setup complete`);
}