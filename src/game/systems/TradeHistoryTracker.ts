
import { TradeGood } from '../models/Market';

export interface TradeRecord {
  id: string;
  timestamp: number;
  systemId: number;
  systemName: string;
  trader: string;
  tradeType: 'BUY' | 'SELL';
  good: TradeGood;
  quantity: number;
  pricePerUnit: number;
  totalValue: number;
  marketConditions: any;
  economicFactors: any;
  playerContext: any;
}

export interface SystemTradeHistory {
  systemId: number;
  systemName: string;
  totalTrades: number;
  totalVolume: number;
  totalValue: number;
  priceVolatility: number;
  tradeFrequency: number;
  marketShocks: number;
}

export interface PlayerTradeHistory {
  playerId: string;
  totalTrades: number;
  totalVolume: number;
  totalValue: number;
  netProfit: number;
}

export interface ArbitrageOpportunity {
  id: string;
  good: TradeGood;
  buySystem: { id: number; name: string; price: number; };
  sellSystem: { id: number; name: string; price: number; };
  potentialProfit: number;
}

export class TradeHistoryTracker {
  private tradeRecords: TradeRecord[] = [];
  private systemHistories: Map<number, SystemTradeHistory> = new Map();
  private playerHistories: Map<string, PlayerTradeHistory> = new Map();

  recordTrade(
    systemId: number,
    systemName: string,
    trader: string,
    tradeType: 'BUY' | 'SELL',
    good: TradeGood,
    quantity: number,
    pricePerUnit: number,
    marketContext: any,
    economicContext: any,
    playerContext: any
  ): void {
    const record: TradeRecord = {
        id: `trade-${Date.now()}`,
        timestamp: Date.now(),
        systemId, systemName, trader, tradeType, good, quantity, pricePerUnit,
        totalValue: quantity * pricePerUnit,
        marketConditions: marketContext,
        economicFactors: economicContext,
        playerContext
    };
    this.tradeRecords.push(record);
    
    // Update histories
    this.updateSystemHistory(systemId, systemName, record);
  }

  private updateSystemHistory(systemId: number, systemName: string, record: TradeRecord) {
      let hist = this.systemHistories.get(systemId);
      if (!hist) {
          hist = { 
              systemId, systemName, totalTrades: 0, totalVolume: 0, totalValue: 0, 
              priceVolatility: 0, tradeFrequency: 0, marketShocks: 0 
          };
          this.systemHistories.set(systemId, hist);
      }
      hist.totalTrades++;
      hist.totalVolume += record.quantity;
      hist.totalValue += record.totalValue;
  }

  getSystemHistory(systemId: number): SystemTradeHistory | undefined {
      return this.systemHistories.get(systemId);
  }

  getMarketTrends(systemId: number, good: TradeGood) {
      // Simplified trend
      return { priceMomentum: 0.05, priceTrend: 'STABLE' };
  }

  getTradingStatistics() {
      return {
          totalTrades: this.tradeRecords.length,
          totalVolume: this.tradeRecords.reduce((acc, r) => acc + r.quantity, 0)
      };
  }
  
  getArbitrageOpportunities(): ArbitrageOpportunity[] {
      return [];
  }
  
  searchTradeRecords(filters: any, limit: number): TradeRecord[] {
      return this.tradeRecords.slice(0, limit);
  }
}
