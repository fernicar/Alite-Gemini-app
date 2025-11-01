
export interface StarSystem {
  id: number;
  name: string;
  x: number;
  y: number;
  economy: 'Industrial' | 'Agricultural' | 'Mining' | 'High-Tech' | 'Refinery' | 'Tourism';
  government: 'Anarchy' | 'Feudal' | 'Corporate' | 'Democracy' | 'Alliance';
  description: string;
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
    jumpRange: number;
    slots: { type: ShipSlotType; size: number }[];
    basePrice: number;
}

export interface ShipForSale {
    type: string;
    spec: ShipSpec;
    price: number;
}

export interface NPC {
  id: string;
  type: 'Pirate' | 'Trader' | 'Police';
  shipType: string;
  hull: number;
  maxHull: number;
  shields: number;
  maxShields: number;
  position: { x: number; y: number };
  isHostile: boolean;
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
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  angle: number; // degrees
}

export interface Salvage {
  id: string;
  contents: CargoItem;
  position: { x: number; y: number };
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'Bounty' | 'Delivery';
  reward: number;
  targetNPC?: {
    type: 'Pirate';
    shipType: string;
  };
  status: 'Available' | 'InProgress' | 'Completed';
  systemId: number; // The system where the mission objective is
}