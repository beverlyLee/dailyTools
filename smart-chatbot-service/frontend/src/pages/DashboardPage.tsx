import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  message,
  Descriptions,
  Timeline,
  Badge,
  Empty
} from 'antd';
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  EyeOutlined,
  EditOutlined,
  PlusOutlined,
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons';
import { ticketApi } from '../services/api';
import { Ticket, TicketStatistics, Agent, TicketDetail, TicketActivity } from '../types';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

const DashboardPage: React.FC = () => {
  const [statistics, setStatistics] = useState<TicketStatistics | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [agentModalVisible, setAgentModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [agentForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, ticketsRes, agentsRes] = await Promise.all([
        ticketApi.getStatistics(),
        ticketApi.getTickets({ limit: 10 }),
        ticketApi.getAgents(),
      ]);
      setStatistics(statsRes);
      setTickets(ticketsRes.tickets);
      setAgents(agentsRes.agents);
    } catch (error) {
      console.error('Failed to load data:', error);
      message.error('加载数据失败');
    }
  };

  const viewTicketDetail = async (ticketId: string) => {
    try {
      const ticket = await ticketApi.getTicket(ticketId);
      setSelectedTicket(ticket);
      setDetailModalVisible(true);
    } catch (error) {
      console.error('Failed to load ticket:', error);
      message.error('加载工单详情失败');
    }
  };

  const openEditModal = (ticket: Ticket) => {
    form.setFieldsValue({
      status: ticket.status,
      priority: ticket.priority,
      assigned_agent_id: ticket.assigned_agent_id,
      note: '',
    });
    setSelectedTicket(ticket as TicketDetail);
    setEditModalVisible(true);
  };

  const handleEditSubmit = async (values: any) => {
    if (!selectedTicket) return;
    
    try {
      await ticketApi.updateTicket(selectedTicket.id, values);
      message.success('工单更新成功');
      setEditModalVisible(false);
      loadData();
    } catch (error) {
      console.error('Failed to update ticket:', error);
      message.error('更新工单失败');
    }
  };

  const handleCreateAgent = async (values: any) => {
    try {
      await ticketApi.createAgent(values);
      message.success('客服人员创建成功');
      setAgentModalVisible(false);
      agentForm.resetFields();
      loadData();
    } catch (error) {
      console.error('Failed to create agent:', error);
      message.error('创建客服人员失败');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'red',
      in_progress: 'orange',
      resolved: 'green',
      closed: 'default',
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      open: '待处理',
      in_progress: '处理中',
      resolved: '已解决',
      closed: '已关闭',
    };
    return texts[status] || status;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'default',
      medium: 'blue',
      high: 'orange',
      urgent: 'red',
    };
    return colors[priority] || 'default';
  };

  const getPriorityText = (priority: string) => {
    const texts: Record<string, string> = {
      low: '低',
      medium: '中',
      high: '高',
      urgent: '紧急',
    };
    return texts[priority] || priority;
  };

  const columns = [
    {
      title: '工单号',
      dataIndex: 'ticket_number',
      key: 'ticket_number',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)}>{getPriorityText(priority)}</Tag>
      ),
    },
    {
      title: '用户',
      dataIndex: 'user_identifier',
      key: 'user_identifier',
      render: (text: string) => text || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) => dayjs(time).format('MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Ticket) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => viewTicketDetail(record.id)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总工单数"
              value={statistics?.total || 0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理"
              value={statistics?.open || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="处理中"
              value={statistics?.in_progress || 0}
              prefix={<SyncOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已解决"
              value={statistics?.resolved || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={18}>
          <Card
            title="工单列表"
            extra={
              <Button type="primary" onClick={loadData}>
                刷新
              </Button>
            }
          >
            <Table
              columns={columns}
              dataSource={tickets}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Col>

        <Col span={6}>
          <Card
            title="客服人员"
            extra={
              <Button
                type="link"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => setAgentModalVisible(true)}
              >
                添加
              </Button>
            }
          >
            {agents.length === 0 ? (
              <Empty description="暂无客服人员" />
            ) : (
              agents.map((agent) => (
                <div
                  key={agent.id}
                  style={{
                    padding: '12px 0',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar
                      icon={<UserOutlined />}
                      style={{ backgroundColor: '#1890ff', marginRight: 12 }}
                    />
                    <div>
                      <div style={{ fontWeight: 500 }}>{agent.name}</div>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        {agent.email}
                        {agent.department && ` · ${agent.department}`}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="工单详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedTicket && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="工单号">
                <Tag color="blue">{selectedTicket.ticket_number}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="标题">
                {selectedTicket.title}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={getStatusColor(selectedTicket.status)}>
                  {getStatusText(selectedTicket.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag color={getPriorityColor(selectedTicket.priority)}>
                  {getPriorityText(selectedTicket.priority)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="用户标识">
                {selectedTicket.user_identifier || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="用户邮箱">
                {selectedTicket.user_email || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="意图分类">
                {selectedTicket.intent_category || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="解决时间">
                {selectedTicket.resolved_at
                  ? dayjs(selectedTicket.resolved_at).format('YYYY-MM-DD HH:mm')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>
                {dayjs(selectedTicket.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>
                {selectedTicket.description || '-'}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 24 }}>
              <h4>处理记录</h4>
              <Timeline>
                {selectedTicket.activities &&
                  selectedTicket.activities.map((activity: TicketActivity) => (
                    <Timeline.Item key={activity.id}>
                      <p>
                        <strong>{activity.actor || '系统'}</strong>
                        <span style={{ color: '#999', marginLeft: 8 }}>
                          {dayjs(activity.created_at).format('MM-DD HH:mm')}
                        </span>
                      </p>
                      <p>{activity.description}</p>
                    </Timeline.Item>
                  ))}
              </Timeline>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="编辑工单"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="status" label="状态">
            <Select>
              <Option value="open">待处理</Option>
              <Option value="in_progress">处理中</Option>
              <Option value="resolved">已解决</Option>
              <Option value="closed">已关闭</Option>
            </Select>
          </Form.Item>
          <Form.Item name="priority" label="优先级">
            <Select>
              <Option value="low">低</Option>
              <Option value="medium">中</Option>
              <Option value="high">高</Option>
              <Option value="urgent">紧急</Option>
            </Select>
          </Form.Item>
          <Form.Item name="assigned_agent_id" label="分配客服">
            <Select placeholder="选择客服人员" allowClear>
              {agents.map((agent) => (
                <Option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.email})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="note" label="备注">
            <TextArea rows={4} placeholder="添加备注信息..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加客服人员"
        open={agentModalVisible}
        onCancel={() => setAgentModalVisible(false)}
        onOk={() => agentForm.submit()}
      >
        <Form form={agentForm} layout="vertical" onFinish={handleCreateAgent}>
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item name="department" label="部门">
            <Input placeholder="请输入部门（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DashboardPage;
