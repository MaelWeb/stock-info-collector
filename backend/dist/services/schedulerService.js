"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulerService = exports.SchedulerService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = require("../lib/prisma");
const stockDataService_1 = require("./stockDataService");
const aiAnalysisService_1 = require("./aiAnalysisService");
const config_1 = require("../config");
class SchedulerService {
    dailyAnalysisJob = null;
    isRunning = false;
    constructor() {
        this.initializeJobs();
    }
    initializeJobs() {
        this.setupDailyAnalysisJob();
        console.log('Scheduler service initialized');
    }
    setupDailyAnalysisJob() {
        this.dailyAnalysisJob = node_cron_1.default.schedule(config_1.cronConfig.dailyAnalysisTime, async () => {
            console.log('Starting daily stock analysis...');
            await this.performDailyAnalysis();
        }, {
            timezone: 'America/New_York',
        });
        console.log(`Daily analysis job scheduled for: ${config_1.cronConfig.dailyAnalysisTime}`);
    }
    start() {
        if (this.isRunning) {
            console.log('Scheduler service is already running');
            return;
        }
        if (this.dailyAnalysisJob) {
            this.dailyAnalysisJob.start();
            console.log('Daily analysis job started');
        }
        this.isRunning = true;
        console.log('Scheduler service started successfully');
    }
    stop() {
        if (!this.isRunning) {
            console.log('Scheduler service is not running');
            return;
        }
        if (this.dailyAnalysisJob) {
            this.dailyAnalysisJob.stop();
            console.log('Daily analysis job stopped');
        }
        this.isRunning = false;
        console.log('Scheduler service stopped successfully');
    }
    async performDailyAnalysis() {
        try {
            console.log('Starting daily stock analysis...');
            const stocksToAnalyze = await this.getStocksToAnalyze();
            console.log(`Found ${stocksToAnalyze.length} stocks to analyze`);
            if (stocksToAnalyze.length === 0) {
                console.log('No stocks to analyze today');
                return;
            }
            const analysisDataList = await this.collectStockData(stocksToAnalyze);
            console.log(`Collected data for ${analysisDataList.length} stocks`);
            const analysisResults = await aiAnalysisService_1.aiAnalysisService.analyzeMultipleStocks(analysisDataList);
            console.log(`Generated analysis for ${analysisResults.length} stocks`);
            await this.saveAnalysisResults(stocksToAnalyze, analysisResults);
            console.log('Analysis results saved to database');
            console.log('Daily stock analysis completed successfully');
        }
        catch (error) {
            console.error('Error during daily analysis:', error);
            throw error;
        }
    }
    async getStocksToAnalyze() {
        try {
            const stocks = new Set();
            const watchlistStocks = await prisma_1.prisma.watchlistItem.findMany({
                include: {
                    stock: true,
                },
            });
            watchlistStocks.forEach((item) => {
                stocks.add(item.stock.symbol);
            });
            const popularStocks = [
                'AAPL',
                'MSFT',
                'GOOGL',
                'AMZN',
                'TSLA',
                'META',
                'NVDA',
                'NFLX',
                'AMD',
                'INTC',
                'CRM',
                'ADBE',
                'PYPL',
                'UBER',
                'LYFT',
                'ZM',
            ];
            popularStocks.forEach((symbol) => {
                stocks.add(symbol);
            });
            const recentRecommendations = await prisma_1.prisma.recommendation.findMany({
                where: {
                    date: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    },
                },
                include: {
                    stock: true,
                },
            });
            recentRecommendations.forEach((rec) => {
                stocks.add(rec.stock.symbol);
            });
            return Array.from(stocks);
        }
        catch (error) {
            console.error('Error getting stocks to analyze:', error);
            return [];
        }
    }
    async collectStockData(symbols) {
        const analysisDataList = [];
        for (const symbol of symbols) {
            try {
                const stock = await stockDataService_1.stockDataService.getStockInfo(symbol);
                if (!stock) {
                    console.warn(`Stock info not found for ${symbol}`);
                    continue;
                }
                const priceHistory = await stockDataService_1.stockDataService.getStockPrices(symbol, 50);
                if (priceHistory.length === 0) {
                    console.warn(`No price data found for ${symbol}`);
                    continue;
                }
                const currentPrice = priceHistory[0];
                if (!currentPrice) {
                    console.warn(`No current price data found for ${symbol}`);
                    continue;
                }
                const technicalIndicators = await this.calculateTechnicalIndicators(stock.id, priceHistory);
                analysisDataList.push({
                    stock,
                    currentPrice,
                    priceHistory,
                    technicalIndicators,
                });
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
            catch (error) {
                console.error(`Error collecting data for ${symbol}:`, error);
                continue;
            }
        }
        return analysisDataList;
    }
    async calculateTechnicalIndicators(stockId, priceHistory) {
        const indicators = [];
        const today = new Date();
        try {
            const rsi = this.calculateRSI(priceHistory);
            if (rsi !== null) {
                indicators.push({
                    stockId,
                    date: today,
                    indicator: 'RSI',
                    value: rsi,
                    signal: this.getRSISignal(rsi),
                });
            }
            const ma20 = this.calculateMA(priceHistory, 20);
            const ma50 = this.calculateMA(priceHistory, 50);
            if (ma20 !== null) {
                indicators.push({
                    stockId,
                    date: today,
                    indicator: 'MA20',
                    value: ma20,
                    signal: null,
                });
            }
            if (ma50 !== null) {
                indicators.push({
                    stockId,
                    date: today,
                    indicator: 'MA50',
                    value: ma50,
                    signal: null,
                });
            }
            const macd = this.calculateMACD(priceHistory);
            if (macd !== null) {
                indicators.push({
                    stockId,
                    date: today,
                    indicator: 'MACD',
                    value: macd,
                    signal: null,
                });
            }
            await Promise.all(indicators.map((indicator) => prisma_1.prisma.technicalIndicator.upsert({
                where: {
                    stockId_date_indicator: {
                        stockId: indicator.stockId,
                        date: indicator.date,
                        indicator: indicator.indicator,
                    },
                },
                update: indicator,
                create: indicator,
            })));
            return indicators;
        }
        catch (error) {
            console.error('Error calculating technical indicators:', error);
            return [];
        }
    }
    calculateRSI(prices) {
        if (prices.length < 14)
            return null;
        let gains = 0;
        let losses = 0;
        for (let i = 1; i <= 14; i++) {
            const change = prices[i - 1].close - prices[i].close;
            if (change > 0) {
                gains += change;
            }
            else {
                losses -= change;
            }
        }
        const avgGain = gains / 14;
        const avgLoss = losses / 14;
        if (avgLoss === 0)
            return 100;
        const rs = avgGain / avgLoss;
        return 100 - 100 / (1 + rs);
    }
    getRSISignal(rsi) {
        if (rsi > 70)
            return 'SELL';
        if (rsi < 30)
            return 'BUY';
        return 'HOLD';
    }
    calculateMA(prices, period) {
        if (prices.length < period)
            return null;
        const sum = prices.slice(0, period).reduce((acc, price) => acc + price.close, 0);
        return sum / period;
    }
    calculateMACD(prices) {
        if (prices.length < 26)
            return null;
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        if (ema12 === null || ema26 === null)
            return null;
        return ema12 - ema26;
    }
    calculateEMA(prices, period) {
        if (prices.length < period)
            return null;
        const multiplier = 2 / (period + 1);
        let ema = prices[0].close;
        for (let i = 1; i < prices.length; i++) {
            ema = prices[i].close * multiplier + ema * (1 - multiplier);
        }
        return ema;
    }
    async saveAnalysisResults(symbols, analysisResults) {
        try {
            const stocks = await prisma_1.prisma.stock.findMany({
                where: {
                    symbol: {
                        in: symbols,
                    },
                },
            });
            const recommendations = analysisResults
                .map((result, index) => {
                const stock = stocks[index];
                if (!stock) {
                    console.warn(`Stock not found for index ${index}`);
                    return null;
                }
                return {
                    stockId: stock.id,
                    type: 'DAILY_OPPORTUNITY',
                    confidence: result.confidence,
                    action: result.action,
                    priceTarget: result.priceTarget,
                    reasoning: result.reasoning,
                    riskLevel: result.riskLevel,
                    timeHorizon: result.timeHorizon,
                };
            })
                .filter((rec) => rec !== null);
            await Promise.all(recommendations.map((rec) => prisma_1.prisma.recommendation.create({
                data: rec,
            })));
            console.log(`Saved ${recommendations.length} recommendations to database`);
        }
        catch (error) {
            console.error('Error saving analysis results:', error);
            throw error;
        }
    }
    async triggerManualAnalysis(symbols) {
        console.log('Triggering manual analysis...');
        if (symbols && symbols.length > 0) {
            const analysisDataList = await this.collectStockData(symbols);
            const analysisResults = await aiAnalysisService_1.aiAnalysisService.analyzeMultipleStocks(analysisDataList);
            await this.saveAnalysisResults(symbols, analysisResults);
        }
        else {
            await this.performDailyAnalysis();
        }
        console.log('Manual analysis completed');
    }
    getStatus() {
        const status = {
            isRunning: this.isRunning,
        };
        if (this.dailyAnalysisJob) {
            status.nextRun = new Date().toISOString();
        }
        return status;
    }
}
exports.SchedulerService = SchedulerService;
exports.schedulerService = new SchedulerService();
//# sourceMappingURL=schedulerService.js.map