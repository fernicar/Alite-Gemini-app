
import { StarSystem, MarketGood, Ship, CargoItem } from '../types';
import { COMMODITIES } from '../data/commodities';

// Cache to store market data for each system, to persist changes during a session.
const marketDataCache = new Map<number, MarketGood[]>();

class MarketService {
  public getMarketData(system: StarSystem): MarketGood[] {
    if (marketDataCache.has(system.id)) {
      return marketDataCache.get(system.id)!;
    }

    const market: MarketGood[] = COMMODITIES.map(commodity => {
      let priceModifier = 1.0;
      let quantityModifier = 1.0;

      // Economy
      switch (system.economy) {
        case 'Agricultural':
          if (commodity.category === 'Consumer Goods') { priceModifier -= 0.3; quantityModifier += 1.5; }
          if (commodity.category === 'Industrial Goods' || commodity.category === 'Technology') { priceModifier += 0.4; quantityModifier -= 0.5; }
          break;
        case 'Industrial':
          if (commodity.category === 'Consumer Goods') { priceModifier += 0.2; quantityModifier -= 0.3; }
          if (commodity.category === 'Industrial Goods') { priceModifier -= 0.4; quantityModifier += 2.0; }
          if (commodity.category === 'Raw Materials') { priceModifier += 0.3; quantityModifier -= 0.5; }
          break;
        case 'High-Tech':
          if (commodity.category === 'Technology') { priceModifier -= 0.5; quantityModifier += 1.5; }
          if (commodity.category === 'Industrial Goods') { priceModifier += 0.3; quantityModifier -= 0.5; }
          if (commodity.category === 'Consumer Goods') { priceModifier += 0.1; }
          break;
        case 'Mining':
          if (commodity.category === 'Raw Materials') { priceModifier -= 0.4; quantityModifier += 2.5; }
          if (commodity.category === 'Industrial Goods') { priceModifier += 0.5; quantityModifier -= 0.6; }
          break;
        case 'Refinery':
          if (commodity.category === 'Raw Materials') { priceModifier += 0.4; quantityModifier -= 0.5; }
          if (commodity.category === 'Industrial Goods') { priceModifier -= 0.2; quantityModifier += 1.0; }
          break;
        case 'Tourism':
          if (commodity.category === 'Luxury') { priceModifier -= 0.3; quantityModifier += 1.0; }
          if (commodity.category === 'Consumer Goods') { priceModifier -= 0.1; quantityModifier += 0.5; }
          break;
      }

      // Government
      switch (system.government) {
          case 'Anarchy':
              if (commodity.category === 'Military' || commodity.name === 'Narcotics') { priceModifier -= 0.2; quantityModifier += 0.5; }
              if (commodity.category === 'Technology') { priceModifier += 0.3; quantityModifier -= 0.4; }
              break;
          case 'Corporate':
              if (commodity.category === 'Industrial Goods' || commodity.category === 'Technology') { priceModifier += 0.1; }
              break;
          case 'Democracy':
              priceModifier += 0.05; // Stable prices
              break;
      }

      // Tech Level
      if (commodity.category === 'Technology') {
          priceModifier -= (system.techLevel / 30); // Higher tech -> cheaper tech goods
          quantityModifier += (system.techLevel / 10); // Higher tech -> more tech goods
      } else if (commodity.category === 'Raw Materials' || commodity.category === 'Consumer Goods') {
          priceModifier += (system.techLevel / 40); // Higher tech -> demands more basic goods
      }
      
      // Population
      quantityModifier *= (1 + system.population / 10_000_000);
      if (commodity.category === 'Consumer Goods') {
          priceModifier += (system.population / 20_000_000);
      }

      priceModifier += (Math.random() - 0.5) * 0.1; // +/- 5%
      quantityModifier += (Math.random() - 0.5) * 0.2; // +/- 10%

      const basePrice = commodity.basePrice;
      const marketPrice = Math.round(basePrice * priceModifier);
      
      const sellPrice = Math.round(marketPrice * 0.9); // Player sells to station
      const buyPrice = Math.round(marketPrice * 1.1); // Player buys from station

      return {
        name: commodity.name,
        category: commodity.category,
        quantity: Math.max(0, Math.round(100 * quantityModifier)),
        buyPrice: buyPrice,
        sellPrice: sellPrice,
        weight: commodity.weight,
      };
    });

    marketDataCache.set(system.id, market);
    return market;
  }

  private adjustPrice(marketItem: MarketGood, quantityChange: number): MarketGood {
    const newQuantity = marketItem.quantity + quantityChange;
    // Simple elasticity: price changes inversely to quantity change
    const priceElasticity = 0.05; 
    const relativeChange = -quantityChange / (marketItem.quantity + 1);
    const priceChangeFactor = 1 + (relativeChange * priceElasticity);

    const newBuyPrice = Math.round(marketItem.buyPrice * priceChangeFactor);
    const newSellPrice = Math.round(marketItem.sellPrice * priceChangeFactor);
    
    return {
        ...marketItem,
        quantity: newQuantity,
        buyPrice: Math.max(1, newBuyPrice),
        sellPrice: Math.max(1, newSellPrice)
    };
  }

  public buyCommodity(ship: Ship, system: StarSystem, commodityName: string, quantity: number): { success: boolean, ship?: Ship, market?: MarketGood[], error?: string } {
    const market = this.getMarketData(system);
    const selectedCommodity = market.find(c => c.name === commodityName);
    if (!selectedCommodity) return { success: false, error: "Commodity not found in this market." };
    
    const commodityInfo = COMMODITIES.find(c => c.name === selectedCommodity.name);
    if (!commodityInfo) return { success: false, error: "Commodity data not found." };
    
    const totalPrice = selectedCommodity.buyPrice * quantity;
    const totalWeight = commodityInfo.weight * quantity;
    const currentWeight = ship.cargo.reduce((acc, item) => acc + (item.quantity * item.weight), 0);
    
    if (ship.credits < totalPrice) return { success: false, error: "Insufficient credits." };
    if (currentWeight + totalWeight > ship.cargoCapacity) return { success: false, error: "Insufficient cargo space." };
    if (quantity > selectedCommodity.quantity) return { success: false, error: "Station does not have enough stock." };

    const newCargo = [...ship.cargo];
    const existingItem = newCargo.find(item => item.name === selectedCommodity.name);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        newCargo.push({ name: selectedCommodity.name, quantity: quantity, weight: commodityInfo.weight });
    }
    
    const newShipState: Ship = {
        ...ship,
        credits: ship.credits - totalPrice,
        cargo: newCargo,
    };

    const newMarketData = market.map(item =>
        item.name === commodityName ? this.adjustPrice(item, -quantity) : item
    );
    marketDataCache.set(system.id, newMarketData);
    
    return { success: true, ship: newShipState, market: newMarketData };
  }

  public sellCommodity(ship: Ship, system: StarSystem, commodityName: string, quantity: number): { success: boolean, ship?: Ship, market?: MarketGood[], error?: string } {
    const market = this.getMarketData(system);
    const selectedCommodity = market.find(c => c.name === commodityName);
    if (!selectedCommodity) return { success: false, error: "This station does not trade this commodity." };
    
    const cargoItem = ship.cargo.find(item => item.name === commodityName);
    if (!cargoItem || quantity > cargoItem.quantity) return { success: false, error: "You don't have enough to sell." };

    const totalPrice = selectedCommodity.sellPrice * quantity;
    
    const newCargo = ship.cargo.map(item => {
        if (item.name === selectedCommodity.name) {
            return { ...item, quantity: item.quantity - quantity };
        }
        return item;
    }).filter(item => item.quantity > 0);

    const newShipState: Ship = {
        ...ship,
        credits: ship.credits + totalPrice,
        cargo: newCargo,
    };

    const newMarketData = market.map(item =>
        item.name === commodityName ? this.adjustPrice(item, quantity) : item
    );
    marketDataCache.set(system.id, newMarketData);

    return { success: true, ship: newShipState, market: newMarketData };
  }
}

export const marketService = new MarketService();
