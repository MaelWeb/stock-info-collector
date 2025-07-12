export declare class SchedulerService {
    private dailyAnalysisJob;
    private isRunning;
    constructor();
    private initializeJobs;
    private setupDailyAnalysisJob;
    start(): void;
    stop(): void;
    performDailyAnalysis(): Promise<void>;
    private getStocksToAnalyze;
    private collectStockData;
    private calculateTechnicalIndicators;
    private calculateRSI;
    private getRSISignal;
    private calculateMA;
    private calculateMACD;
    private calculateEMA;
    private saveAnalysisResults;
    triggerManualAnalysis(symbols?: string[]): Promise<void>;
    getStatus(): {
        isRunning: boolean;
        nextRun?: string;
    };
}
export declare const schedulerService: SchedulerService;
//# sourceMappingURL=schedulerService.d.ts.map