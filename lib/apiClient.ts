// lib/apiClient.ts
import axios from 'axios';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; timestamp: number }>();

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
}

export interface TimeSeriesData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

class FinancialAPIClient {
  private baseURLs = {
    alphavantage: 'https://www.alphavantage.co/query',
    finnhub: 'https://finnhub.io/api/v1',
  };

  private apiKeys = {
    alphavantage: process.env.NEXT_PUBLIC_ALPHAVANTAGE_API_KEY || '',
    finnhub: process.env.NEXT_PUBLIC_FINNHUB_API_KEY || '',
  };

  // Cache management
  private getCached(key: string) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any) {
    cache.set(key, { data, timestamp: Date.now() });
  }

  // Alpha Vantage APIs
// inside FinancialAPIClient class in lib/apiClient.ts
async getStockQuote(symbol: string): Promise<StockQuote> {
  const cacheKey = `quote_${symbol}`;
  const cached = this.getCached(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(this.baseURLs.alphavantage, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol,
        apikey: this.apiKeys.alphavantage,
      },
      timeout: 10000,
    });
    console.log(response)
    const quote = response.data && response.data['Global Quote'];
    if (!quote || Object.keys(quote).length === 0) {
      // If the API returns something unexpected, include the raw body in the error for debugging:
      const raw = response.data ? JSON.stringify(response.data).slice(0, 500) : 'empty response';
      const msg = `AlphaVantage returned no 'Global Quote' for symbol=${symbol}. Raw: ${raw}`;
      console.warn(msg);
      throw new Error(msg);
    }

    // Defensive parsing - check each field exists
    const symbolVal = quote['01. symbol'];
    const priceVal = quote['05. price'];
    const changeVal = quote['09. change'];
    const changePctVal = quote['10. change percent'];
    const volumeVal = quote['06. volume'];

    if (!symbolVal || !priceVal) {
      const raw = JSON.stringify(quote).slice(0, 500);
      throw new Error(`AlphaVantage returned incomplete quote for ${symbol}. Quote: ${raw}`);
    }

    const result: StockQuote = {
      symbol: String(symbolVal),
      price: parseFloat(priceVal),
      change: changeVal ? parseFloat(changeVal) : 0,
      changePercent: changePctVal ? parseFloat(String(changePctVal).replace('%', '')) : 0,
      volume: volumeVal ? parseInt(String(volumeVal).replace(/,/g, '')) : 0,
    };

    this.setCache(cacheKey, result);
    return result;
  } catch (error: any) {
    console.error('Error fetching stock quote:', error?.message || error);
    // Wrap the error with context so caller knows which symbol failed
    throw new Error(`Failed to fetch quote for ${symbol}: ${error?.message || error}`);
  }
}


  // async getTimeSeries(
  //   symbol: string,
  //   interval: 'daily' | 'weekly' | 'monthly' = 'daily'
  // ): Promise<TimeSeriesData[]> {
  //   const cacheKey = `timeseries_${symbol}_${interval}`;
  //   const cached = this.getCached(cacheKey);
  //   if (cached) return cached;

  //   try {
  //     const functionMap = {
  //       daily: 'TIME_SERIES_DAILY',
  //       weekly: 'TIME_SERIES_WEEKLY',
  //       monthly: 'TIME_SERIES_MONTHLY',
  //     };

  //     const response = await axios.get(this.baseURLs.alphavantage, {
  //       params: {
  //         function: functionMap[interval],
  //         symbol,
  //         apikey: this.apiKeys.alphavantage,
  //       },
  //     });

  //     const timeSeriesKey = Object.keys(response.data).find(key =>
  //       key.includes('Time Series')
  //     );
      
  //     if (!timeSeriesKey) throw new Error('Invalid response format');

  //     const timeSeries = response.data[timeSeriesKey];
  //     const result = Object.entries(timeSeries)
  //       .slice(0, 100)
  //       .map(([date, values]: [string, any]) => ({
  //         timestamp: date,
  //         open: parseFloat(values['1. open']),
  //         high: parseFloat(values['2. high']),
  //         low: parseFloat(values['3. low']),
  //         close: parseFloat(values['4. close']),
  //         volume: parseInt(values['5. volume']),
  //       }))
  //       .reverse();

  //     this.setCache(cacheKey, result);
  //     return result;
  //   } catch (error) {
  //     console.error('Error fetching time series:', error);
  //     throw error;
  //   }
  // }

  // async getTopGainersLosers() {
  //   const cacheKey = 'top_gainers_losers';
  //   const cached = this.getCached(cacheKey);
  //   if (cached) return cached;

  //   try {
  //     const response = await axios.get(this.baseURLs.alphavantage, {
  //       params: {
  //         function: 'TOP_GAINERS_LOSERS',
  //         apikey: this.apiKeys.alphavantage,
  //       },
  //     });

  //     const result = {
  //       gainers: response.data.top_gainers?.slice(0, 10) || [],
  //       losers: response.data.top_losers?.slice(0, 10) || [],
  //       activelyTraded: response.data.most_actively_traded?.slice(0, 10) || [],
  //     };

  //     this.setCache(cacheKey, result);
  //     return result;
  //   } catch (error) {
  //     console.error('Error fetching gainers/losers:', error);
  //     throw error;
  //   }
  // }

  // // Finnhub APIs (alternative/backup)
  // async getFinnhubQuote(symbol: string): Promise<StockQuote> {
  //   const cacheKey = `finnhub_quote_${symbol}`;
  //   const cached = this.getCached(cacheKey);
  //   if (cached) return cached;

  //   try {
  //     const response = await axios.get(`${this.baseURLs.finnhub}/quote`, {
  //       params: {
  //         symbol,
  //         token: this.apiKeys.finnhub,
  //       },
  //     });

  //     const data = response.data;
  //     const result: StockQuote = {
  //       symbol,
  //       price: data.c,
  //       change: data.d,
  //       changePercent: data.dp,
  //       volume: 0,
  //     };

  //     this.setCache(cacheKey, result);
  //     return result;
  //   } catch (error) {
  //     console.error('Error fetching Finnhub quote:', error);
  //     throw error;
  //   }
  // }

  // // Search stocks
  // async searchStocks(query: string) {
  //   try {
  //     const response = await axios.get(this.baseURLs.alphavantage, {
  //       params: {
  //         function: 'SYMBOL_SEARCH',
  //         keywords: query,
  //         apikey: this.apiKeys.alphavantage,
  //       },
  //     });

  //     return response.data.bestMatches || [];
  //   } catch (error) {
  //     console.error('Error searching stocks:', error);
  //     throw error;
  //   }
  // }
}

export const apiClient = new FinancialAPIClient();