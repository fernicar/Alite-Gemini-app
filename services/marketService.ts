
import { StarSystem, MarketGood } from '../types';
import { COMMODITIES } from '../data/commodities';

export const generateMarketData = (system: StarSystem): MarketGood[] => {
  // Simple logic based on economy
  // In a real game this would be much more complex, using seeded randoms etc.
  const market: MarketGood[] = COMMODITIES.map(commodity => {
    let priceModifier = 1.0;
    let quantityModifier = 1.0;

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

    // Add some random variance
    priceModifier += (Math.random() - 0.5) * 0.1; // +/- 5%
    quantityModifier += (Math.random() - 0.5) * 0.2; // +/- 10%

    const basePrice = commodity.basePrice;
    const marketPrice = Math.round(basePrice * priceModifier);
    
    // Stations buy for less and sell for more
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

  return market;
};