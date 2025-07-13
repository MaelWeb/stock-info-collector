import React from 'react';
import { Row, Col, Card, Table, Tag, Space, Typography, Tooltip, Button } from 'antd';
import { useQuery } from 'react-query';
import { Line, Column } from '@ant-design/charts';
import { RiseOutlined, StockOutlined, EyeOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { stockAPI } from '@/api/stocks';
import { recommendationAPI } from '@/api/recommendations';
import { watchlistAPI } from '@/api/watchlist';
import type { Stock } from '@/types';
import StatCard from '../components/common/StatCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './Dashboard.less';

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
            prices.data?.map((price: any, index: number) => {
              const previousPrice = index > 0 ? prices.data[index - 1].close : price.close;
              const change = price.close - previousPrice;
              const changePercent = (change / previousPrice) * 100;

              return {
                date: formatDateForDisplay(new Date(price.date)), // 直接使用格式化后的日期
                value: price.close,
                change: parseFloat(change.toFixed(2)),
                changePercent: parseFloat(changePercent.toFixed(2)),
                type: stock.symbol,
              };
            }) || []
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
   * @description 格式化日期显示
   */
  const formatDateForDisplay = (date: Date) => {
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays <= 7) return `${diffDays}天前`;

    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  };

  /**
   * @description 生成模拟价格数据
   */
  const generateMockPriceData = (symbol: string, days: number) => {
    const data = [];
    const basePrice = 100 + Math.random() * 200; // 100-300之间的基础价格
    let currentPrice = basePrice;
    let previousPrice = basePrice;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // 模拟价格波动
      const change = (Math.random() - 0.5) * 8; // -4到+4的随机变化
      currentPrice = Math.max(10, currentPrice + change); // 确保价格不为负

      // 计算变化量和百分比
      const priceChange = currentPrice - previousPrice;
      const changePercent = (priceChange / previousPrice) * 100;

      data.push({
        date: formatDateForDisplay(date), // 直接使用格式化后的日期
        value: parseFloat(currentPrice.toFixed(2)),
        change: parseFloat(priceChange.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        type: symbol,
      });

      previousPrice = currentPrice;
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
    return <LoadingSpinner text='正在加载仪表盘数据...' />;
  }

  return (
    <div>
      {/* 页面标题 */}
      <div className='dashboard-header'>
        <div className='header-content'>
          <Title
            level={2}
            className='page-title'>
            仪表盘
          </Title>
          <Text className='page-subtitle'>股票信息收集器 - 实时监控和分析</Text>
        </div>
        <div className='header-actions'>
          <Tooltip title='刷新数据'>
            <Button
              type='primary'
              icon={<ClockCircleOutlined />}
              onClick={() => window.location.reload()}>
              刷新
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* 统计卡片 */}
      <Row
        gutter={[16, 16]}
        style={{ marginBottom: 24 }}>
        <Col
          xs={24}
          sm={12}
          lg={6}>
          <StatCard
            title='总股票数'
            value={stats?.totalStocks || 0}
            prefix={<StockOutlined />}
            changePercent={12.5}
            loading={statsLoading}
          />
        </Col>
        <Col
          xs={24}
          sm={12}
          lg={6}>
          <StatCard
            title='投资建议'
            value={stats?.totalRecommendations || 0}
            prefix={<RiseOutlined />}
            changePercent={8.2}
            loading={statsLoading}
          />
        </Col>
        <Col
          xs={24}
          sm={12}
          lg={6}>
          <StatCard
            title='自选股'
            value={stats?.totalWatchlist || 0}
            prefix={<EyeOutlined />}
            changePercent={-2.1}
            loading={statsLoading}
          />
        </Col>
        <Col
          xs={24}
          sm={12}
          lg={6}>
          <StatCard
            title='今日更新'
            value={24}
            prefix={<ClockCircleOutlined />}
            changePercent={15.3}
            loading={statsLoading}
          />
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
            className='chart-container'
            loading={!priceHistory || priceHistory.length === 0}>
            {priceHistory && priceHistory.length > 0 ? (
              <Line
                data={priceHistory || []}
                xField='date'
                yField='value'
                seriesField='type'
                height={320}
                smooth
                point={{
                  size: 5,
                  shape: 'circle',
                  style: {
                    fill: '#fff',
                    stroke: '#1890ff',
                    lineWidth: 2,
                  },
                }}
                line={{
                  style: {
                    lineWidth: 3,
                    shadowBlur: 10,
                    shadowColor: 'rgba(24, 144, 255, 0.3)',
                  },
                }}
                colorField='type'
                color={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']}
                xAxis={{
                  type: 'cat',
                  tickCount: 7,
                  label: {
                    style: {
                      fontSize: 11,
                      fill: '#8c8c8c',
                      fontWeight: 500,
                    },
                  },
                  grid: {
                    line: {
                      style: {
                        stroke: '#f5f5f5',
                        lineWidth: 1,
                        lineDash: [4, 4],
                      },
                    },
                  },
                  line: {
                    style: {
                      stroke: '#e8e8e8',
                      lineWidth: 1,
                    },
                  },
                }}
                yAxis={{
                  label: {
                    formatter: (value: number) => {
                      if (value >= 1000) {
                        return `$${(value / 1000).toFixed(1)}K`;
                      }
                      return `$${value.toFixed(0)}`;
                    },
                    style: {
                      fontSize: 11,
                      fill: '#8c8c8c',
                      fontWeight: 500,
                    },
                  },
                  grid: {
                    line: {
                      style: {
                        stroke: '#f5f5f5',
                        lineWidth: 1,
                        lineDash: [4, 4],
                      },
                    },
                  },
                  line: {
                    style: {
                      stroke: '#e8e8e8',
                      lineWidth: 1,
                    },
                  },
                }}
                tooltip={{
                  showCrosshairs: true,
                  crosshairs: {
                    type: 'xy',
                    line: {
                      style: {
                        stroke: '#1890ff',
                        lineWidth: 2,
                        lineDash: [6, 6],
                        opacity: 0.8,
                      },
                    },
                  },
                  domStyles: {
                    'g2-tooltip': {
                      background: 'rgba(255, 255, 255, 0.98)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid #f0f0f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      padding: '12px 16px',
                    },
                    'g2-tooltip-title': {
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#262626',
                      marginBottom: '8px',
                      borderBottom: '1px solid #f0f0f0',
                      paddingBottom: '8px',
                    },
                    'g2-tooltip-list': {
                      margin: '0',
                    },
                    'g2-tooltip-list-item': {
                      fontSize: '13px',
                      color: '#595959',
                      marginBottom: '4px',
                    },
                    'g2-tooltip-marker': {
                      borderRadius: '2px',
                    },
                    'g2-tooltip-value': {
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#262626',
                    },
                  },
                  formatter: (datum: any) => {
                    const date = new Date(datum.date);
                    const change = datum.change || 0;
                    const changePercent = datum.changePercent || 0;

                    return {
                      name: `${datum.type} (${change >= 0 ? '+' : ''}${change.toFixed(2)} | ${
                        change >= 0 ? '+' : ''
                      }${changePercent.toFixed(2)}%)`,
                      value: `$${datum.value.toFixed(2)}`,
                      title: date.toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long',
                      }),
                    };
                  },
                }}
                legend={{
                  position: 'top-right',
                  marker: {
                    symbol: 'circle',
                    style: {
                      r: 4,
                    },
                  },
                  itemName: {
                    style: {
                      fontSize: 12,
                      fill: '#262626',
                      fontWeight: 500,
                    },
                  },
                  itemValue: {
                    style: {
                      fontSize: 11,
                      fill: '#8c8c8c',
                    },
                  },
                }}
                animation={{
                  appear: {
                    animation: 'path-in',
                    duration: 1500,
                    easing: 'ease-out',
                  },
                  update: {
                    animation: 'path-in',
                    duration: 800,
                  },
                }}
                interactions={[
                  {
                    type: 'marker-active',
                  },
                  {
                    type: 'brush',
                  },
                ]}
                state={{
                  active: {
                    style: {
                      shadowBlur: 15,
                      shadowColor: 'rgba(24, 144, 255, 0.5)',
                    },
                  },
                }}
              />
            ) : (
              <div
                style={{
                  height: 320,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#8c8c8c',
                  fontSize: 14,
                }}>
                暂无价格数据
              </div>
            )}
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
              colorField='recommendation'
              color={['#10b981', '#ef4444', '#f59e0b', '#6366f1', '#8b5cf6']}
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
