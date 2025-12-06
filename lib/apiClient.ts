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
      });

      const quote = response.data['Global Quote'];
      const result: StockQuote = {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        volume: parseInt(quote['06. volume']),
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching stock quote:', error);
      throw error;
    }
  }

  async getTimeSeries(
    symbol: string,
    interval: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<TimeSeriesData[]> {
    const cacheKey = `timeseries_${symbol}_${interval}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const functionMap = {
        daily: 'TIME_SERIES_DAILY',
        weekly: 'TIME_SERIES_WEEKLY',
        monthly: 'TIME_SERIES_MONTHLY',
      };

      const response = await axios.get(this.baseURLs.alphavantage, {
        params: {
          function: functionMap[interval],
          symbol,
          apikey: this.apiKeys.alphavantage,
        },
      });

      const timeSeriesKey = Object.keys(response.data).find(key =>
        key.includes('Time Series')
      );
      
      if (!timeSeriesKey) throw new Error('Invalid response format');

      const timeSeries = response.data[timeSeriesKey];
      const result = Object.entries(timeSeries)
        .slice(0, 100)
        .map(([date, values]: [string, any]) => ({
          timestamp: date,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume']),
        }))
        .reverse();

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching time series:', error);
      throw error;
    }
  }

  async getTopGainersLosers() {
    const cacheKey = 'top_gainers_losers';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(this.baseURLs.alphavantage, {
        params: {
          function: 'TOP_GAINERS_LOSERS',
          apikey: this.apiKeys.alphavantage,
        },
      });

      const result = {
        gainers: response.data.top_gainers?.slice(0, 10) || [],
        losers: response.data.top_losers?.slice(0, 10) || [],
        activelyTraded: response.data.most_actively_traded?.slice(0, 10) || [],
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching gainers/losers:', error);
      throw error;
    }
  }

  // Finnhub APIs (alternative/backup)
  async getFinnhubQuote(symbol: string): Promise<StockQuote> {
    const cacheKey = `finnhub_quote_${symbol}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseURLs.finnhub}/quote`, {
        params: {
          symbol,
          token: this.apiKeys.finnhub,
        },
      });

      const data = response.data;
      const result: StockQuote = {
        symbol,
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        volume: 0,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching Finnhub quote:', error);
      throw error;
    }
  }

  // Search stocks
  async searchStocks(query: string) {
    try {
      const response = await axios.get(this.baseURLs.alphavantage, {
        params: {
          function: 'SYMBOL_SEARCH',
          keywords: query,
          apikey: this.apiKeys.alphavantage,
        },
      });

      return response.data.bestMatches || [];
    } catch (error) {
      console.error('Error searching stocks:', error);
      throw error;
    }
  }
}

export const apiClient = new FinancialAPIClient();