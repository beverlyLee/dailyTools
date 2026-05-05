import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Table,
  Progress,
  Button,
  Modal,
  Descriptions,
  Space,
  Select,
  Input,
  Form,
  List,
  Timeline,
  Statistic,
  Divider,
  Transfer,
  Radio,
  InputNumber,
  Switch,
  Empty,
  Spin,
  message,
} from 'antd';
import {
  AppstoreOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
  RollbackOutlined,
  ContainerOutlined,
  RocketOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { appAPI, deploymentAPI, nodeAPI } from '../utils/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const getStatusColor = (status) => {
  switch (status) {
    case 'running': return '#1890ff';
    case 'completed': return '#52c41a';
    case 'failed': return '#ff4d4f';
    case 'pending': return '#faad14';
    case 'rolling_back': return '#722ed1';
    default: return '#bfbfbf';
  }
};

const getStatusText = (status) => {
  const statusMap = {
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    pending: '等待中',
    rolling_back: '回滚中',
    rolled_back: '已回滚',
  };
  return statusMap[status] || status;
};

const getStrategyText = (strategy) => {
  const strategyMap = {
    canary: '灰度发布',
    rolling: '滚动更新',
    blue_green: '蓝绿发布',
  };
  return strategyMap[strategy] || strategy;
};

function AppDeploy() {
  const [apps, setApps] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [logsModalVisible, setLogsModalVisible] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [appsRes, deploysRes, nodesRes] = await Promise.all([
        appAPI.getAll(),
        deploymentAPI.getAll(),
        nodeAPI.getAll(),
      ]);
      setApps(appsRes.data || []);
      setDeployments(deploysRes.data || []);
      setNodes(nodesRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setApps([
        { id: 'app-1', name: 'Web应用服务', image: 'nginx', tag: 'latest', status: 'active' },
        { id: 'app-2', name: 'Redis缓存服务', image: 'redis', tag: '7-alpine', status: 'active' },
        { id: 'app-3', name: 'MySQL数据库服务', image: 'mysql', tag: '8.0', status: 'inactive' },
      ]);
      setDeployments([
        {
          id: 'deploy-1',
          app_name: 'Web应用服务',
          app_id: 'app-1',
          image: 'nginx',
          tag: '1.25',
          strategy: 'canary',
          canary_percentage: 20,
          status: 'completed',
          progress: 100,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          node_ids: ['node-1', 'node-2', 'node-3'],
        },
        {
          id: 'deploy-2',
          app_name: 'Redis缓存服务',
          app_id: 'app-2',
          image: 'redis',
          tag: '7-alpine',
          strategy: 'rolling',
          status: 'running',
          progress: 65,
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          node_ids: ['node-1', 'node-4'],
        },
      ]);
      setNodes([
        { key: 'node-1', title: '北京节点-01', description: '192.168.1.10', disabled: false },
        { key: 'node-2', title: '上海节点-01', description: '192.168.2.20', disabled: false },
        { key: 'node-3', title: '新加坡节点-01', description: '192.168.3.30', disabled: false },
        { key: 'node-4', title: '东京节点-01', description: '192.168.4.40', disabled: false },
        { key: 'node-5', title: '法兰克福节点-01', description: '192.168.5.50', disabled: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeployment = async (values) => {
    try {
      const data = {
        app_id: values.app_id,
        app_name: apps.find(a => a.id === values.app_id)?.name || '',
        image: values.image,
        tag: values.tag,
        node_ids: values.selected_nodes,
        strategy: values.strategy,
        canary_percentage: values.canary_percentage,
      };
      
      await deploymentAPI.create(data);
      message.success('部署任务创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error('创建部署任务失败');
    }
  };

  const handleRollback = async (deployment) => {
    try {
      await deploymentAPI.rollback(deployment.id);
      message.success('回滚操作已启动');
      fetchData();
    } catch (error) {
      message.error('回滚操作失败');
    }
  };

  const handleViewLogs = (deployment) => {
    setSelectedDeployment(deployment);
    setLogsModalVisible(true);
  };

  const handleViewDetail = (deployment) => {
    setSelectedDeployment(deployment);
    setDetailModalVisible(true);
  };

  const deploymentColumns = [
    {
      title: '应用名称',
      dataIndex: 'app_name',
      key: 'app_name',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: '镜像版本',
      key: 'version',
      render: (_, record) => (
        <Tag color="blue">
          <ContainerOutlined /> {record.image}:{record.tag}
        </Tag>
      ),
    },
    {
      title: '发布策略',
      dataIndex: 'strategy',
      key: 'strategy',
      render: (strategy) => (
        <Tag color="purple">{getStrategyText(strategy)}</Tag>
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress, record) => (
        <Progress
          percent={progress}
          size="small"
          status={
            record.status === 'failed' ? 'exception' :
            record.status === 'completed' ? 'success' : 'active'
          }
        />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time) => new Date(time).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          />
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewLogs(record)}
          >
            日志
          </Button>
          {record.status === 'completed' && (
            <Button
              type="text"
              danger
              icon={<RollbackOutlined />}
              onClick={() => handleRollback(record)}
            >
              回滚
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const stats = [
    { label: '总部署数', value: deployments.length, icon: <RocketOutlined />, color: '#1890ff' },
    { label: '运行中', value: deployments.filter(d => d.status === 'running').length, color: '#1890ff' },
    { label: '已完成', value: deployments.filter(d => d.status === 'completed').length, color: '#52c41a' },
    { label: '失败', value: deployments.filter(d => d.status === 'failed').length, color: '#ff4d4f' },
  ];

  const deploymentChart = {
    title: { text: '部署趋势', left: 'center' },
    tooltip: { trigger: 'axis' },
    legend: { data: ['成功', '失败'], bottom: 10 },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '成功',
        type: 'bar',
        data: [12, 15, 8, 20, 18, 5, 3],
        itemStyle: { color: '#52c41a' },
      },
      {
        name: '失败',
        type: 'bar',
        data: [1, 0, 2, 1, 0, 0, 0],
        itemStyle: { color: '#ff4d4f' },
      },
    ],
  };

  const mockLogs = [
    { time: '10:00:01', level: 'info', message: '开始部署流程...' },
    { time: '10:00:02', level: 'info', message: '拉取镜像: nginx:1.25' },
    { time: '10:00:15', level: 'info', message: '镜像拉取成功' },
    { time: '10:00:16', level: 'info', message: '准备容器配置...' },
    { time: '10:00:18', level: 'info', message: '端口映射: 80->8080' },
    { time: '10:00:19', level: 'info', message: '环境变量已设置: ENV=production' },
    { time: '10:00:20', level: 'info', message: '创建容器...' },
    { time: '10:00:25', level: 'success', message: '容器创建成功, ID: abc123def456' },
    { time: '10:00:26', level: 'info', message: '启动容器...' },
    { time: '10:00:28', level: 'info', message: '等待健康检查...' },
    { time: '10:00:35', level: 'success', message: '容器健康检查通过' },
    { time: '10:00:36', level: 'success', message: '部署完成' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>边缘应用分发器</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            新建部署
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {stats.map((stat, index) => (
          <Col span={6} key={index}>
            <Card>
              <Statistic
                title={stat.label}
                value={stat.value}
                prefix={stat.icon}
                valueStyle={{ color: stat.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={16}>
          <Card title="部署任务列表">
            <Table
              columns={deploymentColumns}
              dataSource={deployments}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 5 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="应用列表">
            <List
              dataSource={apps}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<AppstoreOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                    title={
                      <Space>
                        <Text strong>{item.name}</Text>
                        <Tag color={item.status === 'active' ? 'success' : 'default'}>
                          {item.status === 'active' ? '活跃' : '停用'}
                        </Tag>
                      </Space>
                    }
                    description={`${item.image}:${item.tag}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="部署统计">
            <ReactECharts option={deploymentChart} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Modal
        title="新建部署任务"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateDeployment}
          initialValues={{
            strategy: 'rolling',
            canary_percentage: 20,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="app_id"
                label="选择应用"
                rules={[{ required: true, message: '请选择应用' }]}
              >
                <Select placeholder="请选择要部署的应用">
                  {apps.filter(a => a.status === 'active').map((app) => (
                    <Option key={app.id} value={app.id}>
                      {app.name} ({app.image}:{app.tag})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="tag"
                label="镜像标签"
                rules={[{ required: true, message: '请输入镜像标签' }]}
              >
                <Input placeholder="例如: latest, v1.0.0" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="image"
            label="镜像地址"
            rules={[{ required: true, message: '请输入镜像地址' }]}
          >
            <Input placeholder="例如: nginx, registry.example.com/myapp" />
          </Form.Item>

          <Form.Item label="发布策略">
            <Form.Item name="strategy" noStyle>
              <Radio.Group>
                <Radio.Button value="rolling">
                  <RocketOutlined /> 滚动更新
                </Radio.Button>
                <Radio.Button value="canary">
                  <WarningOutlined /> 灰度发布
                </Radio.Button>
                <Radio.Button value="blue_green">
                  <CheckCircleOutlined /> 蓝绿发布
                </Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.strategy !== curr.strategy}
          >
            {({ getFieldValue }) =>
              getFieldValue('strategy') === 'canary' ? (
                <Form.Item
                  name="canary_percentage"
                  label="灰度流量比例"
                  rules={[{ required: true, message: '请设置灰度流量比例' }]}
                >
                  <InputNumber
                    min={1}
                    max={99}
                    formatter={(value) => `${value}%`}
                    parser={(value) => value.replace('%', '')}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item
            name="selected_nodes"
            label="选择目标节点"
            rules={[{ required: true, message: '请选择至少一个目标节点' }]}
          >
            <Transfer
              dataSource={nodes}
              titles={['可用节点', '已选节点']}
              targetKeys={[]}
              onChange={(targetKeys) => form.setFieldValue('selected_nodes', targetKeys)}
              render={(item) => `${item.title} (${item.description})`}
              listStyle={{ width: '100%', height: 200 }}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<PlayCircleOutlined />}>
                开始部署
              </Button>
              <Button onClick={() => setCreateModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`部署详情 - ${selectedDeployment?.app_name}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={800}
        footer={[
          <Button key="logs" onClick={() => {
            setDetailModalVisible(false);
            setLogsModalVisible(true);
          }}>
            查看日志
          </Button>,
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {selectedDeployment && (
          <>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="应用名称">{selectedDeployment.app_name}</Descriptions.Item>
              <Descriptions.Item label="镜像版本">
                {selectedDeployment.image}:{selectedDeployment.tag}
              </Descriptions.Item>
              <Descriptions.Item label="发布策略">
                <Tag color="purple">{getStrategyText(selectedDeployment.strategy)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={getStatusColor(selectedDeployment.status)}>
                  {getStatusText(selectedDeployment.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="目标节点数">
                {selectedDeployment.node_ids?.length || 0} 个
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(selectedDeployment.created_at).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Title level={5}>部署进度</Title>
            <Progress
              percent={selectedDeployment.progress}
              status={
                selectedDeployment.status === 'failed' ? 'exception' :
                selectedDeployment.status === 'completed' ? 'success' : 'active'
              }
              size="large"
              style={{ marginBottom: 24 }}
            />

            <Title level={5}>节点状态</Title>
            <Timeline
              items={(selectedDeployment.node_ids || []).map((nodeId, index) => ({
                dot: (
                  index < (selectedDeployment.progress || 0) / (100 / (selectedDeployment.node_ids?.length || 1))
                    ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    : <CloseCircleOutlined style={{ color: '#bfbfbf' }} />
                ),
                children: (
                  <Space>
                    <Text strong>节点 {nodeId}</Text>
                    <Tag>
                      {index < (selectedDeployment.progress || 0) / (100 / (selectedDeployment.node_ids?.length || 1))
                        ? '已完成' : '等待中'}
                    </Tag>
                  </Space>
                ),
              }))}
            />
          </>
        )}
      </Modal>

      <Modal
        title={`部署日志 - ${selectedDeployment?.app_name}`}
        open={logsModalVisible}
        onCancel={() => setLogsModalVisible(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setLogsModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        <div className="deployment-log">
          {mockLogs.map((log, index) => (
            <div key={index} style={{ marginBottom: 4 }}>
              <Text type="secondary">[{log.time}]</Text>
              <Text
                className={`log-${log.level === 'success' ? 'success' : log.level === 'error' ? 'error' : 'info'}`}
              >
                {' '}[{log.level.toUpperCase()}]
              </Text>
              <Text> {log.message}</Text>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

export default AppDeploy;
