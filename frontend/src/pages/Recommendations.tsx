import React, { useState } from 'react';
import {
  Table,
  Card,
  Tag,
  Space,
  Typography,
  Button,
  Modal,
  Form,
  Select,
  Input,
  message,
  Progress,
  Tooltip,
  Alert,
} from 'antd';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { EyeOutlined, DeleteOutlined, PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { recommendationAPI } from '@/api/recommendations';
import { stockAPI } from '@/api/stocks';
import type { Recommendation, Stock, AIProvider } from '@/types';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

/**
 * @description 投资建议页面组件
 */
const Recommendations: React.FC = () => {
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取投资建议列表
  const { data: recommendationsData, isLoading } = useQuery(
    ['recommendations', pagination.current, pagination.pageSize],
    () =>
      recommendationAPI.getRecommendations({
        page: pagination.current,
        limit: pagination.pageSize,
      })
  );

  // 获取股票列表（用于分析）
  const { data: stocksData } = useQuery('stocks-for-analysis', () => stockAPI.getStocks({ page: 1, limit: 100 }));

  // 获取AI提供商列表
  const { data: aiProviders } = useQuery('ai-providers', () => recommendationAPI.getAIProviders());

  // 创建分析
  const createAnalysisMutation = useMutation((values: any) => recommendationAPI.createAnalysis(values), {
    onSuccess: () => {
      message.success('分析请求已提交，请稍后查看结果');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries('recommendations');
    },
    onError: (error: any) => {
      message.error(error.message || '分析请求失败');
    },
  });

  // 删除投资建议
  const deleteRecommendationMutation = useMutation((id: string) => recommendationAPI.deleteRecommendation(id), {
    onSuccess: () => {
      message.success('投资建议删除成功');
      queryClient.invalidateQueries('recommendations');
    },
    onError: (error: any) => {
      message.error(error.message || '删除失败');
    },
  });

  /**
   * @description 处理表格分页变化
   */
  const handleTableChange = (pagination: any) => {
    setPagination({
      current: pagination.current,
      pageSize: pagination.pageSize,
    });
  };

  /**
   * @description 显示建议详情
   */
  const showRecommendationDetail = (recommendation: Recommendation) => {
    setSelectedRecommendation(recommendation);
  };

  /**
   * @description 打开分析模态框
   */
  const showAnalysisModal = () => {
    setIsModalVisible(true);
  };

  /**
   * @description 处理分析表单提交
   */
  const handleAnalysisSubmit = async (values: any) => {
    // 根据stockId获取股票symbol
    const selectedStock = stocksData?.data.data?.find((stock: Stock) => stock.id === values.stockId);
    if (!selectedStock) {
      message.error('选择的股票不存在');
      return;
    }

    // 构造请求参数，将stockId转换为stockSymbol
    const requestData = {
      stockSymbol: selectedStock.symbol,
      aiProvider: values.aiProvider,
      customPrompt: values.customPrompt,
    };

    await createAnalysisMutation.mutateAsync(requestData);
  };

  /**
   * @description 处理删除
   */
  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条投资建议吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: () => deleteRecommendationMutation.mutate(id),
    });
  };

  /**
   * @description 渲染推荐建议标签
   */
  const renderRecommendationTag = (recommendation: string) => {
    const colorMap = {
      buy: 'green',
      sell: 'red',
      hold: 'orange',
    };
    return <Tag color={colorMap[recommendation as keyof typeof colorMap]}>{recommendation.toUpperCase()}</Tag>;
  };

  /**
   * @description 获取货币符号
   */
  const getCurrencySymbol = (exchange: string) => {
    if (exchange === 'SSE' || exchange === 'SZSE') {
      return '¥'; // 人民币
    } else if (exchange === 'NASDAQ' || exchange === 'NYSE') {
      return '$'; // 美元
    } else if (exchange === 'LSE') {
      return '£'; // 英镑
    } else if (exchange === 'TSE') {
      return '¥'; // 日元
    }
    return '$'; // 默认美元
  };

  /**
   * @description 渲染风险等级标签
   */
  const renderRiskLevelTag = (riskLevel: string) => {
    const colorMap = {
      low: 'green',
      medium: 'orange',
      high: 'red',
    };
    return <Tag color={colorMap[riskLevel as keyof typeof colorMap]}>{riskLevel.toUpperCase()}</Tag>;
  };

  // 表格列配置
  const columns = [
    {
      title: (
        <Tooltip title='股票代码和公司名称'>
          <Space>
            股票
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
          </Space>
        </Tooltip>
      ),
      dataIndex: 'stock',
      key: 'stock',
      render: (stock: Stock) => (
        <Space
          direction='vertical'
          size={0}>
          <Text strong>{stock.symbol}</Text>
          <Text
            type='secondary'
            style={{ fontSize: '12px' }}>
            {stock.name}
          </Text>
        </Space>
      ),
    },
    {
      title: (
        <Tooltip title='AI分析的投资建议：买入(BUY)、卖出(SELL)、持有(HOLD)'>
          <Space>
            建议
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
          </Space>
        </Tooltip>
      ),
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => renderRecommendationTag(action),
    },
    {
      title: (
        <Tooltip title='AI分析的置信度，越高表示建议越可靠'>
          <Space>
            置信度
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
          </Space>
        </Tooltip>
      ),
      dataIndex: 'confidence',
      key: 'confidence',
      render: (confidence: number) => (
        <Tooltip title={`置信度: ${(confidence * 100).toFixed(1)}%`}>
          <Progress
            percent={Math.round(confidence * 100)}
            size='small'
            status={confidence > 0.7 ? 'success' : confidence > 0.4 ? 'normal' : 'exception'}
          />
        </Tooltip>
      ),
    },
    {
      title: (
        <Tooltip title='AI预测的股票目标价格，基于技术分析和基本面分析'>
          <Space>
            目标价格
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
          </Space>
        </Tooltip>
      ),
      dataIndex: 'priceTarget',
      key: 'priceTarget',
      render: (price: number, record: Recommendation) => {
        const currencySymbol = getCurrencySymbol(record.stock.exchange);
        return (
          <Tooltip title={price ? `预测目标价格: ${currencySymbol}${price.toFixed(2)}` : '暂无目标价格'}>
            <Text
              strong
              style={{ color: price ? '#1890ff' : '#999' }}>
              {price ? `${currencySymbol}${price.toFixed(2)}` : '-'}
            </Text>
          </Tooltip>
        );
      },
    },
    {
      title: (
        <Tooltip title='投资风险等级：低风险(绿色)、中等风险(橙色)、高风险(红色)'>
          <Space>
            风险等级
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
          </Space>
        </Tooltip>
      ),
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      render: (riskLevel: string) => renderRiskLevelTag(riskLevel),
    },
    {
      title: (
        <Tooltip title='分析类型：每日机会(系统自动生成) 或 自定义分析(用户请求)'>
          <Space>
            类型
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
          </Space>
        </Tooltip>
      ),
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag>{type === 'DAILY_OPPORTUNITY' ? '每日机会' : '自定义分析'}</Tag>,
    },
    {
      title: (
        <Tooltip title='分析生成的时间'>
          <Space>
            日期
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
          </Space>
        </Tooltip>
      ),
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => new Date(date).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Recommendation) => (
        <Space>
          <Button
            type='text'
            icon={<EyeOutlined />}
            size='small'
            onClick={() => showRecommendationDetail(record)}
          />
          <Button
            type='text'
            icon={<DeleteOutlined />}
            size='small'
            danger
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 页面标题 */}
      <div className='page-header'>
        <Title
          level={2}
          className='page-title'>
          投资建议
        </Title>
        <Text className='page-subtitle'>AI驱动的股票投资分析和建议</Text>
      </div>

      {/* 操作栏 */}
      <Card style={{ marginBottom: 24 }}>
        <Button
          type='primary'
          icon={<PlusOutlined />}
          size='large'
          onClick={showAnalysisModal}>
          创建新分析
        </Button>
      </Card>

      {/* 表格说明 */}
      <Card style={{ marginBottom: 16 }}>
        <Alert
          message='表格字段说明'
          description={
            <div>
              <p>
                <strong>建议</strong>：AI分析的投资建议，包括买入(BUY)、卖出(SELL)、持有(HOLD)三种操作
              </p>
              <p>
                <strong>置信度</strong>
                ：AI分析的可靠程度，绿色表示高置信度(&gt;70%)，橙色表示中等置信度(40%-70%)，红色表示低置信度(&lt;40%)
              </p>
              <p>
                <strong>目标价格</strong>
                ：AI预测的股票在未来可能达到的价格水平，基于技术分析和基本面分析。A股显示人民币(¥)，美股显示美元($)
              </p>
              <p>
                <strong>风险等级</strong>：投资风险评估，绿色表示低风险，橙色表示中等风险，红色表示高风险
              </p>
              <p>
                <strong>类型</strong>：分析来源，每日机会为系统自动生成，自定义分析为用户主动请求
              </p>
              <p>
                <strong>操作</strong>：点击眼睛图标查看详细分析，点击删除图标删除建议
              </p>
            </div>
          }
          type='info'
          showIcon
        />
      </Card>

      {/* 投资建议表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={recommendationsData?.data.data || []}
          loading={isLoading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: recommendationsData?.data.pagination.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          onChange={handleTableChange}
          rowKey='id'
        />
      </Card>

      {/* 建议详情模态框 */}
      <Modal
        title='投资建议详情'
        open={!!selectedRecommendation}
        onCancel={() => setSelectedRecommendation(null)}
        footer={null}
        width={800}>
        {selectedRecommendation && (
          <div>
            <Space
              direction='vertical'
              size='large'
              style={{ width: '100%' }}>
              <div>
                <Title level={4}>
                  {selectedRecommendation.stock.symbol} - {selectedRecommendation.stock.name}
                </Title>
                <Space>
                  {renderRecommendationTag(selectedRecommendation.action)}
                  {renderRiskLevelTag(selectedRecommendation.riskLevel)}
                  <Tag>{selectedRecommendation.type === 'DAILY_OPPORTUNITY' ? '每日机会' : '自定义分析'}</Tag>
                </Space>
              </div>

              <div>
                <Title level={5}>
                  <Space>
                    置信度
                    <Tooltip title='AI分析的可靠程度，数值越高表示建议越可信'>
                      <InfoCircleOutlined style={{ color: '#1890ff' }} />
                    </Tooltip>
                  </Space>
                </Title>
                <Progress
                  percent={Math.round(selectedRecommendation.confidence * 100)}
                  status={
                    selectedRecommendation.confidence > 0.7
                      ? 'success'
                      : selectedRecommendation.confidence > 0.4
                      ? 'normal'
                      : 'exception'
                  }
                />
                <Text
                  type='secondary'
                  style={{ fontSize: '12px' }}>
                  {selectedRecommendation.confidence > 0.7
                    ? '高置信度 - 建议可信度较高'
                    : selectedRecommendation.confidence > 0.4
                    ? '中等置信度 - 建议仅供参考'
                    : '低置信度 - 建议谨慎对待'}
                </Text>
              </div>

              {selectedRecommendation.priceTarget && (
                <div>
                  <Title level={5}>
                    <Space>
                      目标价格
                      <Tooltip title='AI预测的股票在未来可能达到的价格水平，基于技术分析和基本面分析'>
                        <InfoCircleOutlined style={{ color: '#1890ff' }} />
                      </Tooltip>
                    </Space>
                  </Title>
                  <Text
                    strong
                    style={{ fontSize: '18px', color: '#1890ff' }}>
                    {getCurrencySymbol(selectedRecommendation.stock.exchange)}
                    {selectedRecommendation.priceTarget.toFixed(2)}
                  </Text>
                  <Text
                    type='secondary'
                    style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
                    注意：目标价格是预测值，实际股价可能因市场变化而偏离预测
                  </Text>
                </div>
              )}

              <div>
                <Title level={5}>
                  <Space>
                    分析内容
                    <Tooltip title='AI分析得出的投资建议和理由'>
                      <InfoCircleOutlined style={{ color: '#1890ff' }} />
                    </Tooltip>
                  </Space>
                </Title>
                <Paragraph>{selectedRecommendation.reasoning}</Paragraph>
              </div>

              <div>
                <Title level={5}>
                  <Space>
                    推理过程
                    <Tooltip title='AI分析的具体推理逻辑和依据'>
                      <InfoCircleOutlined style={{ color: '#1890ff' }} />
                    </Tooltip>
                  </Space>
                </Title>
                <Paragraph>{selectedRecommendation.reasoning}</Paragraph>
              </div>

              <div>
                <Text type='secondary'>生成时间: {new Date(selectedRecommendation.date).toLocaleString('zh-CN')}</Text>
              </div>
            </Space>
          </div>
        )}
      </Modal>

      {/* 创建分析模态框 */}
      <Modal
        title='创建新分析'
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={600}>
        <Form
          form={form}
          layout='vertical'
          onFinish={handleAnalysisSubmit}
          initialValues={{
            aiProvider: aiProviders?.data?.[0]?.provider || 'gemini',
          }}>
          <Form.Item
            name='stockId'
            label='选择股票'
            rules={[{ required: true, message: '请选择股票' }]}>
            <Select
              placeholder='选择要分析的股票'
              showSearch>
              {stocksData?.data.data?.map((stock: Stock) => (
                <Option
                  key={stock.id}
                  value={stock.id}>
                  {stock.symbol} - {stock.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name='aiProvider'
            label='AI提供商'
            rules={[{ required: true, message: '请选择AI提供商' }]}>
            <Select placeholder='选择AI提供商'>
              {aiProviders?.data?.map((provider: AIProvider) => (
                <Option
                  key={provider.provider}
                  value={provider.provider}>
                  {provider.name} ({provider.model})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name='customPrompt'
            label='自定义提示词'>
            <TextArea
              placeholder='可选：自定义分析提示词'
              rows={4}
              maxLength={1000}
              showCount
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type='primary'
                htmlType='submit'
                loading={createAnalysisMutation.isLoading}>
                开始分析
              </Button>
              <Button onClick={() => setIsModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Recommendations;
