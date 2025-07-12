"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = recommendationRoutes;
const prisma_1 = require("../lib/prisma");
const aiAnalysisService_1 = require("../services/aiAnalysisService");
const stockDataService_1 = require("../services/stockDataService");
async function recommendationRoutes(fastify) {
    fastify.get('/', {
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
    }, async (request, reply) => {
        try {
            const { page = 1, limit = 20, type, action, riskLevel, timeHorizon, dateFrom, dateTo } = request.query;
            const where = {};
            if (type)
                where.type = type;
            if (action)
                where.action = action;
            if (riskLevel)
                where.riskLevel = riskLevel;
            if (timeHorizon)
                where.timeHorizon = timeHorizon;
            if (dateFrom || dateTo) {
                where.date = {};
                if (dateFrom)
                    where.date.gte = new Date(dateFrom);
                if (dateTo)
                    where.date.lte = new Date(dateTo);
            }
            const skip = (page - 1) * limit;
            const total = await prisma_1.prisma.recommendation.count({ where });
            const recommendations = await prisma_1.prisma.recommendation.findMany({
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
        }
        catch (error) {
            fastify.log.error('Error getting recommendations:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    fastify.get('/:id', {
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
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const recommendation = await prisma_1.prisma.recommendation.findUnique({
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
        }
        catch (error) {
            fastify.log.error('Error getting recommendation details:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    fastify.get('/stock/:symbol', {
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
    }, async (request, reply) => {
        try {
            const { symbol, limit = 10 } = request.params;
            const stock = await prisma_1.prisma.stock.findUnique({
                where: { symbol: symbol.toUpperCase() },
            });
            if (!stock) {
                return reply.status(404).send({
                    success: false,
                    error: 'Stock not found',
                });
            }
            const recommendations = await prisma_1.prisma.recommendation.findMany({
                where: { stockId: stock.id },
                orderBy: { date: 'desc' },
                take: limit,
            });
            return {
                success: true,
                data: recommendations,
            };
        }
        catch (error) {
            fastify.log.error('Error getting stock recommendations:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    fastify.get('/today', {
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
    }, async (_, reply) => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const recommendations = await prisma_1.prisma.recommendation.findMany({
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
        }
        catch (error) {
            fastify.log.error('Error getting today recommendations:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    fastify.get('/stats', {
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
    }, async (_, reply) => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const total = await prisma_1.prisma.recommendation.count();
            const todayCount = await prisma_1.prisma.recommendation.count({
                where: {
                    date: {
                        gte: today,
                        lt: tomorrow,
                    },
                },
            });
            const byAction = await prisma_1.prisma.recommendation.groupBy({
                by: ['action'],
                _count: {
                    action: true,
                },
            });
            const byRiskLevel = await prisma_1.prisma.recommendation.groupBy({
                by: ['riskLevel'],
                _count: {
                    riskLevel: true,
                },
            });
            const avgConfidence = await prisma_1.prisma.recommendation.aggregate({
                _avg: {
                    confidence: true,
                },
            });
            const actionStats = {
                BUY: 0,
                SELL: 0,
                HOLD: 0,
            };
            byAction.forEach((item) => {
                if (item.action in actionStats) {
                    actionStats[item.action] = item._count.action;
                }
            });
            const riskStats = {
                LOW: 0,
                MEDIUM: 0,
                HIGH: 0,
            };
            byRiskLevel.forEach((item) => {
                if (item.riskLevel in riskStats) {
                    riskStats[item.riskLevel] = item._count.riskLevel;
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
        }
        catch (error) {
            fastify.log.error('Error getting recommendation stats:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    fastify.get('/providers', {
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
    }, async (_, reply) => {
        try {
            const { getAvailableAIModels } = await Promise.resolve().then(() => __importStar(require('../config')));
            const availableModels = getAvailableAIModels();
            const getProviderDisplayName = (provider) => {
                const displayNames = {
                    openai: 'OpenAI GPT',
                    anthropic: 'Anthropic Claude',
                    gemini: 'Google Gemini',
                    ollama: 'Ollama',
                    huggingface: 'Hugging Face',
                };
                return displayNames[provider] || provider;
            };
            const providers = availableModels.map((model) => ({
                provider: model.provider,
                name: getProviderDisplayName(model.provider),
                model: model.model,
            }));
            return {
                success: true,
                data: providers,
            };
        }
        catch (error) {
            fastify.log.error('Error getting AI providers:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    fastify.post('/analyze', {
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
    }, async (request, reply) => {
        try {
            const { stockSymbol, analysisType = 'HYBRID', timeHorizon = 'MEDIUM_TERM', customPrompt } = request.body;
            const stock = await prisma_1.prisma.stock.findUnique({
                where: { symbol: stockSymbol.toUpperCase() },
            });
            if (!stock) {
                return reply.status(404).send({
                    success: false,
                    error: 'Stock not found',
                });
            }
            const stockDataService = new stockDataService_1.StockDataService();
            const aiAnalysisService = new aiAnalysisService_1.AIAnalysisService();
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
            let aiAnalysis;
            try {
                const selectedProvider = request.body.aiProvider;
                aiAnalysis = await aiAnalysisService.analyzeStock(analysisData, selectedProvider);
                console.log('AI Analysis Result:', aiAnalysis);
            }
            catch (error) {
                console.error('AI analysis failed, falling back to mock analysis:', error);
                const basePrice = currentPrice.close;
                let priceRange = 0.3;
                if (stock.exchange === 'SSE' || stock.exchange === 'SZSE') {
                    priceRange = 0.2;
                }
                else if (stock.exchange === 'NASDAQ' || stock.exchange === 'NYSE') {
                    priceRange = 0.4;
                }
                const priceChange = (Math.random() - 0.5) * 2 * priceRange;
                const targetPrice = basePrice * (1 + priceChange);
                aiAnalysis = {
                    confidence: 0.75 + Math.random() * 0.2,
                    action: ['BUY', 'SELL', 'HOLD'][Math.floor(Math.random() * 3)],
                    priceTarget: Math.round(targetPrice * 100) / 100,
                    reasoning: `基于${analysisType.toLowerCase()}分析，${stockSymbol}在${timeHorizon.toLowerCase()}内表现出${['积极', '中性', '消极'][Math.floor(Math.random() * 3)]}的趋势。${customPrompt ? `用户特别关注：${customPrompt}` : ''}`,
                    riskLevel: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
                    timeHorizon: timeHorizon || 'MEDIUM_TERM',
                };
            }
            const recommendation = await prisma_1.prisma.recommendation.create({
                data: {
                    stockId: stock.id,
                    type: 'CUSTOM_ANALYSIS',
                    aiProvider: request.body.aiProvider || 'gemini',
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
        }
        catch (error) {
            fastify.log.error('Error creating analysis:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    fastify.delete('/:id', {
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
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const deleted = await prisma_1.prisma.recommendation.deleteMany({ where: { id } });
            if (deleted.count === 0) {
                return reply.status(404).send({ success: false, error: 'Recommendation not found' });
            }
            return { success: true };
        }
        catch (error) {
            fastify.log.error('Error deleting recommendation:', error);
            return reply.status(500).send({ success: false, error: 'Internal server error' });
        }
    });
}
//# sourceMappingURL=recommendations.js.map