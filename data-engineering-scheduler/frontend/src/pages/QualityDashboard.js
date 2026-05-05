import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Tag,
  message,
  Tabs,
  Statistic,
  Row,
  Col,
  Timeline,
  Descriptions,
  Divider,
  Radio,
  DatePicker,
} from 'antd';
import {
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  LineChartOutlined,
  ClusterOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

const ruleTypes = [
  {
    value: 'not_null',
    label: '非空检查',
    description: '检查字段是否为 NULL',
    icon: <ExclamationCircleOutlined />,
  },
  {
    value: 'uniqueness',
    label: '唯一性检查',
    description: '检查字段是否唯一',
    icon: <CheckCircleOutlined />,
  },
  {
    value: 'range',
    label: '值域检查',
    description: '检查字段值是否在范围内',
    icon: <LineChartOutlined />,
  },
  {
    value: 'regex',
    label: '正则匹配',
    description: '检查字段值是否匹配正则表达式',
    icon: <EyeOutlined />,
  },
  {
    value: 'custom_sql',
    label: '自定义SQL',
    description: '使用自定义SQL进行检查',
    icon: <EditOutlined />,
  },
];

const severityLevels = [
  { value: 'low', label: '低', color: 'blue' },
  { value: 'medium', label: '中', color: 'orange' },
  { value: 'high', label: '高', color: 'red' },
  { value: 'critical', label: '严重', color: 'red' },
];

const QualityDashboard = () => {
  const [qualityRules, setQualityRules] = useState([]);
  const [monitoringData, setMonitoringData] = useState([]);
  const [dataLineage, setDataLineage] = useState([]);
  const [impactAnalysis, setImpactAnalysis] = useState([]);
  const [ruleModal, setRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form] = Form.useForm();
  const [statistics, setStatistics] = useState({
    totalRules: 0,
    passed: 0,
    failed: 0,
    warning: 0,
  });
  const lineageCanvasRef = useRef(null);
  const [selectedDataSource, setSelectedDataSource] = useState(null);

  useEffect(() => {
    loadQualityRules();
    loadMonitoringData();
    loadStatistics();
    loadDataLineage();
    loadImpactAnalysis();
  }, []);

  const loadQualityRules = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/quality/rules');
      setQualityRules(response.data);
    } catch (error) {
      console.error('加载质量规则失败:', error);
      const mockRules = [
        {
          id: 1,
          name: '用户ID非空检查',
          type: 'not_null',
          table: 'users',
          column: 'user_id',
          severity: 'high',
          status: 'active',
          lastRun: '2026-05-04 14:30:00',
          lastResult: 'passed',
        },
        {
          id: 2,
          name: '邮箱唯一性检查',
          type: 'uniqueness',
          table: 'users',
          column: 'email',
          severity: 'medium',
          status: 'active',
          lastRun: '2026-05-04 14:35:00',
          lastResult: 'passed',
        },
        {
          id: 3,
          name: '金额值域检查',
          type: 'range',
          table: 'transactions',
          column: 'amount',
          severity: 'high',
          status: 'active',
          lastRun: '2026-05-04 15:00:00',
          lastResult: 'failed',
          minValue: 0,
          maxValue: 1000000,
        },
      ];
      setQualityRules(mockRules);
    }
  };

  const loadMonitoringData = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/quality/monitoring');
      setMonitoringData(response.data);
    } catch (error) {
      console.error('加载监控数据失败:', error);
      const mockData = [
        {
          id: 1,
          ruleName: '用户ID非空检查',
          checkTime: '2026-05-04 14:30:00',
          totalRecords: 15000,
          passedRecords: 15000,
          failedRecords: 0,
          passRate: 100,
          status: 'passed',
        },
        {
          id: 2,
          ruleName: '邮箱唯一性检查',
          checkTime: '2026-05-04 14:35:00',
          totalRecords: 15000,
          passedRecords: 14998,
          failedRecords: 2,
          passRate: 99.99,
          status: 'warning',
        },
        {
          id: 3,
          ruleName: '金额值域检查',
          checkTime: '2026-05-04 15:00:00',
          totalRecords: 8500,
          passedRecords: 8420,
          failedRecords: 80,
          passRate: 99.06,
          status: 'failed',
        },
      ];
      setMonitoringData(mockData);
    }
  };

  const loadStatistics = () => {
    const passed = qualityRules.filter((r) => r.lastResult === 'passed').length;
    const failed = qualityRules.filter((r) => r.lastResult === 'failed').length;
    const warning = qualityRules.filter((r) => r.lastResult === 'warning').length;

    setStatistics({
      totalRules: qualityRules.length,
      passed,
      failed,
      warning,
    });
  };

  const loadDataLineage = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/quality/lineage');
      setDataLineage(response.data);
    } catch (error) {
      console.error('加载数据血缘失败:', error);
      const mockLineage = {
        nodes: [
          { id: 'source_users', name: 'users', type: 'source', x: 100, y: 150 },
          { id: 'source_orders', name: 'orders', type: 'source', x: 100, y: 300 },
          { id: 'etl_user_orders', name: 'user_orders_join', type: 'etl', x: 350, y: 225 },
          { id: 'dw_user_summary', name: 'user_summary', type: 'warehouse', x: 600, y: 225 },
          { id: 'report_daily_sales', name: 'daily_sales_report', type: 'report', x: 850, y: 225 },
        ],
        links: [
          { source: 'source_users', target: 'etl_user_orders' },
          { source: 'source_orders', target: 'etl_user_orders' },
          { source: 'etl_user_orders', target: 'dw_user_summary' },
          { source: 'dw_user_summary', target: 'report_daily_sales' },
        ],
      };
      setDataLineage(mockLineage);
    }
  };

  const loadImpactAnalysis = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/quality/impact');
      setImpactAnalysis(response.data);
    } catch (error) {
      console.error('加载影响分析失败:', error);
      const mockImpact = [
        {
          id: 1,
          sourceTable: 'users',
          affectedTables: ['user_summary', 'daily_sales_report', 'customer_analysis'],
          affectedJobs: ['job_user_aggregation', 'job_daily_report'],
          impactLevel: 'high',
          description: '用户表变更将影响多个下游汇总表和报表',
        },
        {
          id: 2,
          sourceTable: 'orders',
          affectedTables: ['order_details', 'revenue_report'],
          affectedJobs: ['job_order_processing'],
          impactLevel: 'medium',
          description: '订单表变更将影响订单详情和收入报表',
        },
      ];
      setImpactAnalysis(mockImpact);
    }
  };

  const handleSaveRule = async (values) => {
    try {
      if (editingRule) {
        await axios.put(`http://localhost:5000/api/quality/rules/${editingRule.id}`, values);
        message.success('规则更新成功');
      } else {
        await axios.post('http://localhost:5000/api/quality/rules', values);
        message.success('规则创建成功');
      }
      setRuleModal(false);
      form.resetFields();
      setEditingRule(null);
      loadQualityRules();
      loadStatistics();
    } catch (error) {
      message.error('保存规则失败: ' + error.message);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      await axios.delete(`http://localhost:5000/api/quality/rules/${ruleId}`);
      message.success('规则删除成功');
      loadQualityRules();
      loadStatistics();
    } catch (error) {
      message.error('删除规则失败: ' + error.message);
    }
  };

  const handleRunRule = async (ruleId) => {
    try {
      await axios.post(`http://localhost:5000/api/quality/rules/${ruleId}/run`);
      message.success('规则已提交运行');
      setTimeout(() => {
        loadQualityRules();
        loadMonitoringData();
        loadStatistics();
      }, 2000);
    } catch (error) {
      message.error('运行规则失败: ' + error.message);
    }
  };

  const getRuleTypeInfo = (type) => ruleTypes.find((r) => r.value === type);
  const getSeverityInfo = (severity) => severityLevels.find((s) => s.value === severity);

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed':
        return 'green';
      case 'failed':
        return 'red';
      case 'warning':
        return 'orange';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      default:
        return null;
    }
  };

  const ruleColumns = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: '规则类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const info = getRuleTypeInfo(type);
        return (
          <Tag>
            {info?.icon} {info?.label}
          </Tag>
        );
      },
    },
    {
      title: '表.字段',
      key: 'table_column',
      render: (_, record) => `${record.table}.${record.column}`,
    },
    {
      title: '严重级别',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity) => {
        const info = getSeverityInfo(severity);
        return <Tag color={info?.color}>{info?.label}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '上次检查结果',
      dataIndex: 'lastResult',
      key: 'lastResult',
      render: (result) => (
        <Space>
          {getStatusIcon(result)}
          <Tag color={getStatusColor(result)}>
            {result === 'passed' ? '通过' : result === 'failed' ? '失败' : '警告'}
          </Tag>
        </Space>
      ),
    },
    {
      title: '上次运行时间',
      dataIndex: 'lastRun',
      key: 'lastRun',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setEditingRule(record);
              form.setFieldsValue(record);
              setRuleModal(true);
            }}
          >
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => handleRunRule(record.id)}>
            运行
          </Button>
          <Button type="link" size="small" danger onClick={() => handleDeleteRule(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const monitoringColumns = [
    {
      title: '规则名称',
      dataIndex: 'ruleName',
      key: 'ruleName',
    },
    {
      title: '检查时间',
      dataIndex: 'checkTime',
      key: 'checkTime',
    },
    {
      title: '总记录数',
      dataIndex: 'totalRecords',
      key: 'totalRecords',
      render: (num) => num.toLocaleString(),
    },
    {
      title: '通过记录数',
      dataIndex: 'passedRecords',
      key: 'passedRecords',
      render: (num) => <span style={{ color: '#52c41a' }}>{num.toLocaleString()}</span>,
    },
    {
      title: '失败记录数',
      dataIndex: 'failedRecords',
      key: 'failedRecords',
      render: (num) => (
        <span style={{ color: num > 0 ? '#ff4d4f' : 'inherit' }}>
          {num.toLocaleString()}
        </span>
      ),
    },
    {
      title: '通过率',
      dataIndex: 'passRate',
      key: 'passRate',
      render: (rate) => (
        <Tag color={rate >= 99.9 ? 'green' : rate >= 95 ? 'orange' : 'red'}>
          {rate.toFixed(2)}%
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Space>
          {getStatusIcon(status)}
          <Tag color={getStatusColor(status)}>
            {status === 'passed' ? '通过' : status === 'failed' ? '失败' : '警告'}
          </Tag>
        </Space>
      ),
    },
  ];

  const impactColumns = [
    {
      title: '源表',
      dataIndex: 'sourceTable',
      key: 'sourceTable',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: '影响级别',
      dataIndex: 'impactLevel',
      key: 'impactLevel',
      render: (level) => (
        <Tag color={level === 'high' ? 'red' : level === 'medium' ? 'orange' : 'blue'}>
          {level === 'high' ? '高' : level === 'medium' ? '中' : '低'}
        </Tag>
      ),
    },
    {
      title: '受影响表',
      dataIndex: 'affectedTables',
      key: 'affectedTables',
      render: (tables) => (
        <Space wrap>
          {tables.map((table, idx) => (
            <Tag key={idx}>{table}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '受影响任务',
      dataIndex: 'affectedJobs',
      key: 'affectedJobs',
      render: (jobs) => (
        <Space wrap>
          {jobs.map((job, idx) => (
            <Tag key={idx} color="blue">{job}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
  ];

  const getNodeTypeColor = (type) => {
    switch (type) {
      case 'source':
        return '#1890ff';
      case 'etl':
        return '#52c41a';
      case 'warehouse':
        return '#722ed1';
      case 'report':
        return '#fa8c16';
      default:
        return '#d9d9d9';
    }
  };

  const getNodeTypeLabel = (type) => {
    switch (type) {
      case 'source':
        return '数据源';
      case 'etl':
        return 'ETL';
      case 'warehouse':
        return '数仓';
      case 'report':
        return '报表';
      default:
        return '未知';
    }
  };

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="质量规则总数"
              value={statistics.totalRules}
              prefix={<ClusterOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="通过规则"
              value={statistics.passed}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="警告规则"
              value={statistics.warning}
              valueStyle={{ color: '#cf1322' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="失败规则"
              value={statistics.failed}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs defaultActiveKey="rules">
          <TabPane tab="质量规则管理" key="rules">
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <h3>数据质量规则列表</h3>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingRule(null);
                  form.resetFields();
                  setRuleModal(true);
                }}
              >
                新建规则
              </Button>
            </div>
            <Table columns={ruleColumns} dataSource={qualityRules} rowKey="id" />
          </TabPane>

          <TabPane tab="实时监控" key="monitoring">
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <h3>数据质量监控记录</h3>
              <Space>
                <RangePicker />
                <Button
                  type="primary"
                  onClick={() => {
                    loadMonitoringData();
                    loadStatistics();
                    message.success('监控数据已刷新');
                  }}
                >
                  刷新
                </Button>
              </Space>
            </div>
            <Table columns={monitoringColumns} dataSource={monitoringData} rowKey="id" />
          </TabPane>

          <TabPane tab="数据血缘图谱" key="lineage">
            <div style={{ marginBottom: 16 }}>
              <h3>数据血缘关系</h3>
              <p style={{ color: '#666' }}>展示数据从源到目标的流转关系，点击节点查看详情</p>
            </div>
            
            <Card>
              <div
                style={{
                  width: '100%',
                  height: 500,
                  position: 'relative',
                  background: '#fafafa',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
                ref={lineageCanvasRef}
              >
                <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
                  {dataLineage.links?.map((link, idx) => {
                    const sourceNode = dataLineage.nodes?.find((n) => n.id === link.source);
                    const targetNode = dataLineage.nodes?.find((n) => n.id === link.target);
                    if (!sourceNode || !targetNode) return null;

                    const midX = (sourceNode.x + 100 + targetNode.x) / 2;
                    const midY = (sourceNode.y + 30 + targetNode.y + 30) / 2;

                    return (
                      <path
                        key={idx}
                        d={`M ${sourceNode.x + 100} ${sourceNode.y + 30} Q ${midX} ${midY}, ${targetNode.x} ${targetNode.y + 30}`}
                        fill="none"
                        stroke="#1890ff"
                        strokeWidth={2}
                        strokeDasharray="5,5"
                        markerEnd="url(#arrowhead)"
                      />
                    );
                  })}
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="10"
                      markerHeight="7"
                      refX="9"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3.5, 0 7" fill="#1890ff" />
                    </marker>
                  </defs>
                </svg>

                {dataLineage.nodes?.map((node) => (
                  <div
                    key={node.id}
                    style={{
                      position: 'absolute',
                      left: node.x,
                      top: node.y,
                      width: 140,
                      padding: '12px 16px',
                      background: '#fff',
                      border: `3px solid ${getNodeTypeColor(node.type)}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      transition: 'all 0.3s',
                    }}
                    onClick={() => setSelectedDataSource(node)}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: getNodeTypeColor(node.type),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                        }}
                      >
                        {node.type === 'source' && <LineChartOutlined />}
                        {node.type === 'etl' && <ClusterOutlined />}
                        {node.type === 'warehouse' && <CheckCircleOutlined />}
                        {node.type === 'report' && <EyeOutlined />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{node.name}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>
                          {getNodeTypeLabel(node.type)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div style={{ position: 'absolute', bottom: 16, left: 16, background: '#fff', padding: 12, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>图例</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: '#1890ff' }} />
                      <span>数据源</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: '#52c41a' }} />
                      <span>ETL 处理</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: '#722ed1' }} />
                      <span>数据仓库</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: '#fa8c16' }} />
                      <span>报表</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedDataSource && (
                <Card
                  title="节点详情"
                  size="small"
                  style={{ marginTop: 16 }}
                  extra={
                    <Button size="small" onClick={() => setSelectedDataSource(null)}>
                      关闭
                    </Button>
                  }
                >
                  <Descriptions column={2} size="small">
                    <Descriptions.Item label="名称">{selectedDataSource.name}</Descriptions.Item>
                    <Descriptions.Item label="类型">{getNodeTypeLabel(selectedDataSource.type)}</Descriptions.Item>
                    <Descriptions.Item label="上游依赖">
                      {dataLineage.links
                        ?.filter((l) => l.target === selectedDataSource.id)
                        .map((l) => dataLineage.nodes?.find((n) => n.id === l.source)?.name)
                        .filter(Boolean)
                        .join(', ') || '无'}
                    </Descriptions.Item>
                    <Descriptions.Item label="下游影响">
                      {dataLineage.links
                        ?.filter((l) => l.source === selectedDataSource.id)
                        .map((l) => dataLineage.nodes?.find((n) => n.id === l.target)?.name)
                        .filter(Boolean)
                        .join(', ') || '无'}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              )}
            </Card>
          </TabPane>

          <TabPane tab="影响分析" key="impact">
            <div style={{ marginBottom: 16 }}>
              <h3>数据变更影响分析</h3>
              <p style={{ color: '#666' }}>分析数据源变更对下游表和任务的影响范围</p>
            </div>
            <Table columns={impactColumns} dataSource={impactAnalysis} rowKey="id" />
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title={editingRule ? '编辑质量规则' : '新建质量规则'}
        open={ruleModal}
        onOk={() => form.submit()}
        onCancel={() => {
          setRuleModal(false);
          setEditingRule(null);
          form.resetFields();
        }}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveRule}
          initialValues={{
            severity: 'medium',
            status: 'active',
          }}
        >
          <Form.Item
            label="规则名称"
            name="name"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="例如：用户ID非空检查" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="规则类型"
                name="type"
                rules={[{ required: true, message: '请选择规则类型' }]}
              >
                <Select placeholder="请选择规则类型">
                  {ruleTypes.map((type) => (
                    <Option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="严重级别"
                name="severity"
                rules={[{ required: true, message: '请选择严重级别' }]}
              >
                <Select placeholder="请选择严重级别">
                  {severityLevels.map((level) => (
                    <Option key={level.value} value={level.value}>
                      <Tag color={level.color}>{level.label}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="目标表"
                name="table"
                rules={[{ required: true, message: '请输入目标表名' }]}
              >
                <Input placeholder="例如：users" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="目标字段"
                name="column"
                rules={[{ required: true, message: '请输入目标字段' }]}
              >
                <Input placeholder="例如：user_id" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="状态"
            name="status"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Radio.Group>
              <Radio value="active">启用</Radio>
              <Radio value="inactive">禁用</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
            {({ getFieldValue }) => {
              const ruleType = getFieldValue('type');
              
              if (ruleType === 'range') {
                return (
                  <>
                    <Divider>值域配置</Divider>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="最小值" name="minValue">
                          <InputNumber style={{ width: '100%' }} placeholder="最小值" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="最大值" name="maxValue">
                          <InputNumber style={{ width: '100%' }} placeholder="最大值" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                );
              }

              if (ruleType === 'regex') {
                return (
                  <>
                    <Divider>正则配置</Divider>
                    <Form.Item label="正则表达式" name="regexPattern">
                      <Input placeholder="例如：^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$" />
                    </Form.Item>
                  </>
                );
              }

              if (ruleType === 'custom_sql') {
                return (
                  <>
                    <Divider>自定义 SQL</Divider>
                    <Form.Item label="检查 SQL" name="customSql">
                      <Input.TextArea
                        rows={4}
                        placeholder="SELECT CASE WHEN COUNT(*) = 0 THEN 1 ELSE 0 END AS passed FROM table WHERE condition"
                      />
                    </Form.Item>
                  </>
                );
              }

              return null;
            }}
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="请输入规则描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default QualityDashboard;
