import cron, { ScheduledTask } from 'node-cron';
import { prisma } from '../lib/prisma';
import { stockDataService } from './stockDataService';
import { aiAnalysisService, StockAnalysisData } from './aiAnalysisService';
import { cronConfig } from '../config';

/**
 * @description 定时任务服务类，负责管理所有定时任务，包括每日股票分析和数据收集。
 * 使用 node-cron 进行任务调度，确保在指定时间自动执行分析任务。
 */
export class SchedulerService {
  private dailyAnalysisJob: ScheduledTask | null = null;
  private isRunning = false;

  constructor() {
    this.initializeJobs();
  }

  /**
   * @description 初始化所有定时任务，设置每日分析任务的时间表。
   */
  private initializeJobs(): void {
    this.setupDailyAnalysisJob();
    console.log('Scheduler service initialized');
  }

  /**
   * @description 设置每日分析任务，每天上午9点自动分析股票并生成投资建议。
   * 使用美东时间作为基准时区，确保与市场时间同步。
   */
  private setupDailyAnalysisJob(): void {
    this.dailyAnalysisJob = cron.schedule(
      cronConfig.dailyAnalysisTime,
      async () => {
        console.log('Starting daily stock analysis...');
        await this.performDailyAnalysis();
      },
      {
        timezone: 'America/New_York', // 美东时间
      }
    );

    console.log(`Daily analysis job scheduled for: ${cronConfig.dailyAnalysisTime}`);
  }

  /**
   * 启动定时任务服务
   */
  start(): void {
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

  /**
   * 停止定时任务服务
   */
  stop(): void {
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

  /**
   * 执行每日股票分析
   * 这是核心的每日分析逻辑
   */
  async performDailyAnalysis(): Promise<void> {
    try {
      console.log('Starting daily stock analysis...');

      // 1. 获取需要分析的股票列表
      const stocksToAnalyze = await this.getStocksToAnalyze();
      console.log(`Found ${stocksToAnalyze.length} stocks to analyze`);

      if (stocksToAnalyze.length === 0) {
        console.log('No stocks to analyze today');
        return;
      }

      // 2. 收集股票数据
      const analysisDataList = await this.collectStockData(stocksToAnalyze);
      console.log(`Collected data for ${analysisDataList.length} stocks`);

      // 3. 使用AI分析股票
      const analysisResults = await aiAnalysisService.analyzeMultipleStocks(analysisDataList);
      console.log(`Generated analysis for ${analysisResults.length} stocks`);

      // 4. 保存分析结果到数据库
      await this.saveAnalysisResults(stocksToAnalyze, analysisResults);
      console.log('Analysis results saved to database');

      console.log('Daily stock analysis completed successfully');
    } catch (error) {
      console.error('Error during daily analysis:', error);
      throw error;
    }
  }

  /**
   * 获取需要分析的股票列表
   * 包括热门股票和用户关注的股票
   */
  private async getStocksToAnalyze(): Promise<string[]> {
    try {
      const stocks = new Set<string>();

      // 1. 获取用户关注的股票
      const watchlistStocks = await prisma.watchlistItem.findMany({
        include: {
          stock: true,
        },
      });

      watchlistStocks.forEach((item: any) => {
        stocks.add(item.stock.symbol);
      });

      // 2. 获取热门股票（这里可以扩展为从配置文件或API获取）
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

      // 3. 获取最近有推荐但需要重新分析的股票
      const recentRecommendations = await prisma.recommendation.findMany({
        where: {
          date: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 最近7天
          },
        },
        include: {
          stock: true,
        },
      });

      recentRecommendations.forEach((rec: any) => {
        stocks.add(rec.stock.symbol);
      });

      return Array.from(stocks);
    } catch (error) {
      console.error('Error getting stocks to analyze:', error);
      return [];
    }
  }

  /**
   * @description 收集股票数据，包括基本信息、价格历史和技术指标。
   * @param symbols - 股票代码列表
   * @returns 股票分析数据列表
   */
  private async collectStockData(symbols: string[]): Promise<StockAnalysisData[]> {
    const analysisDataList: StockAnalysisData[] = [];

    for (const symbol of symbols) {
      try {
        // 获取股票基本信息
        const stock = await stockDataService.getStockInfo(symbol);
        if (!stock) {
          console.warn(`Stock info not found for ${symbol}`);
          continue;
        }

        // 获取价格数据
        const priceHistory = await stockDataService.getStockPrices(symbol, 50);
        if (priceHistory.length === 0) {
          console.warn(`No price data found for ${symbol}`);
          continue;
        }

        const currentPrice = priceHistory[0]; // 最新的价格数据
        if (!currentPrice) {
          console.warn(`No current price data found for ${symbol}`);
          continue;
        }

        // 计算技术指标
        const technicalIndicators = await this.calculateTechnicalIndicators(stock.id, priceHistory);

        analysisDataList.push({
          stock,
          currentPrice,
          priceHistory,
          technicalIndicators,
        });

        // 添加延迟避免API限制
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error collecting data for ${symbol}:`, error);
        continue;
      }
    }

    return analysisDataList;
  }

  /**
   * 计算技术指标
   * @param stockId - 股票ID
   * @param priceHistory - 价格历史数据
   * @returns 技术指标列表
   */
  private async calculateTechnicalIndicators(stockId: string, priceHistory: any[]): Promise<any[]> {
    const indicators: any[] = [];
    const today = new Date();

    try {
      // 计算RSI
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

      // 计算移动平均线
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

      // 计算MACD
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

      // 保存技术指标到数据库
      await Promise.all(
        indicators.map((indicator) =>
          prisma.technicalIndicator.upsert({
            where: {
              stockId_date_indicator: {
                stockId: indicator.stockId,
                date: indicator.date,
                indicator: indicator.indicator,
              },
            },
            update: indicator,
            create: indicator,
          })
        )
      );

      return indicators;
    } catch (error) {
      console.error('Error calculating technical indicators:', error);
      return [];
    }
  }

  /**
   * 计算RSI指标
   * @param prices - 价格数据
   * @returns RSI值
   */
  private calculateRSI(prices: any[]): number | null {
    if (prices.length < 14) return null;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= 14; i++) {
      const change = prices[i - 1].close - prices[i].close;
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }

    const avgGain = gains / 14;
    const avgLoss = losses / 14;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  /**
   * 获取RSI信号
   * @param rsi - RSI值
   * @returns 信号
   */
  private getRSISignal(rsi: number): string {
    if (rsi > 70) return 'SELL';
    if (rsi < 30) return 'BUY';
    return 'HOLD';
  }

  /**
   * 计算移动平均线
   * @param prices - 价格数据
   * @param period - 周期
   * @returns 移动平均值
   */
  private calculateMA(prices: any[], period: number): number | null {
    if (prices.length < period) return null;

    const sum = prices.slice(0, period).reduce((acc, price) => acc + price.close, 0);
    return sum / period;
  }

  /**
   * 计算MACD指标
   * @param prices - 价格数据
   * @returns MACD值
   */
  private calculateMACD(prices: any[]): number | null {
    if (prices.length < 26) return null;

    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);

    if (ema12 === null || ema26 === null) return null;

    return ema12 - ema26;
  }

  /**
   * 计算指数移动平均线
   * @param prices - 价格数据
   * @param period - 周期
   * @returns EMA值
   */
  private calculateEMA(prices: any[], period: number): number | null {
    if (prices.length < period) return null;

    const multiplier = 2 / (period + 1);
    let ema = prices[0].close;

    for (let i = 1; i < prices.length; i++) {
      ema = prices[i].close * multiplier + ema * (1 - multiplier);
    }

    return ema;
  }

  /**
   * @description 保存分析结果到数据库，将AI分析结果转换为推荐记录。
   * @param symbols - 股票代码列表
   * @param analysisResults - 分析结果列表
   */
  private async saveAnalysisResults(symbols: string[], analysisResults: any[]): Promise<void> {
    try {
      const stocks = await prisma.stock.findMany({
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
        .filter((rec): rec is NonNullable<typeof rec> => rec !== null); // 过滤掉 null 值

      // 批量保存推荐结果
      await Promise.all(
        recommendations.map((rec) =>
          prisma.recommendation.create({
            data: rec,
          })
        )
      );

      console.log(`Saved ${recommendations.length} recommendations to database`);
    } catch (error) {
      console.error('Error saving analysis results:', error);
      throw error;
    }
  }

  /**
   * 手动触发分析（用于测试）
   * @param symbols - 要分析的股票代码列表
   */
  async triggerManualAnalysis(symbols?: string[]): Promise<void> {
    console.log('Triggering manual analysis...');

    if (symbols && symbols.length > 0) {
      // 分析指定的股票
      const analysisDataList = await this.collectStockData(symbols);
      const analysisResults = await aiAnalysisService.analyzeMultipleStocks(analysisDataList);
      await this.saveAnalysisResults(symbols, analysisResults);
    } else {
      // 执行完整的每日分析
      await this.performDailyAnalysis();
    }

    console.log('Manual analysis completed');
  }

  /**
   * @description 获取服务状态，包括运行状态和下次执行时间。
   * @returns 服务状态对象
   */
  getStatus(): { isRunning: boolean; nextRun?: string } {
    const status: { isRunning: boolean; nextRun?: string } = {
      isRunning: this.isRunning,
    };

    if (this.dailyAnalysisJob) {
      status.nextRun = new Date().toISOString();
    }

    return status;
  }
}

/**
 * 定时任务服务单例实例
 */
export const schedulerService = new SchedulerService();
