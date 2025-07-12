import React, { useState } from 'react';
import { Table, Card, Button, Space, Tag, Typography, Modal, Form, InputNumber, Input, message, Empty } from 'antd';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { watchlistAPI } from '@/api/watchlist';

import type { WatchlistItem } from '@/types';

const { Title, Text } = Typography;
const { TextArea } = Input;

/**
 * @description 自选股页面组件
 */
const Watchlist: React.FC = () => {
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<WatchlistItem | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取自选股列表
  const { data: watchlistData, isLoading } = useQuery(['watchlist', pagination.current, pagination.pageSize], () =>
    watchlistAPI.getWatchlist({
      page: pagination.current,
      limit: pagination.pageSize,
    })
  );

  // 更新自选股项目
  const updateWatchlistMutation = useMutation(
    ({ id, data }: { id: string; data: any }) => watchlistAPI.updateWatchlistItem(id, data),
    {
      onSuccess: () => {
        message.success('自选股更新成功');
        setIsModalVisible(false);
        setEditingItem(null);
        form.resetFields();
        queryClient.invalidateQueries('watchlist');
      },
      onError: (error: any) => {
        message.error(error.message || '更新失败');
      },
    }
  );

  // 删除自选股项目
  const deleteWatchlistMutation = useMutation((id: string) => watchlistAPI.removeFromWatchlist(id), {
    onSuccess: () => {
      message.success('自选股删除成功');
      queryClient.invalidateQueries('watchlist');
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
   * @description 打开编辑模态框
   */
  const showEditModal = (item: WatchlistItem) => {
    setEditingItem(item);
    form.setFieldsValue({
      notes: item.notes,
      targetPrice: item.targetPrice,
      stopLoss: item.stopLoss,
    });
    setIsModalVisible(true);
  };

  /**
   * @description 处理表单提交
   */
  const handleSubmit = async (values: any) => {
    if (editingItem) {
      await updateWatchlistMutation.mutateAsync({ id: editingItem.id, data: values });
    }
  };

  /**
   * @description 处理删除
   */
  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要从自选股中移除这只股票吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: () => deleteWatchlistMutation.mutate(id),
    });
  };

  // 表格列配置
  const columns = [
    {
      title: '股票',
      dataIndex: 'stock',
      key: 'stock',
      render: (stock: any) => (
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
      title: '交易所',
      dataIndex: 'stock',
      key: 'exchange',
      render: (stock: any) => <Tag color='blue'>{stock.exchange}</Tag>,
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
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      render: (notes: string) => notes || '-',
      ellipsis: true,
    },
    {
      title: '添加时间',
      dataIndex: 'addedAt',
      key: 'addedAt',
      render: (date: string) => new Date(date).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: WatchlistItem) => (
        <Space>
          <Button
            type='text'
            icon={<EditOutlined />}
            size='small'
            onClick={() => showEditModal(record)}
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
          自选股
        </Title>
        <Text className='page-subtitle'>管理您关注的股票</Text>
      </div>

      {/* 自选股表格 */}
      <Card>
        {watchlistData?.data.data && watchlistData.data.data.length > 0 ? (
          <Table
            columns={columns}
            dataSource={watchlistData.data.data}
            loading={isLoading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: watchlistData.data.pagination.total || 0,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            }}
            onChange={handleTableChange}
            rowKey='id'
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description='暂无自选股'
            style={{ padding: '60px 0' }}>
            <Button
              type='primary'
              icon={<PlusOutlined />}>
              添加自选股
            </Button>
          </Empty>
        )}
      </Card>

      {/* 编辑模态框 */}
      <Modal
        title='编辑自选股'
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={500}>
        <Form
          form={form}
          layout='vertical'
          onFinish={handleSubmit}>
          <Form.Item
            name='targetPrice'
            label='目标价格'>
            <InputNumber
              placeholder='设置目标价格'
              min={0}
              precision={2}
              style={{ width: '100%' }}
              addonBefore='$'
            />
          </Form.Item>

          <Form.Item
            name='stopLoss'
            label='止损价格'>
            <InputNumber
              placeholder='设置止损价格'
              min={0}
              precision={2}
              style={{ width: '100%' }}
              addonBefore='$'
            />
          </Form.Item>

          <Form.Item
            name='notes'
            label='备注'>
            <TextArea
              placeholder='添加备注信息'
              rows={4}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type='primary'
                htmlType='submit'
                loading={updateWatchlistMutation.isLoading}>
                更新
              </Button>
              <Button onClick={() => setIsModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Watchlist;
