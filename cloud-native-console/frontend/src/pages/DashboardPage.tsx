import React, { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Select,
  Table,
  Tag,
  Statistic,
  Space,
  Button,
  Modal,
  Form,
  Input,
  message,
  Progress,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CloudOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { clusterApi, resourceApi, Cluster, Node, Pod } from '../api'

const { Option } = Select

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

const DashboardPage: React.FC = () => {
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [selectedCluster, setSelectedCluster] = useState<string>('')
  const [nodes, setNodes] = useState<Node[]>([])
  const [pods, setPods] = useState<Pod[]>([])
  const [loading, setLoading] = useState(false)
  const [addClusterModal, setAddClusterModal] = useState(false)
  const [form] = Form.useForm()

  const fetchClusters = async () => {
    setLoading(true)
    try {
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
      if (mockClusters.length > 0 && !selectedCluster) {
        setSelectedCluster(mockClusters[0].id)
      }
    } catch (error) {
      message.error('获取集群列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchResources = async () => {
    if (!selectedCluster) return
    setLoading(true)
    try {
      const mockNodes: Node[] = [
        {
          name: 'node-1-master',
          status: 'Ready',
          role: 'master',
          cpu: { used: 2.5, total: 8, percent: 31.25 },
          memory: { used: 4.2, total: 16, percent: 26.25 },
          pods: 5,
          ip: '192.168.1.10',
        },
        {
          name: 'node-2-worker',
          status: 'Ready',
          role: 'worker',
          cpu: { used: 4.8, total: 8, percent: 60 },
          memory: { used: 10.5, total: 16, percent: 65.625 },
          pods: 12,
          ip: '192.168.1.11',
        },
        {
          name: 'node-3-worker',
          status: 'Ready',
          role: 'worker',
          cpu: { used: 3.2, total: 8, percent: 40 },
          memory: { used: 8.3, total: 16, percent: 51.875 },
          pods: 10,
          ip: '192.168.1.12',
        },
        {
          name: 'node-4-worker',
          status: 'NotReady',
          role: 'worker',
          cpu: { used: 0, total: 8, percent: 0 },
          memory: { used: 0, total: 16, percent: 0 },
          pods: 0,
          ip: '192.168.1.13',
        },
        {
          name: 'node-5-worker',
          status: 'Ready',
          role: 'worker',
          cpu: { used: 6.5, total: 8, percent: 81.25 },
          memory: { used: 14.2, total: 16, percent: 88.75 },
          pods: 15,
          ip: '192.168.1.14',
        },
      ]
      setNodes(mockNodes)

      const mockPods: Pod[] = [
        { name: 'nginx-789654321-abcde', namespace: 'default', status: 'Running', node: 'node-2-worker', ip: '10.244.1.5', age: '2d3h', containers: 1 },
        { name: 'nginx-789654321-fghij', namespace: 'default', status: 'Running', node: 'node-3-worker', ip: '10.244.2.8', age: '2d3h', containers: 1 },
        { name: 'nginx-789654321-klmno', namespace: 'default', status: 'Pending', node: 'node-5-worker', ip: '10.244.5.2', age: '1h', containers: 1 },
        { name: 'mysql-0', namespace: 'production', status: 'Running', node: 'node-5-worker', ip: '10.244.5.3', age: '5d12h', containers: 1 },
        { name: 'redis-123456789-abcde', namespace: 'production', status: 'Running', node: 'node-2-worker', ip: '10.244.1.10', age: '3d2h', containers: 1 },
        { name: 'redis-123456789-fghij', namespace: 'production', status: 'Failed', node: 'node-3-worker', ip: '10.244.2.15', age: '15m', containers: 1 },
      ]
      setPods(mockPods)
    } catch (error) {
      message.error('获取资源信息失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClusters()
  }, [])

  useEffect(() => {
    fetchResources()
  }, [selectedCluster])

  const handleAddCluster = async (values: any) => {
    try {
      message.success('集群添加成功')
      setAddClusterModal(false)
      form.resetFields()
      fetchClusters()
    } catch (error) {
      message.error('添加集群失败')
    }
  }

  const handleDeleteCluster = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个集群配置吗？',
      onOk: () => {
        setClusters(clusters.filter(c => c.id !== id))
        if (selectedCluster === id && clusters.length > 1) {
          setSelectedCluster(clusters.find(c => c.id !== id)?.id || '')
        }
        message.success('集群已删除')
      },
    })
  }

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'connected':
      case 'Ready':
      case 'Running':
      case 'Succeeded':
        return <Tag color="success">{status}</Tag>
      case 'disconnected':
      case 'NotReady':
      case 'Failed':
        return <Tag color="error">{status}</Tag>
      case 'Pending':
        return <Tag color="warning">{status}</Tag>
      default:
        return <Tag>{status}</Tag>
    }
  }

  const currentCluster = clusters.find(c => c.id === selectedCluster)

  const nodeChartData = nodes.map(n => ({
    name: n.name,
    CPU: n.cpu.percent,
    内存: n.memory.percent,
  }))

  const podStatusData = [
    { name: 'Running', value: pods.filter(p => p.status === 'Running').length },
    { name: 'Pending', value: pods.filter(p => p.status === 'Pending').length },
    { name: 'Failed', value: pods.filter(p => p.status === 'Failed').length },
    { name: 'Succeeded', value: pods.filter(p => p.status === 'Succeeded').length },
  ]

  const nodeColumns = [
    {
      title: '节点名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Node) => (
        <Space>
          {record.role === 'master' && <Tag color="purple">master</Tag>}
          {record.role === 'worker' && <Tag color="blue">worker</Tag>}
          {text}
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
      title: 'CPU',
      dataIndex: 'cpu',
      key: 'cpu',
      render: (cpu: Node['cpu']) => (
        <Progress
          percent={cpu.percent}
          size="small"
          status={cpu.percent > 80 ? 'exception' : undefined}
          format={() => `${cpu.used.toFixed(1)}/${cpu.total} cores`}
        />
      ),
    },
    {
      title: '内存',
      dataIndex: 'memory',
      key: 'memory',
      render: (memory: Node['memory']) => (
        <Progress
          percent={memory.percent}
          size="small"
          status={memory.percent > 80 ? 'exception' : undefined}
          format={() => `${memory.used.toFixed(1)}/${memory.total} GB`}
        />
      ),
    },
    {
      title: 'Pod数量',
      dataIndex: 'pods',
      key: 'pods',
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
    },
  ]

  const podColumns = [
    {
      title: 'Pod名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '命名空间',
      dataIndex: 'namespace',
      key: 'namespace',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '节点',
      dataIndex: 'node',
      key: 'node',
    },
    {
      title: 'Pod IP',
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: '运行时间',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: '容器数',
      dataIndex: 'containers',
      key: 'containers',
    },
  ]

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space style={{ marginBottom: 16 }}>
                <span style={{ fontWeight: 'bold' }}>选择集群：</span>
                <Select
                  style={{ width: 300 }}
                  value={selectedCluster}
                  onChange={setSelectedCluster}
                  placeholder="请选择集群"
                >
                  {clusters.map(c => (
                    <Option key={c.id} value={c.id}>
                      <Space>
                        {c.status === 'connected' ? (
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        ) : (
                          <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                        )}
                        {c.name}
                      </Space>
                    </Option>
                  ))}
                </Select>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setAddClusterModal(true)}
                >
                  添加集群
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    fetchClusters()
                    fetchResources()
                  }}
                >
                  刷新
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>

        {currentCluster && (
          <>
            <Col span={6}>
              <Card>
                <Statistic
                  title="集群状态"
                  value={currentCluster.status === 'connected' ? '已连接' : '已断开'}
                  valueStyle={{ color: currentCluster.status === 'connected' ? '#3f8600' : '#cf1322' }}
                  prefix={currentCluster.status === 'connected' ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="节点数量"
                  value={currentCluster.nodes}
                  prefix={<CloudOutlined />}
                  suffix="个"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Pod数量"
                  value={currentCluster.pods}
                  prefix={<CloudOutlined />}
                  suffix="个"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="K8s版本"
                  value={currentCluster.version}
                  prefix={<CloudOutlined />}
                />
              </Card>
            </Col>

            <Col span={12}>
              <Card title="节点资源使用率">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={nodeChartData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="CPU" fill="#8884d8" />
                    <Bar dataKey="内存" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            <Col span={12}>
              <Card title="Pod状态分布">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={podStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {podStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            <Col span={24}>
              <Card title="节点列表">
                <Table
                  columns={nodeColumns}
                  dataSource={nodes}
                  rowKey="name"
                  loading={loading}
                  size="small"
                />
              </Card>
            </Col>

            <Col span={24}>
              <Card title="Pod列表">
                <Table
                  columns={podColumns}
                  dataSource={pods}
                  rowKey="name"
                  loading={loading}
                  size="small"
                  scroll={{ x: 800 }}
                />
              </Card>
            </Col>
          </>
        )}
      </Row>

      <Modal
        title="添加集群"
        open={addClusterModal}
        onCancel={() => setAddClusterModal(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddCluster}
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
            <Input.TextArea
              rows={8}
              placeholder="粘贴 kubeconfig 文件内容..."
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                添加
              </Button>
              <Button onClick={() => setAddClusterModal(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default DashboardPage
