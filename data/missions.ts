import { StarSystem, Mission } from '../types';

const PIRATE_NAMES = ['"One-Eye" Jack', 'Silas "The Ghost" Kane', 'Mara "Red Blade"'];
const PIRATE_SHIP_TYPES = ['Viper Mk I', 'Cobra Mk III', 'Adder'];

export const generateMissions = (system: StarSystem): Mission[] => {
  const missions: Mission[] = [];
  
  // Only generate bounty missions in low security systems for now
  if (system.government === 'Anarchy' || system.government === 'Feudal') {
    const missionCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < missionCount; i++) {
        const pirateName = PIRATE_NAMES[Math.floor(Math.random() * PIRATE_NAMES.length)];
        const shipType = PIRATE_SHIP_TYPES[Math.floor(Math.random() * PIRATE_SHIP_TYPES.length)];
        missions.push({
            id: `bounty-${system.id}-${Date.now()}-${i}`,
            title: `Bounty: ${pirateName}`,
            description: `A notorious pirate, ${pirateName}, has been causing trouble in the ${system.name} system. They were last seen flying a ${shipType}. Destroy their ship to claim the bounty.`,
            type: 'Bounty',
            reward: 5000 + Math.floor(Math.random() * 5000),
            targetNPC: {
                type: 'Pirate',
                shipType: shipType,
            },
            status: 'Available',
            systemId: system.id,
        });
    }
  }

  // TODO: Add other mission types like delivery for industrial systems etc.

  return missions;
};
