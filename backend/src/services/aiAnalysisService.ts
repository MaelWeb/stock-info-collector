import axios, { AxiosInstance } from 'axios';
import { aiConfig, getAvailableAIModels } from '../config';
import type { Stock, StockPrice, TechnicalIndicator } from '@prisma/client';

/**
 * @description AI分析结果接口，定义股票分析的标准输出格式。
 * 包含投资建议、置信度、目标价格、分析理由、风险等级和时间框架。
 */
export interface AIAnalysisResult {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  priceTarget?: number;
  reasoning: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  timeHorizon: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
}

/**
 * @description 股票分析数据接口，包含进行AI分析所需的所有数据。
 * 包括股票基本信息、当前价格、价格历史和技术指标。
 */
export interface StockAnalysisData {
  stock: Stock;
  currentPrice: StockPrice;
  priceHistory: StockPrice[];
  technicalIndicators: TechnicalIndicator[];
  marketContext?: string;
}

/**
 * @description AI提供者类型定义，支持多种AI模型服务。
 */
type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'huggingface';

/**
 * @description AI分析服务类，负责使用多种AI模型进行股票分析。
 * 支持 OpenAI、Anthropic、Gemini、Ollama 和 Hugging Face 等多种AI服务。
 */
export class AIAnalysisService {
  private clients: Map<AIProvider, AxiosInstance> = new Map();

  constructor() {
    this.initializeClients();
  }

  /**
   * @description 初始化所有可用的AI客户端，为每个配置的AI提供者创建HTTP客户端。
   */
  private initializeClients(): void {
    const availableModels = getAvailableAIModels();

    availableModels.forEach((model) => {
      const client = axios.create({
        baseURL: this.getBaseURL(model.provider),
        timeout: 30000,
        headers: this.getHeaders(model.provider, 'apiKey' in model ? model.apiKey : undefined),
      });

      this.clients.set(model.provider, client);
    });
  }

  /**
   * 获取AI模型的基础URL
   */
  private getBaseURL(provider: AIProvider): string {
    switch (provider) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      case 'gemini':
        return 'https://generativelanguage.googleapis.com/v1beta';
      case 'ollama':
        return aiConfig.ollama.baseUrl;
      case 'huggingface':
        return 'https://api-inference.huggingface.co/models';
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  /**
   * 获取AI模型的请求头
   */
  private getHeaders(provider: AIProvider, apiKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    switch (provider) {
      case 'openai':
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'anthropic':
        if (apiKey) headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        break;
      case 'gemini':
        // Gemini使用URL参数传递API key
        break;
      case 'ollama':
        // Ollama通常不需要认证
        break;
      case 'huggingface':
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
        break;
    }

    return headers;
  }

  /**
   * 分析股票并生成投资建议
   * @param analysisData - 股票分析数据
   * @param preferredProvider - 优先使用的AI提供商（可选）
   * @returns AI分析结果
   */
  async analyzeStock(analysisData: StockAnalysisData, preferredProvider?: AIProvider): Promise<AIAnalysisResult> {
    try {
      const availableModels = getAvailableAIModels();

      if (availableModels.length === 0) {
        throw new Error('No AI models available for analysis');
      }

      // 如果指定了优先提供商，先尝试使用它
      if (preferredProvider) {
        const preferredModel = availableModels.find((model) => model.provider === preferredProvider);
        if (preferredModel) {
          try {
            const result = await this.analyzeWithModel(preferredProvider, analysisData);
            if (result) {
              return result;
            }
          } catch (error) {
            console.warn(`Analysis failed with preferred provider ${preferredProvider}:`, error);
            // 如果优先提供商失败，继续尝试其他模型
          }
        } else {
          console.warn(`Preferred provider ${preferredProvider} not available, trying other models`);
        }
      }

      // 按优先级尝试不同的AI模型
      for (const model of availableModels) {
        // 如果已经尝试过优先提供商，跳过
        if (preferredProvider && model.provider === preferredProvider) {
          continue;
        }

        try {
          const result = await this.analyzeWithModel(model.provider, analysisData);
          if (result) {
            return result;
          }
        } catch (error) {
          console.warn(`Analysis failed with ${model.provider}:`, error);
          continue;
        }
      }

      throw new Error('All AI models failed to analyze the stock');
    } catch (error) {
      console.error('Error analyzing stock:', error);
      // 返回默认的HOLD建议
      return {
        action: 'HOLD',
        confidence: 0.5,
        reasoning: 'Unable to perform AI analysis. Please check your configuration.',
        riskLevel: 'MEDIUM',
        timeHorizon: 'MEDIUM_TERM',
      };
    }
  }

  /**
   * 使用特定AI模型分析股票
   * @param provider - AI模型提供者
   * @param analysisData - 股票分析数据
   * @returns AI分析结果
   */
  private async analyzeWithModel(
    provider: AIProvider,
    analysisData: StockAnalysisData
  ): Promise<AIAnalysisResult | null> {
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

  /**
   * @description 构建分析提示词，将股票数据转换为AI可理解的格式。
   * @param analysisData - 股票分析数据
   * @returns 格式化的提示词字符串
   */
  private buildAnalysisPrompt(analysisData: StockAnalysisData): string {
    const { stock, currentPrice, priceHistory, technicalIndicators } = analysisData;

    // 计算基本技术指标
    const previousPrice = priceHistory[1]?.close || currentPrice.close;
    const priceChange = previousPrice > 0 ? ((currentPrice.close - previousPrice) / previousPrice) * 100 : 0;
    const avgVolume =
      priceHistory.slice(0, 20).reduce((sum, p) => sum + p.volume, 0) / Math.min(20, priceHistory.length);

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

  /**
   * 使用OpenAI分析
   */
  private async analyzeWithOpenAI(client: AxiosInstance, prompt: string): Promise<AIAnalysisResult> {
    const response = await client.post('/chat/completions', {
      model: aiConfig.openai.model,
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
      max_tokens: aiConfig.openai.maxTokens,
      temperature: aiConfig.openai.temperature,
    });

    const content = response.data.choices[0]?.message?.content;
    return this.parseAIResponse(content);
  }

  /**
   * 使用Anthropic Claude分析
   */
  private async analyzeWithAnthropic(client: AxiosInstance, prompt: string): Promise<AIAnalysisResult> {
    const response = await client.post('/messages', {
      model: aiConfig.anthropic.model,
      max_tokens: aiConfig.anthropic.maxTokens,
      temperature: aiConfig.anthropic.temperature,
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

  /**
   * 使用Google Gemini分析
   */
  private async analyzeWithGemini(_client: AxiosInstance, prompt: string): Promise<AIAnalysisResult> {
    // Gemini需要特殊的URL构造，直接在URL中传递API key
    const apiKey = aiConfig.gemini.apiKey;
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;

    const response = await axios.post(
      url,
      {
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
          maxOutputTokens: aiConfig.gemini.maxTokens,
          temperature: aiConfig.gemini.temperature,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    return this.parseAIResponse(content);
  }

  /**
   * 使用Ollama分析
   */
  private async analyzeWithOllama(client: AxiosInstance, prompt: string): Promise<AIAnalysisResult> {
    const response = await client.post('/api/generate', {
      model: aiConfig.ollama.model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: aiConfig.ollama.temperature,
        num_predict: aiConfig.ollama.maxTokens,
      },
    });

    const content = response.data.response;
    return this.parseAIResponse(content);
  }

  /**
   * 使用Hugging Face分析
   */
  private async analyzeWithHuggingFace(_client: AxiosInstance, prompt: string): Promise<AIAnalysisResult> {
    // Hugging Face需要特殊的URL构造
    const apiKey = aiConfig.huggingface.apiKey;
    if (!apiKey) {
      throw new Error('Hugging Face API key is required');
    }

    const url = `https://api-inference.huggingface.co/models/${aiConfig.huggingface.model}`;

    const response = await axios.post(
      url,
      {
        inputs: prompt,
        parameters: {
          max_new_tokens: aiConfig.huggingface.maxTokens,
          temperature: aiConfig.huggingface.temperature,
          return_full_text: false,
          do_sample: true,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const content = response.data[0]?.generated_text;
    return this.parseAIResponse(content);
  }

  /**
   * @description 解析AI响应，将AI返回的内容转换为标准化的分析结果。
   * @param content - AI返回的内容
   * @returns 解析后的分析结果
   */
  private parseAIResponse(content: string | undefined): AIAnalysisResult {
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
      // 尝试提取JSON部分
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

      // 如果无法解析JSON，尝试从文本中提取信息
      return this.extractFromText(content || 'No content available');
    } catch (error) {
      console.error('Error parsing AI response:', error);
      // 确保 content 不为 undefined 再传递给 extractFromText
      return this.extractFromText(content || 'Error parsing response');
    }
  }

  /**
   * @description 从文本中提取分析信息，当AI返回非JSON格式时使用此方法。
   * @param content - AI返回的文本内容
   * @returns 提取的分析结果
   */
  private extractFromText(content: string): AIAnalysisResult {
    const actionMatch = content.match(/(BUY|SELL|HOLD)/i);
    const confidenceMatch = content.match(/confidence[:\s]*([0-9]*\.?[0-9]+)/i);
    const riskMatch = content.match(/risk[:\s]*(LOW|MEDIUM|HIGH)/i);
    const timeMatch = content.match(/(SHORT_TERM|MEDIUM_TERM|LONG_TERM)/i);

    return {
      action: (actionMatch?.[1]?.toUpperCase() as 'BUY' | 'SELL' | 'HOLD') || 'HOLD',
      confidence: confidenceMatch && confidenceMatch[1] ? parseFloat(confidenceMatch[1]) : 0.5,
      reasoning: content.length > 200 ? content.substring(0, 200) + '...' : content,
      riskLevel: (riskMatch?.[1]?.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH') || 'MEDIUM',
      timeHorizon: (timeMatch?.[1]?.toUpperCase() as 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM') || 'MEDIUM_TERM',
    };
  }

  /**
   * 批量分析股票
   * @param analysisDataList - 股票分析数据列表
   * @returns 分析结果列表
   */
  async analyzeMultipleStocks(analysisDataList: StockAnalysisData[]): Promise<AIAnalysisResult[]> {
    const results: AIAnalysisResult[] = [];

    // 限制并发数量避免API限制
    const batchSize = 3;
    for (let i = 0; i < analysisDataList.length; i += batchSize) {
      const batch = analysisDataList.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((data) => this.analyzeStock(data)));

      results.push(...batchResults);

      // 添加延迟避免API限制
      if (i + batchSize < analysisDataList.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return results;
  }
}

/**
 * AI分析服务单例实例
 */
export const aiAnalysisService = new AIAnalysisService();
