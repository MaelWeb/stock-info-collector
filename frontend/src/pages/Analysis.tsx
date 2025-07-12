import React, { useState } from 'react';
import { Card, Row, Col, Select, Typography, Spin, Empty, Statistic, Space } from 'antd';
import { useQuery } from 'react-query';
import { Line } from '@ant-design/charts';
import { stockAPI } from '@/api/stocks';
import type { Stock, StockPrice, TechnicalIndicator } from '@/types';

const { Title, Text } = Typography;
const { Option } = Select;

/**
 * @description 技术分析页面组件
 */
const Analysis: React.FC = () => {
  const [selectedStockId, setSelectedStockId] = useState<string>('');

  // 获取股票列表
  const { data: stocksData } = useQuery('stocks-for-analysis', () => stockAPI.getStocks({ page: 1, limit: 100 }));

  // 获取股票价格数据
  const { data: priceData, isLoading: priceLoading } = useQuery(
    ['stock-prices', selectedStockId],
    () => {
      const stock = stocksData?.data?.data?.find((s: Stock) => s.id === selectedStockId);
      if (!stock || !stock.symbol) {
        console.warn('Stock or symbol is missing:', stock);
        return null;
      }
      return stockAPI.getStockPrices(stock.symbol, { days: 100 });
    },
    { enabled: !!selectedStockId && !!stocksData?.data?.data }
  );

  // 获取技术指标数据
  const { data: indicatorData, isLoading: indicatorLoading } = useQuery(
    ['technical-indicators', selectedStockId],
    () => {
      const stock = stocksData?.data?.data?.find((s: Stock) => s.id === selectedStockId);
      if (!stock || !stock.symbol) {
        console.warn('Stock or symbol is missing:', stock);
        return null;
      }
      return stockAPI.getTechnicalIndicators(stock.symbol, { limit: 100 });
    },
    { enabled: !!selectedStockId && !!stocksData?.data?.data }
  );

  /**
   * @description 处理股票选择
   */
  const handleStockChange = (stockId: string) => {
    setSelectedStockId(stockId);
  };

  /**
   * @description 渲染价格图表数据
   */
  const getPriceChartData = () => {
    if (!priceData?.data) return [];

    return priceData.data.map((price: StockPrice) => ({
      date: price.date,
      value: price.close,
      type: '收盘价',
    }));
  };

  /**
   * @description 渲染技术指标图表数据
   */
  const getIndicatorChartData = () => {
    if (!indicatorData?.data) return [];

    const data: any[] = [];
    indicatorData.data.forEach((indicator: TechnicalIndicator) => {
      if (indicator.rsi !== undefined) {
        data.push({ date: indicator.date, value: indicator.rsi, type: 'RSI' });
      }
      if (indicator.macd !== undefined) {
        data.push({ date: indicator.date, value: indicator.macd, type: 'MACD' });
      }
      if (indicator.sma20 !== undefined) {
        data.push({ date: indicator.date, value: indicator.sma20, type: 'SMA20' });
      }
      if (indicator.sma50 !== undefined) {
        data.push({ date: indicator.date, value: indicator.sma50, type: 'SMA50' });
      }
    });

    return data;
  };

  /**
   * @description 获取最新技术指标
   */
  const getLatestIndicators = () => {
    if (!indicatorData?.data || indicatorData.data.length === 0) return null;
    return indicatorData.data[0];
  };

  /**
   * @description 获取最新价格
   */
  const getLatestPrice = () => {
    if (!priceData?.data || priceData.data.length === 0) return null;
    return priceData.data[0];
  };

  const latestIndicators = getLatestIndicators();
  const latestPrice = getLatestPrice();

  return (
    <div>
      {/* 页面标题 */}
      <div className='page-header'>
        <Title
          level={2}
          className='page-title'>
          技术分析
        </Title>
        <Text className='page-subtitle'>股票技术指标和价格分析</Text>
      </div>

      {/* 股票选择 */}
      <Card style={{ marginBottom: 24 }}>
        <Space
          direction='vertical'
          size='middle'
          style={{ width: '100%' }}>
          <Text strong>选择股票进行分析：</Text>
          <Select
            placeholder='选择股票'
            style={{ width: 400 }}
            showSearch
            onChange={handleStockChange}
            value={selectedStockId}>
            {stocksData?.data.data?.map((stock: Stock) => (
              <Option
                key={stock.id}
                value={stock.id}>
                {stock.symbol} - {stock.name}
              </Option>
            ))}
          </Select>
        </Space>
      </Card>

      {!selectedStockId ? (
        <Empty description='请选择一只股票开始分析' />
      ) : (
        <>
          {/* 统计信息 */}
          <Row
            gutter={[24, 24]}
            style={{ marginBottom: 24 }}>
            <Col
              xs={24}
              sm={12}
              lg={6}>
              <Card>
                <Statistic
                  title='最新价格'
                  value={latestPrice?.close || 0}
                  precision={2}
                  prefix='$'
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col
              xs={24}
              sm={12}
              lg={6}>
              <Card>
                <Statistic
                  title='RSI'
                  value={latestIndicators?.rsi || 0}
                  precision={2}
                  valueStyle={{
                    color:
                      latestIndicators?.rsi && latestIndicators.rsi > 70
                        ? '#f5222d'
                        : latestIndicators?.rsi && latestIndicators.rsi < 30
                        ? '#52c41a'
                        : '#1890ff',
                  }}
                />
              </Card>
            </Col>
            <Col
              xs={24}
              sm={12}
              lg={6}>
              <Card>
                <Statistic
                  title='MACD'
                  value={latestIndicators?.macd || 0}
                  precision={4}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col
              xs={24}
              sm={12}
              lg={6}>
              <Card>
                <Statistic
                  title='成交量'
                  value={latestPrice?.volume || 0}
                  formatter={(value) => `${(Number(value) / 1000000).toFixed(2)}M`}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
          </Row>

          {/* 图表区域 */}
          <Row gutter={[24, 24]}>
            <Col
              xs={24}
              lg={12}>
              <Card
                title='价格走势'
                className='chart-container'>
                {priceLoading ? (
                  <div className='loading-container'>
                    <Spin size='large' />
                  </div>
                ) : (
                  <Line
                    data={getPriceChartData()}
                    xField='date'
                    yField='value'
                    seriesField='type'
                    height={300}
                    smooth
                    point={{
                      size: 3,
                      shape: 'circle',
                    }}
                  />
                )}
              </Card>
            </Col>
            <Col
              xs={24}
              lg={12}>
              <Card
                title='技术指标'
                className='chart-container'>
                {indicatorLoading ? (
                  <div className='loading-container'>
                    <Spin size='large' />
                  </div>
                ) : (
                  <Line
                    data={getIndicatorChartData()}
                    xField='date'
                    yField='value'
                    seriesField='type'
                    height={300}
                    smooth
                    point={{
                      size: 3,
                      shape: 'circle',
                    }}
                  />
                )}
              </Card>
            </Col>
          </Row>

          {/* 详细指标 */}
          <Row
            gutter={[24, 24]}
            style={{ marginTop: 24 }}>
            <Col
              xs={24}
              lg={12}>
              <Card
                title='移动平均线'
                className='chart-container'>
                {indicatorLoading ? (
                  <div className='loading-container'>
                    <Spin size='large' />
                  </div>
                ) : (
                  <div>
                    <Space
                      direction='vertical'
                      size='middle'
                      style={{ width: '100%' }}>
                      <div>
                        <Text strong>SMA 20: </Text>
                        <Text>{latestIndicators?.sma20?.toFixed(2) || 'N/A'}</Text>
                      </div>
                      <div>
                        <Text strong>SMA 50: </Text>
                        <Text>{latestIndicators?.sma50?.toFixed(2) || 'N/A'}</Text>
                      </div>
                      <div>
                        <Text strong>SMA 200: </Text>
                        <Text>{latestIndicators?.sma200?.toFixed(2) || 'N/A'}</Text>
                      </div>
                    </Space>
                  </div>
                )}
              </Card>
            </Col>
            <Col
              xs={24}
              lg={12}>
              <Card
                title='布林带'
                className='chart-container'>
                {indicatorLoading ? (
                  <div className='loading-container'>
                    <Spin size='large' />
                  </div>
                ) : (
                  <div>
                    <Space
                      direction='vertical'
                      size='middle'
                      style={{ width: '100%' }}>
                      <div>
                        <Text strong>上轨: </Text>
                        <Text>{latestIndicators?.bollingerUpper?.toFixed(2) || 'N/A'}</Text>
                      </div>
                      <div>
                        <Text strong>中轨: </Text>
                        <Text>{latestIndicators?.bollingerMiddle?.toFixed(2) || 'N/A'}</Text>
                      </div>
                      <div>
                        <Text strong>下轨: </Text>
                        <Text>{latestIndicators?.bollingerLower?.toFixed(2) || 'N/A'}</Text>
                      </div>
                    </Space>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default Analysis;
