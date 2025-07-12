import type { Stock, StockPrice, TechnicalIndicator } from '@prisma/client';
export interface AIAnalysisResult {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    priceTarget?: number;
    reasoning: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    timeHorizon: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
}
export interface StockAnalysisData {
    stock: Stock;
    currentPrice: StockPrice;
    priceHistory: StockPrice[];
    technicalIndicators: TechnicalIndicator[];
    marketContext?: string;
}
type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'huggingface';
export declare class AIAnalysisService {
    private clients;
    constructor();
    private initializeClients;
    private getBaseURL;
    private getHeaders;
    analyzeStock(analysisData: StockAnalysisData, preferredProvider?: AIProvider): Promise<AIAnalysisResult>;
    private analyzeWithModel;
    private buildAnalysisPrompt;
    private analyzeWithOpenAI;
    private analyzeWithAnthropic;
    private analyzeWithGemini;
    private analyzeWithOllama;
    private analyzeWithHuggingFace;
    private parseAIResponse;
    private extractFromText;
    analyzeMultipleStocks(analysisDataList: StockAnalysisData[]): Promise<AIAnalysisResult[]>;
}
export declare const aiAnalysisService: AIAnalysisService;
export {};
//# sourceMappingURL=aiAnalysisService.d.ts.map