import { Commodity } from '../types';

export const COMMODITIES: Commodity[] = [
    { name: 'Food Rations', category: 'Consumer Goods', basePrice: 50, weight: 1 },
    { name: 'Water', category: 'Consumer Goods', basePrice: 20, weight: 1 },
    { name: 'Polymers', category: 'Industrial Goods', basePrice: 120, weight: 1.5 },
    { name: 'Machine Parts', category: 'Industrial Goods', basePrice: 250, weight: 5 },
    { name: 'Ore', category: 'Raw Materials', basePrice: 80, weight: 2 },
    { name: 'Precious Metals', category: 'Raw Materials', basePrice: 500, weight: 0.1 },
    { name: 'Scrap Metal', category: 'Raw Materials', basePrice: 25, weight: 1 },
    { name: 'Microchips', category: 'Technology', basePrice: 700, weight: 0.2 },
    { name: 'AI Cores', category: 'Technology', basePrice: 2000, weight: 0.5 },
    { name: 'Luxury Goods', category: 'Luxury', basePrice: 1500, weight: 0.8 },
    { name: 'Narcotics', category: 'Luxury', basePrice: 3000, weight: 0.4 },
    { name: 'Hand Weapons', category: 'Military', basePrice: 400, weight: 2 },
    { name: 'Battle Armor', category: 'Military', basePrice: 1200, weight: 8 },
];