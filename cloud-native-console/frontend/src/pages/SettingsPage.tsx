import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Tag,
  message,
  Popconfirm,
  Tabs,
  Row,
  Col,
  Divider,
  List,
  Typography,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  ReloadOutlined,
  SettingOutlined,
  CloudOutlined,
  BellOutlined,
} from '@ant-design/icons'
import { Cluster, AlertRule } from '../api'

const { Option } = Select
const { TabPane } = Tabs
const { TextArea } = Input
const { Title, Text } = Typography

const SettingsPage: React.FC = () => {
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [alertRules, setAlertRules] = useState<AlertRule[]>([])
  const [selectedCluster, setSelectedCluster] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const [clusterModal, setClusterModal] = useState(false)
  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null)
  const [clusterForm] = Form.useForm()

  const [alertModal, setAlertModal] = useState(false)
  const [editingAlert, setEditingAlert] = useState<AlertRule | null>(null)
  const [alertForm] = Form.useForm()

  useEffect(() => {
    const mockClusters: Cluster[] = [
      {
        id: 'cluster-1',
        name: '生产环境集群',
        status: 'connected',
        version: '1.28.0',
        nodes: 5,
        pods: 42,
        namespaces: ['default', 'kube-system', 'production', 'monitoring'],
      },
      {
        id: 'cluster-2',
        name: '测试环境集群',
        status: 'connected',
        version: '1.27.5',
        nodes: 3,
        pods: 18,
        namespaces: ['default', 'test', 'dev'],
      },
      {
        id: 'cluster-3',
        name: '开发环境集群',
        status: 'disconnected',
        version: '1.26.8',
        nodes: 2,
        pods: 8,
        namespaces: ['default', 'dev'],
      },
    ]
    setClusters(mockClusters)
    if (mockClusters.length > 0) {
      setSelectedCluster(mockClusters[0].id)
    }

    const mockAlertRules: AlertRule[] = [
      {
        id: 'alert-1',
        name: 'CPU 使用率过高',
        metric: 'cpu_usage',
        condition: '>',
        threshold: 80,
        duration: '5m',
        enabled: true,
      },
      {
        id: 'alert-2',
        name: '内存使用率过高',
        metric: 'memory_usage',
        condition: '>',
        threshold: 85,
        duration: '5m',
        enabled: true,
      },
      {
        id: 'alert-3',
        name: 'Pod 重启次数过多',
        metric: 'pod_restart_count',
        condition: '>',
        threshold: 5,
        duration: '10m',
        enabled: false,
      },
      {
        id: 'alert-4',
        name: '节点不可达',
        metric: 'node_status',
        condition: '!=',
        threshold: 1,
        duration: '1m',
        enabled: true,
      },
    ]
    setAlertRules(mockAlertRules)
  }, [])

  const handleAddCluster = () => {
    setEditingCluster(null)
    clusterForm.resetFields()
    setClusterModal(true)
  }

  const handleEditCluster = (cluster: Cluster) => {
    setEditingCluster(cluster)
    clusterForm.setFieldsValue({
      name: cluster.name,
      kubeconfig: `# Kubeconfig 内容已保存
# 集群版本: ${cluster.version}
# 节点数: ${cluster.nodes}
# Pods: ${cluster.pods}`,
    })
    setClusterModal(true)
  }

  const handleSaveCluster = async (values: any) => {
    try {
      if (editingCluster) {
        setClusters(clusters.map(c => 
          c.id === editingCluster.id ? { ...c, name: values.name } : c
        ))
        message.success('集群更新成功')
      } else {
        const newCluster: Cluster = {
          id: `cluster-${Date.now()}`,
          name: values.name,
          status: 'connected',
          version: '1.28.0',
          nodes: 0,
          pods: 0,
          namespaces: ['default'],
        }
        setClusters([...clusters, newCluster])
        message.success('集群添加成功')
      }
      setClusterModal(false)
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleDeleteCluster = (id: string) => {
    setClusters(clusters.filter(c => c.id !== id))
    if (selectedCluster === id && clusters.length > 1) {
      setSelectedCluster(clusters.find(c => c.id !== id)?.id || '')
    }
    message.success('集群已删除')
  }

  const handleAddAlert = () => {
    setEditingAlert(null)
    alertForm.resetFields()
    setAlertModal(true)
  }

  const handleEditAlert = (alert: AlertRule) => {
    setEditingAlert(alert)
    alertForm.setFieldsValue({
      name: alert.name,
      metric: alert.metric,
      condition: alert.condition,
      threshold: alert.threshold,
      duration: alert.duration,
      enabled: alert.enabled,
    })
    setAlertModal(true)
  }

  const handleSaveAlert = async (values: any) => {
    try {
      if (editingAlert) {
        setAlertRules(alertRules.map(a => 
          a.id === editingAlert.id ? { ...a, ...values } : a
        ))
        message.success('告警规则更新成功')
      } else {
        const newAlert: AlertRule = {
          id: `alert-${Date.now()}`,
          ...values,
        }
        setAlertRules([...alertRules, newAlert])
        message.success('告警规则添加成功')
      }
      setAlertModal(false)
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleDeleteAlert = (id: string) => {
    setAlertRules(alertRules.filter(a => a.id !== id))
    message.success('告警规则已删除')
  }

  const toggleAlertEnabled = (id: string, enabled: boolean) => {
    setAlertRules(alertRules.map(a => 
      a.id === id ? { ...a, enabled } : a
    ))
    message.success(enabled ? '告警已启用' : '告警已禁用')
  }

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'connected':
        return <Tag color="success">已连接</Tag>
      case 'disconnected':
        return <Tag color="error">已断开</Tag>
      case 'error':
        return <Tag color="warning">错误</Tag>
      default:
        return <Tag>{status}</Tag>
    }
  }

  const clusterColumns = [
    {
      title: '集群名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Cluster) => (
        <Space>
          <CloudOutlined />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'K8s 版本',
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: '节点数',
      dataIndex: 'nodes',
      key: 'nodes',
    },
    {
      title: 'Pod 数',
      dataIndex: 'pods',
      key: 'pods',
    },
    {
      title: '命名空间',
      dataIndex: 'namespaces',
      key: 'namespaces',
      render: (namespaces: string[]) => (
        <Space wrap>
          {namespaces.map(ns => (
            <Tag key={ns}>{ns}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Cluster) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditCluster(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个集群配置吗？"
            onConfirm={() => handleDeleteCluster(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const alertColumns = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: AlertRule) => (
        <Space>
          <BellOutlined />
          <Text strong>{text}</Text>
          {!record.enabled && <Tag color="default">已禁用</Tag>}
        </Space>
      ),
    },
    {
      title: '指标',
      dataIndex: 'metric',
      key: 'metric',
      render: (metric: string) => (
        <Tag color="blue">{metric}</Tag>
      ),
    },
    {
      title: '条件',
      dataIndex: 'condition',
      key: 'condition',
      render: (condition: string, record: AlertRule) => (
        <Text strong>{condition} {record.threshold}</Text>
      ),
    },
    {
      title: '持续时间',
      dataIndex: 'duration',
      key: 'duration',
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean, record: AlertRule) => (
        <Switch
          checked={enabled}
          onChange={checked => toggleAlertEnabled(record.id, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: AlertRule) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditAlert(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个告警规则吗？"
            onConfirm={() => handleDeleteAlert(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Tabs defaultActiveKey="clusters">
        <TabPane
          tab={
            <span>
              <CloudOutlined />
              集群管理
            </span>
          }
          key="clusters"
        >
          <Card
            title="集群配置列表"
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddCluster}
              >
                添加集群
              </Button>
            }
          >
            <Table
              columns={clusterColumns}
              dataSource={clusters}
              rowKey="id"
              loading={loading}
            />
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <BellOutlined />
              告警规则
            </span>
          }
          key="alerts"
        >
          <Row gutter={16}>
            <Col span={24}>
              <Card
                title={`告警规则配置 (当前集群: ${clusters.find(c => c.id === selectedCluster)?.name || '未选择'})`
                extra={
                  <Space>
                    <Select
                      style={{ width: 200 }}
                      value={selectedCluster}
                      onChange={setSelectedCluster}
                    >
                      {clusters.map(c => (
                        <Option key={c.id} value={c.id}>
                          {c.name}
                        </Option>
                      ))}
                    </Select>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddAlert}
                    >
                      添加规则
                    </Button>
                  </Space>
                }
              >
                <Table
                  columns={alertColumns}
                  dataSource={alertRules}
                  rowKey="id"
                />
              </Card>
            </Col>
          </Row>

          <Divider />

          <Row gutter={16}>
            <Col span={12}>
              <Card title="预定义告警模板">
                <List
                  dataSource={[
                    'CPU 使用率超过 80%',
                    '内存使用率超过 85%',
                    '磁盘使用率超过 90%',
                    'Pod 重启次数超过 5 次',
                    '节点状态异常',
                    'API 响应时间过长',
                  ]}
                  renderItem={item => (
                    <List.Item
                      actions={[
                        <Button
                          type="link"
                          onClick={() => {
                            setEditingAlert(null)
                            alertForm.resetFields()
                            alertForm.setFieldsValue({
                              name: item,
                              metric: 'cpu_usage',
                              condition: '>',
                              threshold: 80,
                              duration: '5m',
                              enabled: true,
                            })
                            setAlertModal(true)
                          }}
                        >
                          快速添加
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<BellOutlined style={{ fontSize: 20 }} />}
                        title={item}
                        description="点击快速添加常用告警规则"
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="告警配置说明">
                <List>
                  <List.Item>
                    <Text strong>指标类型：</Text>
                    <Tag>cpu_usage</Tag>
                    <Tag>memory_usage</Tag>
                    <Tag>disk_usage</Tag>
                    <Tag>pod_restart_count</Tag>
                  </List.Item>
                  <List.Item>
                    <Text strong>条件运算符：</Text>
                    <Tag>大于 (>)</Tag>
                    <Tag>小于 (<)</Tag>
                    <Tag>等于 (=)</Tag>
                    <Tag>不等于 (!=)</Tag>
                  </List.Item>
                  <List.Item>
                    <Text strong>持续时间：</Text>
                    <Tag>1m</Tag>
                    <Tag>5m</Tag>
                    <Tag>10m</Tag>
                    <Tag>30m</Tag>
                    <Tag>1h</Tag>
                  </List.Item>
                </List>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane
          tab={
            <span>
              <SettingOutlined />
              系统设置
            </span>
          }
          key="settings"
        >
          <Card title="基本设置">
            <Form layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="刷新间隔 (秒)">
                    <InputNumber min={5} max={300} defaultValue={30} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="默认命名空间">
                    <Select defaultValue="default">
                      <Option value="default">default</Option>
                      <Option value="kube-system">kube-system</Option>
                      <Option value="production">production</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="主题">
                    <Select defaultValue="light">
                      <Option value="light">浅色</Option>
                      <Option value="dark">深色</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="语言">
                    <Select defaultValue="zh-CN">
                      <Option value="zh-CN">简体中文</Option>
                      <Option value="en-US">English</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                >
                  保存设置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
      </Tabs>

      <Modal
        title={editingCluster ? '编辑集群' : '添加集群'}
        open={clusterModal}
        onCancel={() => setClusterModal(false)}
        footer={null}
        width={700}
      >
        <Form
          form={clusterForm}
          layout="vertical"
          onFinish={handleSaveCluster}
        >
          <Form.Item
            name="name"
            label="集群名称"
            rules={[{ required: true, message: '请输入集群名称' }]}
          >
            <Input placeholder="例如：生产环境集群" />
          </Form.Item>
          <Form.Item
            name="kubeconfig"
            label="Kubeconfig 内容"
            rules={[{ required: true, message: '请输入 kubeconfig 内容' }]}
          >
            <TextArea
              rows={10}
              placeholder="粘贴 kubeconfig 文件内容..."
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingCluster ? '更新' : '添加'}
              </Button>
              <Button onClick={() => setClusterModal(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingAlert ? '编辑告警规则' : '添加告警规则'}
        open={alertModal}
        onCancel={() => setAlertModal(false)}
        footer={null}
        width={600}
      >
        <Form
          form={alertForm}
          layout="vertical"
          onFinish={handleSaveAlert}
        >
          <Form.Item
            name="name"
            label="规则名称"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="例如：CPU 使用率过高" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="metric"
                label="指标"
                rules={[{ required: true, message: '请选择指标' }]}
              >
                <Select placeholder="选择指标">
                  <Option value="cpu_usage">CPU 使用率</Option>
                  <Option value="memory_usage">内存使用率</Option>
                  <Option value="disk_usage">磁盘使用率</Option>
                  <Option value="pod_restart_count">Pod 重启次数</Option>
                  <Option value="node_status">节点状态</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="condition"
                label="条件"
                rules={[{ required: true, message: '请选择条件' }]}
              >
                <Select placeholder="选择条件">
                  <Option value=">">大于 (>)</Option>
                  <Option value="<">小于 (<)</Option>
                  <Option value="=">等于 (=)</Option>
                  <Option value="!=">不等于 (!=)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="threshold"
                label="阈值"
                rules={[{ required: true, message: '请输入阈值' }]}
              >
                <InputNumber style={{ width: '100%' }} placeholder="例如: 80" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="duration"
                label="持续时间"
                rules={[{ required: true, message: '请选择持续时间' }]}
              >
                <Select placeholder="选择持续时间">
                  <Option value="1m">1 分钟</Option>
                  <Option value="5m">5 分钟</Option>
                  <Option value="10m">10 分钟</Option>
                  <Option value="30m">30 分钟</Option>
                  <Option value="1h">1 小时</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="enabled"
                label="启用"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingAlert ? '更新' : '添加'}
              </Button>
              <Button onClick={() => setAlertModal(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default SettingsPage
