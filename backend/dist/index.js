"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
const config_1 = require("./config");
const prisma_1 = require("./lib/prisma");
const schedulerService_1 = require("./services/schedulerService");
const stocks_1 = __importDefault(require("./routes/stocks"));
const recommendations_1 = __importDefault(require("./routes/recommendations"));
const watchlist_1 = __importDefault(require("./routes/watchlist"));
const analysis_1 = __importDefault(require("./routes/analysis"));
const fastify = (0, fastify_1.default)({
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
async function registerPlugins() {
    await fastify.register(helmet_1.default, {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:'],
            },
        },
    });
    await fastify.register(cors_1.default, {
        origin: true,
        credentials: true,
    });
    await fastify.register(rate_limit_1.default, {
        max: config_1.rateLimitConfig.max,
        timeWindow: config_1.rateLimitConfig.windowMs,
        errorResponseBuilder: (_request, context) => ({
            code: 429,
            error: 'Too Many Requests',
            message: `Rate limit exceeded, retry in ${context.after}`,
            retryAfter: context.after,
        }),
    });
    await fastify.register(swagger_1.default, {
        swagger: {
            info: {
                title: 'Stock Info Collector API',
                description: 'AI-powered stock analysis and investment recommendations',
                version: '1.0.0',
            },
            host: `localhost:${config_1.serverConfig.port}`,
            schemes: ['http'],
            consumes: ['application/json'],
            produces: ['application/json'],
        },
    });
    await fastify.register(swagger_ui_1.default, {
        routePrefix: '/docs',
        uiConfig: {
            docExpansion: 'full',
            deepLinking: false,
        },
    });
}
async function registerRoutes() {
    fastify.get('/health', async () => {
        const dbHealth = await prisma_1.prisma.$queryRaw `SELECT 1`;
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: dbHealth ? 'connected' : 'disconnected',
            scheduler: schedulerService_1.schedulerService.getStatus(),
        };
    });
    await fastify.register(stocks_1.default, { prefix: '/api/stocks' });
    await fastify.register(recommendations_1.default, { prefix: '/api/recommendations' });
    await fastify.register(watchlist_1.default, { prefix: '/api/watchlist' });
    await fastify.register(analysis_1.default, { prefix: '/api/analysis' });
    fastify.get('/', async () => {
        return {
            message: 'Stock Info Collector API',
            version: '1.0.0',
            documentation: '/docs',
            health: '/health',
        };
    });
}
fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);
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
    if (error.validation) {
        return reply.status(400).send({
            error: 'Bad Request',
            message: 'Validation failed',
            details: error.validation,
        });
    }
    return reply.status(error.statusCode || 500).send({
        error: 'Internal Server Error',
        message: config_1.serverConfig.isDevelopment ? error.message : 'Something went wrong',
    });
});
async function gracefulShutdown(signal) {
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
    try {
        schedulerService_1.schedulerService.stop();
        await (0, prisma_1.closePrismaConnection)();
        await fastify.close();
        console.log('Graceful shutdown completed');
        process.exit(0);
    }
    catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
}
async function startServer() {
    try {
        (0, config_1.validateConfig)();
        await registerPlugins();
        await registerRoutes();
        schedulerService_1.schedulerService.start();
        await fastify.listen({
            port: config_1.serverConfig.port,
            host: '0.0.0.0',
        });
        console.log(`🚀 Server is running on http://localhost:${config_1.serverConfig.port}`);
        console.log(`📚 API Documentation: http://localhost:${config_1.serverConfig.port}/docs`);
        console.log(`💚 Health Check: http://localhost:${config_1.serverConfig.port}/health`);
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    }
    catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=index.js.map