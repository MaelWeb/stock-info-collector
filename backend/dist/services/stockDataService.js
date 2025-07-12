"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockDataService = exports.StockDataService = void 0;
const axios_1 = __importDefault(require("axios"));
const prisma_1 = require("../lib/prisma");
const config_1 = require("../config");
class StockDataService {
    alphaVantageClient;
    yahooFinanceClient;
    constructor() {
        this.alphaVantageClient = axios_1.default.create({
            baseURL: config_1.apiConfig.alphaVantage.baseUrl,
            timeout: 10000,
        });
        this.yahooFinanceClient = axios_1.default.create({
            baseURL: config_1.apiConfig.yahooFinance.baseUrl,
            timeout: 10000,
            headers: {
                'X-API-KEY': config_1.apiConfig.yahooFinance.apiKey,
            },
        });
    }
    async getStockInfo(symbol) {
        try {
            const existingStock = await prisma_1.prisma.stock.findUnique({
                where: { symbol: symbol.toUpperCase() },
            });
            if (existingStock) {
                return existingStock;
            }
            const stockInfo = await this.fetchStockInfoFromAPI(symbol);
            if (!stockInfo) {
                return null;
            }
            const newStock = await prisma_1.prisma.stock.create({
                data: stockInfo,
            });
            return newStock;
        }
        catch (error) {
            console.error(`Error getting stock info for ${symbol}:`, error);
            return null;
        }
    }
    async fetchStockInfoFromAPI(symbol) {
        try {
            if (config_1.apiConfig.alphaVantage.apiKey) {
                const response = await this.alphaVantageClient.get('', {
                    params: {
                        function: 'GLOBAL_QUOTE',
                        symbol: symbol.toUpperCase(),
                        apikey: config_1.apiConfig.alphaVantage.apiKey,
                    },
                });
                if (response.data['Global Quote']) {
                    const quote = response.data['Global Quote'];
                    return {
                        symbol: quote['01. symbol'],
                        name: quote['01. symbol'],
                        exchange: 'UNKNOWN',
                        sector: null,
                        industry: null,
                        marketCap: null,
                        peRatio: null,
                        dividendYield: null,
                    };
                }
            }
            if (config_1.apiConfig.yahooFinance.apiKey) {
                const response = await this.yahooFinanceClient.get(`/finance/chart/${symbol}`, {
                    params: {
                        range: '1d',
                        interval: '1d',
                    },
                });
                if (response.data.chart?.result?.[0]?.meta) {
                    const meta = response.data.chart.result[0].meta;
                    return {
                        symbol: meta.symbol,
                        name: meta.symbol,
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
        }
        catch (error) {
            console.error(`Error fetching stock info from API for ${symbol}:`, error);
            return null;
        }
    }
    async getStockPrices(symbol, days = 30) {
        try {
            const existingPrices = await prisma_1.prisma.stockPrice.findMany({
                where: {
                    stock: { symbol: symbol.toUpperCase() },
                },
                orderBy: { date: 'desc' },
                take: days,
            });
            if (existingPrices.length >= days) {
                return existingPrices;
            }
            const newPrices = await this.fetchStockPricesFromAPI(symbol, days);
            if (newPrices.length === 0) {
                return existingPrices;
            }
            const stock = await prisma_1.prisma.stock.findUnique({
                where: { symbol: symbol.toUpperCase() },
            });
            if (!stock) {
                throw new Error(`Stock ${symbol} not found in database`);
            }
            await Promise.all(newPrices.map((priceData) => prisma_1.prisma.stockPrice.upsert({
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
            })));
            return await prisma_1.prisma.stockPrice.findMany({
                where: {
                    stock: { symbol: symbol.toUpperCase() },
                },
                orderBy: { date: 'desc' },
                take: days,
            });
        }
        catch (error) {
            console.error(`Error getting stock prices for ${symbol}:`, error);
            return [];
        }
    }
    async fetchStockPricesFromAPI(symbol, days) {
        try {
            if (config_1.apiConfig.alphaVantage.apiKey) {
                const response = await this.alphaVantageClient.get('', {
                    params: {
                        function: 'TIME_SERIES_DAILY',
                        symbol: symbol.toUpperCase(),
                        outputsize: days > 100 ? 'full' : 'compact',
                        apikey: config_1.apiConfig.alphaVantage.apiKey,
                    },
                });
                if (response.data['Time Series (Daily)']) {
                    const timeSeries = response.data['Time Series (Daily)'];
                    const prices = [];
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
            if (config_1.apiConfig.yahooFinance.apiKey) {
                const response = await this.yahooFinanceClient.get(`/finance/chart/${symbol}`, {
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
                        const prices = [];
                        timestamps.forEach((timestamp, index) => {
                            if (quotes.open?.[index] && quotes.high?.[index] && quotes.low?.[index] && quotes.close?.[index]) {
                                prices.push({
                                    date: new Date(timestamp * 1000),
                                    open: quotes.open[index],
                                    high: quotes.high[index],
                                    low: quotes.low[index],
                                    close: quotes.close[index],
                                    volume: quotes.volume?.[index] || 0,
                                });
                            }
                        });
                        return prices.sort((a, b) => a['date'].getTime() - b['date'].getTime());
                    }
                }
            }
            return [];
        }
        catch (error) {
            console.error(`Error fetching stock prices from API for ${symbol}:`, error);
            return [];
        }
    }
    async getCurrentPrice(symbol) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayPrice = await prisma_1.prisma.stockPrice.findFirst({
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
            const prices = await this.getStockPrices(symbol, 1);
            return prices[0]?.close || null;
        }
        catch (error) {
            console.error(`Error getting current price for ${symbol}:`, error);
            return null;
        }
    }
    async getMultipleStocks(symbols) {
        try {
            const stocks = [];
            const batchSize = 5;
            for (let i = 0; i < symbols.length; i += batchSize) {
                const batch = symbols.slice(i, i + batchSize);
                const batchResults = await Promise.all(batch.map((symbol) => this.getStockInfo(symbol)));
                stocks.push(...batchResults.filter((stock) => stock !== null));
                if (i + batchSize < symbols.length) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            }
            return stocks;
        }
        catch (error) {
            console.error('Error getting multiple stocks:', error);
            return [];
        }
    }
    async searchStocks(query) {
        try {
            const stocks = await prisma_1.prisma.stock.findMany({
                where: {
                    OR: [{ symbol: { contains: query.toUpperCase() } }, { name: { contains: query } }],
                },
                take: 10,
            });
            return stocks;
        }
        catch (error) {
            console.error('Error searching stocks:', error);
            return [];
        }
    }
}
exports.StockDataService = StockDataService;
exports.stockDataService = new StockDataService();
//# sourceMappingURL=stockDataService.js.map