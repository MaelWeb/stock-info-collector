const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * @description 种子数据
 */
const seedData = {
  stocks: [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      exchange: 'NASDAQ',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      marketCap: 3000000000000,
      peRatio: 25.5,
      dividendYield: 0.5,
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      exchange: 'NASDAQ',
      sector: 'Technology',
      industry: 'Software',
      marketCap: 2800000000000,
      peRatio: 30.2,
      dividendYield: 0.8,
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      exchange: 'NASDAQ',
      sector: 'Technology',
      industry: 'Internet Content & Information',
      marketCap: 1800000000000,
      peRatio: 28.1,
      dividendYield: 0.0,
    },
    {
      symbol: 'AMZN',
      name: 'Amazon.com Inc.',
      exchange: 'NASDAQ',
      sector: 'Consumer Cyclical',
      industry: 'Internet Retail',
      marketCap: 1600000000000,
      peRatio: 45.3,
      dividendYield: 0.0,
    },
    {
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      exchange: 'NASDAQ',
      sector: 'Consumer Cyclical',
      industry: 'Auto Manufacturers',
      marketCap: 800000000000,
      peRatio: 60.2,
      dividendYield: 0.0,
    },
    {
      symbol: 'META',
      name: 'Meta Platforms Inc.',
      exchange: 'NASDAQ',
      sector: 'Technology',
      industry: 'Internet Content & Information',
      marketCap: 900000000000,
      peRatio: 22.8,
      dividendYield: 0.0,
    },
    {
      symbol: 'NVDA',
      name: 'NVIDIA Corporation',
      exchange: 'NASDAQ',
      sector: 'Technology',
      industry: 'Semiconductors',
      marketCap: 1200000000000,
      peRatio: 35.6,
      dividendYield: 0.1,
    },
    {
      symbol: 'NFLX',
      name: 'Netflix Inc.',
      exchange: 'NASDAQ',
      sector: 'Communication Services',
      industry: 'Entertainment',
      marketCap: 250000000000,
      peRatio: 40.2,
      dividendYield: 0.0,
    },
    // A股测试数据
    {
      symbol: '002261',
      name: '拓维信息',
      exchange: 'SZSE',
      sector: 'Technology',
      industry: 'Software',
      marketCap: 50000000000,
      peRatio: 25.5,
      dividendYield: 1.2,
    },
    {
      symbol: '000001',
      name: '平安银行',
      exchange: 'SZSE',
      sector: 'Financial Services',
      industry: 'Banks',
      marketCap: 200000000000,
      peRatio: 8.5,
      dividendYield: 3.5,
    },
    {
      symbol: '600036',
      name: '招商银行',
      exchange: 'SSE',
      sector: 'Financial Services',
      industry: 'Banks',
      marketCap: 180000000000,
      peRatio: 7.8,
      dividendYield: 4.2,
    },
  ],
  recommendations: [
    {
      stockSymbol: 'AAPL',
      type: 'DAILY_OPPORTUNITY',
      confidence: 0.85,
      action: 'BUY',
      priceTarget: 185.0,
      reasoning: 'Strong fundamentals and innovative product pipeline',
      riskLevel: 'LOW',
      timeHorizon: 'MEDIUM_TERM',
    },
    {
      stockSymbol: 'MSFT',
      type: 'DAILY_OPPORTUNITY',
      confidence: 0.78,
      action: 'HOLD',
      priceTarget: 320.0,
      reasoning: 'Stable growth but current valuation is fair',
      riskLevel: 'LOW',
      timeHorizon: 'LONG_TERM',
    },
    {
      stockSymbol: 'GOOGL',
      type: 'CUSTOM_ANALYSIS',
      confidence: 0.72,
      action: 'BUY',
      priceTarget: 145.0,
      reasoning: 'AI leadership and strong advertising revenue',
      riskLevel: 'MEDIUM',
      timeHorizon: 'MEDIUM_TERM',
    },
    // A股投资建议
    {
      stockSymbol: '002261',
      type: 'CUSTOM_ANALYSIS',
      confidence: 0.68,
      action: 'BUY',
      priceTarget: 35.5,
      reasoning: '软件行业景气度提升，公司技术实力较强',
      riskLevel: 'MEDIUM',
      timeHorizon: 'MEDIUM_TERM',
    },
    {
      stockSymbol: '000001',
      type: 'DAILY_OPPORTUNITY',
      confidence: 0.75,
      action: 'HOLD',
      priceTarget: 12.8,
      reasoning: '银行业绩稳定，但估值已相对合理',
      riskLevel: 'LOW',
      timeHorizon: 'LONG_TERM',
    },
  ],
  watchlistItems: [
    {
      stockSymbol: 'AAPL',
      notes: 'Core holding - strong ecosystem',
    },
    {
      stockSymbol: 'MSFT',
      notes: 'Cloud leader with stable growth',
    },
    {
      stockSymbol: 'NVDA',
      notes: 'AI chip leader - high growth potential',
    },
  ],
};

/**
 * @description 主种子函数
 */
async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // 清空现有数据
    console.log('🗑️  Clearing existing data...');
    await prisma.recommendation.deleteMany();
    await prisma.watchlistItem.deleteMany();
    await prisma.stock.deleteMany();
    await prisma.user.deleteMany();

    // 创建默认用户
    console.log('👤 Creating default user...');
    const defaultUser = await prisma.user.create({
      data: {
        email: 'default@example.com',
        name: 'Default User',
      },
    });
    console.log(`✅ Created default user: ${defaultUser.email}`);

    // 创建股票
    console.log('📈 Creating stocks...');
    const createdStocks = [];
    for (const stockData of seedData.stocks) {
      const stock = await prisma.stock.create({
        data: stockData,
      });
      createdStocks.push(stock);
      console.log(`✅ Created stock: ${stock.symbol}`);
    }

    // 创建推荐
    console.log('💡 Creating recommendations...');
    for (const recData of seedData.recommendations) {
      const stock = createdStocks.find((s) => s.symbol === recData.stockSymbol);
      if (stock) {
        await prisma.recommendation.create({
          data: {
            stockId: stock.id,
            userId: defaultUser.id,
            type: recData.type,
            confidence: recData.confidence,
            action: recData.action,
            priceTarget: recData.priceTarget,
            reasoning: recData.reasoning,
            riskLevel: recData.riskLevel,
            timeHorizon: recData.timeHorizon,
          },
        });
        console.log(`✅ Created recommendation for ${recData.stockSymbol}`);
      }
    }

    // 创建关注列表项
    console.log('⭐ Creating watchlist items...');
    for (const watchData of seedData.watchlistItems) {
      const stock = createdStocks.find((s) => s.symbol === watchData.stockSymbol);
      if (stock) {
        await prisma.watchlistItem.create({
          data: {
            userId: defaultUser.id,
            stockId: stock.id,
            notes: watchData.notes,
          },
        });
        console.log(`✅ Created watchlist item for ${watchData.stockSymbol}`);
      }
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log(
      `📊 Created ${createdStocks.length} stocks, ${seedData.recommendations.length} recommendations, and ${seedData.watchlistItems.length} watchlist items.`
    );
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行种子函数
main()
  .then(() => {
    console.log('✅ Seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
