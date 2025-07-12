import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import { schedulerService } from '../services/schedulerService';
import { aiAnalysisService } from '../services/aiAnalysisService';
import { stockDataService } from '../services/stockDataService';

/**
 * @description 分析路由插件，提供股票分析相关的API端点。
 * 包括状态查询、手动触发分析、单股票分析等功能。
 * @param fastify - Fastify 实例
 */
export default async function analysisRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * @description 获取分析服务状态，包括运行状态、统计信息等。
   * GET /api/analysis/status
   */
  fastify.get(
    '/status',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  isRunning: { type: 'boolean' },
                  nextRun: { type: 'string' },
                  lastRun: { type: 'string' },
                  totalAnalyses: { type: 'number' },
                  todayAnalyses: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const status = schedulerService.getStatus();

        // 获取分析统计信息
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const totalAnalyses = await prisma.recommendation.count();
        const todayAnalyses = await prisma.recommendation.count({
          where: {
            date: {
              gte: today,
              lt: tomorrow,
            },
          },
        });

        return {
          success: true,
          data: {
            ...status,
            totalAnalyses,
            todayAnalyses,
            lastRun: 'Not implemented yet', // TODO: 实现最后运行时间记录
          },
        };
      } catch (error) {
        fastify.log.error('Error getting analysis status:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * @description 手动触发分析，可以指定特定股票或执行完整分析。
   * POST /api/analysis/trigger
   */
  fastify.post(
    '/trigger',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            symbols: {
              type: 'array',
              items: { type: 'string', minLength: 1 },
            },
          },
          required: [], // symbols 可选
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  analyzedStocks: { type: 'number' },
                  generatedRecommendations: { type: 'number' },
                  duration: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: { symbols?: string[] } }>, reply: FastifyReply) => {
      try {
        const { symbols } = request.body;
        const startTime = Date.now();

        // 触发分析
        await schedulerService.triggerManualAnalysis(symbols);

        const duration = Date.now() - startTime;

        return {
          success: true,
          data: {
            message: 'Analysis completed successfully',
            analyzedStocks: symbols?.length || 0,
            generatedRecommendations: symbols?.length || 0,
            duration,
          },
        };
      } catch (error) {
        fastify.log.error('Error triggering analysis:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * @description 分析单个股票，获取技术指标和AI推荐。
   * POST /api/analysis/stock/:symbol
   */
  fastify.post(
    '/stock/:symbol',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            symbol: { type: 'string', minLength: 1 },
          },
          required: ['symbol'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  stock: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      symbol: { type: 'string' },
                      name: { type: 'string' },
                    },
                  },
                  currentPrice: {
                    type: 'object',
                    properties: {
                      close: { type: 'number' },
                      date: { type: 'string' },
                    },
                  },
                  technicalIndicators: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        indicator: { type: 'string' },
                        value: { type: 'number' },
                        signal: { type: 'string' },
                      },
                    },
                  },
                  recommendation: {
                    type: 'object',
                    properties: {
                      action: { type: 'string' },
                      confidence: { type: 'number' },
                      priceTarget: { type: 'number' },
                      reasoning: { type: 'string' },
                      riskLevel: { type: 'string' },
                      timeHorizon: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { symbol: string } }>, reply: FastifyReply) => {
      try {
        const { symbol } = request.params;

        // 获取股票信息
        const stock = await prisma.stock.findUnique({
          where: { symbol: symbol.toUpperCase() },
        });

        if (!stock) {
          return reply.status(404).send({
            success: false,
            error: 'Stock not found',
          });
        }

        // 获取价格数据
        const priceHistory = await stockDataService.getStockPrices(symbol, 50);
        if (priceHistory.length === 0) {
          return reply.status(404).send({
            success: false,
            error: 'No price data available',
          });
        }

        const currentPrice = priceHistory[0];
        if (!currentPrice) {
          return reply.status(404).send({
            success: false,
            error: 'Current price data not available',
          });
        }

        // 获取技术指标
        const technicalIndicators = await prisma.technicalIndicator.findMany({
          where: { stockId: stock.id },
          orderBy: { date: 'desc' },
          take: 10,
        });

        // 执行AI分析
        const analysisData = {
          stock,
          currentPrice,
          priceHistory,
          technicalIndicators,
        };

        const recommendation = await aiAnalysisService.analyzeStock(analysisData);

        // 保存推荐结果
        await prisma.recommendation.create({
          data: {
            stockId: stock.id,
            type: 'MANUAL_ANALYSIS',
            confidence: recommendation.confidence,
            action: recommendation.action,
            priceTarget: recommendation.priceTarget ?? null,
            reasoning: recommendation.reasoning,
            riskLevel: recommendation.riskLevel,
            timeHorizon: recommendation.timeHorizon,
          },
        });

        return {
          success: true,
          data: {
            stock: {
              id: stock.id,
              symbol: stock.symbol,
              name: stock.name,
            },
            currentPrice: {
              close: currentPrice.close,
              date: currentPrice.date.toISOString(),
            },
            technicalIndicators: technicalIndicators.map((ti: any) => ({
              indicator: ti.indicator,
              value: ti.value,
              signal: ti.signal,
            })),
            recommendation: {
              action: recommendation.action,
              confidence: recommendation.confidence,
              priceTarget: recommendation.priceTarget,
              reasoning: recommendation.reasoning,
              riskLevel: recommendation.riskLevel,
              timeHorizon: recommendation.timeHorizon,
            },
          },
        };
      } catch (error) {
        fastify.log.error('Error analyzing stock:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * @description 获取推荐历史记录，支持分页和筛选。
   * GET /api/analysis/recommendations
   */
  fastify.get(
    '/recommendations',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            symbol: { type: 'string' },
            action: { type: 'string', enum: ['BUY', 'SELL', 'HOLD'] },
            dateFrom: { type: 'string' },
            dateTo: { type: 'string' },
          },
          required: [],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  recommendations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        type: { type: 'string' },
                        action: { type: 'string' },
                        confidence: { type: 'number' },
                        priceTarget: { type: 'number' },
                        reasoning: { type: 'string' },
                        riskLevel: { type: 'string' },
                        timeHorizon: { type: 'string' },
                        date: { type: 'string' },
                        stock: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            symbol: { type: 'string' },
                            name: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'number' },
                      limit: { type: 'number' },
                      total: { type: 'number' },
                      totalPages: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          page?: number;
          limit?: number;
          symbol?: string;
          action?: string;
          dateFrom?: string;
          dateTo?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { page = 1, limit = 20, symbol, action, dateFrom, dateTo } = request.query;

        // 构建查询条件
        const where: any = {};
        if (symbol) {
          where.stock = { symbol: symbol.toUpperCase() };
        }
        if (action) {
          where.action = action;
        }
        if (dateFrom || dateTo) {
          where.date = {};
          if (dateFrom) where.date.gte = new Date(dateFrom);
          if (dateTo) where.date.lte = new Date(dateTo);
        }

        // 获取总数
        const total = await prisma.recommendation.count({ where });

        // 获取推荐记录
        const history = await prisma.recommendation.findMany({
          where,
          include: {
            stock: {
              select: {
                id: true,
                symbol: true,
                name: true,
              },
            },
          },
          orderBy: { date: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        });

        return {
          success: true,
          data: {
            recommendations: history.map((rec: any) => ({
              id: rec.id,
              type: rec.type,
              action: rec.action,
              confidence: rec.confidence,
              priceTarget: rec.priceTarget,
              reasoning: rec.reasoning,
              riskLevel: rec.riskLevel,
              timeHorizon: rec.timeHorizon,
              date: rec.date.toISOString(),
              stock: rec.stock,
            })),
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            },
          },
        };
      } catch (error) {
        fastify.log.error('Error getting recommendations:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * @description 获取分析仪表板数据，包括统计信息和热门股票。
   * GET /api/analysis/dashboard
   */
  fastify.get(
    '/dashboard',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  stats: {
                    type: 'object',
                    properties: {
                      totalStocks: { type: 'number' },
                      totalRecommendations: { type: 'number' },
                      avgConfidence: { type: 'number' },
                      buyRecommendations: { type: 'number' },
                      sellRecommendations: { type: 'number' },
                      holdRecommendations: { type: 'number' },
                    },
                  },
                  topStocks: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        symbol: { type: 'string' },
                        name: { type: 'string' },
                        recommendationCount: { type: 'number' },
                        avgConfidence: { type: 'number' },
                        lastAction: { type: 'string' },
                      },
                    },
                  },
                  recentActivity: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        date: { type: 'string' },
                        action: { type: 'string' },
                        count: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        // 获取基础统计信息
        const totalStocks = await prisma.stock.count();
        const totalRecommendations = await prisma.recommendation.count();

        // 获取平均置信度
        const avgConfidence = await prisma.recommendation.aggregate({
          _avg: {
            confidence: true,
          },
        });

        // 获取推荐类型统计
        const buyRecommendations = await prisma.recommendation.count({
          where: { action: 'BUY' },
        });
        const sellRecommendations = await prisma.recommendation.count({
          where: { action: 'SELL' },
        });
        const holdRecommendations = await prisma.recommendation.count({
          where: { action: 'HOLD' },
        });

        // 获取热门股票
        const topStocks = await prisma.recommendation.groupBy({
          by: ['stockId'],
          _count: {
            id: true,
          },
          _avg: {
            confidence: true,
          },
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
          take: 10,
        });

        // 获取股票详细信息
        const topStocksWithDetails = await Promise.all(
          topStocks.map(async (item: any) => {
            const stock = await prisma.stock.findUnique({
              where: { id: item.stockId },
            });

            const lastRecommendation = await prisma.recommendation.findFirst({
              where: { stockId: item.stockId },
              orderBy: { date: 'desc' },
            });

            return {
              symbol: stock?.symbol || 'Unknown',
              name: stock?.name || 'Unknown',
              recommendationCount: item._count.id,
              avgConfidence: item._avg.confidence || 0,
              lastAction: lastRecommendation?.action || 'N/A',
            };
          })
        );

        // 获取最近活动
        const recentActivity = await prisma.recommendation.groupBy({
          by: ['date', 'action'],
          _count: {
            id: true,
          },
          orderBy: {
            date: 'desc',
          },
          take: 7,
        });

        const formattedRecentActivity = recentActivity.map((item: any) => ({
          date: item.date.toISOString().split('T')[0],
          action: item.action,
          count: item._count.id,
        }));

        return {
          success: true,
          data: {
            stats: {
              totalStocks,
              totalRecommendations,
              avgConfidence: avgConfidence._avg.confidence || 0,
              buyRecommendations,
              sellRecommendations,
              holdRecommendations,
            },
            topStocks: topStocksWithDetails,
            recentActivity: formattedRecentActivity,
          },
        };
      } catch (error) {
        fastify.log.error('Error getting dashboard data:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );
}
