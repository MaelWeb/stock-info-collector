import { z } from 'zod';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 环境变量验证模式
 */
const envSchema = z.object({
  // 数据库配置
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // 服务器配置
  PORT: z.coerce.number().min(1).max(65535).default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // 股票数据API配置
  ALPHA_VANTAGE_API_KEY: z.string().optional(),
  YAHOO_FINANCE_API_KEY: z.string().optional(),

  // AI模型配置
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().url().optional(),
  HUGGINGFACE_API_KEY: z.string().optional(),

  // 定时任务配置
  DAILY_ANALYSIS_TIME: z.string().default('0 9 * * *'),
  MARKET_HOURS_START: z.string().default('09:30'),
  MARKET_HOURS_END: z.string().default('16:00'),

  // 限流配置
  RATE_LIMIT_MAX: z.coerce.number().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(900000),

  // 日志配置
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

/**
 * 验证并解析环境变量
 */
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((issue) => issue.path.join('.')).join(', ');
      throw new Error(`Environment validation failed: ${missingVars}`);
    }
    throw error;
  }
};

/**
 * 应用配置对象
 */
export const config = parseEnv();

/**
 * 数据库配置
 */
export const dbConfig = {
  url: config.DATABASE_URL,
} as const;

/**
 * 服务器配置
 */
export const serverConfig = {
  port: config.PORT,
  nodeEnv: config.NODE_ENV,
  isDevelopment: config.NODE_ENV === 'development',
  isProduction: config.NODE_ENV === 'production',
  isTest: config.NODE_ENV === 'test',
} as const;

/**
 * API配置
 */
export const apiConfig = {
  alphaVantage: {
    apiKey: config.ALPHA_VANTAGE_API_KEY,
    baseUrl: 'https://www.alphavantage.co/query',
  },
  yahooFinance: {
    apiKey: config.YAHOO_FINANCE_API_KEY,
    baseUrl: 'https://yfapi.net/v6',
  },
} as const;

/**
 * AI模型配置
 */
export const aiConfig = {
  openai: {
    apiKey: config.OPENAI_API_KEY,
    model: 'gpt-3.5-turbo',
    maxTokens: 2000,
    temperature: 0.7,
  },
  anthropic: {
    apiKey: config.ANTHROPIC_API_KEY,
    model: 'claude-3-sonnet-20240229',
    maxTokens: 2000,
    temperature: 0.7,
  },
  gemini: {
    apiKey: config.GEMINI_API_KEY,
    model: 'gemini-1.5-pro',
    maxTokens: 2000,
    temperature: 0.7,
  },
  ollama: {
    baseUrl: config.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: 'llama2',
    maxTokens: 2000,
    temperature: 0.7,
  },
  huggingface: {
    apiKey: config.HUGGINGFACE_API_KEY,
    model: 'microsoft/DialoGPT-medium',
    maxTokens: 2000,
    temperature: 0.7,
  },
} as const;

/**
 * 定时任务配置
 */
export const cronConfig = {
  dailyAnalysisTime: config.DAILY_ANALYSIS_TIME,
  marketHours: {
    start: config.MARKET_HOURS_START,
    end: config.MARKET_HOURS_END,
  },
} as const;

/**
 * 限流配置
 */
export const rateLimitConfig = {
  max: config.RATE_LIMIT_MAX,
  windowMs: config.RATE_LIMIT_WINDOW_MS,
} as const;

/**
 * 日志配置
 */
export const logConfig = {
  level: config.LOG_LEVEL,
} as const;

/**
 * 获取可用的AI模型配置
 * 按优先级返回可用的模型配置
 */
export const getAvailableAIModels = () => {
  const models = [];

  if (aiConfig.openai.apiKey) {
    models.push({
      provider: 'openai' as const,
      ...aiConfig.openai,
    });
  }

  if (aiConfig.anthropic.apiKey) {
    models.push({
      provider: 'anthropic' as const,
      ...aiConfig.anthropic,
    });
  }

  if (aiConfig.gemini.apiKey) {
    models.push({
      provider: 'gemini' as const,
      ...aiConfig.gemini,
    });
  }

  if (aiConfig.ollama.baseUrl) {
    models.push({
      provider: 'ollama' as const,
      ...aiConfig.ollama,
    });
  }

  if (aiConfig.huggingface.apiKey) {
    models.push({
      provider: 'huggingface' as const,
      ...aiConfig.huggingface,
    });
  }

  return models;
};

/**
 * 验证配置完整性
 */
export const validateConfig = () => {
  const errors: string[] = [];

  // 检查是否有可用的股票数据API
  if (!apiConfig.alphaVantage.apiKey && !apiConfig.yahooFinance.apiKey) {
    errors.push('At least one stock data API key is required (ALPHA_VANTAGE_API_KEY or YAHOO_FINANCE_API_KEY)');
  }

  // 检查是否有可用的AI模型
  const availableModels = getAvailableAIModels();
  if (availableModels.length === 0) {
    errors.push('At least one AI model configuration is required');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  return true;
};
