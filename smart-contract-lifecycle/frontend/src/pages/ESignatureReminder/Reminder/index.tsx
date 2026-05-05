import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  DatePicker,
  TimePicker,
  Switch,
  Table,
  message,
  Modal,
  Tag,
  Descriptions,
  Divider,
  Row,
  Col,
  Statistic,
  Badge,
  Tooltip,
  Popconfirm,
} from 'antd';
import {
  BellOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CalendarOutlined,
  MailOutlined,
  MobileOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  BellFilled,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs, { Dayjs } from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

interface Reminder {
  id: number;
  contractId: number;
  contractTitle: string;
  contractNumber: string;
  reminderTitle: string;
  reminderType: string;
  reminderDate: string;
  reminderTime: string;
  status: string;
  isRead: boolean;
  reminderMessage: string;
  recipientEmail: string;
  recipientPhone: string;
  sendEmail: boolean;
  sendSms: boolean;
  daysBefore: number;
  repeatType: string;
  createdAt: string;
}

const ReminderPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  // 模拟提醒数据
  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = () => {
    setTableLoading(true);
    
    const mockReminders: Reminder[] = [
      {
        id: 1,
        contractId: 1,
        contractTitle: '设备采购合同-20230512',
        contractNumber: 'CT-2023-001',
        reminderTitle: '合同到期提醒',
        reminderType: 'CONTRACT_EXPIRATION',
        reminderDate: dayjs().add(3, 'day').format('YYYY-MM-DD'),
        reminderTime: '09:00',
        status: 'PENDING',
        isRead: false,
        reminderMessage: '设备采购合同将于3天后到期，请及时处理续约事宜。',
        recipientEmail: 'admin@example.com',
        recipientPhone: '13800138000',
        sendEmail: true,
        sendSms: true,
        daysBefore: 7,
        repeatType: 'ONCE',
        createdAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        id: 2,
        contractId: 2,
        contractTitle: '技术服务协议-20230510',
        contractNumber: 'CT-2023-002',
        reminderTitle: '付款到期提醒',
        reminderType: 'PAYMENT_DUE',
        reminderDate: dayjs().add(1, 'day').format('YYYY-MM-DD'),
        reminderTime: '10:00',
        status: 'PENDING',
        isRead: false,
        reminderMessage: '技术服务协议第二期付款将于明天到期，金额：50,000元。',
        recipientEmail: 'finance@example.com',
        recipientPhone: '13900139000',
        sendEmail: true,
        sendSms: false,
        daysBefore: 3,
        repeatType: 'ONCE',
        createdAt: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        id: 3,
        contractId: 3,
        contractTitle: '办公场所租赁合同',
        contractNumber: 'CT-2023-003',
        reminderTitle: '续约提醒',
        reminderType: 'RENEWAL_REMINDER',
        reminderDate: dayjs().add(15, 'day').format('YYYY-MM-DD'),
        reminderTime: '09:00',
        status: 'PENDING',
        isRead: false,
        reminderMessage: '办公场所租赁合同将于15天后到期，请提前评估是否续约。',
        recipientEmail: 'admin@example.com',
        recipientPhone: '13800138000',
        sendEmail: true,
        sendSms: true,
        daysBefore: 30,
        repeatType: 'ONCE',
        createdAt: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        id: 4,
        contractId: 1,
        contractTitle: '设备采购合同-20230512',
        contractNumber: 'CT-2023-001',
        reminderTitle: '验收提醒',
        reminderType: 'PERFORMANCE_NODE',
        reminderDate: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
        reminderTime: '14:00',
        status: 'SENT',
        isRead: true,
        reminderMessage: '设备采购验收节点已到达，请组织相关人员进行验收。',
        recipientEmail: 'qa@example.com',
        recipientPhone: '13700137000',
        sendEmail: true,
        sendSms: false,
        daysBefore: 0,
        repeatType: 'ONCE',
        createdAt: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss'),
      },
    ];

    setTimeout(() => {
      setReminders(mockReminders);
      setTableLoading(false);
    }, 500);
  };

  const getReminderTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      CONTRACT_EXPIRATION: '合同到期',
      PAYMENT_DUE: '付款到期',
      PERFORMANCE_NODE: '履约节点',
      RENEWAL_REMINDER: '续约提醒',
    };
    return typeMap[type] || type;
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'SENT':
        return <Tag color="success">已发送</Tag>;
      case 'PENDING':
        return <Tag color="processing">待发送</Tag>;
      case 'FAILED':
        return <Tag color="error">发送失败</Tag>;
      case 'CANCELLED':
        return <Tag color="default">已取消</Tag>;
      default:
        return <Tag color="default">未知</Tag>;
    }
  };

  const getReminderTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      CONTRACT_EXPIRATION: 'red',
      PAYMENT_DUE: 'orange',
      PERFORMANCE_NODE: 'blue',
      RENEWAL_REMINDER: 'purple',
    };
    return colorMap[type] || 'default';
  };

  const getUrgencyColor = (reminder: Reminder) => {
    if (reminder.status === 'SENT') return 'default';
    const daysUntil = dayjs(reminder.reminderDate).diff(dayjs(), 'day');
    if (daysUntil <= 1) return 'red';
    if (daysUntil <= 3) return 'orange';
    return 'default';
  };

  const handleAddReminder = () => {
    setEditingReminder(null);
    form.resetFields();
    form.setFieldsValue({
      sendEmail: true,
      sendSms: false,
      daysBefore: 7,
      repeatType: 'ONCE',
      reminderTime: dayjs().hour(9).minute(0),
    });
    setShowAddModal(true);
  };

  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminder(reminder);
    form.setFieldsValue({
      ...reminder,
      reminderDate: dayjs(reminder.reminderDate),
      reminderTime: reminder.reminderTime ? dayjs(reminder.reminderTime, 'HH:mm') : null,
    });
    setShowAddModal(true);
  };

  const handleViewDetail = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setShowDetailModal(true);
  };

  const handleDeleteReminder = (id: number) => {
    // 实际项目中调用后端 API
    // await axios.delete(`/api/reminder/${id}`);
    
    setReminders(reminders.filter((r) => r.id !== id));
    message.success('提醒删除成功');
  };

  const handleSaveReminder = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      const reminderData: Reminder = {
        ...values,
        id: editingReminder?.id || Date.now(),
        contractId: 1, // 模拟合同ID
        contractTitle: '模拟合同',
        contractNumber: 'CT-2024-001',
        status: 'PENDING',
        isRead: false,
        createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        reminderDate: values.reminderDate.format('YYYY-MM-DD'),
        reminderTime: values.reminderTime ? values.reminderTime.format('HH:mm') : '09:00',
      };

      if (editingReminder) {
        // 编辑模式
        setReminders(reminders.map((r) => (r.id === editingReminder.id ? reminderData : r)));
        message.success('提醒更新成功');
      } else {
        // 新增模式
        setReminders([reminderData, ...reminders]);
        message.success('提醒创建成功');
      }

      setShowAddModal(false);
      form.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerReminder = async (id: number) => {
    try {
      setLoading(true);
      // 实际项目中调用后端 API
      // await axios.post('/api/reminder/trigger');
      
      // 模拟发送成功
      setReminders(reminders.map((r) => 
        r.id === id ? { ...r, status: 'SENT', isRead: true } : r
      ));
      message.success('提醒已触发发送');
    } catch (error: any) {
      message.error('触发失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '提醒标题',
      dataIndex: 'reminderTitle',
      key: 'reminderTitle',
      render: (text: string, record: Reminder) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {!record.isRead && (
            <Badge status="processing" style={{ marginRight: '8px' }} />
          )}
          <span style={{ fontWeight: record.isRead ? 'normal' : 'bold' }}>
            {text}
          </span>
        </div>
      ),
    },
    {
      title: '关联合同',
      dataIndex: 'contractTitle',
      key: 'contractTitle',
      ellipsis: true,
    },
    {
      title: '提醒类型',
      dataIndex: 'reminderType',
      key: 'reminderType',
      render: (type: string) => (
        <Tag color={getReminderTypeColor(type)}>
          {getReminderTypeLabel(type)}
        </Tag>
      ),
    },
    {
      title: '提醒时间',
      dataIndex: 'reminderDate',
      key: 'reminderDate',
      render: (date: string, record: Reminder) => (
        <div>
          <div style={{ 
            color: getUrgencyColor(record) === 'red' ? '#ff4d4f' : 
                   getUrgencyColor(record) === 'orange' ? '#fa8c16' : undefined 
          }}>
            {date}
          </div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            {record.reminderTime}
          </div>
        </div>
      ),
    },
    {
      title: '通知方式',
      key: 'notifyType',
      render: (_: any, record: Reminder) => (
        <div>
          {record.sendEmail && (
            <Tooltip title="邮件通知">
              <MailOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            </Tooltip>
          )}
          {record.sendSms && (
            <Tooltip title="短信通知">
              <MobileOutlined style={{ color: '#52c41a' }} />
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 200,
      render: (_: any, record: Reminder) => (
        <div>
          <Tooltip title="查看详情">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
              size="small"
            />
          </Tooltip>
          {record.status === 'PENDING' && (
            <Tooltip title="编辑">
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleEditReminder(record)}
                size="small"
              />
            </Tooltip>
          )}
          {record.status === 'PENDING' && (
            <Tooltip title="立即发送">
              <Button
                type="link"
                icon={<BellFilled />}
                onClick={() => handleTriggerReminder(record.id)}
                size="small"
              />
            </Tooltip>
          )}
          <Popconfirm
            title="确定要删除这条提醒吗？"
            onConfirm={() => handleDeleteReminder(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="link"
                icon={<DeleteOutlined />}
                danger
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const pendingCount = reminders.filter((r) => r.status === 'PENDING').length;
  const sentCount = reminders.filter((r) => r.status === 'SENT').length;
  const urgentCount = reminders.filter(
    (r) => r.status === 'PENDING' && dayjs(r.reminderDate).diff(dayjs(), 'day') <= 3
  ).length;

  return (
    <div>
      {/* 统计卡片 */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title="待发送提醒"
              value={pendingCount}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title="紧急提醒"
              value={urgentCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: urgentCount > 0 ? '#ff4d4f' : '#999' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title="已发送提醒"
              value={sentCount}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title="总提醒数"
              value={reminders.length}
              prefix={<BellOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* 主要内容区 */}
      <Card
        title="提醒管理"
        bordered={false}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddReminder}>
            新建提醒
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={reminders}
          rowKey="id"
          loading={tableLoading}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 新建/编辑提醒弹窗 */}
      <Modal
        title={editingReminder ? '编辑提醒' : '新建提醒'}
        open={showAddModal}
        onOk={handleSaveReminder}
        onCancel={() => setShowAddModal(false)}
        confirmLoading={loading}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            sendEmail: true,
            sendSms: false,
            daysBefore: 7,
            repeatType: 'ONCE',
          }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="reminderTitle"
                label="提醒标题"
                rules={[{ required: true, message: '请输入提醒标题' }]}
              >
                <Input placeholder="请输入提醒标题" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="reminderType"
                label="提醒类型"
                rules={[{ required: true, message: '请选择提醒类型' }]}
              >
                <Select placeholder="请选择提醒类型">
                  <Option value="CONTRACT_EXPIRATION">合同到期提醒</Option>
                  <Option value="PAYMENT_DUE">付款到期提醒</Option>
                  <Option value="PERFORMANCE_NODE">履约节点提醒</Option>
                  <Option value="RENEWAL_REMINDER">续约提醒</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="reminderDate"
                label="提醒日期"
                rules={[{ required: true, message: '请选择提醒日期' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="请选择提醒日期"
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="reminderTime"
                label="提醒时间"
                rules={[{ required: true, message: '请选择提醒时间' }]}
              >
                <TimePicker
                  style={{ width: '100%' }}
                  placeholder="请选择提醒时间"
                  format="HH:mm"
                  minuteStep={30}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="recipientEmail"
                label="收件人邮箱"
                rules={[
                  { type: 'email', message: '请输入有效的邮箱地址' },
                ]}
              >
                <Input placeholder="请输入收件人邮箱" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="recipientPhone"
                label="收件人手机"
                rules={[
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' },
                ]}
              >
                <Input placeholder="请输入收件人手机" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="reminderMessage"
            label="提醒内容"
            rules={[{ required: true, message: '请输入提醒内容' }]}
          >
            <TextArea
              rows={4}
              placeholder="请输入提醒内容"
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item name="sendEmail" label="邮件通知" valuePropName="checked">
                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="sendSms" label="短信通知" valuePropName="checked">
                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="daysBefore"
                label="提前提醒天数"
                rules={[{ required: true, message: '请输入提前提醒天数' }]}
              >
                <InputNumber
                  min={0}
                  max={365}
                  style={{ width: '100%' }}
                  placeholder="请输入提前提醒天数"
                  addonAfter="天"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="repeatType"
                label="重复类型"
                rules={[{ required: true, message: '请选择重复类型' }]}
              >
                <Select placeholder="请选择重复类型">
                  <Option value="ONCE">一次性</Option>
                  <Option value="DAILY">每天</Option>
                  <Option value="WEEKLY">每周</Option>
                  <Option value="MONTHLY">每月</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 提醒详情弹窗 */}
      <Modal
        title="提醒详情"
        open={showDetailModal}
        onCancel={() => setShowDetailModal(false)}
        footer={
          <Button onClick={() => setShowDetailModal(false)}>
            关闭
          </Button>
        }
        width={600}
      >
        {selectedReminder && (
          <div>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="提醒标题">
                {selectedReminder.reminderTitle}
              </Descriptions.Item>
              <Descriptions.Item label="提醒类型">
                <Tag color={getReminderTypeColor(selectedReminder.reminderType)}>
                  {getReminderTypeLabel(selectedReminder.reminderType)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="关联合同">
                {selectedReminder.contractTitle} ({selectedReminder.contractNumber})
              </Descriptions.Item>
              <Descriptions.Item label="提醒时间">
                {selectedReminder.reminderDate} {selectedReminder.reminderTime}
              </Descriptions.Item>
              <Descriptions.Item label="收件人">
                {selectedReminder.recipientEmail || '-'}
                {selectedReminder.recipientEmail && selectedReminder.recipientPhone && ' / '}
                {selectedReminder.recipientPhone || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="通知方式">
                {selectedReminder.sendEmail && (
                  <Tag color="blue" style={{ marginRight: '8px' }}>
                    <MailOutlined style={{ marginRight: '4px' }} />
                    邮件
                  </Tag>
                )}
                {selectedReminder.sendSms && (
                  <Tag color="green">
                    <MobileOutlined style={{ marginRight: '4px' }} />
                    短信
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(selectedReminder.status)}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {selectedReminder.createdAt}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>提醒内容：</div>
              <Card size="small" style={{ background: '#fafafa' }}>
                {selectedReminder.reminderMessage}
              </Card>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReminderPage;
