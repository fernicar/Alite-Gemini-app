
export class SeededRandomGenerator {
  private _seed: number;
  private _state: number;
  private _buffer: number[];
  private _bufferIndex: number;

  constructor(seed: number | string) {
    if (typeof seed === 'string') {
      this._seed = this.hashString(seed);
    } else {
      this._seed = seed >>> 0;
    }
    this._state = this._seed;
    this._buffer = new Array(256);
    this._bufferIndex = 0;
    this._refillBuffer();
  }

  private hashString(str: string): number {
    let hash = 0x811C9DC5; 
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193); 
    }
    return hash >>> 0;
  }

  tweakRandom(change: number = 0): number {
    this._state = (this._state * 0x41C64E6D + 0x3039 + change) & 0xFFFFFFFF;
    return this._state >>> 0;
  }

  next(): number {
    const value = this.tweakRandom();
    return (value & 0xFFFFFFFF) / 0x100000000;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextBoolean(): boolean {
    return (this.tweakRandom() & 0x80000000) !== 0;
  }

  choice<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  nextGaussian(mean: number = 0, stdDev: number = 1): number {
    let u1 = 0, u2 = 0;
    while (u1 === 0) u1 = this.next();
    while (u2 === 0) u2 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  setSeed(seed: number | string): void {
    if (typeof seed === 'string') {
      this._seed = this.hashString(seed);
    } else {
      this._seed = seed >>> 0;
    }
    this._state = this._seed;
    this._bufferIndex = 0;
    this._refillBuffer();
  }

  private _refillBuffer(): void {
    for (let i = 0; i < this._buffer.length; i++) {
      this._buffer[i] = this.tweakRandom();
    }
    this._bufferIndex = 0;
  }
}

export class MarketRandom extends SeededRandomGenerator {
  nextPriceFluctuation(basePrice: number, volatility: number): number {
    const fluctuation = this.nextGaussian(0, volatility);
    return Math.max(0.1, basePrice + fluctuation);
  }

  nextCommodityQuantity(average: number, variance: number): number {
    const quantity = Math.max(0, this.nextGaussian(average, variance));
    return Math.round(quantity);
  }
}
