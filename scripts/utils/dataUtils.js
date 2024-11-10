import { debugLog } from "./debuggingUtils";
import { MODULE_NAME } from "..";
export function findActorByNameOrId(identifier) {
    debugLog(`${MODULE_NAME} | findActorByNameOrId:`, identifier);
    let actor = game.actors.get(identifier);
    debugLog(`${MODULE_NAME} | findActorByNameOrId:`, actor);
    if (!actor) {
        const matches = game.actors.filter(a => a.name.toLowerCase() === identifier.toLowerCase());
        debugLog(`${MODULE_NAME} | findActorByNameOrId:`, matches);
        if (matches.length === 1) {
            actor = matches[0];
        } else if (matches.length > 1) {
            throw new Error(`Multiple characters found with the name '${identifier}'. Please use an ID.`);
        }
    }

    return actor;
}