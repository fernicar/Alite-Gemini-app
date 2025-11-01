import { Ship, NPC } from '../types';

export interface CombatUpdateResult {
  updatedNpcs: NPC[];
  damageToPlayer: number;
}

/**
 * Processes a single frame of combat logic for NPCs.
 * @param ship The player's ship.
 * @param npcs The list of all NPCs in the system.
 * @returns An object containing the updated NPC list and total damage dealt to the player.
 */
export const updateCombatState = (ship: Ship, npcs: NPC[]): CombatUpdateResult => {
  let totalDamage = 0;
  const shipPosition = ship.position;

  const updatedNpcs = npcs.map(npc => {
    if (npc.isHostile) {
      const distToPlayer = Math.sqrt(
        (npc.position.x - shipPosition.x) ** 2 + (npc.position.y - shipPosition.y) ** 2
      );

      if (distToPlayer > 400) { // Move closer if far
        const angleToPlayer = Math.atan2(shipPosition.y - npc.position.y, shipPosition.x - npc.position.x);
        return {
          ...npc,
          position: {
            x: npc.position.x + Math.cos(angleToPlayer) * 2, // NPC speed
            y: npc.position.y + Math.sin(angleToPlayer) * 2,
          }
        };
      } else { // Fire if close
        if (Math.random() < 0.02) { // slower fire rate with faster loop
          totalDamage += Math.random() * 10;
        }
      }
    }
    return npc;
  });

  return { updatedNpcs, damageToPlayer: totalDamage };
};
