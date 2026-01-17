
import { Mission, StarSystem, NPC, CargoItem } from '../types';
import { playerShipService } from './playerShipService';

const PIRATE_NAMES = ['"One-Eye" Jack', 'Silas "The Ghost" Kane', 'Mara "Red Blade"', 'Vex', 'Korg'];
const PIRATE_SHIP_TYPES = ['Viper Mk I', 'Cobra Mk III', 'Adder'];

class MissionService {
    private activeMission: Mission | null = null;
    private availableMissions: Mission[] = [];
    private subscribers: (() => void)[] = [];

    public subscribe(callback: () => void): () => void {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    private notify() {
        this.subscribers.forEach(cb => cb());
    }

    public reset() {
        this.activeMission = null;
        this.availableMissions = [];
        this.notify();
    }

    public getActiveMission(): Mission | null {
        return this.activeMission;
    }

    public getAvailableMissions(system: StarSystem): Mission[] {
        // Regenerate missions if system changes or list is empty (simplified for now)
        // ideally we cache by system ID
        if (this.availableMissions.length === 0 || this.availableMissions[0].systemId !== system.id) {
             this.generateMissions(system);
        }
        return this.availableMissions;
    }

    private generateMissions(system: StarSystem) {
        this.availableMissions = [];
        
        // Bounty Missions (Anarchy/Feudal)
        if (system.government === 'Anarchy' || system.government === 'Feudal') {
            const count = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < count; i++) {
                const pirateName = PIRATE_NAMES[Math.floor(Math.random() * PIRATE_NAMES.length)];
                const shipType = PIRATE_SHIP_TYPES[Math.floor(Math.random() * PIRATE_SHIP_TYPES.length)];
                this.availableMissions.push({
                    id: `bounty-${system.id}-${Date.now()}-${i}`,
                    title: `Bounty: ${pirateName}`,
                    description: `A notorious pirate, ${pirateName}, has been terrorizing the ${system.name} system. Eliminate them.`,
                    type: 'Assassination',
                    reward: 2000 + Math.floor(Math.random() * 3000),
                    status: 'Available',
                    systemId: system.id,
                    targetName: pirateName,
                    targetShipType: shipType
                });
            }
            
            // Generic Pirate Hunt
            this.availableMissions.push({
                id: `patrol-${system.id}-${Date.now()}`,
                title: `Patrol Duty`,
                description: `Clear the lanes. Destroy 3 pirate vessels in ${system.name}.`,
                type: 'Bounty',
                reward: 1500,
                status: 'Available',
                systemId: system.id,
                requiredKills: 3,
                currentKills: 0
            });
        }

        // Delivery Missions (Industrial/Agri)
        if (system.economy === 'Industrial' || system.economy === 'Agricultural') {
             const cargo: CargoItem = { name: system.economy === 'Industrial' ? 'Machinery' : 'Food Rations', quantity: 5, weight: 1 };
             this.availableMissions.push({
                 id: `deliv-${system.id}-${Date.now()}`,
                 title: `Urgent Delivery: ${cargo.name}`,
                 description: `Deliver ${cargo.quantity} units of ${cargo.name} to any station in this system (Simulation placeholder: just dock again).`,
                 type: 'Delivery',
                 reward: 1000,
                 status: 'Available',
                 systemId: system.id,
                 destinationSystemId: system.id, // For now, same system for simplicity of prototype
                 cargoRequired: cargo
             });
        }
        
        this.notify();
    }

    public acceptMission(mission: Mission) {
        if (this.activeMission) return; // Only one at a time for now

        // Handle delivery cargo logic
        if (mission.type === 'Delivery' && mission.cargoRequired) {
            const ship = playerShipService.getShip();
            const totalWeight = ship.cargo.reduce((acc, c) => acc + (c.quantity * c.weight), 0);
            const reqWeight = mission.cargoRequired.quantity * mission.cargoRequired.weight;
            
            if (totalWeight + reqWeight > ship.cargoCapacity) {
                // Warning handled by UI
                return;
            }
            
            // Add mission cargo
            const newCargo = [...ship.cargo];
            const existing = newCargo.find(c => c.name === mission.cargoRequired!.name);
            if (existing) {
                existing.quantity += mission.cargoRequired.quantity;
            } else {
                newCargo.push({ ...mission.cargoRequired });
            }
            playerShipService.setShip({ ...ship, cargo: newCargo });
        }

        this.activeMission = { ...mission, status: 'InProgress' };
        this.availableMissions = this.availableMissions.filter(m => m.id !== mission.id);
        this.notify();
    }
    
    public abandonMission() {
        if (!this.activeMission) return;
        
        // Remove mission cargo if delivery
        if (this.activeMission.type === 'Delivery' && this.activeMission.cargoRequired) {
            const ship = playerShipService.getShip();
            const newCargo = ship.cargo.map(c => {
                 if (c.name === this.activeMission!.cargoRequired!.name) {
                     return { ...c, quantity: Math.max(0, c.quantity - this.activeMission!.cargoRequired!.quantity) };
                 }
                 return c;
            }).filter(c => c.quantity > 0);
            playerShipService.setShip({ ...ship, cargo: newCargo });
        }

        this.activeMission = null;
        this.notify();
    }

    public onNpcDestroyed(npc: NPC, currentSystemId: number) {
        if (!this.activeMission || this.activeMission.status !== 'InProgress') return;
        
        // Check system
        if (this.activeMission.systemId !== currentSystemId) return;

        let updated = false;

        // Bounty (Generic Kills)
        if (this.activeMission.type === 'Bounty' && npc.type === 'Pirate') {
            const current = this.activeMission.currentKills || 0;
            const required = this.activeMission.requiredKills || 1;
            
            if (current < required) {
                this.activeMission = { ...this.activeMission, currentKills: current + 1 };
                updated = true;
                
                if (this.activeMission.currentKills! >= required) {
                     this.completeMissionCondition();
                }
            }
        }
        
        // Assassination (Specific Target)
        // Simplified: Matches ship type + Pirate type for now, or random chance if named
        if (this.activeMission.type === 'Assassination' && npc.type === 'Pirate') {
             // In a real system, NPC would have a specific ID or Name property matched here.
             // For prototype, we'll assume a 25% chance it was the target if ship type matches
             if (npc.shipType === this.activeMission.targetShipType && Math.random() < 0.25) {
                 this.completeMissionCondition();
                 updated = true;
                 // Alert handled by UI
             }
        }

        if (updated) this.notify();
    }
    
    private completeMissionCondition() {
        if (this.activeMission) {
            this.activeMission = { ...this.activeMission, status: 'Completed' };
            this.notify();
        }
    }

    public checkDockingCompletion(systemId: number): string | null {
        if (!this.activeMission) return null;

        // Delivery Completion
        if (this.activeMission.type === 'Delivery' && this.activeMission.status === 'InProgress' && this.activeMission.destinationSystemId === systemId) {
             // Remove cargo
             const ship = playerShipService.getShip();
             const req = this.activeMission.cargoRequired!;
             
             // Check if we still have the cargo (player might have sold it!)
             const hasCargo = ship.cargo.find(c => c.name === req.name && c.quantity >= req.quantity);
             
             if (hasCargo) {
                 const newCargo = ship.cargo.map(c => {
                    if (c.name === req.name) {
                        return { ...c, quantity: c.quantity - req.quantity };
                    }
                    return c;
                 }).filter(c => c.quantity > 0);
                 playerShipService.setShip({ ...ship, cargo: newCargo });
                 
                 this.completeMissionRewards();
                 return `Mission Complete: ${this.activeMission.title}. Reward: ${this.activeMission.reward}cr`;
             } else {
                 return "Mission Failed: Cargo missing.";
             }
        }
        
        // Bounty/Assassination Claim
        if ((this.activeMission.type === 'Bounty' || this.activeMission.type === 'Assassination') && this.activeMission.status === 'Completed') {
            // Must be at the issuing system (or any system for bounty? usually issuing for contracts)
            if (this.activeMission.systemId === systemId) {
                this.completeMissionRewards();
                return `Mission Complete: ${this.activeMission.title}. Bounty Claimed: ${this.activeMission.reward}cr`;
            }
        }

        return null;
    }
    
    private completeMissionRewards() {
        if (!this.activeMission) return;
        const ship = playerShipService.getShip();
        playerShipService.setShip({ ...ship, credits: ship.credits + this.activeMission.reward });
        this.activeMission = null;
        this.notify();
    }
}

export const missionService = new MissionService();
