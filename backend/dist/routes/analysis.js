"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = analysisRoutes;
const prisma_1 = require("../lib/prisma");
const schedulerService_1 = require("../services/schedulerService");
const aiAnalysisService_1 = require("../services/aiAnalysisService");
const stockDataService_1 = require("../services/stockDataService");
async function analysisRoutes(fastify) {
    fastify.get('/status', {
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
    }, async (_request, reply) => {
        try {
            const status = schedulerService_1.schedulerService.getStatus();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const totalAnalyses = await prisma_1.prisma.recommendation.count();
            const todayAnalyses = await prisma_1.prisma.recommendation.count({
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
                    lastRun: 'Not implemented yet',
                },
            };
        }
        catch (error) {
            fastify.log.error('Error getting analysis status:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    fastify.post('/trigger', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    symbols: {
                        type: 'array',
                        items: { type: 'string', minLength: 1 },
                    },
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
    }, async (request, reply) => {
        try {
            const { symbols } = request.body;
            const startTime = Date.now();
            await schedulerService_1.schedulerService.triggerManualAnalysis(symbols);
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
        }
        catch (error) {
            fastify.log.error('Error triggering analysis:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    fastify.post('/stock/:symbol', {
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
    }, async (request, reply) => {
        try {
            const { symbol } = request.params;
            const stock = await prisma_1.prisma.stock.findUnique({
                where: { symbol: symbol.toUpperCase() },
            });
            if (!stock) {
                return reply.status(404).send({
                    success: false,
                    error: 'Stock not found',
                });
            }
            const priceHistory = await stockDataService_1.stockDataService.getStockPrices(symbol, 50);
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
            const technicalIndicators = await prisma_1.prisma.technicalIndicator.findMany({
                where: { stockId: stock.id },
                orderBy: { date: 'desc' },
                take: 10,
            });
            const analysisData = {
                stock,
                currentPrice,
                priceHistory,
                technicalIndicators,
            };
            const recommendation = await aiAnalysisService_1.aiAnalysisService.analyzeStock(analysisData);
            await prisma_1.prisma.recommendation.create({
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
                    technicalIndicators: technicalIndicators.map((ti) => ({
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
        }
        catch (error) {
            fastify.log.error('Error analyzing stock:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    fastify.get('/recommendations', {
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
    }, async (request, reply) => {
        try {
            const { page = 1, limit = 20, symbol, action, dateFrom, dateTo } = request.query;
            const where = {};
            if (symbol) {
                where.stock = { symbol: symbol.toUpperCase() };
            }
            if (action) {
                where.action = action;
            }
            if (dateFrom || dateTo) {
                where.date = {};
                if (dateFrom)
                    where.date.gte = new Date(dateFrom);
                if (dateTo)
                    where.date.lte = new Date(dateTo);
            }
            const total = await prisma_1.prisma.recommendation.count({ where });
            const history = await prisma_1.prisma.recommendation.findMany({
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
                    recommendations: history.map((rec) => ({
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
        }
        catch (error) {
            fastify.log.error('Error getting recommendations:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    fastify.get('/dashboard', {
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
    }, async (_request, reply) => {
        try {
            const totalStocks = await prisma_1.prisma.stock.count();
            const totalRecommendations = await prisma_1.prisma.recommendation.count();
            const avgConfidence = await prisma_1.prisma.recommendation.aggregate({
                _avg: {
                    confidence: true,
                },
            });
            const buyRecommendations = await prisma_1.prisma.recommendation.count({
                where: { action: 'BUY' },
            });
            const sellRecommendations = await prisma_1.prisma.recommendation.count({
                where: { action: 'SELL' },
            });
            const holdRecommendations = await prisma_1.prisma.recommendation.count({
                where: { action: 'HOLD' },
            });
            const topStocks = await prisma_1.prisma.recommendation.groupBy({
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
            const topStocksWithDetails = await Promise.all(topStocks.map(async (item) => {
                const stock = await prisma_1.prisma.stock.findUnique({
                    where: { id: item.stockId },
                });
                const lastRecommendation = await prisma_1.prisma.recommendation.findFirst({
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
            }));
            const recentActivity = await prisma_1.prisma.recommendation.groupBy({
                by: ['date', 'action'],
                _count: {
                    id: true,
                },
                orderBy: {
                    date: 'desc',
                },
                take: 7,
            });
            const formattedRecentActivity = recentActivity.map((item) => ({
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
        }
        catch (error) {
            fastify.log.error('Error getting dashboard data:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
}
//# sourceMappingURL=analysis.js.map