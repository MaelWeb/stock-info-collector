import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';

/**
 * 关注列表项更新验证
 */
const updateWatchlistItemSchema = {
  type: 'object',
  properties: {
    notes: { type: 'string' },
  },
  required: [],
};

/**
 * 关注列表路由插件
 */
export default async function watchlistRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * 获取用户的关注列表
   * GET /api/watchlist?page=1&limit=10
   */
  fastify.get(
    '/',
    {
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
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          page?: number;
          limit?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { page = 1, limit = 10 } = request.query;

        // TODO: 从认证中间件获取用户ID
        // 临时使用默认用户，在实际应用中应该从认证中间件获取
        const defaultUser = await prisma.user.findFirst({
          where: { email: 'default@example.com' },
        });
        const userId = defaultUser?.id || 'default-user'; // 临时使用默认用户

        // 计算分页
        const skip = (page - 1) * limit;

        // 获取总数和数据
        const [watchlistItems, total] = await Promise.all([
          prisma.watchlistItem.findMany({
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
          prisma.watchlistItem.count({ where: { userId } }),
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
      } catch (error) {
        fastify.log.error('Error getting watchlist:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * 添加股票到关注列表
   * POST /api/watchlist
   */
  fastify.post(
    '/',
    {
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
    },
    async (request: FastifyRequest<{ Body: { symbol: string; notes?: string } }>, reply: FastifyReply) => {
      try {
        const { symbol, notes } = request.body;
        // 临时使用默认用户，在实际应用中应该从认证中间件获取
        const defaultUser = await prisma.user.findFirst({
          where: { email: 'default@example.com' },
        });
        const userId = defaultUser?.id || 'default-user'; // 临时使用默认用户

        // 检查股票是否存在
        const stock = await prisma.stock.findUnique({
          where: { symbol: symbol.toUpperCase() },
        });

        if (!stock) {
          return reply.status(404).send({
            success: false,
            error: 'Stock not found',
          });
        }

        // 检查是否已经在关注列表中
        const existingItem = await prisma.watchlistItem.findUnique({
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

        // 创建关注列表项
        const watchlistItem = await prisma.watchlistItem.create({
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
      } catch (error) {
        fastify.log.error('Error adding to watchlist:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * 更新关注列表项
   * PUT /api/watchlist/:id
   */
  const updateWatchlistItemParamsSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', minLength: 1 },
    },
    required: ['id'],
  };

  fastify.put(
    '/:id',
    {
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
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { notes?: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const { notes } = request.body;
        const userId = 'default-user'; // 临时使用默认用户

        // 检查关注列表项是否存在且属于当前用户
        const existingItem = await prisma.watchlistItem.findFirst({
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

        // 更新关注列表项
        const updatedItem = await prisma.watchlistItem.update({
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
      } catch (error) {
        fastify.log.error('Error updating watchlist item:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * 从关注列表中删除股票
   * DELETE /api/watchlist/:id
   */
  const deleteWatchlistItemParamsSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', minLength: 1 },
    },
    required: ['id'],
  };

  fastify.delete(
    '/:id',
    {
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
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const userId = 'default-user'; // 临时使用默认用户

        // 检查关注列表项是否存在且属于当前用户
        const existingItem = await prisma.watchlistItem.findFirst({
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

        // 删除关注列表项
        await prisma.watchlistItem.delete({
          where: { id },
        });

        return {
          success: true,
          message: 'Stock removed from watchlist',
        };
      } catch (error) {
        fastify.log.error('Error removing from watchlist:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * 检查股票是否在关注列表中
   * GET /api/watchlist/check/:symbol
   */
  const checkWatchlistParamsSchema = {
    type: 'object',
    properties: {
      symbol: { type: 'string', minLength: 1 },
    },
    required: ['symbol'],
  };

  fastify.get(
    '/check/:symbol',
    {
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
    },
    async (request: FastifyRequest<{ Params: { symbol: string } }>, reply: FastifyReply) => {
      try {
        const { symbol } = request.params;
        const userId = 'default-user'; // 临时使用默认用户

        const stock = await prisma.stock.findUnique({
          where: { symbol: symbol.toUpperCase() },
        });

        if (!stock) {
          return reply.status(404).send({
            success: false,
            error: 'Stock not found',
          });
        }

        const watchlistItem = await prisma.watchlistItem.findUnique({
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
      } catch (error) {
        fastify.log.error('Error checking watchlist status:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * 批量添加股票到关注列表
   * POST /api/watchlist/batch
   */
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

  fastify.post(
    '/batch',
    {
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
    },
    async (request: FastifyRequest<{ Body: { symbols: string[]; notes?: string } }>, reply: FastifyReply) => {
      try {
        const { symbols, notes } = request.body;
        const userId = 'default-user'; // 临时使用默认用户

        let added = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const symbol of symbols) {
          try {
            // 检查股票是否存在
            const stock = await prisma.stock.findUnique({
              where: { symbol: symbol.toUpperCase() },
            });

            if (!stock) {
              errors.push(`Stock ${symbol} not found`);
              continue;
            }

            // 检查是否已经在关注列表中
            const existingItem = await prisma.watchlistItem.findUnique({
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

            // 添加到关注列表
            await prisma.watchlistItem.create({
              data: {
                userId,
                stockId: stock.id,
                notes: notes ?? null,
              },
            });

            added++;
          } catch (error) {
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
      } catch (error) {
        fastify.log.error('Error batch adding to watchlist:', error);
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );
}
