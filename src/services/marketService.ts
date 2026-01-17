
import { StarSystem, MarketGood, Ship, CargoItem } from '../types';
import { playerShipService } from './playerShipService';
import { MarketManager, TradeGood } from '../game/models/Market';
import { EconomicSystemCoordinator } from '../game/systems/EconomicSystemCoordinator';

class MarketService {
  private manager: MarketManager;
  private coordinator: EconomicSystemCoordinator;
  private initializedSystems = new Set<number>();

  constructor() {
      this.manager = new MarketManager();
      this.coordinator = new EconomicSystemCoordinator(this.manager);
  }

  private ensureSystemInitialized(system: StarSystem) {
      if (!this.initializedSystems.has(system.id)) {
          this.coordinator.initializeSystem(system.id, system as any);
          this.initializedSystems.add(system.id);
      }
  }

  public getMarketData(system: StarSystem): MarketGood[] {
    this.ensureSystemInitialized(system);
    const summary = this.coordinator.getSystemMarketSummary(system.id);
    return summary.commodities || [];
  }

  public buyCommodity(system: StarSystem, commodityName: string, quantity: number): { success: boolean, market?: MarketGood[], error?: string } {
    this.ensureSystemInitialized(system);
    const ship = playerShipService.getShip();
    
    // Find commodity in market
    const marketData = this.getMarketData(system);
    const item = marketData.find(c => c.name === commodityName);
    
    if (!item) return { success: false, error: 'Item not found' };
    
    const cost = item.buyPrice * quantity;
    if (ship.credits < cost) return { success: false, error: 'Insufficient credits' };

    // Record trade via coordinator (handles logic and history)
    this.coordinator.recordTrade(
        system.id, system.name, ship.id, 'BUY', commodityName as TradeGood,
        quantity, item.buyPrice, {}, {}, {}
    );
    
    // Update player ship (Credits/Cargo)
    const newCargo = [...ship.cargo];
    const existing = newCargo.find(c => c.name === commodityName);
    if (existing) {
        existing.quantity += quantity;
    } else {
        newCargo.push({ name: commodityName, quantity, weight: 1 }); // Mock weight
    }
    
    playerShipService.setShip({
        ...ship,
        credits: ship.credits - cost,
        cargo: newCargo
    });

    return { success: true, market: this.getMarketData(system) };
  }

  public sellCommodity(system: StarSystem, commodityName: string, quantity: number): { success: boolean, market?: MarketGood[], error?: string } {
    this.ensureSystemInitialized(system);
    const ship = playerShipService.getShip();
    
    const marketData = this.getMarketData(system);
    const item = marketData.find(c => c.name === commodityName);
    if (!item) return { success: false, error: 'Station does not buy this item' };

    const revenue = item.sellPrice * quantity;

    // Record trade
    this.coordinator.recordTrade(
        system.id, system.name, ship.id, 'SELL', commodityName as TradeGood,
        quantity, item.sellPrice, {}, {}, {}
    );

    // Update ship
    const newCargo = ship.cargo.map(c => {
        if (c.name === commodityName) {
            return { ...c, quantity: c.quantity - quantity };
        }
        return c;
    }).filter(c => c.quantity > 0);

    playerShipService.setShip({
        ...ship,
        credits: ship.credits + revenue,
        cargo: newCargo
    });

    return { success: true, market: this.getMarketData(system) };
  }
}

export const marketService = new MarketService();
