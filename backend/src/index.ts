import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { serverConfig, rateLimitConfig, validateConfig } from './config';
import { prisma, closePrismaConnection } from './lib/prisma';
import { schedulerService } from './services/schedulerService';
import { SuperAdminService } from './services/superAdminService';

// 导入路由
import stockRoutes from './routes/stocks';
import recommendationRoutes from './routes/recommendations';
import watchlistRoutes from './routes/watchlist';
import analysisRoutes from './routes/analysis';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';

/**
 * 创建Fastify应用实例
 */
const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

/**
 * 注册插件和中间件
 */
async function registerPlugins(): Promise<void> {
  // 安全中间件
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  // CORS配置
  await fastify.register(cors, {
    origin: true, // 在生产环境中应该指定具体的域名
    credentials: true,
  });

  // 限流配置
  await fastify.register(rateLimit, {
    max: rateLimitConfig.max,
    timeWindow: rateLimitConfig.windowMs,
    errorResponseBuilder: (_request, context) => ({
      code: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded, retry in ${context.after}`,
      retryAfter: context.after,
    }),
  });

  // Swagger文档
  await fastify.register(swagger, {
    swagger: {
      info: {
        title: 'Stock Info Collector API',
        description: 'AI-powered stock analysis and investment recommendations',
        version: '1.0.0',
      },
      host: `localhost:${serverConfig.port}`,
      schemes: ['http'],
      consumes: ['application/json'],
      produces: ['application/json'],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false,
    },
  });
}

/**
 * 注册路由
 */
async function registerRoutes(): Promise<void> {
  // 健康检查端点
  fastify.get('/health', async () => {
    const dbHealth = await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbHealth ? 'connected' : 'disconnected',
      scheduler: schedulerService.getStatus(),
    };
  });

  // API路由
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(adminRoutes, { prefix: '/api/admin' });
  await fastify.register(stockRoutes, { prefix: '/api/stocks' });
  await fastify.register(recommendationRoutes, { prefix: '/api/recommendations' });
  await fastify.register(watchlistRoutes, { prefix: '/api/watchlist' });
  await fastify.register(analysisRoutes, { prefix: '/api/analysis' });

  // 根路径
  fastify.get('/', async () => {
    return {
      message: 'Stock Info Collector API',
      version: '1.0.0',
      documentation: '/docs',
      health: '/health',
    };
  });
}

/**
 * @description 全局错误处理，统一处理 Prisma、验证及其他错误，防止泄露内部实现细节。
 * @param error - 捕获到的错误对象。
 * @param _request - Fastify 请求对象（未使用）。
 * @param reply - Fastify 响应对象。
 */
fastify.setErrorHandler((error, _request, reply) => {
  fastify.log.error(error);

  // 处理Prisma错误
  if (error.code === 'P2002') {
    return reply.status(409).send({
      error: 'Conflict',
      message: 'Resource already exists',
    });
  }

  if (error.code === 'P2025') {
    return reply.status(404).send({
      error: 'Not Found',
      message: 'Resource not found',
    });
  }

  // 处理验证错误
  if (error.validation) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Validation failed',
      details: error.validation,
    });
  }

  // 默认错误响应
  return reply.status(error.statusCode || 500).send({
    error: 'Internal Server Error',
    message: serverConfig.isDevelopment ? error.message : 'Something went wrong',
  });
});

/**
 * 优雅关闭处理
 */
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  try {
    // 停止定时任务
    schedulerService.stop();

    // 关闭数据库连接
    await closePrismaConnection();

    // 关闭Fastify服务器
    await fastify.close();

    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

/**
 * 启动服务器
 */
async function startServer(): Promise<void> {
  try {
    // 验证配置
    validateConfig();

    // 注册插件和路由
    await registerPlugins();
    await registerRoutes();

    // 启动定时任务服务
    schedulerService.start();

    // 初始化超级管理员
    console.log('正在初始化超级管理员...');
    const superAdminResult = await SuperAdminService.initializeSuperAdmin();
    if (superAdminResult.success) {
      console.log('✅ 超级管理员初始化成功:', superAdminResult.user?.email);
    } else {
      console.log('ℹ️  超级管理员初始化:', superAdminResult.message);
    }

    // 启动服务器
    await fastify.listen({
      port: serverConfig.port,
      host: '0.0.0.0',
    });

    console.log(`🚀 Server is running on http://localhost:${serverConfig.port}`);
    console.log(`📚 API Documentation: http://localhost:${serverConfig.port}/docs`);
    console.log(`💚 Health Check: http://localhost:${serverConfig.port}/health`);

    // 注册信号处理器
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();
