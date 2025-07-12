"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = watchlistRoutes;
const prisma_1 = require("../lib/prisma");
const updateWatchlistItemSchema = {
    type: 'object',
    properties: {
        notes: { type: 'string' },
    },
    required: [],
};
async function watchlistRoutes(fastify) {
    fastify.get('/', {
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    page: { type: 'number', minimum: 1, default: 1 },
                    limit: { type: 'number', minimum: 1, maximum: 100, default: 10 },
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
                                            userId: { type: 'string' },
                                            stockId: { type: 'string' },
                                            addedAt: { type: 'string' },
                                            notes: { type: 'string' },
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
            const { page = 1, limit = 10 } = request.query;
            const defaultUser = await prisma_1.prisma.user.findFirst({
                where: { email: 'default@example.com' },
            });
            const userId = defaultUser?.id || 'default-user';
            const skip = (page - 1) * limit;
            const [watchlistItems, total] = await Promise.all([
                prisma_1.prisma.watchlistItem.findMany({
                    where: { userId },
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
                    orderBy: { addedAt: 'desc' },
                    skip,
                    take: limit,
                }),
                prisma_1.prisma.watchlistItem.count({ where: { userId } }),
            ]);
            const totalPages = Math.ceil(total / limit);
            return {
                success: true,
                data: {
                    data: watchlistItems,
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
            fastify.log.error('Error getting watchlist:', error);
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
                    symbol: { type: 'string', minLength: 1 },
                    notes: { type: 'string' },
                },
                required: ['symbol'],
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                userId: { type: 'string' },
                                stockId: { type: 'string' },
                                addedAt: { type: 'string' },
                                notes: { type: 'string' },
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
            const { symbol, notes } = request.body;
            const defaultUser = await prisma_1.prisma.user.findFirst({
                where: { email: 'default@example.com' },
            });
            const userId = defaultUser?.id || 'default-user';
            const stock = await prisma_1.prisma.stock.findUnique({
                where: { symbol: symbol.toUpperCase() },
            });
            if (!stock) {
                return reply.status(404).send({
                    success: false,
                    error: 'Stock not found',
                });
            }
            const existingItem = await prisma_1.prisma.watchlistItem.findUnique({
                where: {
                    userId_stockId: {
                        userId,
                        stockId: stock.id,
                    },
                },
            });
            if (existingItem) {
                return reply.status(409).send({
                    success: false,
                    error: 'Stock already in watchlist',
                });
            }
            const watchlistItem = await prisma_1.prisma.watchlistItem.create({
                data: {
                    userId,
                    stockId: stock.id,
                    notes: notes ?? null,
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
            return reply.status(201).send({
                success: true,
                data: watchlistItem,
            });
        }
        catch (error) {
            fastify.log.error('Error adding to watchlist:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    const updateWatchlistItemParamsSchema = {
        type: 'object',
        properties: {
            id: { type: 'string', minLength: 1 },
        },
        required: ['id'],
    };
    fastify.put('/:id', {
        schema: {
            params: updateWatchlistItemParamsSchema,
            body: updateWatchlistItemSchema,
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                userId: { type: 'string' },
                                stockId: { type: 'string' },
                                addedAt: { type: 'string' },
                                notes: { type: 'string' },
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
            const { id } = request.params;
            const { notes } = request.body;
            const userId = 'default-user';
            const existingItem = await prisma_1.prisma.watchlistItem.findFirst({
                where: {
                    id,
                    userId,
                },
            });
            if (!existingItem) {
                return reply.status(404).send({
                    success: false,
                    error: 'Watchlist item not found',
                });
            }
            const updatedItem = await prisma_1.prisma.watchlistItem.update({
                where: { id },
                data: { notes: notes ?? null },
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
                data: updatedItem,
            };
        }
        catch (error) {
            fastify.log.error('Error updating watchlist item:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    const deleteWatchlistItemParamsSchema = {
        type: 'object',
        properties: {
            id: { type: 'string', minLength: 1 },
        },
        required: ['id'],
    };
    fastify.delete('/:id', {
        schema: {
            params: deleteWatchlistItemParamsSchema,
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
            const userId = 'default-user';
            const existingItem = await prisma_1.prisma.watchlistItem.findFirst({
                where: {
                    id,
                    userId,
                },
            });
            if (!existingItem) {
                return reply.status(404).send({
                    success: false,
                    error: 'Watchlist item not found',
                });
            }
            await prisma_1.prisma.watchlistItem.delete({
                where: { id },
            });
            return {
                success: true,
                message: 'Stock removed from watchlist',
            };
        }
        catch (error) {
            fastify.log.error('Error removing from watchlist:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    const checkWatchlistParamsSchema = {
        type: 'object',
        properties: {
            symbol: { type: 'string', minLength: 1 },
        },
        required: ['symbol'],
    };
    fastify.get('/check/:symbol', {
        schema: {
            params: checkWatchlistParamsSchema,
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                isWatched: { type: 'boolean' },
                                watchlistItem: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        notes: { type: 'string' },
                                        addedAt: { type: 'string' },
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
            const userId = 'default-user';
            const stock = await prisma_1.prisma.stock.findUnique({
                where: { symbol: symbol.toUpperCase() },
            });
            if (!stock) {
                return reply.status(404).send({
                    success: false,
                    error: 'Stock not found',
                });
            }
            const watchlistItem = await prisma_1.prisma.watchlistItem.findUnique({
                where: {
                    userId_stockId: {
                        userId,
                        stockId: stock.id,
                    },
                },
            });
            return {
                success: true,
                data: {
                    isWatched: !!watchlistItem,
                    watchlistItem: watchlistItem
                        ? {
                            id: watchlistItem.id,
                            notes: watchlistItem.notes,
                            addedAt: watchlistItem.addedAt.toISOString(),
                        }
                        : null,
                },
            };
        }
        catch (error) {
            fastify.log.error('Error checking watchlist status:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
    const batchAddWatchlistSchema = {
        type: 'object',
        properties: {
            symbols: {
                type: 'array',
                items: { type: 'string', minLength: 1 },
                minItems: 1,
                maxItems: 20,
            },
            notes: { type: 'string' },
        },
        required: ['symbols'],
    };
    fastify.post('/batch', {
        schema: {
            body: batchAddWatchlistSchema,
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                added: { type: 'number' },
                                skipped: { type: 'number' },
                                errors: { type: 'array', items: { type: 'string' } },
                            },
                        },
                    },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const { symbols, notes } = request.body;
            const userId = 'default-user';
            let added = 0;
            let skipped = 0;
            const errors = [];
            for (const symbol of symbols) {
                try {
                    const stock = await prisma_1.prisma.stock.findUnique({
                        where: { symbol: symbol.toUpperCase() },
                    });
                    if (!stock) {
                        errors.push(`Stock ${symbol} not found`);
                        continue;
                    }
                    const existingItem = await prisma_1.prisma.watchlistItem.findUnique({
                        where: {
                            userId_stockId: {
                                userId,
                                stockId: stock.id,
                            },
                        },
                    });
                    if (existingItem) {
                        skipped++;
                        continue;
                    }
                    await prisma_1.prisma.watchlistItem.create({
                        data: {
                            userId,
                            stockId: stock.id,
                            notes: notes ?? null,
                        },
                    });
                    added++;
                }
                catch (error) {
                    errors.push(`Error adding ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
            return {
                success: true,
                data: {
                    added,
                    skipped,
                    errors,
                },
            };
        }
        catch (error) {
            fastify.log.error('Error batch adding to watchlist:', error);
            return reply.status(500).send({
                success: false,
                error: 'Internal server error',
            });
        }
    });
}
//# sourceMappingURL=watchlist.js.map