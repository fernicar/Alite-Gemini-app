
import { EconomyType, GovernmentType, TechLevel } from './Galaxy';
import { SeededRandomGenerator, MarketRandom } from '../procedural/SeededRandomGenerator';

export enum TradeGood {
  FOOD_CARTRIDGES = 'Food Cartridges',
  LIQUOR = 'Liquor',
  LUXURIES = 'Luxuries',
  GRAIN = 'Grain',
  VEGETABLES = 'Vegetables',
  MEAT = 'Meat',
  METALS = 'Metals',
  MACHINERY = 'Machinery',
  CHEMICALS = 'Chemicals',
  COMPUTERS = 'Computers',
  SOFTWARE = 'Software',
  ROBOTS = 'Robots',
  MINERALS = 'Minerals',
  PRECIOUS_STONES = 'Precious Stones',
  FUEL = 'Fuel',
  WEAPONS = 'Hand Weapons',
  MILITARY_EQUIPMENT = 'Military Equipment',
  ARMOR = 'Battle Armor'
}

export enum CommodityCategory {
  CONSUMER = 'Consumer Goods',
  INDUSTRIAL = 'Industrial Goods',
  RAW_MATERIALS = 'Raw Materials',
  MILITARY = 'Military',
  LUXURY = 'Luxury',
  TECHNOLOGY = 'Technology'
}

export enum PriceBehavior {
  STABLE = 'Stable',
  VOLATILE = 'Volatile',
  SEASONAL = 'Seasonal',
  TRENDING = 'Trending',
  RANDOM = 'Random'
}

export interface MarketConditions {
  demand: Map<TradeGood, number>;
  supply: Map<TradeGood, number>;
  specialEvents: any[];
  priceInfluence: Map<TradeGood, number>;
}

export interface CommodityMarket {
  good: TradeGood;
  basePrice: number;
  currentPrice: number;
  quantity: number;
  averageQuantity: number;
  lastPrice: number;
  priceHistory: number[];
  fluctuationRange: number;
  behavior: PriceBehavior;
  category: CommodityCategory;
  priceElasticity: number;
  supplyResponsiveness: number;
  marketShare: number;
  baseDemand: number;
  baseSupply: number;
  productionCost: number;
  rarity: string;
  productionDifficulty: number;
  galacticVolume: number;
}

export interface SystemMarketInstance {
  systemId: number;
  marketConditions: MarketConditions;
  commodities: Map<TradeGood, CommodityMarket>;
  lastUpdate: number;
  updateFrequency: number;
  totalVolume: number;
  totalTrades: number;
  revenueGenerated: number;
  averagePriceLevel: number;
  priceStability: number;
  tradeHealth: number;
  galacticInfluence: Map<TradeGood, number>;
  tradeRouteInfluence: Map<TradeGood, number>;
}

export interface GalacticMarket {
    goods: Map<TradeGood, any>;
    priceIndices: Map<string, number>;
    tradeFlows: any[];
    marketEvents: any[];
}

export class MarketManager {
  private galacticMarket: GalacticMarket;
  private systemMarkets: Map<number, SystemMarketInstance>;
  private random: MarketRandom;

  constructor(seed: number = Date.now()) {
    this.random = new MarketRandom(seed);
    this.systemMarkets = new Map();
    this.galacticMarket = { goods: new Map(), priceIndices: new Map(), tradeFlows: [], marketEvents: [] };
  }

  createSystemMarket(
    systemId: number,
    economy: EconomyType,
    government: GovernmentType,
    techLevel: TechLevel,
    position?: { x: number; y: number }
  ): SystemMarketInstance {
    const commodities = new Map<TradeGood, CommodityMarket>();
    
    // Initialize base commodities
    Object.values(TradeGood).forEach(good => {
        const basePrice = this.getBasePrice(good);
        // Simple mock calculation for now to ensure data exists
        const currentPrice = Math.max(1, Math.round(basePrice * (0.8 + this.random.next() * 0.4)));
        const quantity = Math.floor(this.random.next() * 100) + 10;
        
        commodities.set(good, {
            good,
            basePrice,
            currentPrice,
            quantity,
            averageQuantity: quantity,
            lastPrice: currentPrice,
            priceHistory: [currentPrice],
            fluctuationRange: 0.1,
            behavior: PriceBehavior.STABLE,
            category: this.getCommodityCategory(good),
            priceElasticity: 1,
            supplyResponsiveness: 1,
            marketShare: 0.1,
            baseDemand: 100,
            baseSupply: 100,
            productionCost: basePrice * 0.5,
            rarity: 'Common',
            productionDifficulty: 1,
            galacticVolume: 0
        });
    });

    const market: SystemMarketInstance = {
      systemId,
      marketConditions: { demand: new Map(), supply: new Map(), specialEvents: [], priceInfluence: new Map() },
      commodities,
      lastUpdate: Date.now(),
      updateFrequency: 1,
      totalVolume: 0,
      totalTrades: 0,
      revenueGenerated: 0,
      averagePriceLevel: 100,
      priceStability: 0.8,
      tradeHealth: 0.8,
      galacticInfluence: new Map(),
      tradeRouteInfluence: new Map()
    };

    this.systemMarkets.set(systemId, market);
    return market;
  }

  private getBasePrice(good: TradeGood): number {
      // Simplified base prices
      switch(good) {
          case TradeGood.FOOD_CARTRIDGES: return 20;
          case TradeGood.FUEL: return 5;
          case TradeGood.COMPUTERS: return 800;
          case TradeGood.LUXURIES: return 500;
          case TradeGood.WEAPONS: return 1200;
          default: return 100;
      }
  }

  private getCommodityCategory(good: TradeGood): CommodityCategory {
      // Simplified mapping
      if (good === TradeGood.FOOD_CARTRIDGES || good === TradeGood.GRAIN) return CommodityCategory.CONSUMER;
      if (good === TradeGood.WEAPONS || good === TradeGood.ARMOR) return CommodityCategory.MILITARY;
      if (good === TradeGood.MACHINERY || good === TradeGood.COMPUTERS) return CommodityCategory.INDUSTRIAL;
      return CommodityCategory.RAW_MATERIALS;
  }

  getSystemMarket(systemId: number): SystemMarketInstance | undefined {
    return this.systemMarkets.get(systemId);
  }
  
  getMarketSummary(systemId: number): any {
      const market = this.getSystemMarket(systemId);
      if (!market) return {};
      
      const commodities = Array.from(market.commodities.values()).map(c => ({
          name: c.good,
          price: c.currentPrice,
          quantity: c.quantity,
          category: c.category,
          buyPrice: Math.round(c.currentPrice * 1.05),
          sellPrice: Math.round(c.currentPrice * 0.95)
      }));
      return { commodities };
  }

  executeTrade(systemId: number, good: TradeGood, quantity: number, type: 'BUY' | 'SELL'): { success: boolean, price?: number, error?: string } {
      const market = this.getSystemMarket(systemId);
      if (!market) return { success: false, error: 'Market not initialized' };
      
      const commodity = market.commodities.get(good);
      if (!commodity) return { success: false, error: 'Commodity not found' };
      
      if (type === 'BUY') {
          if (commodity.quantity < quantity) return { success: false, error: 'Insufficient stock' };
          commodity.quantity -= quantity;
          return { success: true, price: Math.round(commodity.currentPrice * 1.05) };
      } else {
          commodity.quantity += quantity;
          return { success: true, price: Math.round(commodity.currentPrice * 0.95) };
      }
  }
}
