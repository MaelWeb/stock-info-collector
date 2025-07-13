import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Tabs,
  Tag,
  Popconfirm,
  InputNumber,
  DatePicker,
} from 'antd';
import {
  UserOutlined,
  KeyOutlined,
  AuditOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import * as authAPI from '../api/authAPI';
import { User, InviteCode } from '../types/user';

const { TabPane } = Tabs;
const { Option } = Select;

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * @description 管理员页面组件
 */
const Admin: React.FC = () => {
  const { token } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [inviteForm] = Form.useForm();
  const [userForm] = Form.useForm();

  // 获取用户列表
  const fetchUsers = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取邀请码列表
  const fetchInviteCodes = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch('/api/admin/invite', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setInviteCodes(data.data);
      }
    } catch (error) {
      message.error('获取邀请码列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取审计日志
  const fetchAuditLogs = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch('/api/admin/audit-logs', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setAuditLogs(data.data.logs);
      }
    } catch (error) {
      message.error('获取审计日志失败');
    } finally {
      setLoading(false);
    }
  };

  // 生成邀请码
  const generateInviteCodes = async (count: number) => {
    if (!token) return;
    try {
      const response = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count }),
      });
      const data = await response.json();
      if (data.success) {
        message.success(`成功生成 ${count} 个邀请码`);
        fetchInviteCodes();
      }
    } catch (error) {
      message.error('生成邀请码失败');
    }
  };

  // 更新用户角色
  const updateUserRole = async (userId: string, updates: any) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (data.success) {
        message.success('用户角色更新成功');
        fetchUsers();
        setUserModalVisible(false);
        setEditingUser(null);
        userForm.resetFields();
      }
    } catch (error) {
      message.error('更新用户角色失败');
    }
  };

  // 删除用户
  const deleteUser = async (userId: string) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        message.success('用户删除成功');
        fetchUsers();
      }
    } catch (error) {
      message.error('删除用户失败');
    }
  };

  // 删除邀请码
  const deleteInviteCode = async (inviteCodeId: string) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/admin/invite/${inviteCodeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        message.success('邀请码删除成功');
        fetchInviteCodes();
      }
    } catch (error) {
      message.error('删除邀请码失败');
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchInviteCodes();
    fetchAuditLogs();
  }, [token]);

  // 用户表格列定义
  const userColumns = [
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const color = role === 'super_admin' ? 'red' : role === 'admin' ? 'blue' : 'green';
        return <Tag color={color}>{role.toUpperCase()}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => <Tag color={isActive ? 'green' : 'red'}>{isActive ? '激活' : '禁用'}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: User) => (
        <Space>
          <Button
            type='link'
            icon={<EditOutlined />}
            onClick={() => {
              setEditingUser(record);
              setUserModalVisible(true);
              userForm.setFieldsValue(record);
            }}>
            编辑
          </Button>
          {record.role !== 'super_admin' && (
            <Popconfirm
              title='确定要删除这个用户吗？'
              onConfirm={() => deleteUser(record.id)}>
              <Button
                type='link'
                danger
                icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 邀请码表格列定义
  const inviteCodeColumns = [
    {
      title: '邀请码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '状态',
      dataIndex: 'used',
      key: 'used',
      render: (used: boolean) => <Tag color={used ? 'red' : 'green'}>{used ? '已使用' : '未使用'}</Tag>,
    },
    {
      title: '使用者',
      dataIndex: 'usedBy',
      key: 'usedBy',
      render: (usedBy: string) => usedBy || '-',
    },
    {
      title: '使用时间',
      dataIndex: 'usedAt',
      key: 'usedAt',
      render: (date: string) => (date ? new Date(date).toLocaleString() : '-'),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: InviteCode) => (
        <Popconfirm
          title='确定要删除这个邀请码吗？'
          onConfirm={() => deleteInviteCode(record.id)}>
          <Button
            type='link'
            danger
            icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  // 审计日志表格列定义
  const auditLogColumns = [
    {
      title: '操作用户',
      dataIndex: ['user', 'email'],
      key: 'userEmail',
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => {
        const color =
          action === 'CREATE' ? 'green' : action === 'UPDATE' ? 'blue' : action === 'DELETE' ? 'red' : 'orange';
        return <Tag color={color}>{action}</Tag>;
      },
    },
    {
      title: '操作资源',
      dataIndex: 'resource',
      key: 'resource',
    },
    {
      title: 'IP地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
    },
    {
      title: '操作时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Tabs defaultActiveKey='users'>
        <TabPane
          tab={
            <span>
              <UserOutlined />
              用户管理
            </span>
          }
          key='users'>
          <Card
            title='用户列表'
            extra={
              <Button
                type='primary'
                icon={<PlusOutlined />}>
                添加用户
              </Button>
            }>
            <Table
              columns={userColumns}
              dataSource={users}
              rowKey='id'
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <KeyOutlined />
              邀请码管理
            </span>
          }
          key='invite'>
          <Card
            title='邀请码列表'
            extra={
              <Space>
                <Form
                  form={inviteForm}
                  layout='inline'>
                  <Form.Item
                    name='count'
                    initialValue={5}>
                    <InputNumber
                      min={1}
                      max={100}
                      placeholder='数量'
                    />
                  </Form.Item>
                  <Form.Item>
                    <Button
                      type='primary'
                      icon={<PlusOutlined />}
                      onClick={() => {
                        const count = inviteForm.getFieldValue('count') || 5;
                        generateInviteCodes(count);
                      }}>
                      生成邀请码
                    </Button>
                  </Form.Item>
                </Form>
              </Space>
            }>
            <Table
              columns={inviteCodeColumns}
              dataSource={inviteCodes}
              rowKey='id'
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <AuditOutlined />
              审计日志
            </span>
          }
          key='audit'>
          <Card title='操作日志'>
            <Table
              columns={auditLogColumns}
              dataSource={auditLogs}
              rowKey='id'
              loading={loading}
              pagination={{ pageSize: 20 }}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* 编辑用户模态框 */}
      <Modal
        title='编辑用户'
        open={userModalVisible}
        onCancel={() => {
          setUserModalVisible(false);
          setEditingUser(null);
          userForm.resetFields();
        }}
        footer={null}>
        <Form
          form={userForm}
          layout='vertical'
          onFinish={(values) => {
            if (editingUser) {
              updateUserRole(editingUser.id, values);
            }
          }}>
          <Form.Item
            label='角色'
            name='role'>
            <Select>
              <Option value='user'>普通用户</Option>
              <Option value='admin'>管理员</Option>
              <Option value='super_admin'>超级管理员</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label='状态'
            name='isActive'
            valuePropName='checked'>
            <Switch />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type='primary'
                htmlType='submit'>
                保存
              </Button>
              <Button
                onClick={() => {
                  setUserModalVisible(false);
                  setEditingUser(null);
                  userForm.resetFields();
                }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Admin;
