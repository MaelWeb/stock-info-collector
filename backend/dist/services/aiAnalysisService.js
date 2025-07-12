"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiAnalysisService = exports.AIAnalysisService = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
class AIAnalysisService {
    clients = new Map();
    constructor() {
        this.initializeClients();
    }
    initializeClients() {
        const availableModels = (0, config_1.getAvailableAIModels)();
        availableModels.forEach((model) => {
            const client = axios_1.default.create({
                baseURL: this.getBaseURL(model.provider),
                timeout: 30000,
                headers: this.getHeaders(model.provider, 'apiKey' in model ? model.apiKey : undefined),
            });
            this.clients.set(model.provider, client);
        });
    }
    getBaseURL(provider) {
        switch (provider) {
            case 'openai':
                return 'https://api.openai.com/v1';
            case 'anthropic':
                return 'https://api.anthropic.com/v1';
            case 'gemini':
                return 'https://generativelanguage.googleapis.com/v1beta';
            case 'ollama':
                return config_1.aiConfig.ollama.baseUrl;
            case 'huggingface':
                return 'https://api-inference.huggingface.co/models';
            default:
                throw new Error(`Unsupported AI provider: ${provider}`);
        }
    }
    getHeaders(provider, apiKey) {
        const headers = {
            'Content-Type': 'application/json',
        };
        switch (provider) {
            case 'openai':
                if (apiKey)
                    headers['Authorization'] = `Bearer ${apiKey}`;
                break;
            case 'anthropic':
                if (apiKey)
                    headers['x-api-key'] = apiKey;
                headers['anthropic-version'] = '2023-06-01';
                break;
            case 'gemini':
                break;
            case 'ollama':
                break;
            case 'huggingface':
                if (apiKey)
                    headers['Authorization'] = `Bearer ${apiKey}`;
                break;
        }
        return headers;
    }
    async analyzeStock(analysisData, preferredProvider) {
        try {
            const availableModels = (0, config_1.getAvailableAIModels)();
            if (availableModels.length === 0) {
                throw new Error('No AI models available for analysis');
            }
            if (preferredProvider) {
                const preferredModel = availableModels.find((model) => model.provider === preferredProvider);
                if (preferredModel) {
                    try {
                        const result = await this.analyzeWithModel(preferredProvider, analysisData);
                        if (result) {
                            return result;
                        }
                    }
                    catch (error) {
                        console.warn(`Analysis failed with preferred provider ${preferredProvider}:`, error);
                    }
                }
                else {
                    console.warn(`Preferred provider ${preferredProvider} not available, trying other models`);
                }
            }
            for (const model of availableModels) {
                if (preferredProvider && model.provider === preferredProvider) {
                    continue;
                }
                try {
                    const result = await this.analyzeWithModel(model.provider, analysisData);
                    if (result) {
                        return result;
                    }
                }
                catch (error) {
                    console.warn(`Analysis failed with ${model.provider}:`, error);
                    continue;
                }
            }
            throw new Error('All AI models failed to analyze the stock');
        }
        catch (error) {
            console.error('Error analyzing stock:', error);
            return {
                action: 'HOLD',
                confidence: 0.5,
                reasoning: 'Unable to perform AI analysis. Please check your configuration.',
                riskLevel: 'MEDIUM',
                timeHorizon: 'MEDIUM_TERM',
            };
        }
    }
    async analyzeWithModel(provider, analysisData) {
        const client = this.clients.get(provider);
        if (!client) {
            return null;
        }
        const prompt = this.buildAnalysisPrompt(analysisData);
        switch (provider) {
            case 'openai':
                return await this.analyzeWithOpenAI(client, prompt);
            case 'anthropic':
                return await this.analyzeWithAnthropic(client, prompt);
            case 'gemini':
                return await this.analyzeWithGemini(client, prompt);
            case 'ollama':
                return await this.analyzeWithOllama(client, prompt);
            case 'huggingface':
                return await this.analyzeWithHuggingFace(client, prompt);
            default:
                return null;
        }
    }
    buildAnalysisPrompt(analysisData) {
        const { stock, currentPrice, priceHistory, technicalIndicators } = analysisData;
        const previousPrice = priceHistory[1]?.close || currentPrice.close;
        const priceChange = previousPrice > 0 ? ((currentPrice.close - previousPrice) / previousPrice) * 100 : 0;
        const avgVolume = priceHistory.slice(0, 20).reduce((sum, p) => sum + p.volume, 0) / Math.min(20, priceHistory.length);
        const rsi = technicalIndicators.find((ti) => ti.indicator === 'RSI')?.value;
        const macd = technicalIndicators.find((ti) => ti.indicator === 'MACD')?.value;
        const ma20 = technicalIndicators.find((ti) => ti.indicator === 'MA20')?.value;
        const ma50 = technicalIndicators.find((ti) => ti.indicator === 'MA50')?.value;
        return `
作为一位专业的股票分析师，请分析以下股票信息并提供投资建议：

股票信息：
- 代码：${stock.symbol}
- 名称：${stock.name}
- 交易所：${stock.exchange}
- 行业：${stock.sector || '未知'}
- 当前价格：$${currentPrice.close}
- 今日涨跌幅：${priceChange.toFixed(2)}%
- 成交量：${currentPrice.volume.toLocaleString()}
- 平均成交量：${avgVolume.toLocaleString()}

技术指标：
- RSI：${rsi ? rsi.toFixed(2) : 'N/A'}
- MACD：${macd ? macd.toFixed(2) : 'N/A'}
- 20日均线：${ma20 ? ma20.toFixed(2) : 'N/A'}
- 50日均线：${ma50 ? ma50.toFixed(2) : 'N/A'}

价格历史（最近5天）：
${priceHistory
            .slice(0, 5)
            .map((p) => `- ${p.date.toISOString().split('T')[0]}: 开盘$${p.open}, 最高$${p.high}, 最低$${p.low}, 收盘$${p.close}`)
            .join('\n')}

请基于以上信息提供：
1. 投资建议（BUY/SELL/HOLD）
2. 置信度（0-1之间的数字）
3. 目标价格（可选）
4. 分析理由
5. 风险等级（LOW/MEDIUM/HIGH）
6. 投资时间框架（SHORT_TERM/MEDIUM_TERM/LONG_TERM）

请以JSON格式回复：
{
  "action": "BUY|SELL|HOLD",
  "confidence": 0.85,
  "priceTarget": 150.00,
  "reasoning": "详细的分析理由...",
  "riskLevel": "LOW|MEDIUM|HIGH",
  "timeHorizon": "SHORT_TERM|MEDIUM_TERM|LONG_TERM"
}
`;
    }
    async analyzeWithOpenAI(client, prompt) {
        const response = await client.post('/chat/completions', {
            model: config_1.aiConfig.openai.model,
            messages: [
                {
                    role: 'system',
                    content: '你是一位专业的股票分析师，擅长技术分析和基本面分析。请提供准确、客观的投资建议。',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            max_tokens: config_1.aiConfig.openai.maxTokens,
            temperature: config_1.aiConfig.openai.temperature,
        });
        const content = response.data.choices[0]?.message?.content;
        return this.parseAIResponse(content);
    }
    async analyzeWithAnthropic(client, prompt) {
        const response = await client.post('/messages', {
            model: config_1.aiConfig.anthropic.model,
            max_tokens: config_1.aiConfig.anthropic.maxTokens,
            temperature: config_1.aiConfig.anthropic.temperature,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        });
        const content = response.data.content[0]?.text;
        return this.parseAIResponse(content);
    }
    async analyzeWithGemini(_client, prompt) {
        const apiKey = config_1.aiConfig.gemini.apiKey;
        if (!apiKey) {
            throw new Error('Gemini API key is required');
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
        const response = await axios_1.default.post(url, {
            contents: [
                {
                    parts: [
                        {
                            text: prompt,
                        },
                    ],
                },
            ],
            generationConfig: {
                maxOutputTokens: config_1.aiConfig.gemini.maxTokens,
                temperature: config_1.aiConfig.gemini.temperature,
            },
        }, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
        const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        return this.parseAIResponse(content);
    }
    async analyzeWithOllama(client, prompt) {
        const response = await client.post('/api/generate', {
            model: config_1.aiConfig.ollama.model,
            prompt: prompt,
            stream: false,
            options: {
                temperature: config_1.aiConfig.ollama.temperature,
                num_predict: config_1.aiConfig.ollama.maxTokens,
            },
        });
        const content = response.data.response;
        return this.parseAIResponse(content);
    }
    async analyzeWithHuggingFace(_client, prompt) {
        const apiKey = config_1.aiConfig.huggingface.apiKey;
        if (!apiKey) {
            throw new Error('Hugging Face API key is required');
        }
        const url = `https://api-inference.huggingface.co/models/${config_1.aiConfig.huggingface.model}`;
        const response = await axios_1.default.post(url, {
            inputs: prompt,
            parameters: {
                max_new_tokens: config_1.aiConfig.huggingface.maxTokens,
                temperature: config_1.aiConfig.huggingface.temperature,
                return_full_text: false,
                do_sample: true,
            },
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
        const content = response.data[0]?.generated_text;
        return this.parseAIResponse(content);
    }
    parseAIResponse(content) {
        if (!content) {
            return {
                action: 'HOLD',
                confidence: 0.5,
                reasoning: 'No response from AI model',
                riskLevel: 'MEDIUM',
                timeHorizon: 'MEDIUM_TERM',
            };
        }
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    action: parsed.action || 'HOLD',
                    confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
                    priceTarget: parsed.priceTarget,
                    reasoning: parsed.reasoning || 'No reasoning provided',
                    riskLevel: parsed.riskLevel || 'MEDIUM',
                    timeHorizon: parsed.timeHorizon || 'MEDIUM_TERM',
                };
            }
            return this.extractFromText(content || 'No content available');
        }
        catch (error) {
            console.error('Error parsing AI response:', error);
            return this.extractFromText(content || 'Error parsing response');
        }
    }
    extractFromText(content) {
        const actionMatch = content.match(/(BUY|SELL|HOLD)/i);
        const confidenceMatch = content.match(/confidence[:\s]*([0-9]*\.?[0-9]+)/i);
        const riskMatch = content.match(/risk[:\s]*(LOW|MEDIUM|HIGH)/i);
        const timeMatch = content.match(/(SHORT_TERM|MEDIUM_TERM|LONG_TERM)/i);
        return {
            action: actionMatch?.[1]?.toUpperCase() || 'HOLD',
            confidence: confidenceMatch && confidenceMatch[1] ? parseFloat(confidenceMatch[1]) : 0.5,
            reasoning: content.length > 200 ? content.substring(0, 200) + '...' : content,
            riskLevel: riskMatch?.[1]?.toUpperCase() || 'MEDIUM',
            timeHorizon: timeMatch?.[1]?.toUpperCase() || 'MEDIUM_TERM',
        };
    }
    async analyzeMultipleStocks(analysisDataList) {
        const results = [];
        const batchSize = 3;
        for (let i = 0; i < analysisDataList.length; i += batchSize) {
            const batch = analysisDataList.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map((data) => this.analyzeStock(data)));
            results.push(...batchResults);
            if (i + batchSize < analysisDataList.length) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }
        return results;
    }
}
exports.AIAnalysisService = AIAnalysisService;
exports.aiAnalysisService = new AIAnalysisService();
//# sourceMappingURL=aiAnalysisService.js.map