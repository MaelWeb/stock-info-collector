export declare const config: {
    DATABASE_URL: string;
    PORT: number;
    NODE_ENV: "development" | "production" | "test";
    DAILY_ANALYSIS_TIME: string;
    MARKET_HOURS_START: string;
    MARKET_HOURS_END: string;
    RATE_LIMIT_MAX: number;
    RATE_LIMIT_WINDOW_MS: number;
    LOG_LEVEL: "error" | "warn" | "info" | "debug";
    ALPHA_VANTAGE_API_KEY?: string | undefined;
    YAHOO_FINANCE_API_KEY?: string | undefined;
    OPENAI_API_KEY?: string | undefined;
    ANTHROPIC_API_KEY?: string | undefined;
    GEMINI_API_KEY?: string | undefined;
    OLLAMA_BASE_URL?: string | undefined;
    HUGGINGFACE_API_KEY?: string | undefined;
};
export declare const dbConfig: {
    readonly url: string;
};
export declare const serverConfig: {
    readonly port: number;
    readonly nodeEnv: "development" | "production" | "test";
    readonly isDevelopment: boolean;
    readonly isProduction: boolean;
    readonly isTest: boolean;
};
export declare const apiConfig: {
    readonly alphaVantage: {
        readonly apiKey: string | undefined;
        readonly baseUrl: "https://www.alphavantage.co/query";
    };
    readonly yahooFinance: {
        readonly apiKey: string | undefined;
        readonly baseUrl: "https://yfapi.net/v6";
    };
};
export declare const aiConfig: {
    readonly openai: {
        readonly apiKey: string | undefined;
        readonly model: "gpt-3.5-turbo";
        readonly maxTokens: 2000;
        readonly temperature: 0.7;
    };
    readonly anthropic: {
        readonly apiKey: string | undefined;
        readonly model: "claude-3-sonnet-20240229";
        readonly maxTokens: 2000;
        readonly temperature: 0.7;
    };
    readonly gemini: {
        readonly apiKey: string | undefined;
        readonly model: "gemini-1.5-pro";
        readonly maxTokens: 2000;
        readonly temperature: 0.7;
    };
    readonly ollama: {
        readonly baseUrl: string;
        readonly model: "llama2";
        readonly maxTokens: 2000;
        readonly temperature: 0.7;
    };
    readonly huggingface: {
        readonly apiKey: string | undefined;
        readonly model: "microsoft/DialoGPT-medium";
        readonly maxTokens: 2000;
        readonly temperature: 0.7;
    };
};
export declare const cronConfig: {
    readonly dailyAnalysisTime: string;
    readonly marketHours: {
        readonly start: string;
        readonly end: string;
    };
};
export declare const rateLimitConfig: {
    readonly max: number;
    readonly windowMs: number;
};
export declare const logConfig: {
    readonly level: "error" | "warn" | "info" | "debug";
};
export declare const getAvailableAIModels: () => ({
    apiKey: string | undefined;
    model: "gpt-3.5-turbo";
    maxTokens: 2000;
    temperature: 0.7;
    provider: "openai";
} | {
    apiKey: string | undefined;
    model: "claude-3-sonnet-20240229";
    maxTokens: 2000;
    temperature: 0.7;
    provider: "anthropic";
} | {
    apiKey: string | undefined;
    model: "gemini-1.5-pro";
    maxTokens: 2000;
    temperature: 0.7;
    provider: "gemini";
} | {
    baseUrl: string;
    model: "llama2";
    maxTokens: 2000;
    temperature: 0.7;
    provider: "ollama";
} | {
    apiKey: string | undefined;
    model: "microsoft/DialoGPT-medium";
    maxTokens: 2000;
    temperature: 0.7;
    provider: "huggingface";
})[];
export declare const validateConfig: () => boolean;
//# sourceMappingURL=index.d.ts.map