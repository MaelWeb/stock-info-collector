import axios, { AxiosInstance } from 'axios';
import { prisma } from '../lib/prisma';
import { apiConfig } from '../config';
import type { Stock, StockPrice } from '@prisma/client';

/**
 * @description 股票数据API响应接口，定义 Alpha Vantage API 的响应结构。
 * 包含元数据、时间序列数据和全局报价信息。
 */
interface AlphaVantageResponse {
  'Meta Data'?: {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Output Size': string;
    '5. Time Zone': string;
  };
  'Time Series (Daily)'?: Record<
    string,
    {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
      '5. volume': string;
    }
  >;
  'Global Quote'?: {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
  'Error Message'?: string;
  'Note'?: string;
}

/**
 * @description Yahoo Finance API响应接口，定义图表数据的结构。
 * 包含股票元数据、时间戳和价格指标信息。
 */
interface YahooFinanceResponse {
  chart?: {
    result?: Array<{
      meta?: {
        symbol: string;
        regularMarketPrice: number;
        previousClose: number;
        regularMarketTime: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: number[];
          high?: number[];
          low?: number[];
          close?: number[];
          volume?: number[];
        }>;
      };
    }>;
    error?: {
      code: string;
      description: string;
    };
  };
}

/**
 * @description 股票数据服务类，负责从多个数据源获取股票信息。
 * 支持 Alpha Vantage 和 Yahoo Finance API，提供数据缓存和错误处理。
 */
export class StockDataService {
  private alphaVantageClient: AxiosInstance;
  private yahooFinanceClient: AxiosInstance;

  constructor() {
    this.alphaVantageClient = axios.create({
      baseURL: apiConfig.alphaVantage.baseUrl,
      timeout: 10000,
    });

    this.yahooFinanceClient = axios.create({
      baseURL: apiConfig.yahooFinance.baseUrl,
      timeout: 10000,
      headers: {
        'X-API-KEY': apiConfig.yahooFinance.apiKey,
      },
    });
  }

  /**
   * @description 获取股票基本信息，首先检查数据库，然后从API获取。
   * @param symbol - 股票代码
   * @returns 股票基本信息，如果获取失败则返回 null
   */
  async getStockInfo(symbol: string): Promise<Stock | null> {
    try {
      // 首先检查数据库中是否已有该股票信息
      const existingStock = await prisma.stock.findUnique({
        where: { symbol: symbol.toUpperCase() },
      });

      if (existingStock) {
        return existingStock;
      }

      // 从API获取股票信息
      const stockInfo = await this.fetchStockInfoFromAPI(symbol);
      if (!stockInfo) {
        return null;
      }

      // 保存到数据库
      const newStock = await prisma.stock.create({
        data: stockInfo,
      });

      return newStock;
    } catch (error) {
      console.error(`Error getting stock info for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * 从API获取股票基本信息
   * @param symbol - 股票代码
   * @returns 股票基本信息
   */
  private async fetchStockInfoFromAPI(symbol: string): Promise<Omit<Stock, 'id' | 'createdAt' | 'updatedAt'> | null> {
    try {
      // 尝试从Alpha Vantage获取
      if (apiConfig.alphaVantage.apiKey) {
        const response = await this.alphaVantageClient.get<AlphaVantageResponse>('', {
          params: {
            function: 'GLOBAL_QUOTE',
            symbol: symbol.toUpperCase(),
            apikey: apiConfig.alphaVantage.apiKey,
          },
        });

        if (response.data['Global Quote']) {
          const quote = response.data['Global Quote'];
          return {
            symbol: quote['01. symbol'],
            name: quote['01. symbol'], // Alpha Vantage不提供公司名称
            exchange: 'UNKNOWN',
            sector: null,
            industry: null,
            marketCap: null,
            peRatio: null,
            dividendYield: null,
          };
        }
      }

      // 如果Alpha Vantage失败，尝试Yahoo Finance
      if (apiConfig.yahooFinance.apiKey) {
        const response = await this.yahooFinanceClient.get<YahooFinanceResponse>(`/finance/chart/${symbol}`, {
          params: {
            range: '1d',
            interval: '1d',
          },
        });

        if (response.data.chart?.result?.[0]?.meta) {
          const meta = response.data.chart.result[0].meta;
          return {
            symbol: meta.symbol,
            name: meta.symbol, // Yahoo Finance API需要额外调用获取公司名称
            exchange: 'UNKNOWN',
            sector: null,
            industry: null,
            marketCap: null,
            peRatio: null,
            dividendYield: null,
          };
        }
      }

      return null;
    } catch (error) {
      console.error(`Error fetching stock info from API for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * @description 获取股票历史价格数据，首先检查数据库，然后从API获取。
   * @param symbol - 股票代码
   * @param days - 获取天数，默认30天
   * @returns 股票价格数据数组
   */
  async getStockPrices(symbol: string, days: number = 30): Promise<StockPrice[]> {
    try {
      // 首先检查数据库中是否已有足够的数据
      const existingPrices = await prisma.stockPrice.findMany({
        where: {
          stock: { symbol: symbol.toUpperCase() },
        },
        orderBy: { date: 'desc' },
        take: days,
      });

      if (existingPrices.length >= days) {
        return existingPrices;
      }

      // 从API获取最新数据
      const newPrices = await this.fetchStockPricesFromAPI(symbol, days);
      if (newPrices.length === 0) {
        return existingPrices;
      }

      // 保存新数据到数据库
      const stock = await prisma.stock.findUnique({
        where: { symbol: symbol.toUpperCase() },
      });

      if (!stock) {
        throw new Error(`Stock ${symbol} not found in database`);
      }

      // 保存新价格数据到数据库
      await Promise.all(
        newPrices.map((priceData) =>
          prisma.stockPrice.upsert({
            where: {
              stockId_date: {
                stockId: stock.id,
                date: priceData.date,
              },
            },
            update: priceData,
            create: {
              ...priceData,
              stockId: stock.id,
            },
          })
        )
      );

      // 返回最新的数据
      return await prisma.stockPrice.findMany({
        where: {
          stock: { symbol: symbol.toUpperCase() },
        },
        orderBy: { date: 'desc' },
        take: days,
      });
    } catch (error) {
      console.error(`Error getting stock prices for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * 从API获取股票价格数据
   * @param symbol - 股票代码
   * @param days - 获取天数
   * @returns 股票价格数据数组
   */
  private async fetchStockPricesFromAPI(
    symbol: string,
    days: number
  ): Promise<Omit<StockPrice, 'id' | 'stockId' | 'createdAt'>[]> {
    try {
      // 尝试从Alpha Vantage获取
      if (apiConfig.alphaVantage.apiKey) {
        const response = await this.alphaVantageClient.get<AlphaVantageResponse>('', {
          params: {
            function: 'TIME_SERIES_DAILY',
            symbol: symbol.toUpperCase(),
            outputsize: days > 100 ? 'full' : 'compact',
            apikey: apiConfig.alphaVantage.apiKey,
          },
        });

        if (response.data['Time Series (Daily)']) {
          const timeSeries = response.data['Time Series (Daily)'];
          const prices: Omit<StockPrice, 'id' | 'stockId' | 'createdAt'>[] = [];

          Object.entries(timeSeries)
            .slice(0, days)
            .forEach(([date, data]) => {
              prices.push({
                date: new Date(date),
                open: parseFloat(data['1. open']),
                high: parseFloat(data['2. high']),
                low: parseFloat(data['3. low']),
                close: parseFloat(data['4. close']),
                volume: parseInt(data['5. volume']),
              });
            });

          return prices.sort((a, b) => a['date'].getTime() - b['date'].getTime());
        }
      }

      // 如果Alpha Vantage失败，尝试Yahoo Finance
      if (apiConfig.yahooFinance.apiKey) {
        const response = await this.yahooFinanceClient.get<YahooFinanceResponse>(`/finance/chart/${symbol}`, {
          params: {
            range: `${days}d`,
            interval: '1d',
          },
        });

        if (response.data.chart?.result?.[0]) {
          const result = response.data.chart.result[0];
          const timestamps = result.timestamp || [];
          const quotes = result.indicators?.quote?.[0];

          if (quotes && timestamps.length > 0) {
            const prices: Omit<StockPrice, 'id' | 'stockId' | 'createdAt'>[] = [];

            timestamps.forEach((timestamp, index) => {
              if (quotes.open?.[index] && quotes.high?.[index] && quotes.low?.[index] && quotes.close?.[index]) {
                prices.push({
                  date: new Date(timestamp * 1000),
                  open: quotes.open[index]!,
                  high: quotes.high[index]!,
                  low: quotes.low[index]!,
                  close: quotes.close[index]!,
                  volume: quotes.volume?.[index] || 0,
                });
              }
            });

            return prices.sort((a, b) => a['date'].getTime() - b['date'].getTime());
          }
        }
      }

      return [];
    } catch (error) {
      console.error(`Error fetching stock prices from API for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * @description 获取当前股票价格，首先检查数据库，然后从API获取。
   * @param symbol - 股票代码
   * @returns 当前价格，如果获取失败则返回 null
   */
  async getCurrentPrice(symbol: string): Promise<number | null> {
    try {
      // 首先检查数据库中是否有今日数据
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayPrice = await prisma.stockPrice.findFirst({
        where: {
          stock: { symbol: symbol.toUpperCase() },
          date: {
            gte: today,
          },
        },
        orderBy: { date: 'desc' },
      });

      if (todayPrice) {
        return todayPrice.close;
      }

      // 从API获取最新价格
      const prices = await this.getStockPrices(symbol, 1);
      return prices[0]?.close || null;
    } catch (error) {
      console.error(`Error getting current price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * @description 批量获取股票信息，使用并发请求以提高效率，并添加延迟避免API限制。
   * @param symbols - 股票代码数组
   * @returns 股票信息数组
   */
  async getMultipleStocks(symbols: string[]): Promise<Stock[]> {
    try {
      const stocks: Stock[] = [];

      // 使用Promise.all并发获取，但限制并发数量避免API限制
      const batchSize = 5;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map((symbol) => this.getStockInfo(symbol)));

        stocks.push(...batchResults.filter((stock: Stock | null): stock is Stock => stock !== null));

        // 添加延迟避免API限制
        if (i + batchSize < symbols.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      return stocks;
    } catch (error) {
      console.error('Error getting multiple stocks:', error);
      return [];
    }
  }

  /**
   * @description 搜索股票，支持按股票代码和名称进行模糊搜索。
   * @param query - 搜索查询字符串
   * @returns 匹配的股票列表，最多返回10条结果
   */
  async searchStocks(query: string): Promise<Stock[]> {
    try {
      const stocks = await prisma.stock.findMany({
        where: {
          OR: [{ symbol: { contains: query.toUpperCase() } }, { name: { contains: query } }],
        },
        take: 10,
      });

      return stocks;
    } catch (error) {
      console.error('Error searching stocks:', error);
      return [];
    }
  }
}

/**
 * 股票数据服务单例实例
 */
export const stockDataService = new StockDataService();
