import React from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Space, Typography, Spin } from 'antd';
import { useQuery } from 'react-query';
import { Line, Column } from '@ant-design/charts';
import { RiseOutlined, FallOutlined, DollarOutlined, StockOutlined } from '@ant-design/icons';
import { stockAPI } from '@/api/stocks';
import { recommendationAPI } from '@/api/recommendations';
import { watchlistAPI } from '@/api/watchlist';
import type { Stock } from '@/types';

const { Title, Text } = Typography;

/**
 * @description 仪表盘页面组件
 */
const Dashboard: React.FC = () => {
  // 获取统计数据
  const { data: stats, isLoading: statsLoading } = useQuery('dashboard-stats', async () => {
    const [stocksRes, recommendationsRes, watchlistRes] = await Promise.all([
      stockAPI.getStocks({ page: 1, limit: 1 }),
      recommendationAPI.getRecommendations({ page: 1, limit: 1 }),
      watchlistAPI.getWatchlist({ page: 1, limit: 1 }),
    ]);

    return {
      totalStocks: stocksRes.data?.pagination?.total || 0,
      totalRecommendations: recommendationsRes.data?.pagination?.total || 0,
      totalWatchlist: watchlistRes.data?.pagination?.total || 0,
    };
  });

  // 获取最新投资建议
  const { data: latestRecommendations, isLoading: recommendationsLoading } = useQuery('latest-recommendations', () =>
    recommendationAPI.getRecommendations({ page: 1, limit: 5 })
  );

  // 获取自选股
  const { data: watchlist, isLoading: watchlistLoading } = useQuery('watchlist', () =>
    watchlistAPI.getWatchlist({ page: 1, limit: 10 })
  );

  // 获取投资建议分布数据
  const { data: recommendationStats } = useQuery('recommendation-stats', () =>
    recommendationAPI.getRecommendations({ page: 1, limit: 100 })
  );

  // 获取热门股票价格数据用于趋势图
  const { data: popularStocks } = useQuery('popular-stocks', () => stockAPI.getStocks({ page: 1, limit: 5 }));

  // 获取股票价格历史数据
  const { data: priceHistory } = useQuery(
    ['price-history', popularStocks?.data?.data],
    async () => {
      if (!popularStocks?.data?.data?.length) return [];

      const pricePromises = popularStocks.data.data.slice(0, 3).map(async (stock: Stock) => {
        // 确保stock和symbol存在
        if (!stock || !stock.symbol) {
          console.warn('Stock or symbol is missing:', stock);
          return [];
        }

        try {
          const prices = await stockAPI.getStockPrices(stock.symbol, { days: 30 });
          return (
            prices.data?.map((price: any) => ({
              date: price.date,
              value: price.close,
              type: stock.symbol,
            })) || []
          );
        } catch (error) {
          console.error(`Failed to get prices for ${stock.symbol}:`, error);
          // 如果API调用失败，生成模拟数据
          return generateMockPriceData(stock.symbol, 30);
        }
      });

      const results = await Promise.all(pricePromises);
      return results.flat();
    },
    { enabled: !!popularStocks?.data?.data?.length }
  );

  /**
   * @description 生成模拟价格数据
   */
  const generateMockPriceData = (symbol: string, days: number) => {
    const data = [];
    const basePrice = 100 + Math.random() * 200; // 100-300之间的基础价格
    let currentPrice = basePrice;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // 模拟价格波动
      const change = (Math.random() - 0.5) * 10; // -5到+5的随机变化
      currentPrice = Math.max(10, currentPrice + change); // 确保价格不为负

      data.push({
        date: date.toISOString().split('T')[0],
        value: parseFloat(currentPrice.toFixed(2)),
        type: symbol,
      });
    }

    return data;
  };

  /**
   * @description 处理投资建议分布数据
   */
  const getRecommendationDistribution = () => {
    if (!recommendationStats?.data?.data) return [];

    const distribution = recommendationStats.data.data.reduce((acc: any, rec: any) => {
      const action = rec.action?.toLowerCase() || 'unknown';
      acc[action] = (acc[action] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(distribution).map(([action, count]) => ({
      recommendation: action.toUpperCase(),
      count,
    }));
  };

  /**
   * @description 渲染推荐建议标签
   */
  const renderRecommendationTag = (recommendation: string) => {
    if (!recommendation) {
      return <Tag color='default'>-</Tag>;
    }

    const colorMap = {
      buy: 'green',
      sell: 'red',
      hold: 'orange',
    };
    const color = colorMap[recommendation.toLowerCase() as keyof typeof colorMap] || 'default';
    return <Tag color={color}>{recommendation.toUpperCase()}</Tag>;
  };

  /**
   * @description 最新投资建议表格列配置
   */
  const recommendationColumns = [
    {
      title: '股票',
      dataIndex: 'stock',
      key: 'stock',
      render: (stock: Stock) => (
        <Space
          direction='vertical'
          size={0}>
          <Text strong>{stock?.symbol || '-'}</Text>
          <Text
            type='secondary'
            style={{ fontSize: '12px' }}>
            {stock?.name || '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: '建议',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => renderRecommendationTag(action),
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      render: (confidence: number) => (confidence ? `${(confidence * 100).toFixed(1)}%` : '-'),
    },
    {
      title: 'AI提供商',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag>{type?.toUpperCase() || '-'}</Tag>,
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => (date ? new Date(date).toLocaleDateString('zh-CN') : '-'),
    },
  ];

  /**
   * @description 自选股表格列配置
   */
  const watchlistColumns = [
    {
      title: '股票',
      dataIndex: 'stock',
      key: 'stock',
      render: (stock: Stock) => (
        <Space
          direction='vertical'
          size={0}>
          <Text strong>{stock?.symbol || '-'}</Text>
          <Text
            type='secondary'
            style={{ fontSize: '12px' }}>
            {stock?.name || '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: '目标价格',
      dataIndex: 'targetPrice',
      key: 'targetPrice',
      render: (price: number) => (price ? `$${price.toFixed(2)}` : '-'),
    },
    {
      title: '止损价格',
      dataIndex: 'stopLoss',
      key: 'stopLoss',
      render: (price: number) => (price ? `$${price.toFixed(2)}` : '-'),
    },
    {
      title: '添加时间',
      dataIndex: 'addedAt',
      key: 'addedAt',
      render: (date: string) => (date ? new Date(date).toLocaleDateString('zh-CN') : '-'),
    },
  ];

  if (statsLoading || recommendationsLoading || watchlistLoading) {
    return (
      <div className='loading-container'>
        <Spin size='large' />
      </div>
    );
  }

  return (
    <div>
      {/* 页面标题 */}
      <div className='page-header'>
        <Title
          level={2}
          className='page-title'>
          仪表盘
        </Title>
        <Text className='page-subtitle'>股票信息收集器 - 实时监控和分析</Text>
      </div>

      {/* 统计卡片 */}
      <Row
        gutter={[24, 24]}
        style={{ marginBottom: 24 }}>
        <Col
          xs={24}
          sm={12}
          lg={6}>
          <Card className='stat-card'>
            <Statistic
              title='总股票数'
              value={stats?.totalStocks || 0}
              prefix={<StockOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col
          xs={24}
          sm={12}
          lg={6}>
          <Card className='stat-card'>
            <Statistic
              title='投资建议'
              value={stats?.totalRecommendations || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col
          xs={24}
          sm={12}
          lg={6}>
          <Card className='stat-card'>
            <Statistic
              title='自选股'
              value={stats?.totalWatchlist || 0}
              prefix={<FallOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col
          xs={24}
          sm={12}
          lg={6}>
          <Card className='stat-card'>
            <Statistic
              title='今日更新'
              value={0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row
        gutter={[24, 24]}
        style={{ marginBottom: 24 }}>
        <Col
          xs={24}
          lg={12}>
          <Card
            title='股票价格趋势'
            className='chart-container'>
            <Line
              data={priceHistory || []}
              xField='date'
              yField='value'
              seriesField='type'
              height={300}
              smooth
              point={{
                size: 4,
                shape: 'circle',
              }}
              color={['#1890ff', '#52c41a', '#faad14']}
            />
          </Card>
        </Col>
        <Col
          xs={24}
          lg={12}>
          <Card
            title='投资建议分布'
            className='chart-container'>
            <Column
              data={getRecommendationDistribution()}
              xField='recommendation'
              yField='count'
              height={300}
              color='#1890ff'
            />
          </Card>
        </Col>
      </Row>

      {/* 表格区域 */}
      <Row gutter={[24, 24]}>
        <Col
          xs={24}
          lg={12}>
          <Card
            title='最新投资建议'
            className='chart-container'>
            <Table
              columns={recommendationColumns}
              dataSource={latestRecommendations?.data?.data || []}
              pagination={false}
              size='small'
              rowKey='id'
            />
          </Card>
        </Col>
        <Col
          xs={24}
          lg={12}>
          <Card
            title='我的自选股'
            className='chart-container'>
            <Table
              columns={watchlistColumns}
              dataSource={watchlist?.data?.data || []}
              pagination={false}
              size='small'
              rowKey='id'
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
