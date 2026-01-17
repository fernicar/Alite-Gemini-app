

export interface StarSystem {
  id: number;
  name: string;
  x: number;
  y: number;
  economy: 'Industrial' | 'Agricultural' | 'Mining' | 'High-Tech' | 'Refinery' | 'Tourism';
  government: 'Anarchy' | 'Feudal' | 'Corporate' | 'Democracy' | 'Alliance';
  description: string;
  techLevel: number;
  population: number;
}

export type CommodityCategory = 'Consumer Goods' | 'Industrial Goods' | 'Raw Materials' | 'Technology' | 'Luxury' | 'Military';

export interface Commodity {
  name: string;
  category: CommodityCategory;
  basePrice: number;
  weight: number; // in tonnes
}

export interface MarketGood {
  name: string;
  category: Commodity['category'];
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  weight: number;
}

export interface CargoItem {
  name: string;
  quantity: number;
  weight: number; // tonnes per unit
}

export type EquipmentCategory = 'Weapon' | 'Utility' | 'Core' | 'Optional';
export type ShipSlotType = 'CoreInternal' | 'OptionalInternal' | 'Hardpoint' | 'UtilityMount';

export interface EquipmentItem {
    id: string;
    name: string;
    category: EquipmentCategory;
    class: number; // E.g. 1-5
    rating: 'A' | 'B' | 'C' | 'D' | 'E';
    price: number;
    mass: number;
    powerDraw: number;
    compatibleSlotTypes: ShipSlotType[];
    stats: {
        damage?: number;
        shieldStrength?: number;
        cargoIncrease?: number;
        powerGenerated?: number;
        rate?: number;
    };
}

export interface ShipSlot {
    type: ShipSlotType;
    size: number;
    equippedItem: EquipmentItem | null;
}

export interface ShipSpec {
    manufacturer: string;
    class: 'Fighter' | 'Trader' | 'Explorer' | 'Multi-purpose';
    hull: number;
    shields: number; // Base shields
    maxFuel: number;
    cargoCapacity: number; // Base cargo capacity
    maxEnergy: number; // Base energy from ship's built-in reactor
    speed: number;
    turnRate: number; // degrees per second
    acceleration: number;
    jumpRange: number;
    slots: { type: ShipSlotType; size: number }[];
    basePrice: number;
    mass: number;
    maxMissiles?: number;
}

export interface ShipForSale {
    type: string;
    spec: ShipSpec;
    price: number;
}

export type AIState = 'IDLE' | 'PATROLLING' | 'TRAVEL_TO_STATION' | 'INTERCEPT' | 'DOGFIGHT' | 'FLEEING' | 'DOCKING';

export interface NPC {
  id: string;
  type: 'Pirate' | 'Trader' | 'Police';
  shipType: string;
  hull: number;
  maxHull: number;
  shields: number;
  maxShields: number;
  position: { x: number; y: number; z: number };
  isHostile: boolean;
  aiState: AIState;
  velocity: { x: number; y: number; z: number };
  angle: number;
  targetId?: string;
  name?: string; // Add name for specific targets
  navigationTarget?: { x: number; y: number; z: number }; // For travelling logic
}

export interface Celestial {
    id: string;
    type: 'Star' | 'Planet' | 'Station';
    name: string;
    position: { x: number; y: number; z: number };
    radius: number;
}


export interface Ship {
  name: string;
  type: string;
  hull: number; // Current hull
  maxHull: number;
  shields: number; // Current shields
  maxShields: number;
  fuel: number; // In light-years
  maxFuel: number;
  cargoCapacity: number; // in Tonnes
  cargo: CargoItem[];
  credits: number;
  basePrice: number;
  energy: number;
  maxEnergy: number;
  slots: ShipSlot[];
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  angle: number; // degrees
  id: string;
  energyPips: { sys: number; eng: number; wep: number };
  missiles: number;
  maxMissiles: number;
  legalStatus: 'Clean' | 'Offender' | 'Fugitive';
}

export interface Salvage {
  id: string;
  contents: CargoItem;
  position: { x: number; y: number; z: number };
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'Bounty' | 'Delivery' | 'Assassination';
  reward: number;
  status: 'Available' | 'InProgress' | 'Completed' | 'Failed';
  
  // Mission Logic
  systemId: number; // The system where the mission takes place (or destination)
  targetName?: string; // For assassination
  targetShipType?: string; // For bounty/assassination
  requiredKills?: number; // For bounty
  currentKills?: number; // Progress
  cargoRequired?: CargoItem; // For delivery
  destinationSystemId?: number; // Explicit destination if different from origin
}

export interface PhysicsState {
    id: string;
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    angle: number; // degrees
    angularVelocity: number; // degrees per second
    mass: number;
    thrust: number; // magnitude of forward/backward thrust (-1 to 1)
    turn: number;   // direction of turn (-1, 0, 1)
    maxSpeed: number;
    turnRate: number; // degrees per second
}

export interface Projectile {
  id: string;
  ownerId: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  angle: number;
  type: 'laser' | 'missile';
  damage: number;
  remainingLife: number; // in ms
  targetId?: string;
}

export interface VisualEffect {
  id: string;
  type: 'explosion' | 'shield_impact' | 'hull_impact';
  position: { x: number; y: number; z: number };
  size: number;
  maxSize: number;
  remainingLife: number; // in ms
  maxLife: number; // in ms
  angle?: number;
}