"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConfig = exports.getAvailableAIModels = exports.logConfig = exports.rateLimitConfig = exports.cronConfig = exports.aiConfig = exports.apiConfig = exports.serverConfig = exports.dbConfig = exports.config = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL is required'),
    PORT: zod_1.z.coerce.number().min(1).max(65535).default(3001),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    ALPHA_VANTAGE_API_KEY: zod_1.z.string().optional(),
    YAHOO_FINANCE_API_KEY: zod_1.z.string().optional(),
    OPENAI_API_KEY: zod_1.z.string().optional(),
    ANTHROPIC_API_KEY: zod_1.z.string().optional(),
    GEMINI_API_KEY: zod_1.z.string().optional(),
    OLLAMA_BASE_URL: zod_1.z.string().url().optional(),
    HUGGINGFACE_API_KEY: zod_1.z.string().optional(),
    DAILY_ANALYSIS_TIME: zod_1.z.string().default('0 9 * * *'),
    MARKET_HOURS_START: zod_1.z.string().default('09:30'),
    MARKET_HOURS_END: zod_1.z.string().default('16:00'),
    RATE_LIMIT_MAX: zod_1.z.coerce.number().positive().default(100),
    RATE_LIMIT_WINDOW_MS: zod_1.z.coerce.number().positive().default(900000),
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});
const parseEnv = () => {
    try {
        return envSchema.parse(process.env);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const missingVars = error.issues.map((issue) => issue.path.join('.')).join(', ');
            throw new Error(`Environment validation failed: ${missingVars}`);
        }
        throw error;
    }
};
exports.config = parseEnv();
exports.dbConfig = {
    url: exports.config.DATABASE_URL,
};
exports.serverConfig = {
    port: exports.config.PORT,
    nodeEnv: exports.config.NODE_ENV,
    isDevelopment: exports.config.NODE_ENV === 'development',
    isProduction: exports.config.NODE_ENV === 'production',
    isTest: exports.config.NODE_ENV === 'test',
};
exports.apiConfig = {
    alphaVantage: {
        apiKey: exports.config.ALPHA_VANTAGE_API_KEY,
        baseUrl: 'https://www.alphavantage.co/query',
    },
    yahooFinance: {
        apiKey: exports.config.YAHOO_FINANCE_API_KEY,
        baseUrl: 'https://yfapi.net/v6',
    },
};
exports.aiConfig = {
    openai: {
        apiKey: exports.config.OPENAI_API_KEY,
        model: 'gpt-3.5-turbo',
        maxTokens: 2000,
        temperature: 0.7,
    },
    anthropic: {
        apiKey: exports.config.ANTHROPIC_API_KEY,
        model: 'claude-3-sonnet-20240229',
        maxTokens: 2000,
        temperature: 0.7,
    },
    gemini: {
        apiKey: exports.config.GEMINI_API_KEY,
        model: 'gemini-1.5-pro',
        maxTokens: 2000,
        temperature: 0.7,
    },
    ollama: {
        baseUrl: exports.config.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: 'llama2',
        maxTokens: 2000,
        temperature: 0.7,
    },
    huggingface: {
        apiKey: exports.config.HUGGINGFACE_API_KEY,
        model: 'microsoft/DialoGPT-medium',
        maxTokens: 2000,
        temperature: 0.7,
    },
};
exports.cronConfig = {
    dailyAnalysisTime: exports.config.DAILY_ANALYSIS_TIME,
    marketHours: {
        start: exports.config.MARKET_HOURS_START,
        end: exports.config.MARKET_HOURS_END,
    },
};
exports.rateLimitConfig = {
    max: exports.config.RATE_LIMIT_MAX,
    windowMs: exports.config.RATE_LIMIT_WINDOW_MS,
};
exports.logConfig = {
    level: exports.config.LOG_LEVEL,
};
const getAvailableAIModels = () => {
    const models = [];
    if (exports.aiConfig.openai.apiKey) {
        models.push({
            provider: 'openai',
            ...exports.aiConfig.openai,
        });
    }
    if (exports.aiConfig.anthropic.apiKey) {
        models.push({
            provider: 'anthropic',
            ...exports.aiConfig.anthropic,
        });
    }
    if (exports.aiConfig.gemini.apiKey) {
        models.push({
            provider: 'gemini',
            ...exports.aiConfig.gemini,
        });
    }
    if (exports.aiConfig.ollama.baseUrl) {
        models.push({
            provider: 'ollama',
            ...exports.aiConfig.ollama,
        });
    }
    if (exports.aiConfig.huggingface.apiKey) {
        models.push({
            provider: 'huggingface',
            ...exports.aiConfig.huggingface,
        });
    }
    return models;
};
exports.getAvailableAIModels = getAvailableAIModels;
const validateConfig = () => {
    const errors = [];
    if (!exports.apiConfig.alphaVantage.apiKey && !exports.apiConfig.yahooFinance.apiKey) {
        errors.push('At least one stock data API key is required (ALPHA_VANTAGE_API_KEY or YAHOO_FINANCE_API_KEY)');
    }
    const availableModels = (0, exports.getAvailableAIModels)();
    if (availableModels.length === 0) {
        errors.push('At least one AI model configuration is required');
    }
    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
    return true;
};
exports.validateConfig = validateConfig;
//# sourceMappingURL=index.js.map