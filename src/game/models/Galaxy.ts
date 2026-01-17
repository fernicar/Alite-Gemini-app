
import { Vector2D } from '../../types';

export enum EconomyType {
  AGRICULTURAL = 'Agricultural',
  INDUSTRIAL = 'Industrial',
  HIGH_TECH = 'High-Tech',
  MINING = 'Mining',
  TOURISM = 'Tourism',
  MILITARY = 'Military'
}

export enum GovernmentType {
  ANARCHY = 'Anarchy',
  FEUDAL = 'Feudal',
  MULTI_GOVERNMENT = 'Multi-Government',
  DICTATORSHIP = 'Dictatorship',
  COMMUNIST = 'Communist',
  CONFEDERATE = 'Confederate',
  DEMOCRACY = 'Democracy',
  CORPORATE_STATE = 'Corporate',
  IMPLANTED_EMPIRE = 'Alliance' 
}

export enum TechLevel {
  PRIMITIVE = 0,
  LOW = 1,
  BASIC = 2,
  DEVELOPED = 3,
  ADVANCED = 4,
  HIGH = 5,
  INDUSTRIAL = 6,
  AGRICULTURAL = 7,
  PROFESSIONAL = 8,
  TECHNICAL = 9,
  RESEARCH = 10,
  HIGH_TECH = 11,
  ULTRA_HIGH_TECH = 12,
  FUTURE = 13,
  BLEEDING_EDGE = 14
}

export enum StarType {
  MAIN_SEQUENCE = 'Main Sequence',
  WHITE_DWARF = 'White Dwarf',
  RED_GIANT = 'Red Giant',
  NEUTRON = 'Neutron',
  BLACK_HOLE = 'Black Hole',
  BINARY = 'Binary System'
}

export interface System {
    id: number;
    name: string;
    description: string;
    economy: EconomyType | string; 
    government: GovernmentType | string;
    population: number;
    radius?: number;
    position: { x: number; y: number; z: number };
    stations?: string[];
    planets?: any[];
    techLevel?: number;
}
