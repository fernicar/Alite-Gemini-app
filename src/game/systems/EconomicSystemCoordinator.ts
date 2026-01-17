
import { TradeGood, MarketManager } from '../models/Market';
import { System } from '../models/Galaxy';
import { TradeHistoryTracker } from './TradeHistoryTracker';
import { MarketManipulationSystem } from './MarketManipulationSystem';

export class EconomicSystemCoordinator {
  private marketManager: MarketManager;
  private tradeHistoryTracker: TradeHistoryTracker;
  private marketManipulationSystem: MarketManipulationSystem;
  
  constructor(marketManager: MarketManager) {
    this.marketManager = marketManager;
    this.tradeHistoryTracker = new TradeHistoryTracker();
    this.marketManipulationSystem = new MarketManipulationSystem();
  }

  initializeSystem(systemId: number, system: System): void {
      this.marketManipulationSystem.initializeSystemConditions(
          systemId, 
          system.government as any, 
          system.economy as any
      );
      
      this.marketManager.createSystemMarket(
          systemId,
          system.economy as any,
          system.government as any,
          system.techLevel || 5
      );
  }

  recordTrade(
    systemId: number,
    systemName: string,
    playerId: string,
    tradeType: 'BUY' | 'SELL',
    good: TradeGood,
    quantity: number,
    pricePerUnit: number,
    marketContext: any,
    economicContext: any,
    playerContext: any
  ): void {
    this.tradeHistoryTracker.recordTrade(
      systemId, systemName, playerId, tradeType, good, quantity, pricePerUnit,
      marketContext, economicContext, playerContext
    );
    
    this.marketManager.executeTrade(systemId, good, quantity, tradeType);
  }

  getSystemMarketSummary(systemId: number) {
      return this.marketManager.getMarketSummary(systemId);
  }
}
