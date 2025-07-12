"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = stockRoutes;
const stockDataService_1 = require("../services/stockDataService");
const prisma_1 = require("../lib/prisma");
async function stockRoutes(fastify) {
    fastify.get('/', {
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    page: { type: 'number', minimum: 1, default: 1 },
                    limit: { type: 'number', minimum: 1, maximum: 1000, default: 10 },
                    search: { type: 'string' },
                    sector: { type: 'string' },
                    industry: { type: 'string' },
                    exchange: { type: 'string' },
                    sortBy: { type: 'string', enum: ['symbol', 'name', 'marketCap', 'createdAt'], default: 'symbol' },
                    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
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
                                            symbol: { type: 'string' },
                                            name: { type: 'string' },
                                            exchange: { type: 'string' },
                                            sector: { type: 'string' },
                                            industry: { type: 'string' },
                                            marketCap: { type: 'number' },
                                            peRatio: { type: 'number' },
                                            dividendYield: { type: 'number' },
                                            createdAt: { type: 'string' },
                                            updatedAt: { type: 'string' },
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
            const { page = 1, limit = 10, search, sector, industry, exchange, sortBy = 'symbol', sortOrder = 'asc', } = request.query;
            const where = {};
            if (search) {
                where.OR = [
                    { symbol: { contains: search.toUpperCase() } },
                    { name: { contains: search, mode: 'insensitive' } },
                ];
            }
            if (sector) {
                where.sector = sector;
            }
            if (industry) {
                where.industry = industry;
            }
            if (exchange) {
                where.exchange = exchange;
            }
            const skip = (page - 1) * limit;
            const orderBy = {};
            orderBy[sortBy] = sortOrder;
            const [stocks, total] = await Promise.all([
                prisma_1.prisma.stock.findMany({
                    where,
                    orderBy,
                    skip,
                    take: limit,
                    select: {
                        id: true,
                        symbol: true,
                        name: true,
                        exchange: true,
                        sector: true,
                        industry: true,
                        marketCap: true,
                        peRatio: true,
                        dividendYield: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                }),
                prisma_1.prisma.stock.count({ where }),
            ]);
            const totalPages = Math.ceil(total / limit);
            return {
                success: true,
                data: {
                    data: stocks,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages,
                        hasNext: page < totalPages,
                        hasPrev: page > 1,
                    },
                },
            };
        }
        catch (error) {
            fastify.log.error('Error getting stocks list:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    fastify.get('/search', {
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    query: { type: 'string', minLength: 1 },
                    limit: { type: 'number', minimum: 1, maximum: 50, default: 10 },
                },
                required: ['query'],
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
                                    symbol: { type: 'string' },
                                    name: { type: 'string' },
                                    exchange: { type: 'string' },
                                    sector: { type: 'string' },
                                    industry: { type: 'string' },
                                },
                            },
                        },
                    },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const { query, limit } = request.query;
            const stocks = await stockDataService_1.stockDataService.searchStocks(query);
            const limitedStocks = stocks.slice(0, limit);
            return {
                success: true,
                data: limitedStocks,
            };
        }
        catch (error) {
            fastify.log.error('Error searching stocks:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    fastify.get('/:symbol', {
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
                                id: { type: 'string' },
                                symbol: { type: 'string' },
                                name: { type: 'string' },
                                exchange: { type: 'string' },
                                sector: { type: 'string' },
                                industry: { type: 'string' },
                                marketCap: { type: 'number' },
                                peRatio: { type: 'number' },
                                dividendYield: { type: 'number' },
                                createdAt: { type: 'string' },
                                updatedAt: { type: 'string' },
                            },
                        },
                    },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const { symbol } = request.params;
            const stock = await stockDataService_1.stockDataService.getStockInfo(symbol.toUpperCase());
            if (!stock) {
                return reply.status(404).send({
                    success: false,
                    error: 'Stock not found',
                });
            }
            return {
                success: true,
                data: stock,
            };
        }
        catch (error) {
            fastify.log.error('Error getting stock details:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    fastify.get('/:symbol/prices', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    symbol: { type: 'string', minLength: 1 },
                },
                required: ['symbol'],
            },
            querystring: {
                type: 'object',
                properties: {
                    days: { type: 'number', minimum: 1, maximum: 365, default: 30 },
                },
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
                                    stockId: { type: 'string' },
                                    date: { type: 'string' },
                                    open: { type: 'number' },
                                    high: { type: 'number' },
                                    low: { type: 'number' },
                                    close: { type: 'number' },
                                    volume: { type: 'number' },
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
            const { days } = request.query;
            const prices = await stockDataService_1.stockDataService.getStockPrices(symbol.toUpperCase(), days);
            return {
                success: true,
                data: prices,
            };
        }
        catch (error) {
            fastify.log.error('Error getting stock prices:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    fastify.get('/:symbol/price', {
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
                                symbol: { type: 'string' },
                                price: { type: 'number' },
                                timestamp: { type: 'string' },
                            },
                        },
                    },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const { symbol } = request.params;
            const price = await stockDataService_1.stockDataService.getCurrentPrice(symbol.toUpperCase());
            if (price === null) {
                return reply.status(404).send({
                    success: false,
                    error: 'Price not available',
                });
            }
            return {
                success: true,
                data: {
                    symbol: symbol.toUpperCase(),
                    price,
                    timestamp: new Date().toISOString(),
                },
            };
        }
        catch (error) {
            fastify.log.error('Error getting current price:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    fastify.get('/:symbol/indicators', {
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
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    stockId: { type: 'string' },
                                    date: { type: 'string' },
                                    indicator: { type: 'string' },
                                    value: { type: 'number' },
                                    signal: { type: 'string' },
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
            const indicators = await prisma_1.prisma.technicalIndicator.findMany({
                where: { stockId: stock.id },
                orderBy: { date: 'desc' },
                take: 10,
            });
            return {
                success: true,
                data: indicators,
            };
        }
        catch (error) {
            fastify.log.error('Error getting technical indicators:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    fastify.post('/batch', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    symbols: {
                        type: 'array',
                        items: { type: 'string', minLength: 1 },
                        minItems: 1,
                        maxItems: 20,
                    },
                },
                required: ['symbols'],
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
                                    symbol: { type: 'string' },
                                    name: { type: 'string' },
                                    exchange: { type: 'string' },
                                    sector: { type: 'string' },
                                    industry: { type: 'string' },
                                },
                            },
                        },
                    },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const { symbols } = request.body;
            const stocks = await stockDataService_1.stockDataService.getMultipleStocks(symbols);
            return {
                success: true,
                data: stocks,
            };
        }
        catch (error) {
            fastify.log.error('Error getting batch stocks:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    fastify.get('/popular', {
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
                                    symbol: { type: 'string' },
                                    name: { type: 'string' },
                                    exchange: { type: 'string' },
                                    sector: { type: 'string' },
                                    industry: { type: 'string' },
                                },
                            },
                        },
                    },
                },
            },
        },
    }, async (_request, reply) => {
        try {
            const popularSymbols = [
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
            const stocks = await stockDataService_1.stockDataService.getMultipleStocks(popularSymbols);
            return {
                success: true,
                data: stocks,
            };
        }
        catch (error) {
            fastify.log.error('Error getting popular stocks:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    fastify.post('/', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    symbol: { type: 'string', minLength: 1, maxLength: 10 },
                    name: { type: 'string', minLength: 1, maxLength: 200 },
                    exchange: { type: 'string', minLength: 1, maxLength: 50 },
                    sector: { type: 'string', maxLength: 100 },
                    industry: { type: 'string', maxLength: 100 },
                    marketCap: { type: 'number' },
                    peRatio: { type: 'number' },
                    dividendYield: { type: 'number' },
                },
                required: ['symbol', 'name', 'exchange'],
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
                                symbol: { type: 'string' },
                                name: { type: 'string' },
                                exchange: { type: 'string' },
                                sector: { type: 'string' },
                                industry: { type: 'string' },
                                marketCap: { type: 'number' },
                                peRatio: { type: 'number' },
                                dividendYield: { type: 'number' },
                                createdAt: { type: 'string' },
                                updatedAt: { type: 'string' },
                            },
                        },
                    },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const stockData = request.body;
            const existingStock = await prisma_1.prisma.stock.findUnique({
                where: { symbol: stockData.symbol.toUpperCase() },
            });
            if (existingStock) {
                return reply.status(409).send({
                    success: false,
                    error: 'Stock already exists',
                });
            }
            const newStock = await prisma_1.prisma.stock.create({
                data: {
                    symbol: stockData.symbol.toUpperCase(),
                    name: stockData.name,
                    exchange: stockData.exchange,
                    sector: stockData.sector || null,
                    industry: stockData.industry || null,
                    marketCap: stockData.marketCap || null,
                    peRatio: stockData.peRatio || null,
                    dividendYield: stockData.dividendYield || null,
                },
            });
            return {
                success: true,
                data: newStock,
            };
        }
        catch (error) {
            fastify.log.error('Error adding stock:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    fastify.put('/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', minLength: 1 },
                },
                required: ['id'],
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string', minLength: 1, maxLength: 200 },
                    exchange: { type: 'string', minLength: 1, maxLength: 50 },
                    sector: { type: 'string', maxLength: 100 },
                    industry: { type: 'string', maxLength: 100 },
                    marketCap: { type: 'number' },
                    peRatio: { type: 'number' },
                    dividendYield: { type: 'number' },
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
                                id: { type: 'string' },
                                symbol: { type: 'string' },
                                name: { type: 'string' },
                                exchange: { type: 'string' },
                                sector: { type: 'string' },
                                industry: { type: 'string' },
                                marketCap: { type: 'number' },
                                peRatio: { type: 'number' },
                                dividendYield: { type: 'number' },
                                createdAt: { type: 'string' },
                                updatedAt: { type: 'string' },
                            },
                        },
                    },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const updateData = request.body;
            const existingStock = await prisma_1.prisma.stock.findUnique({
                where: { id },
            });
            if (!existingStock) {
                return reply.status(404).send({
                    success: false,
                    error: 'Stock not found',
                });
            }
            const updatedStock = await prisma_1.prisma.stock.update({
                where: { id },
                data: updateData,
            });
            return {
                success: true,
                data: updatedStock,
            };
        }
        catch (error) {
            fastify.log.error('Error updating stock:', error);
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
                        message: { type: 'string' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const existingStock = await prisma_1.prisma.stock.findUnique({
                where: { id },
            });
            if (!existingStock) {
                return reply.status(404).send({
                    success: false,
                    error: 'Stock not found',
                });
            }
            await prisma_1.prisma.stock.delete({
                where: { id },
            });
            return {
                success: true,
                message: 'Stock deleted successfully',
            };
        }
        catch (error) {
            fastify.log.error('Error deleting stock:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
}
//# sourceMappingURL=stocks.js.map