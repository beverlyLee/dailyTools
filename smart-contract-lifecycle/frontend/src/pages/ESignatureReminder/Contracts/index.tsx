import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  DatePicker,
  InputNumber,
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
  Space,
  Tabs,
} from 'antd';
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  BellOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

interface Contract {
  id: number;
  title: string;
  contractNumber: string;
  contractType: string;
  status: string;
  firstParty: string;
  secondParty: string;
  amount: number;
  amountStr: string;
  startDate: string;
  endDate: string;
  signDate: string;
  createTime: string;
  updateTime: string;
  hasReminder: boolean;
  hasSignature: boolean;
}

interface ContractForm {
  title: string;
  contractType: string;
  firstParty: string;
  secondParty: string;
  amount: number;
  startDate: any;
  endDate: any;
  signDate: any;
}

const ContractsPage: React.FC = () => {
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  // 模拟合同数据
  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = () => {
    setTableLoading(true);

    const mockContracts: Contract[] = [
      {
        id: 1,
        title: '设备采购合同-20230512',
        contractNumber: 'CT-2023-001',
        contractType: '采购合同',
        status: 'PENDING_SIGN',
        firstParty: '科技有限公司',
        secondParty: '供应商A',
        amount: 500000,
        amountStr: '500,000.00',
        startDate: dayjs().format('YYYY-MM-DD'),
        endDate: dayjs().add(1, 'year').format('YYYY-MM-DD'),
        signDate: '-',
        createTime: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
        updateTime: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
        hasReminder: true,
        hasSignature: false,
      },
      {
        id: 2,
        title: '技术服务协议-20230510',
        contractNumber: 'CT-2023-002',
        contractType: '服务合同',
        status: 'SIGNED',
        firstParty: '科技有限公司',
        secondParty: '服务商B',
        amount: 120000,
        amountStr: '120,000.00',
        startDate: dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
        endDate: dayjs().add(11, 'month').format('YYYY-MM-DD'),
        signDate: dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
        createTime: dayjs().subtract(1, 'month').format('YYYY-MM-DD HH:mm:ss'),
        updateTime: dayjs().subtract(15, 'day').format('YYYY-MM-DD HH:mm:ss'),
        hasReminder: true,
        hasSignature: true,
      },
      {
        id: 3,
        title: '办公场所租赁合同',
        contractNumber: 'CT-2023-003',
        contractType: '租赁合同',
        status: 'SIGNED',
        firstParty: '科技有限公司',
        secondParty: '物业管理公司',
        amount: 360000,
        amountStr: '360,000.00',
        startDate: dayjs().subtract(6, 'month').format('YYYY-MM-DD'),
        endDate: dayjs().add(6, 'month').format('YYYY-MM-DD'),
        signDate: dayjs().subtract(6, 'month').format('YYYY-MM-DD'),
        createTime: dayjs().subtract(6, 'month').format('YYYY-MM-DD HH:mm:ss'),
        updateTime: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'),
        hasReminder: true,
        hasSignature: true,
      },
      {
        id: 4,
        title: '软件开发委托合同',
        contractNumber: 'CT-2023-004',
        contractType: '委托合同',
        status: 'EXPIRED',
        firstParty: '科技有限公司',
        secondParty: '软件开发商',
        amount: 800000,
        amountStr: '800,000.00',
        startDate: dayjs().subtract(2, 'year').format('YYYY-MM-DD'),
        endDate: dayjs().subtract(6, 'month').format('YYYY-MM-DD'),
        signDate: dayjs().subtract(2, 'year').format('YYYY-MM-DD'),
        createTime: dayjs().subtract(2, 'year').format('YYYY-MM-DD HH:mm:ss'),
        updateTime: dayjs().subtract(6, 'month').format('YYYY-MM-DD HH:mm:ss'),
        hasReminder: false,
        hasSignature: true,
      },
      {
        id: 5,
        title: '人力资源服务协议',
        contractNumber: 'CT-2023-005',
        contractType: '服务合同',
        status: 'DRAFT',
        firstParty: '科技有限公司',
        secondParty: '人力资源公司',
        amount: 150000,
        amountStr: '150,000.00',
        startDate: '-',
        endDate: '-',
        signDate: '-',
        createTime: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss'),
        updateTime: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'),
        hasReminder: false,
        hasSignature: false,
      },
    ];

    setTimeout(() => {
      setContracts(mockContracts);
      setTableLoading(false);
    }, 500);
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Tag color="default">草稿</Tag>;
      case 'PENDING_SIGN':
        return <Tag color="processing">待签署</Tag>;
      case 'SIGNED':
        return <Tag color="success">已签署</Tag>;
      case 'EXPIRED':
        return <Tag color="error">已过期</Tag>;
      case 'TERMINATED':
        return <Tag color="warning">已终止</Tag>;
      default:
        return <Tag color="default">未知</Tag>;
    }
  };

  const getContractTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      采购合同: 'blue',
      服务合同: 'green',
      租赁合同: 'orange',
      委托合同: 'purple',
      销售合同: 'cyan',
      劳动合同: 'magenta',
    };
    return colorMap[type] || 'default';
  };

  const handleAddContract = () => {
    setEditingContract(null);
    form.resetFields();
    setShowAddModal(true);
  };

  const handleEditContract = (contract: Contract) => {
    setEditingContract(contract);
    form.setFieldsValue({
      ...contract,
      startDate: contract.startDate !== '-' ? dayjs(contract.startDate) : null,
      endDate: contract.endDate !== '-' ? dayjs(contract.endDate) : null,
      signDate: contract.signDate !== '-' ? dayjs(contract.signDate) : null,
    });
    setShowAddModal(true);
  };

  const handleViewDetail = (contract: Contract) => {
    setSelectedContract(contract);
    setShowDetailModal(true);
  };

  const handleDeleteContract = (id: number) => {
    setContracts(contracts.filter((c) => c.id !== id));
    message.success('合同删除成功');
  };

  const handleSaveContract = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      const contractData: Contract = {
        ...values,
        id: editingContract?.id || Date.now(),
        contractNumber: `CT-${dayjs().format('YYYY')}-${String(contracts.length + 1).padStart(3, '0')}`,
        status: editingContract?.status || 'DRAFT',
        amountStr: values.amount?.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) || '0.00',
        startDate: values.startDate?.format('YYYY-MM-DD') || '-',
        endDate: values.endDate?.format('YYYY-MM-DD') || '-',
        signDate: values.signDate?.format('YYYY-MM-DD') || '-',
        createTime: editingContract?.createTime || dayjs().format('YYYY-MM-DD HH:mm:ss'),
        updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        hasReminder: false,
        hasSignature: false,
      };

      if (editingContract) {
        setContracts(contracts.map((c) => (c.id === editingContract.id ? contractData : c)));
        message.success('合同更新成功');
      } else {
        setContracts([contractData, ...contracts]);
        message.success('合同创建成功');
      }

      setShowAddModal(false);
      form.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const values = searchForm.getFieldsValue();
    message.info('搜索功能：实际项目中调用后端API进行搜索');
    console.log('搜索条件:', values);
  };

  const handleReset = () => {
    searchForm.resetFields();
    loadContracts();
  };

  const getFilteredContracts = () => {
    if (activeTab === 'all') return contracts;
    return contracts.filter((c) => {
      if (activeTab === 'draft') return c.status === 'DRAFT';
      if (activeTab === 'pending') return c.status === 'PENDING_SIGN';
      if (activeTab === 'signed') return c.status === 'SIGNED';
      if (activeTab === 'expired') return c.status === 'EXPIRED';
      return true;
    });
  };

  const draftCount = contracts.filter((c) => c.status === 'DRAFT').length;
  const pendingCount = contracts.filter((c) => c.status === 'PENDING_SIGN').length;
  const signedCount = contracts.filter((c) => c.status === 'SIGNED').length;
  const expiredCount = contracts.filter((c) => c.status === 'EXPIRED').length;
  const totalAmount = contracts
    .filter((c) => c.status === 'SIGNED')
    .reduce((sum, c) => sum + c.amount, 0);

  const columns = [
    {
      title: '合同编号',
      dataIndex: 'contractNumber',
      key: 'contractNumber',
      width: 140,
    },
    {
      title: '合同名称',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: '合同类型',
      dataIndex: 'contractType',
      key: 'contractType',
      width: 100,
      render: (type: string) => (
        <Tag color={getContractTypeColor(type)}>{type}</Tag>
      ),
    },
    {
      title: '合同金额',
      dataIndex: 'amountStr',
      key: 'amount',
      width: 120,
      render: (text: string) => <span style={{ fontWeight: 'bold' }}>¥{text}</span>,
    },
    {
      title: '甲方',
      dataIndex: 'firstParty',
      key: 'firstParty',
      width: 120,
      ellipsis: true,
    },
    {
      title: '乙方',
      dataIndex: 'secondParty',
      key: 'secondParty',
      width: 120,
      ellipsis: true,
    },
    {
      title: '有效期',
      key: 'validity',
      width: 180,
      render: (_: any, record: Contract) => (
        <div>
          <div style={{ fontSize: '12px' }}>
            {record.startDate !== '-' ? record.startDate : '-'}
          </div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            至 {record.endDate !== '-' ? record.endDate : '-'}
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '标签',
      key: 'tags',
      width: 120,
      render: (_: any, record: Contract) => (
        <Space size={[4, 4]} wrap>
          {record.hasSignature && (
            <Tag icon={<SafetyCertificateOutlined />} color="blue">
              已签章
            </Tag>
          )}
          {record.hasReminder && (
            <Tag icon={<BellOutlined />} color="orange">
              有提醒
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 200,
      render: (_: any, record: Contract) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEditContract(record)}
              size="small"
            />
          </Tooltip>
          {record.status === 'PENDING_SIGN' && (
            <Tooltip title="前往签章">
              <Button
                type="link"
                icon={<SafetyCertificateOutlined />}
                size="small"
                onClick={() => message.info('跳转至电子签章页面')}
              />
            </Tooltip>
          )}
          {record.status === 'SIGNED' && (
            <Tooltip title="添加提醒">
              <Button
                type="link"
                icon={<BellOutlined />}
                size="small"
                onClick={() => message.info('跳转至履约提醒页面')}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="确定要删除这份合同吗？"
            onConfirm={() => handleDeleteContract(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button type="link" icon={<DeleteOutlined />} danger size="small" />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 统计卡片 */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={4}>
            <Statistic
              title="合同总数"
              value={contracts.length}
              prefix={<FileTextOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Statistic
              title="待签署"
              value={pendingCount}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Statistic
              title="已签署"
              value={signedCount}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Statistic
              title="已过期"
              value={expiredCount}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Statistic
              title="已签署合同金额"
              value={totalAmount}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Col>
        </Row>
      </Card>

      {/* 搜索区域 */}
      <Card style={{ marginBottom: '24px' }}>
        <Form form={searchForm} layout="inline">
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="合同名称/编号/甲乙" prefix={<SearchOutlined />} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="contractType" label="合同类型">
            <Select placeholder="请选择" allowClear style={{ width: 150 }}>
              <Option value="采购合同">采购合同</Option>
              <Option value="服务合同">服务合同</Option>
              <Option value="租赁合同">租赁合同</Option>
              <Option value="委托合同">委托合同</Option>
              <Option value="销售合同">销售合同</Option>
              <Option value="劳动合同">劳动合同</Option>
            </Select>
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="请选择" allowClear style={{ width: 120 }}>
              <Option value="DRAFT">草稿</Option>
              <Option value="PENDING_SIGN">待签署</Option>
              <Option value="SIGNED">已签署</Option>
              <Option value="EXPIRED">已过期</Option>
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="日期范围">
            <RangePicker style={{ width: 260 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                搜索
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 合同列表 */}
      <Card
        title="合同列表"
        bordered={false}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddContract}>
            新建合同
          </Button>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginBottom: '16px' }}>
          <TabPane tab={`全部 (${contracts.length})`} key="all" />
          <TabPane tab={`草稿 (${draftCount})`} key="draft" />
          <TabPane tab={`待签署 (${pendingCount})`} key="pending" />
          <TabPane tab={`已签署 (${signedCount})`} key="signed" />
          <TabPane tab={`已过期 (${expiredCount})`} key="expired" />
        </Tabs>

        <Table
          columns={columns}
          dataSource={getFilteredContracts()}
          rowKey="id"
          loading={tableLoading}
          scroll={{ x: 1400 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSize: 10,
          }}
        />
      </Card>

      {/* 新建/编辑合同弹窗 */}
      <Modal
        title={editingContract ? '编辑合同' : '新建合同'}
        open={showAddModal}
        onOk={handleSaveContract}
        onCancel={() => setShowAddModal(false)}
        confirmLoading={loading}
        okText="保存"
        cancelText="取消"
        width={800}
      >
        <Form form={form} layout="vertical">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={16}>
              <Form.Item
                name="title"
                label="合同名称"
                rules={[{ required: true, message: '请输入合同名称' }]}
              >
                <Input placeholder="请输入合同名称" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="contractType"
                label="合同类型"
                rules={[{ required: true, message: '请选择合同类型' }]}
              >
                <Select placeholder="请选择合同类型">
                  <Option value="采购合同">采购合同</Option>
                  <Option value="服务合同">服务合同</Option>
                  <Option value="租赁合同">租赁合同</Option>
                  <Option value="委托合同">委托合同</Option>
                  <Option value="销售合同">销售合同</Option>
                  <Option value="劳动合同">劳动合同</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="firstParty"
                label="甲方"
                rules={[{ required: true, message: '请输入甲方名称' }]}
              >
                <Input placeholder="请输入甲方名称" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="secondParty"
                label="乙方"
                rules={[{ required: true, message: '请输入乙方名称' }]}
              >
                <Input placeholder="请输入乙方名称" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="amount"
                label="合同金额"
                rules={[{ required: true, message: '请输入合同金额' }]}
              >
                <InputNumber
                  min={0}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="请输入合同金额"
                  prefix="¥"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="startDate"
                label="开始日期"
                rules={[{ required: true, message: '请选择开始日期' }]}
              >
                <DatePicker style={{ width: '100%' }} placeholder="请选择开始日期" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="endDate"
                label="结束日期"
                rules={[{ required: true, message: '请选择结束日期' }]}
              >
                <DatePicker style={{ width: '100%' }} placeholder="请选择结束日期" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="signDate"
                label="签署日期"
              >
                <DatePicker style={{ width: '100%' }} placeholder="请选择签署日期" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 合同详情弹窗 */}
      <Modal
        title="合同详情"
        open={showDetailModal}
        onCancel={() => setShowDetailModal(false)}
        footer={
          <Button onClick={() => setShowDetailModal(false)}>
            关闭
          </Button>
        }
        width={700}
      >
        {selectedContract && (
          <div>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="合同名称">
                <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                  {selectedContract.title}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="合同编号">
                {selectedContract.contractNumber}
              </Descriptions.Item>
              <Descriptions.Item label="合同类型">
                <Tag color={getContractTypeColor(selectedContract.contractType)}>
                  {selectedContract.contractType}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="合同状态">
                {getStatusTag(selectedContract.status)}
              </Descriptions.Item>
              <Descriptions.Item label="合同金额">
                <span style={{ color: '#fa8c16', fontWeight: 'bold', fontSize: '18px' }}>
                  ¥{selectedContract.amountStr}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="甲方">
                {selectedContract.firstParty}
              </Descriptions.Item>
              <Descriptions.Item label="乙方">
                {selectedContract.secondParty}
              </Descriptions.Item>
              <Descriptions.Item label="有效期">
                {selectedContract.startDate} 至 {selectedContract.endDate}
              </Descriptions.Item>
              <Descriptions.Item label="签署日期">
                {selectedContract.signDate !== '-' ? selectedContract.signDate : '未签署'}
              </Descriptions.Item>
              <Descriptions.Item label="关联信息">
                <Space size={[8, 8]} wrap>
                  {selectedContract.hasSignature ? (
                    <Tag icon={<SafetyCertificateOutlined />} color="blue">
                      已完成电子签章
                    </Tag>
                  ) : (
                    <Tag color="default">未签章</Tag>
                  )}
                  {selectedContract.hasReminder ? (
                    <Tag icon={<BellOutlined />} color="orange">
                      已设置履约提醒
                    </Tag>
                  ) : (
                    <Tag color="default">未设置提醒</Tag>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {selectedContract.createTime}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {selectedContract.updateTime}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <div>
              <Space>
                {selectedContract.status === 'PENDING_SIGN' && (
                  <Button
                    type="primary"
                    icon={<SafetyCertificateOutlined />}
                    onClick={() => message.info('跳转至电子签章页面')}
                  >
                    前往签章
                  </Button>
                )}
                {selectedContract.status === 'SIGNED' && (
                  <Button
                    type="primary"
                    icon={<BellOutlined />}
                    onClick={() => message.info('跳转至履约提醒页面')}
                  >
                    设置提醒
                  </Button>
                )}
                <Button
                  icon={<EditOutlined />}
                  onClick={() => {
                    setShowDetailModal(false);
                    handleEditContract(selectedContract);
                  }}
                >
                  编辑合同
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ContractsPage;
