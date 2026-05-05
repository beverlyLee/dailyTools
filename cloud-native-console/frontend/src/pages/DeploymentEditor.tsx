import React, { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Steps,
  Divider,
  message,
  Tag,
  Collapse,
  Tabs,
  Table,
  Modal,
  Typography,
  Alert,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  SaveOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import { deployApi, resourceApi, Cluster, Pod, DeployConfig } from '../api'

const { Option } = Select
const { Step } = Steps
const { Panel } = Collapse
const { TabPane } = Tabs
const { TextArea } = Input
const { Text, Title } = Typography

const DeploymentEditor: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0)
  const [form] = Form.useForm()
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [yamlPreview, setYamlPreview] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [deployLogs, setDeployLogs] = useState<string[]>([])
  const [showDeployResult, setShowDeployResult] = useState(false)
  const [deploySuccess, setDeploySuccess] = useState(false)

  const [containers, setContainers] = useState([
    {
      name: 'main',
      image: 'nginx:latest',
      ports: [{ containerPort: 80 }],
      env: [] as { name: string; value: string }[],
      resources: {
        limits: { cpu: '500m', memory: '256Mi' },
        requests: { cpu: '250m', memory: '128Mi' },
      },
    },
  ])

  const [variables, setVariables] = useState<{ name: string; value: string; env: { dev: string; test: string; prod: string } }[]>([])

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
    ]
    setClusters(mockClusters)
  }, [])

  const steps = [
    { title: '基本配置', description: '集群、命名空间等' },
    { title: 'Deployment 配置', description: '容器、副本数等' },
    { title: 'Service 配置', description: '服务暴露' },
    { title: 'Ingress 配置', description: '域名路由' },
    { title: '环境变量', description: '变量替换' },
    { title: '预览部署', description: '确认并部署' },
  ]

  const handleNext = () => {
    setCurrentStep(currentStep + 1)
  }

  const handlePrev = () => {
    setCurrentStep(currentStep - 1)
  }

  const addContainer = () => {
    setContainers([
      ...containers,
      {
        name: `container-${containers.length + 1}`,
        image: '',
        ports: [],
        env: [],
        resources: {
          limits: { cpu: '500m', memory: '256Mi' },
          requests: { cpu: '250m', memory: '128Mi' },
        },
      },
    ])
  }

  const removeContainer = (index: number) => {
    if (containers.length > 1) {
      setContainers(containers.filter((_, i) => i !== index))
    } else {
      message.warning('至少需要一个容器')
    }
  }

  const updateContainer = (index: number, field: string, value: any) => {
    const newContainers = [...containers]
    newContainers[index] = { ...newContainers[index], [field]: value }
    setContainers(newContainers)
  }

  const addEnvVar = (containerIndex: number) => {
    const newContainers = [...containers]
    newContainers[containerIndex].env.push({ name: '', value: '' })
    setContainers(newContainers)
  }

  const updateEnvVar = (containerIndex: number, envIndex: number, field: string, value: string) => {
    const newContainers = [...containers]
    newContainers[containerIndex].env[envIndex][field as 'name' | 'value'] = value
    setContainers(newContainers)
  }

  const removeEnvVar = (containerIndex: number, envIndex: number) => {
    const newContainers = [...containers]
    newContainers[containerIndex].env.splice(envIndex, 1)
    setContainers(newContainers)
  }

  const addPort = (containerIndex: number) => {
    const newContainers = [...containers]
    newContainers[containerIndex].ports.push({ containerPort: 8080 })
    setContainers(newContainers)
  }

  const updatePort = (containerIndex: number, portIndex: number, value: number) => {
    const newContainers = [...containers]
    newContainers[containerIndex].ports[portIndex].containerPort = value
    setContainers(newContainers)
  }

  const removePort = (containerIndex: number, portIndex: number) => {
    const newContainers = [...containers]
    newContainers[containerIndex].ports.splice(portIndex, 1)
    setContainers(newContainers)
  }

  const addVariable = () => {
    setVariables([
      ...variables,
      { name: '', value: '', env: { dev: '', test: '', prod: '' } },
    ])
  }

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index))
  }

  const updateVariable = (index: number, field: string, value: string, env?: string) => {
    const newVariables = [...variables]
    if (env) {
      newVariables[index].env[env as 'dev' | 'test' | 'prod'] = value
    } else {
      newVariables[index][field as 'name' | 'value'] = value
    }
    setVariables(newVariables)
  }

  const generateYaml = () => {
    const values = form.getFieldsValue()
    const yaml = `# Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${values.deploymentName || 'my-app'}
  namespace: ${values.namespace || 'default'}
  labels:
    app: ${values.deploymentName || 'my-app'}
spec:
  replicas: ${values.replicas || 1}
  selector:
    matchLabels:
      app: ${values.deploymentName || 'my-app'}
  template:
    metadata:
      labels:
        app: ${values.deploymentName || 'my-app'}
    spec:
      containers:
${containers.map((c, i) => `      - name: ${c.name}
        image: ${c.image}
        ports:
${c.ports.map(p => `        - containerPort: ${p.containerPort}`).join('\n')}
${c.env.length > 0 ? `        env:
${c.env.map(e => `        - name: ${e.name}
          value: "${e.value}"`).join('\n')}` : ''}
        resources:
          limits:
            cpu: ${c.resources.limits.cpu}
            memory: ${c.resources.limits.memory}
          requests:
            cpu: ${c.resources.requests.cpu}
            memory: ${c.resources.requests.memory}`).join('\n')}
---
# Service
apiVersion: v1
kind: Service
metadata:
  name: ${values.serviceName || values.deploymentName || 'my-app'}
  namespace: ${values.namespace || 'default'}
spec:
  type: ${values.serviceType || 'ClusterIP'}
  selector:
    app: ${values.deploymentName || 'my-app'}
  ports:
    - port: ${values.servicePort || 80}
      targetPort: ${values.targetPort || 80}
${values.ingressName ? `
---
# Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${values.ingressName}
  namespace: ${values.namespace || 'default'}
spec:
  rules:
${values.ingressHost ? `  - host: ${values.ingressHost}
    http:
      paths:
        - path: ${values.ingressPath || '/'}
          pathType: Prefix
          backend:
            service:
              name: ${values.serviceName || values.deploymentName || 'my-app'}
              port:
                number: ${values.servicePort || 80}` : ''}
` : ''}
${variables.length > 0 ? `
# 环境变量替换说明
# 以下变量将在部署时根据环境进行替换：
${variables.map(v => `# ${v.name}=${v.value || v.env.dev || v.env.test || v.env.prod}`).join('\n')}
` : ''}`

    setYamlPreview(yaml)
    setShowPreview(true)
  }

  const handleDeploy = async () => {
    setDeploying(true)
    setDeployLogs([])
    setShowDeployResult(true)

    try {
      const logs = [
        `[${new Date().toLocaleTimeString()}] 开始部署到集群: ${form.getFieldValue('cluster') || 'production-cluster'}`,
        `[${new Date().toLocaleTimeString()}] 正在创建 Deployment...`,
        `[${new Date().toLocaleTimeString()}] Deployment 创建成功`,
        `[${new Date().toLocaleTimeString()}] 正在创建 Service...`,
        `[${new Date().toLocaleTimeString()}] Service 创建成功`,
        form.getFieldValue('ingressName') ? `[${new Date().toLocaleTimeString()}] 正在创建 Ingress...` : null,
        form.getFieldValue('ingressName') ? `[${new Date().toLocaleTimeString()}] Ingress 创建成功` : null,
        `[${new Date().toLocaleTimeString()}] 等待 Pod 启动...`,
        `[${new Date().toLocaleTimeString()}] Pod nginx-789654321-abcde 状态: Running`,
        `[${new Date().toLocaleTimeString()}] Pod nginx-789654321-fghij 状态: Running`,
        `[${new Date().toLocaleTimeString()}] ✅ 部署完成！`,
      ].filter(Boolean) as string[]

      for (let i = 0; i < logs.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500))
        setDeployLogs(prev => [...prev, logs[i]])
      }

      setDeploySuccess(true)
      message.success('部署成功！')
    } catch (error) {
      setDeploySuccess(false)
      message.error('部署失败')
    } finally {
      setDeploying(false)
    }
  }

  const renderBasicConfig = () => (
    <Form form={form} layout="vertical">
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="cluster"
            label="目标集群"
            rules={[{ required: true, message: '请选择目标集群' }]}
          >
            <Select placeholder="请选择要部署的集群">
              {clusters.filter(c => c.status === 'connected').map(c => (
                <Option key={c.id} value={c.id}>{c.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="namespace"
            label="命名空间"
            initialValue="default"
          >
            <Select placeholder="请选择命名空间">
              <Option value="default">default</Option>
              <Option value="kube-system">kube-system</Option>
              <Option value="production">production</Option>
              <Option value="dev">dev</Option>
              <Option value="test">test</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  )

  const renderDeploymentConfig = () => (
    <div>
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="deploymentName"
              label="Deployment 名称"
              initialValue="my-app"
              rules={[{ required: true, message: '请输入 Deployment 名称' }]}
            >
              <Input placeholder="例如: my-web-app" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="replicas"
              label="副本数量"
              initialValue={1}
            >
              <InputNumber min={1} max={100} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      <Divider>容器配置</Divider>

      {containers.map((container, index) => (
        <Card
          key={index}
          title={`容器 ${index + 1}: ${container.name}`}
          extra={
            <Space>
              {containers.length > 1 && (
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeContainer(index)}
                />
              )}
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="容器名称">
                <Input
                  value={container.name}
                  onChange={e => updateContainer(index, 'name', e.target.value)}
                  placeholder="例如: main-container"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="镜像">
                <Input
                  value={container.image}
                  onChange={e => updateContainer(index, 'image', e.target.value)}
                  placeholder="例如: nginx:latest"
                />
              </Form.Item>
            </Col>
          </Row>

          <Collapse defaultActiveKey={[]}>
            <Panel header="端口配置" key="ports">
              <Space direction="vertical" style={{ width: '100%' }}>
                {container.ports.map((port, pIndex) => (
                  <Row key={pIndex} gutter={16}>
                    <Col span={8}>
                      <Form.Item label="容器端口">
                        <InputNumber
                          min={1}
                          max={65535}
                          value={port.containerPort}
                          onChange={val => updatePort(index, pIndex, val || 80)}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item label="协议">
                        <Select defaultValue="TCP">
                          <Option value="TCP">TCP</Option>
                          <Option value="UDP">UDP</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item label="&nbsp;">
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removePort(index, pIndex)}
                        >
                          删除
                        </Button>
                      </Form.Item>
                    </Col>
                  </Row>
                ))}
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => addPort(index)}
                  style={{ width: '100%' }}
                >
                  添加端口
                </Button>
              </Space>
            </Panel>

            <Panel header="环境变量" key="env">
              <Space direction="vertical" style={{ width: '100%' }}>
                {container.env.map((env, eIndex) => (
                  <Row key={eIndex} gutter={16}>
                    <Col span={8}>
                      <Form.Item label="变量名">
                        <Input
                          value={env.name}
                          onChange={e => updateEnvVar(index, eIndex, 'name', e.target.value)}
                          placeholder="例如: DB_HOST"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={10}>
                      <Form.Item label="变量值">
                        <Input
                          value={env.value}
                          onChange={e => updateEnvVar(index, eIndex, 'value', e.target.value)}
                          placeholder="例如: localhost:3306"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item label="&nbsp;">
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeEnvVar(index, eIndex)}
                        >
                          删除
                        </Button>
                      </Form.Item>
                    </Col>
                  </Row>
                ))}
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => addEnvVar(index)}
                  style={{ width: '100%' }}
                >
                  添加环境变量
                </Button>
              </Space>
            </Panel>

            <Panel header="资源限制" key="resources">
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item label="CPU 限制">
                    <Select
                      value={container.resources.limits.cpu}
                      onChange={val => updateContainer(index, 'resources', {
                        ...container.resources,
                        limits: { ...container.resources.limits, cpu: val }
                      })}
                    >
                      <Option value="100m">100m</Option>
                      <Option value="250m">250m</Option>
                      <Option value="500m">500m</Option>
                      <Option value="1">1</Option>
                      <Option value="2">2</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="内存限制">
                    <Select
                      value={container.resources.limits.memory}
                      onChange={val => updateContainer(index, 'resources', {
                        ...container.resources,
                        limits: { ...container.resources.limits, memory: val }
                      })}
                    >
                      <Option value="128Mi">128Mi</Option>
                      <Option value="256Mi">256Mi</Option>
                      <Option value="512Mi">512Mi</Option>
                      <Option value="1Gi">1Gi</Option>
                      <Option value="2Gi">2Gi</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="CPU 请求">
                    <Select
                      value={container.resources.requests.cpu}
                      onChange={val => updateContainer(index, 'resources', {
                        ...container.resources,
                        requests: { ...container.resources.requests, cpu: val }
                      })}
                    >
                      <Option value="100m">100m</Option>
                      <Option value="250m">250m</Option>
                      <Option value="500m">500m</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="内存请求">
                    <Select
                      value={container.resources.requests.memory}
                      onChange={val => updateContainer(index, 'resources', {
                        ...container.resources,
                        requests: { ...container.resources.requests, memory: val }
                      })}
                    >
                      <Option value="64Mi">64Mi</Option>
                      <Option value="128Mi">128Mi</Option>
                      <Option value="256Mi">256Mi</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Panel>
          </Collapse>
        </Card>
      ))}

      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={addContainer}
        style={{ width: '100%' }}
      >
        添加容器
      </Button>
    </div>
  )

  const renderServiceConfig = () => (
    <Form form={form} layout="vertical">
      <Alert
        message="Service 用于将应用暴露给集群内或外部访问"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="serviceName"
            label="Service 名称"
            initialValue="my-app"
          >
            <Input placeholder="留空则使用 Deployment 名称" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="serviceType"
            label="Service 类型"
            initialValue="ClusterIP"
          >
            <Select>
              <Option value="ClusterIP">ClusterIP (仅集群内访问)</Option>
              <Option value="NodePort">NodePort (节点端口)</Option>
              <Option value="LoadBalancer">LoadBalancer (云服务商负载均衡)</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="servicePort"
            label="服务端口"
            initialValue={80}
          >
            <InputNumber min={1} max={65535} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="targetPort"
            label="目标端口"
            initialValue={80}
          >
            <InputNumber min={1} max={65535} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  )

  const renderIngressConfig = () => (
    <Form form={form} layout="vertical">
      <Alert
        message="Ingress 用于将 HTTP/HTTPS 路由到服务，通常需要 Ingress Controller"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="ingressName"
            label="Ingress 名称 (可选)"
          >
            <Input placeholder="留空则不创建 Ingress" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="ingressClass"
            label="Ingress Class"
            initialValue="nginx"
          >
            <Select>
              <Option value="nginx">nginx</Option>
              <Option value="traefik">traefik</Option>
              <Option value="alb">alb (AWS)</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="ingressHost"
            label="域名 (Host)"
          >
            <Input placeholder="例如: my-app.example.com" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="ingressPath"
            label="路径"
            initialValue="/"
          >
            <Input placeholder="例如: /api" />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  )

  const renderVariables = () => (
    <div>
      <Alert
        message="定义变量后，可以在配置中使用 {{变量名}} 语法进行引用，支持按环境(dev/test/prod)配置不同的值"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Table
        dataSource={variables}
        rowKey={(record, index) => index.toString()}
        pagination={false}
        columns={[
          {
            title: '变量名',
            dataIndex: 'name',
            key: 'name',
            render: (text, _, index) => (
              <Input
                value={text}
                onChange={e => updateVariable(index, 'name', e.target.value)}
                placeholder="例如: DB_HOST"
              />
            ),
          },
          {
            title: '默认值',
            dataIndex: 'value',
            key: 'value',
            render: (text, _, index) => (
              <Input
                value={text}
                onChange={e => updateVariable(index, 'value', e.target.value)}
                placeholder="默认值"
              />
            ),
          },
          {
            title: '开发环境 (dev)',
            key: 'env_dev',
            render: (_, record, index) => (
              <Input
                value={record.env.dev}
                onChange={e => updateVariable(index, '', e.target.value, 'dev')}
                placeholder="dev 环境值"
              />
            ),
          },
          {
            title: '测试环境 (test)',
            key: 'env_test',
            render: (_, record, index) => (
              <Input
                value={record.env.test}
                onChange={e => updateVariable(index, '', e.target.value, 'test')}
                placeholder="test 环境值"
              />
            ),
          },
          {
            title: '生产环境 (prod)',
            key: 'env_prod',
            render: (_, record, index) => (
              <Input
                value={record.env.prod}
                onChange={e => updateVariable(index, '', e.target.value, 'prod')}
                placeholder="prod 环境值"
              />
            ),
          },
          {
            title: '操作',
            key: 'action',
            render: (_, __, index) => (
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeVariable(index)}
              />
            ),
          },
        ]}
      />

      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={addVariable}
        style={{ width: '100%', marginTop: 16 }}
      >
        添加变量
      </Button>
    </div>
  )

  const renderPreview = () => (
    <div>
      <Tabs>
        <TabPane tab="配置预览" key="config">
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>集群：</Text>
                  <Tag>{clusters.find(c => c.id === form.getFieldValue('cluster'))?.name || '未选择'}</Tag>
                </Col>
                <Col span={12}>
                  <Text strong>命名空间：</Text>
                  <Tag>{form.getFieldValue('namespace') || 'default'}</Tag>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>Deployment：</Text>
                  <Tag>{form.getFieldValue('deploymentName') || 'my-app'}</Tag>
                </Col>
                <Col span={12}>
                  <Text strong>副本数：</Text>
                  <Tag>{form.getFieldValue('replicas') || 1}</Tag>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>容器数量：</Text>
                  <Tag>{containers.length}</Tag>
                </Col>
                <Col span={12}>
                  <Text strong>Service 类型：</Text>
                  <Tag>{form.getFieldValue('serviceType') || 'ClusterIP'}</Tag>
                </Col>
              </Row>
              {form.getFieldValue('ingressName') && (
                <Row gutter={16}>
                  <Col span={12}>
                    <Text strong>Ingress 域名：</Text>
                    <Tag>{form.getFieldValue('ingressHost') || '未配置'}</Tag>
                  </Col>
                </Row>
              )}
            </Space>
          </Card>
        </TabPane>
        <TabPane tab="YAML 预览" key="yaml">
          <Card
            extra={
              <Space>
                <Button
                  icon={<EyeOutlined />}
                  onClick={generateYaml}
                >
                  生成 YAML
                </Button>
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => {
                    navigator.clipboard.writeText(yamlPreview)
                    message.success('已复制到剪贴板')
                  }}
                >
                  复制
                </Button>
              </Space>
            }
          >
            <TextArea
              value={yamlPreview || '# 点击"生成 YAML" 按钮查看完整配置'}
              readOnly
              rows={25}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  )

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderBasicConfig()
      case 1:
        return renderDeploymentConfig()
      case 2:
        return renderServiceConfig()
      case 3:
        return renderIngressConfig()
      case 4:
        return renderVariables()
      case 5:
        return renderPreview()
      default:
        return null
    }
  }

  return (
    <div>
      <Card>
        <Steps
          current={currentStep}
          items={steps}
          onChange={setCurrentStep}
          style={{ marginBottom: 24 }}
        />

        <div style={{ minHeight: 400 }}>
          {renderStepContent()}
        </div>

        <Divider />

        <Space style={{ justifyContent: 'space-between', width: '100%', display: 'flex' }}>
          <Button
            disabled={currentStep === 0}
            onClick={handlePrev}
          >
            上一步
          </Button>
          <Space>
            {currentStep < steps.length - 1 ? (
              <Button type="primary" onClick={handleNext}>
                下一步
              </Button>
            ) : (
              <Space>
                <Button
                  icon={<EyeOutlined />}
                  onClick={generateYaml}
                >
                  预览 YAML
                </Button>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleDeploy}
                  loading={deploying}
                >
                  一键部署
                </Button>
              </Space>
            )}
          </Space>
        </Space>
      </Card>

      <Modal
        title="部署进度"
        open={showDeployResult}
        onCancel={() => setShowDeployResult(false)}
        footer={[
          <Button key="close" onClick={() => setShowDeployResult(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        <Alert
          message={deploySuccess ? '部署成功' : '部署进行中...'}
          type={deploySuccess ? 'success' : 'info'}
          showIcon
          style={{ marginBottom: 16 }}
        />
        <TextArea
          value={deployLogs.join('\n')}
          readOnly
          rows={15}
          style={{ fontFamily: 'monospace', fontSize: 12, background: '#1a1a1a', color: '#00ff00' }}
        />
      </Modal>
    </div>
  )
}

export default DeploymentEditor
