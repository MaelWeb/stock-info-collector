import React, { useState } from 'react';
import { Table, Card, Input, Button, Space, Tag, Typography, Modal, Form, Select, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { PlusOutlined, SearchOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { stockAPI } from '@/api/stocks';
import type { Stock } from '@/types';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

/**
 * @description 股票列表页面组件
 */
const StockList: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取股票列表
  const { data: stocksData, isLoading } = useQuery(
    ['stocks', pagination.current, pagination.pageSize, searchText],
    () =>
      stockAPI.getStocks({
        page: pagination.current,
        limit: pagination.pageSize,
        symbol: searchText || undefined,
      })
  );

  // 添加股票
  const addStockMutation = useMutation(
    (values: { symbol: string; name: string; exchange: string }) => stockAPI.addStock(values),
    {
      onSuccess: () => {
        message.success('股票添加成功');
        setIsModalVisible(false);
        form.resetFields();
        queryClient.invalidateQueries('stocks');
      },
      onError: (error: any) => {
        message.error(error.message || '添加失败');
      },
    }
  );

  // 更新股票
  const updateStockMutation = useMutation(
    ({ id, data }: { id: string; data: Partial<Stock> }) => stockAPI.updateStock(id, data),
    {
      onSuccess: () => {
        message.success('股票更新成功');
        setIsModalVisible(false);
        setEditingStock(null);
        form.resetFields();
        queryClient.invalidateQueries('stocks');
      },
      onError: (error: any) => {
        message.error(error.message || '更新失败');
      },
    }
  );

  // 删除股票
  const deleteStockMutation = useMutation((id: string) => stockAPI.deleteStock(id), {
    onSuccess: () => {
      message.success('股票删除成功');
      queryClient.invalidateQueries('stocks');
    },
    onError: (error: any) => {
      message.error(error.message || '删除失败');
    },
  });

  /**
   * @description 处理搜索
   */
  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
  };

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
   * @description 打开添加/编辑模态框
   */
  const showModal = (stock?: Stock) => {
    if (stock) {
      setEditingStock(stock);
      form.setFieldsValue(stock);
    } else {
      setEditingStock(null);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  /**
   * @description 处理表单提交
   */
  const handleSubmit = async (values: any) => {
    if (editingStock) {
      await updateStockMutation.mutateAsync({ id: editingStock.id, data: values });
    } else {
      await addStockMutation.mutateAsync(values);
    }
  };

  /**
   * @description 处理删除
   */
  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这只股票吗？此操作不可撤销。',
      okText: '确认',
      cancelText: '取消',
      onOk: () => deleteStockMutation.mutate(id),
    });
  };

  // 表格列配置
  const columns = [
    {
      title: '股票代码',
      dataIndex: 'symbol',
      key: 'symbol',
      render: (symbol: string) => <Text strong>{symbol}</Text>,
    },
    {
      title: '股票名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text>{name}</Text>,
    },
    {
      title: '交易所',
      dataIndex: 'exchange',
      key: 'exchange',
      render: (exchange: string) => <Tag color='blue'>{exchange}</Tag>,
    },
    {
      title: '行业',
      dataIndex: 'sector',
      key: 'sector',
      render: (sector: string) => sector || '-',
    },
    {
      title: '市值',
      dataIndex: 'marketCap',
      key: 'marketCap',
      render: (marketCap: number) => (marketCap ? `$${(marketCap / 1000000000).toFixed(2)}B` : '-'),
    },
    {
      title: '市盈率',
      dataIndex: 'peRatio',
      key: 'peRatio',
      render: (peRatio: number) => (peRatio ? peRatio.toFixed(2) : '-'),
    },
    {
      title: '股息率',
      dataIndex: 'dividendYield',
      key: 'dividendYield',
      render: (dividendYield: number) => (dividendYield ? `${(dividendYield * 100).toFixed(2)}%` : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Stock) => (
        <Space>
          <Button
            type='text'
            icon={<EyeOutlined />}
            size='small'
            onClick={() => {
              /* 查看详情 */
            }}
          />
          <Button
            type='text'
            icon={<EditOutlined />}
            size='small'
            onClick={() => showModal(record)}
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
          股票列表
        </Title>
        <Text className='page-subtitle'>管理和查看所有股票信息</Text>
      </div>

      {/* 搜索和操作栏 */}
      <Card style={{ marginBottom: 24 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Search
            placeholder='搜索股票代码或名称'
            allowClear
            enterButton={<SearchOutlined />}
            size='large'
            style={{ width: 400 }}
            onSearch={handleSearch}
          />
          <Button
            type='primary'
            icon={<PlusOutlined />}
            size='large'
            onClick={() => showModal()}>
            添加股票
          </Button>
        </Space>
      </Card>

      {/* 股票表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={stocksData?.data.data || []}
          loading={isLoading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: stocksData?.data.pagination.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          onChange={handleTableChange}
          rowKey='id'
        />
      </Card>

      {/* 添加/编辑模态框 */}
      <Modal
        title={editingStock ? '编辑股票' : '添加股票'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={600}>
        <Form
          form={form}
          layout='vertical'
          onFinish={handleSubmit}
          initialValues={{ exchange: 'NASDAQ' }}>
          <Form.Item
            name='symbol'
            label='股票代码'
            rules={[{ required: true, message: '请输入股票代码' }]}>
            <Input placeholder='例如: AAPL' />
          </Form.Item>

          <Form.Item
            name='name'
            label='股票名称'
            rules={[{ required: true, message: '请输入股票名称' }]}>
            <Input placeholder='例如: Apple Inc.' />
          </Form.Item>

          <Form.Item
            name='exchange'
            label='交易所'
            rules={[{ required: true, message: '请选择交易所' }]}>
            <Select placeholder='选择交易所'>
              <Option value='NASDAQ'>NASDAQ</Option>
              <Option value='NYSE'>NYSE</Option>
              <Option value='AMEX'>AMEX</Option>
              <Option value='SSE'>上海证券交易所</Option>
              <Option value='SZSE'>深圳证券交易所</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name='sector'
            label='行业'>
            <Input placeholder='例如: Technology' />
          </Form.Item>

          <Form.Item
            name='industry'
            label='子行业'>
            <Input placeholder='例如: Consumer Electronics' />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type='primary'
                htmlType='submit'
                loading={addStockMutation.isLoading || updateStockMutation.isLoading}>
                {editingStock ? '更新' : '添加'}
              </Button>
              <Button onClick={() => setIsModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StockList;
