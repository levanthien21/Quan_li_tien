import Decimal from 'decimal.js';

/**
 * MarketDataService
 * Fetches real-time cryptocurrency prices from CoinGecko API.
 * Uses in-memory caching to avoid hitting API rate limits.
 * 
 * For this bot, the key rate needed is: USDT (Tether) price in VND.
 * CoinGecko returns tether price in VND directly.
 */

interface CachedPrice {
  price: Decimal;
  fetchedAt: number; // timestamp ms
}

interface CoinGeckoResponse {
  [coinId: string]: {
    [currency: string]: number;
  };
}

export class MarketDataService {
  private cache: Map<string, CachedPrice> = new Map();
  private readonly cacheTtlMs: number;
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';

  constructor(apiKey: string, cacheTtlMinutes: number = 5) {
    this.apiKey = apiKey;
    this.cacheTtlMs = cacheTtlMinutes * 60 * 1000;
  }

  /**
   * Gets USDT (Tether) price in VND from CoinGecko.
   * This is the exchange rate: 1 USDT = X VND
   */
  async getUsdtVndRate(): Promise<Decimal> {
    return this.getCoinPrice('tether', 'vnd');
  }

  /**
   * Gets Bitcoin price in USD from CoinGecko.
   */
  async getBtcUsdPrice(): Promise<Decimal> {
    return this.getCoinPrice('bitcoin', 'usd');
  }

  /**
   * Gets Bitcoin price in VND from CoinGecko.
   */
  async getBtcVndPrice(): Promise<Decimal> {
    return this.getCoinPrice('bitcoin', 'vnd');
  }

  /**
   * Gets multiple prices in a single API call.
   * Returns: { tether: { vnd: Decimal }, bitcoin: { usd: Decimal, vnd: Decimal } }
   */
  async getAllRates(): Promise<{
    usdtVnd: Decimal;
    btcUsd: Decimal;
    btcVnd: Decimal;
  }> {
    const cacheKey = 'all_rates';
    const cachedAll = this.cache.get(cacheKey);

    // Check if we have fresh cached data for all rates
    if (cachedAll && !this.isCacheExpired(cachedAll)) {
      const usdtVnd = this.cache.get('tether_vnd');
      const btcUsd = this.cache.get('bitcoin_usd');
      const btcVnd = this.cache.get('bitcoin_vnd');

      if (usdtVnd && btcUsd && btcVnd) {
        return {
          usdtVnd: usdtVnd.price,
          btcUsd: btcUsd.price,
          btcVnd: btcVnd.price,
        };
      }
    }

    // Fetch all prices in a single API call
    const url = `${this.baseUrl}/simple/price?ids=tether,bitcoin&vs_currencies=vnd,usd&x_cg_demo_api_key=${this.apiKey}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as CoinGeckoResponse;
      const now = Date.now();

      // Cache individual prices
      if (data.tether?.vnd) {
        this.cache.set('tether_vnd', { price: new Decimal(data.tether.vnd), fetchedAt: now });
      }
      if (data.bitcoin?.usd) {
        this.cache.set('bitcoin_usd', { price: new Decimal(data.bitcoin.usd), fetchedAt: now });
      }
      if (data.bitcoin?.vnd) {
        this.cache.set('bitcoin_vnd', { price: new Decimal(data.bitcoin.vnd), fetchedAt: now });
      }

      // Mark all_rates as fresh
      this.cache.set(cacheKey, { price: new Decimal(0), fetchedAt: now });

      return {
        usdtVnd: new Decimal(data.tether?.vnd || 0),
        btcUsd: new Decimal(data.bitcoin?.usd || 0),
        btcVnd: new Decimal(data.bitcoin?.vnd || 0),
      };
    } catch (error: any) {
      console.error('❌ CoinGecko API fetch error:', error.message);

      // Return cached values if available (even if expired)
      const fallbackUsdtVnd = this.cache.get('tether_vnd');
      const fallbackBtcUsd = this.cache.get('bitcoin_usd');
      const fallbackBtcVnd = this.cache.get('bitcoin_vnd');

      if (fallbackUsdtVnd && fallbackBtcUsd && fallbackBtcVnd) {
        console.warn('⚠️ Using expired cache as fallback');
        return {
          usdtVnd: fallbackUsdtVnd.price,
          btcUsd: fallbackBtcUsd.price,
          btcVnd: fallbackBtcVnd.price,
        };
      }

      throw new Error(`Không thể lấy tỷ giá từ thị trường. Vui lòng thử lại sau. (${error.message})`);
    }
  }

  /**
   * Gets a single coin price in a specific currency.
   */
  private async getCoinPrice(coinId: string, vsCurrency: string): Promise<Decimal> {
    const cacheKey = `${coinId}_${vsCurrency}`;
    const cached = this.cache.get(cacheKey);

    if (cached && !this.isCacheExpired(cached)) {
      return cached.price;
    }

    const url = `${this.baseUrl}/simple/price?ids=${coinId}&vs_currencies=${vsCurrency}&x_cg_demo_api_key=${this.apiKey}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as CoinGeckoResponse;
      const price = data[coinId]?.[vsCurrency];

      if (price === undefined || price === null) {
        throw new Error(`Không tìm thấy giá ${coinId}/${vsCurrency} từ CoinGecko`);
      }

      const decimalPrice = new Decimal(price);
      this.cache.set(cacheKey, { price: decimalPrice, fetchedAt: Date.now() });

      return decimalPrice;
    } catch (error: any) {
      // Fallback to expired cache if available
      if (cached) {
        console.warn(`⚠️ CoinGecko API failed, using cached ${coinId}/${vsCurrency} price (${this.getAgeMinutes(cached)} phút trước)`);
        return cached.price;
      }
      throw new Error(`Không thể lấy tỷ giá ${coinId}/${vsCurrency}: ${error.message}`);
    }
  }

  /**
   * Forces a cache refresh on next call.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Returns cache age info for display purposes.
   */
  getCacheInfo(): { lastUpdated: Date | null; ageMinutes: number } {
    const anyEntry = this.cache.get('tether_vnd') || this.cache.get('all_rates');
    if (!anyEntry) {
      return { lastUpdated: null, ageMinutes: -1 };
    }
    return {
      lastUpdated: new Date(anyEntry.fetchedAt),
      ageMinutes: this.getAgeMinutes(anyEntry),
    };
  }

  private isCacheExpired(cached: CachedPrice): boolean {
    return Date.now() - cached.fetchedAt > this.cacheTtlMs;
  }

  private getAgeMinutes(cached: CachedPrice): number {
    return Math.round((Date.now() - cached.fetchedAt) / 60000);
  }
}
