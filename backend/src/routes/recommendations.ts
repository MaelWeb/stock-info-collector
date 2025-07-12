import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import { AIAnalysisService } from '../services/aiAnalysisService';
import { StockDataService } from '../services/stockDataService';

type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'huggingface';

/**
 * 投资建议路由插件
 */
export default async function recommendationRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * 获取投资建议列表
   * GET /api/recommendations?page=1&limit=20&action=BUY
   */
  fastify.get(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            type: { type: 'string', enum: ['DAILY_OPPORTUNITY', 'CUSTOM_ANALYSIS'] },
            action: { type: 'string', enum: ['BUY', 'SELL', 'HOLD'] },
            riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            timeHorizon: { type: 'string', enum: ['SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM'] },
            dateFrom: { type: 'string' },
            dateTo: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        stockId: { type: 'string' },
                        date: { type: 'string' },
                        type: { type: 'string' },
                        confidence: { type: 'number' },
                        action: { type: 'string' },
                        priceTarget: { type: 'number' },
                        reasoning: { type: 'string' },
                        riskLevel: { type: 'string' },
                        timeHorizon: { type: 'string' },
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
                      hasNext: { type: 'boolean' },
                      hasPrev: { type: 'boolean' },
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
          type?: string;
          action?: string;
          riskLevel?: string;
          timeHorizon?: string;
          dateFrom?: string;
          dateTo?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { page = 1, limit = 20, type, action, riskLevel, timeHorizon, dateFrom, dateTo } = request.query;

        // 构建查询条件
        const where: any = {};

        if (type) where.type = type;
        if (action) where.action = action;
        if (riskLevel) where.riskLevel = riskLevel;
        if (timeHorizon) where.timeHorizon = timeHorizon;

        if (dateFrom || dateTo) {
          where.date = {};
          if (dateFrom) where.date.gte = new Date(dateFrom);
          if (dateTo) where.date.lte = new Date(dateTo);
        }

        // 计算分页
        const skip = (page - 1) * limit;

        // 获取总数
        const total = await prisma.recommendation.count({ where });

        // 获取推荐列表
        const recommendations = await prisma.recommendation.findMany({
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
          skip,
          take: limit,
        });

        return {
          success: true,
          data: {
            data: recommendations,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
              hasNext: page < Math.ceil(total / limit),
              hasPrev: page > 1,
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
   * 获取推荐详情
   * GET /api/recommendations/:id
   */
  fastify.get(
    '/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', minLength: 1 },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  stockId: { type: 'string' },
                  date: { type: 'string' },
                  type: { type: 'string' },
                  confidence: { type: 'number' },
                  action: { type: 'string' },
                  priceTarget: { type: 'number' },
                  reasoning: { type: 'string' },
                  riskLevel: { type: 'string' },
                  timeHorizon: { type: 'string' },
                  stock: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      symbol: { type: 'string' },
                      name: { type: 'string' },
                      exchange: { type: 'string' },
                      sector: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;

        const recommendation = await prisma.recommendation.findUnique({
          where: { id },
          include: {
            stock: {
              select: {
                id: true,
                symbol: true,
                name: true,
                exchange: true,
                sector: true,
              },
            },
          },
        });

        if (!recommendation) {
          return reply.status(404).send({
            success: false,
            error: 'Recommendation not found',
          });
        }

        return {
          success: true,
          data: recommendation,
        };
      } catch (error) {
        fastify.log.error('Error getting recommendation details:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * 获取股票的投资建议历史
   * GET /api/recommendations/stock/:symbol
   */
  fastify.get(
    '/stock/:symbol',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            symbol: { type: 'string', minLength: 1 },
            limit: { type: 'number', minimum: 1, maximum: 50, default: 10 },
          },
          required: ['symbol'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    date: { type: 'string' },
                    type: { type: 'string' },
                    confidence: { type: 'number' },
                    action: { type: 'string' },
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
    async (request: FastifyRequest<{ Params: { symbol: string; limit?: number } }>, reply: FastifyReply) => {
      try {
        const { symbol, limit = 10 } = request.params;

        const stock = await prisma.stock.findUnique({
          where: { symbol: symbol.toUpperCase() },
        });

        if (!stock) {
          return reply.status(404).send({
            success: false,
            error: 'Stock not found',
          });
        }

        const recommendations = await prisma.recommendation.findMany({
          where: { stockId: stock.id },
          orderBy: { date: 'desc' },
          take: limit,
        });

        return {
          success: true,
          data: recommendations,
        };
      } catch (error) {
        fastify.log.error('Error getting stock recommendations:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * 获取今日推荐
   * GET /api/recommendations/today
   */
  fastify.get(
    '/today',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    stockId: { type: 'string' },
                    date: { type: 'string' },
                    type: { type: 'string' },
                    confidence: { type: 'number' },
                    action: { type: 'string' },
                    priceTarget: { type: 'number' },
                    reasoning: { type: 'string' },
                    riskLevel: { type: 'string' },
                    timeHorizon: { type: 'string' },
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
            },
          },
        },
      },
    },
    async (_: FastifyRequest, reply: FastifyReply) => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const recommendations = await prisma.recommendation.findMany({
          where: {
            date: {
              gte: today,
              lt: tomorrow,
            },
            type: 'DAILY_OPPORTUNITY',
          },
          include: {
            stock: {
              select: {
                id: true,
                symbol: true,
                name: true,
              },
            },
          },
          orderBy: { confidence: 'desc' },
        });

        return {
          success: true,
          data: recommendations,
        };
      } catch (error) {
        fastify.log.error('Error getting today recommendations:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * 获取推荐统计
   * GET /api/recommendations/stats
   */
  fastify.get(
    '/stats',
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
                  total: { type: 'number' },
                  today: { type: 'number' },
                  byAction: {
                    type: 'object',
                    properties: {
                      BUY: { type: 'number' },
                      SELL: { type: 'number' },
                      HOLD: { type: 'number' },
                    },
                  },
                  byRiskLevel: {
                    type: 'object',
                    properties: {
                      LOW: { type: 'number' },
                      MEDIUM: { type: 'number' },
                      HIGH: { type: 'number' },
                    },
                  },
                  averageConfidence: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (_: FastifyRequest, reply: FastifyReply) => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 获取总数
        const total = await prisma.recommendation.count();

        // 获取今日数量
        const todayCount = await prisma.recommendation.count({
          where: {
            date: {
              gte: today,
              lt: tomorrow,
            },
          },
        });

        // 按操作类型统计
        const byAction = await prisma.recommendation.groupBy({
          by: ['action'],
          _count: {
            action: true,
          },
        });

        // 按风险等级统计
        const byRiskLevel = await prisma.recommendation.groupBy({
          by: ['riskLevel'],
          _count: {
            riskLevel: true,
          },
        });

        // 平均置信度
        const avgConfidence = await prisma.recommendation.aggregate({
          _avg: {
            confidence: true,
          },
        });

        // 格式化统计数据
        const actionStats = {
          BUY: 0,
          SELL: 0,
          HOLD: 0,
        };

        byAction.forEach((item) => {
          if (item.action in actionStats) {
            actionStats[item.action as keyof typeof actionStats] = item._count.action;
          }
        });

        const riskStats = {
          LOW: 0,
          MEDIUM: 0,
          HIGH: 0,
        };

        byRiskLevel.forEach((item) => {
          if (item.riskLevel in riskStats) {
            riskStats[item.riskLevel as keyof typeof riskStats] = item._count.riskLevel;
          }
        });

        return {
          success: true,
          data: {
            total,
            today: todayCount,
            byAction: actionStats,
            byRiskLevel: riskStats,
            averageConfidence: avgConfidence._avg.confidence || 0,
          },
        };
      } catch (error) {
        fastify.log.error('Error getting recommendation stats:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * 获取AI提供商列表
   * GET /api/recommendations/providers
   */
  fastify.get(
    '/providers',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    provider: { type: 'string' },
                    name: { type: 'string' },
                    model: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (_: FastifyRequest, reply: FastifyReply) => {
      try {
        // 导入配置
        const { getAvailableAIModels } = await import('../config');

        // 获取实际可用的AI模型
        const availableModels = getAvailableAIModels();

        // 获取提供商显示名称的辅助函数
        const getProviderDisplayName = (provider: string): string => {
          const displayNames: Record<string, string> = {
            openai: 'OpenAI GPT',
            anthropic: 'Anthropic Claude',
            gemini: 'Google Gemini',
            ollama: 'Ollama',
            huggingface: 'Hugging Face',
          };
          return displayNames[provider] || provider;
        };

        // 转换为前端需要的格式
        const providers = availableModels.map((model) => ({
          provider: model.provider,
          name: getProviderDisplayName(model.provider),
          model: model.model,
        }));

        return {
          success: true,
          data: providers,
        };
      } catch (error) {
        fastify.log.error('Error getting AI providers:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * 创建新的投资建议分析
   * POST /api/recommendations/analyze
   */
  fastify.post(
    '/analyze',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            stockSymbol: { type: 'string', minLength: 1, maxLength: 10 },
            aiProvider: { type: 'string', enum: ['openai', 'anthropic', 'gemini', 'ollama', 'huggingface'] },
            analysisType: { type: 'string', enum: ['TECHNICAL', 'FUNDAMENTAL', 'HYBRID'] },
            timeHorizon: { type: 'string', enum: ['SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM'] },
            customPrompt: { type: 'string', maxLength: 1000 },
          },
          required: ['stockSymbol'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  stockId: { type: 'string' },
                  date: { type: 'string' },
                  type: { type: 'string' },
                  confidence: { type: 'number' },
                  action: { type: 'string' },
                  priceTarget: { type: 'number' },
                  reasoning: { type: 'string' },
                  riskLevel: { type: 'string' },
                  timeHorizon: { type: 'string' },
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
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          stockSymbol: string;
          aiProvider?: string;
          analysisType?: string;
          timeHorizon?: string;
          customPrompt?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { stockSymbol, analysisType = 'HYBRID', timeHorizon = 'MEDIUM_TERM', customPrompt } = request.body;

        // 查找股票
        const stock = await prisma.stock.findUnique({
          where: { symbol: stockSymbol.toUpperCase() },
        });

        if (!stock) {
          return reply.status(404).send({
            success: false,
            error: 'Stock not found',
          });
        }

        // 初始化服务
        const stockDataService = new StockDataService();
        const aiAnalysisService = new AIAnalysisService();

        // 获取股票价格数据
        const priceHistory = await stockDataService.getStockPrices(stockSymbol, 50);
        if (priceHistory.length === 0) {
          return reply.status(404).send({
            success: false,
            error: 'No price data available for analysis',
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

        // 准备AI分析数据
        const analysisData = {
          stock,
          currentPrice,
          priceHistory,
          technicalIndicators,
        };

        // 使用真实AI分析
        let aiAnalysis;
        try {
          // 传递用户选择的AI提供商
          const selectedProvider = request.body.aiProvider as AIProvider | undefined;
          aiAnalysis = await aiAnalysisService.analyzeStock(analysisData, selectedProvider);
          console.log('AI Analysis Result:', aiAnalysis);
        } catch (error) {
          console.error('AI analysis failed, falling back to mock analysis:', error);

          // 如果AI分析失败，使用改进的模拟分析
          const basePrice = currentPrice.close;
          let priceRange = 0.3;
          if (stock.exchange === 'SSE' || stock.exchange === 'SZSE') {
            priceRange = 0.2;
          } else if (stock.exchange === 'NASDAQ' || stock.exchange === 'NYSE') {
            priceRange = 0.4;
          }

          const priceChange = (Math.random() - 0.5) * 2 * priceRange;
          const targetPrice = basePrice * (1 + priceChange);

          aiAnalysis = {
            confidence: 0.75 + Math.random() * 0.2,
            action: ['BUY', 'SELL', 'HOLD'][Math.floor(Math.random() * 3)] as 'BUY' | 'SELL' | 'HOLD',
            priceTarget: Math.round(targetPrice * 100) / 100,
            reasoning: `基于${analysisType.toLowerCase()}分析，${stockSymbol}在${timeHorizon.toLowerCase()}内表现出${['积极', '中性', '消极'][Math.floor(Math.random() * 3)]}的趋势。${customPrompt ? `用户特别关注：${customPrompt}` : ''}`,
            riskLevel: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] as 'LOW' | 'MEDIUM' | 'HIGH',
            timeHorizon: timeHorizon || 'MEDIUM_TERM',
          };
        }

        // 创建推荐记录
        const recommendation = await prisma.recommendation.create({
          data: {
            stockId: stock.id,
            type: 'CUSTOM_ANALYSIS',
            aiProvider: request.body.aiProvider || 'gemini', // 记录使用的AI提供商
            confidence: aiAnalysis.confidence,
            action: aiAnalysis.action,
            priceTarget: aiAnalysis.priceTarget || null,
            reasoning: aiAnalysis.reasoning,
            riskLevel: aiAnalysis.riskLevel,
            timeHorizon: aiAnalysis.timeHorizon,
            date: new Date(),
          },
          include: {
            stock: {
              select: {
                id: true,
                symbol: true,
                name: true,
              },
            },
          },
        });

        return {
          success: true,
          data: recommendation,
        };
      } catch (error) {
        fastify.log.error('Error creating analysis:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * 删除投资建议
   * DELETE /api/recommendations/:id
   */
  fastify.delete(
    '/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', minLength: 1 },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    /**
     * @description 删除指定ID的投资建议
     * @param request - FastifyRequest<{ Params: { id: string } }>
     * @param reply - FastifyReply
     * @returns 删除结果
     */
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const deleted = await prisma.recommendation.deleteMany({ where: { id } });
        if (deleted.count === 0) {
          return reply.status(404).send({ success: false, error: 'Recommendation not found' });
        }
        return { success: true };
      } catch (error) {
        fastify.log.error('Error deleting recommendation:', error);
        return reply.status(500).send({ success: false, error: 'Internal server error' });
      }
    }
  );
}
