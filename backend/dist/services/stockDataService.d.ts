import type { Stock, StockPrice } from '@prisma/client';
export declare class StockDataService {
    private alphaVantageClient;
    private yahooFinanceClient;
    constructor();
    getStockInfo(symbol: string): Promise<Stock | null>;
    private fetchStockInfoFromAPI;
    getStockPrices(symbol: string, days?: number): Promise<StockPrice[]>;
    private fetchStockPricesFromAPI;
    getCurrentPrice(symbol: string): Promise<number | null>;
    getMultipleStocks(symbols: string[]): Promise<Stock[]>;
    searchStocks(query: string): Promise<Stock[]>;
}
export declare const stockDataService: StockDataService;
//# sourceMappingURL=stockDataService.d.ts.map