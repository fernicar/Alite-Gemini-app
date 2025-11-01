import { Ship, NPC, Salvage } from '../types';

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


export interface PlayerAttackResult {
    playerEnergyUsed: number;
    updatedNpcs: NPC[];
    newSalvage: Salvage | null;
    targetDestroyed: boolean;
    updatedTarget: NPC | null;
}

/**
 * Processes a player's attack action.
 * @param ship The player's ship.
 * @param target The target NPC.
 * @param npcs The list of all NPCs.
 * @returns The result of the attack, including energy used, updated NPCs, and any new salvage.
 */
export const handlePlayerAttack = (ship: Ship, target: NPC, npcs: NPC[]): PlayerAttackResult => {
    // 1. Get weapons and calculate cost/damage
    const weapons = ship.slots.filter(
        s => s.type === 'Hardpoint' && s.equippedItem?.category === 'Weapon'
    );

    if (weapons.length === 0) {
        return { playerEnergyUsed: 0, updatedNpcs: npcs, newSalvage: null, targetDestroyed: false, updatedTarget: target };
    }

    const totalEnergyCost = weapons.reduce((acc, s) => acc + (s.equippedItem?.powerDraw || 0), 0);
    const totalDamage = weapons.reduce((acc, s) => acc + (s.equippedItem?.stats?.damage || 0), 0);
    
    if (ship.energy < totalEnergyCost) {
        return { playerEnergyUsed: 0, updatedNpcs: npcs, newSalvage: null, targetDestroyed: false, updatedTarget: target };
    }

    // 2. Apply damage to target
    let targetDestroyed = false;
    let newSalvage: Salvage | null = null;
    let updatedTarget: NPC | null = null;

    const newNpcs = npcs.map(npc => {
        if (npc.id !== target.id) {
            return npc;
        }
        
        // This is the target, calculate damage
        const newShields = npc.shields - totalDamage;
        let newHull = npc.hull;
        let finalShields = newShields;
        
        if (newShields < 0) {
            newHull += newShields;
            finalShields = 0;
        }
        
        const damagedNpc = { ...npc, shields: finalShields, hull: newHull };
        
        if (damagedNpc.hull <= 0) {
            targetDestroyed = true;
            newSalvage = {
                id: `salvage-${damagedNpc.id}`,
                contents: { name: 'Scrap Metal', quantity: Math.ceil(Math.random() * 5), weight: 1 },
                position: damagedNpc.position,
            };
            updatedTarget = null;
            return null; // This will be filtered out later
        } else {
            updatedTarget = damagedNpc;
            return damagedNpc;
        }
    }).filter((n): n is NPC => n !== null); // Remove null (destroyed) NPCs

    return {
        playerEnergyUsed: totalEnergyCost,
        updatedNpcs: newNpcs,
        newSalvage,
        targetDestroyed,
        updatedTarget,
    };
};