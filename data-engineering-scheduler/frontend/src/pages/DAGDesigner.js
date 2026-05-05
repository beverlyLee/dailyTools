import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Popconfirm,
  message,
  Tag,
  Drawer,
  Descriptions,
  Timeline,
  Radio,
} from 'antd';
import {
  PlayCircleOutlined,
  SaveOutlined,
  DeleteOutlined,
  PlusOutlined,
  CloudDownloadOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  FilterOutlined,
  UploadOutlined,
  SettingOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;

const nodeTypes = [
  {
    type: 'extract',
    name: '数据抽取',
    icon: <CloudDownloadOutlined />,
    color: '#1890ff',
    category: 'ETL',
    description: '从数据源抽取数据',
  },
  {
    type: 'transform',
    name: '数据转换',
    icon: <FilterOutlined />,
    color: '#52c41a',
    category: 'ETL',
    description: '数据清洗和转换',
  },
  {
    type: 'load',
    name: '数据加载',
    icon: <UploadOutlined />,
    color: '#faad14',
    category: 'ETL',
    description: '加载到目标数据源',
  },
  {
    type: 'quality_check',
    name: '质量检查',
    icon: <EyeOutlined />,
    color: '#722ed1',
    category: 'Quality',
    description: '数据质量校验',
  },
];

const DAGDesigner = () => {
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [propertyDrawer, setPropertyDrawer] = useState(false);
  const [saveModal, setSaveModal] = useState(false);
  const [dagName, setDagName] = useState('');
  const [dagDescription, setDagDescription] = useState('');
  const [scheduleInterval, setScheduleInterval] = useState('@daily');
  const [form] = Form.useForm();
  const canvasRef = useRef(null);
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connecting, setConnecting] = useState(null);
  const [tempLine, setTempLine] = useState(null);
  const [dagList, setDagList] = useState([]);
  const [runningStatus, setRunningStatus] = useState({});

  useEffect(() => {
    loadDagList();
  }, []);

  const loadDagList = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/dags');
      setDagList(response.data);
    } catch (error) {
      console.error('加载 DAG 列表失败:', error);
    }
  };

  const handleDragStart = (e, nodeType) => {
    e.dataTransfer.setData('nodeType', JSON.stringify(nodeType));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const nodeTypeData = e.dataTransfer.getData('nodeType');
    if (!nodeTypeData) return;

    const nodeType = JSON.parse(nodeTypeData);
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left - 60;
    const y = e.clientY - canvasRect.top - 30;

    const newNode = {
      id: `node_${Date.now()}`,
      type: nodeType.type,
      name: `${nodeType.name}_${nodes.length + 1}`,
      x: Math.max(0, x),
      y: Math.max(0, y),
      status: 'idle',
      config: {
        retryCount: 3,
        retryDelay: 5,
        alertOnFailure: true,
        alertEmail: '',
      },
    };

    setNodes([...nodes, newNode]);
  };

  const handleNodeMouseDown = (e, node) => {
    if (e.target.classList.contains('node-port')) return;
    e.stopPropagation();
    setSelectedNode(node);
    setDraggingNode(node.id);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleCanvasMouseMove = (e) => {
    if (draggingNode) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - canvasRect.left - dragOffset.x;
      const y = e.clientY - canvasRect.top - dragOffset.y;

      setNodes(
        nodes.map((node) =>
          node.id === draggingNode
            ? { ...node, x: Math.max(0, x), y: Math.max(0, y) }
            : node
        )
      );
    }

    if (connecting) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      setTempLine({
        startX: connecting.startX,
        startY: connecting.startY,
        endX: e.clientX - canvasRect.left,
        endY: e.clientY - canvasRect.top,
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggingNode(null);
    if (connecting) {
      setConnecting(null);
      setTempLine(null);
    }
  };

  const handlePortMouseDown = (e, node, portType) => {
    e.stopPropagation();
    if (portType === 'output') {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const nodeEl = e.target.closest('.flow-node');
      const nodeRect = nodeEl.getBoundingClientRect();

      setConnecting({
        fromNodeId: node.id,
        startX: nodeRect.right - canvasRect.left,
        startY: nodeRect.top + nodeRect.height / 2 - canvasRect.top,
      });
    }
  };

  const handlePortMouseUp = (e, targetNode, portType) => {
    e.stopPropagation();
    if (connecting && portType === 'input' && connecting.fromNodeId !== targetNode.id) {
      const existingConnection = connections.find(
        (c) => c.from === connecting.fromNodeId && c.to === targetNode.id
      );
      if (!existingConnection) {
        setConnections([
          ...connections,
          {
            id: `conn_${Date.now()}`,
            from: connecting.fromNodeId,
            to: targetNode.id,
          },
        ]);
      }
    }
    setConnecting(null);
    setTempLine(null);
  };

  const deleteNode = (nodeId) => {
    setNodes(nodes.filter((n) => n.id !== nodeId));
    setConnections(connections.filter((c) => c.from !== nodeId && c.to !== nodeId));
    setSelectedNode(null);
    setPropertyDrawer(false);
    message.success('节点已删除');
  };

  const deleteConnection = (connId) => {
    setConnections(connections.filter((c) => c.id !== connId));
  };

  const getNodeCenter = (node, portType) => {
    const baseX = node.x + 60;
    const baseY = node.y + 30;
    if (portType === 'output') {
      return { x: node.x + 120, y: baseY };
    }
    return { x: node.x, y: baseY };
  };

  const generatePath = (fromNode, toNode) => {
    const from = getNodeCenter(fromNode, 'output');
    const to = getNodeCenter(toNode, 'input');
    const midX = (from.x + to.x) / 2;
    return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
  };

  const saveDAG = async () => {
    try {
      const dagData = {
        name: dagName,
        description: dagDescription,
        schedule_interval: scheduleInterval,
        nodes: nodes,
        connections: connections,
      };

      const response = await axios.post('http://localhost:5000/api/dags', dagData);
      message.success('DAG 保存成功');
      setSaveModal(false);
      loadDagList();
    } catch (error) {
      message.error('保存 DAG 失败: ' + error.message);
    }
  };

  const runDAG = async () => {
    if (nodes.length === 0) {
      message.warning('请先添加节点');
      return;
    }

    try {
      const topoOrder = topologicalSort();
      const newStatus = {};
      topoOrder.forEach((nodeId) => {
        newStatus[nodeId] = 'running';
      });
      setRunningStatus(newStatus);

      await axios.post('http://localhost:5000/api/dags/run', {
        nodes,
        connections,
      });

      message.success('DAG 已提交运行');
      
      setTimeout(() => {
        const successStatus = {};
        topoOrder.forEach((nodeId) => {
          successStatus[nodeId] = Math.random() > 0.2 ? 'success' : 'failed';
        });
        setRunningStatus(successStatus);
      }, 3000);
    } catch (error) {
      message.error('运行 DAG 失败: ' + error.message);
    }
  };

  const topologicalSort = () => {
    const inDegree = {};
    const adjacency = {};

    nodes.forEach((node) => {
      inDegree[node.id] = 0;
      adjacency[node.id] = [];
    });

    connections.forEach((conn) => {
      inDegree[conn.to] = (inDegree[conn.to] || 0) + 1;
      adjacency[conn.from] = adjacency[conn.from] || [];
      adjacency[conn.from].push(conn.to);
    });

    const queue = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id);
    const result = [];

    while (queue.length > 0) {
      const nodeId = queue.shift();
      result.push(nodeId);

      adjacency[nodeId]?.forEach((neighbor) => {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) {
          queue.push(neighbor);
        }
      });
    }

    return result;
  };

  const updateNodeConfig = (values) => {
    setNodes(
      nodes.map((n) =>
        n.id === selectedNode.id
          ? {
              ...n,
              name: values.name,
              config: {
                ...n.config,
                retryCount: values.retryCount,
                retryDelay: values.retryDelay,
                alertOnFailure: values.alertOnFailure,
                alertEmail: values.alertEmail,
              },
            }
          : n
      )
    );
    setPropertyDrawer(false);
    message.success('配置已更新');
  };

  const getNodeTypeInfo = (type) => nodeTypes.find((nt) => nt.type === type);

  return (
    <div>
      <Card
        title="DAG 工作流设计器"
        extra={
          <Space>
            <Select
              placeholder="加载已保存的 DAG"
              style={{ width: 200 }}
              onChange={(value) => {
                const dag = dagList.find((d) => d.id === value);
                if (dag) {
                  setNodes(dag.nodes || []);
                  setConnections(dag.connections || []);
                  setDagName(dag.name);
                  setDagDescription(dag.description);
                  message.success('DAG 已加载');
                }
              }}
            >
              {dagList.map((dag) => (
                <Option key={dag.id} value={dag.id}>
                  {dag.name}
                </Option>
              ))}
            </Select>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => setSaveModal(true)}
            >
              保存
            </Button>
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={runDAG}>
              运行
            </Button>
            <Button
              icon={<PlusOutlined />}
              onClick={() => {
                setNodes([]);
                setConnections([]);
                setSelectedNode(null);
              }}
            >
              新建
            </Button>
          </Space>
        }
      >
        <div style={{ display: 'flex', gap: 16 }}>
          <Card title="节点面板" style={{ width: 240, flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {nodeTypes.map((nodeType) => (
                <div
                  key={nodeType.type}
                  className="node-panel-item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, nodeType)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: nodeType.color, fontSize: 18 }}>
                      {nodeType.icon}
                    </span>
                    <div>
                      <div style={{ fontWeight: 500 }}>{nodeType.name}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {nodeType.description}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="工作流画布"
            style={{ flex: 1 }}
            bodyStyle={{ padding: 0 }}
          >
            <div
              ref={canvasRef}
              className="flow-canvas"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onClick={() => setSelectedNode(null)}
            >
              <svg
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              >
                {connections.map((conn) => {
                  const fromNode = nodes.find((n) => n.id === conn.from);
                  const toNode = nodes.find((n) => n.id === conn.to);
                  if (!fromNode || !toNode) return null;

                  return (
                    <path
                      key={conn.id}
                      className="connection-line"
                      d={generatePath(fromNode, toNode)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('确定删除此连接?')) {
                          deleteConnection(conn.id);
                        }
                      }}
                      style={{ pointerEvents: 'stroke' }}
                    />
                  );
                })}
                {tempLine && (
                  <path
                    className="temp-line"
                    d={`M ${tempLine.startX} ${tempLine.startY} L ${tempLine.endX} ${tempLine.endY}`}
                  />
                )}
              </svg>

              {nodes.map((node) => {
                const nodeType = getNodeTypeInfo(node.type);
                const status = runningStatus[node.id] || 'idle';
                return (
                  <div
                    key={node.id}
                    className={`flow-node ${selectedNode?.id === node.id ? 'selected' : ''} ${status}`}
                    style={{
                      left: node.x,
                      top: node.y,
                      borderColor: nodeType?.color,
                    }}
                    onMouseDown={(e) => handleNodeMouseDown(e, node)}
                    onDoubleClick={() => {
                      setSelectedNode(node);
                      form.setFieldsValue({
                        name: node.name,
                        retryCount: node.config.retryCount,
                        retryDelay: node.config.retryDelay,
                        alertOnFailure: node.config.alertOnFailure,
                        alertEmail: node.config.alertEmail,
                      });
                      setPropertyDrawer(true);
                    }}
                  >
                    <div
                      className="node-port input"
                      onMouseUp={(e) => handlePortMouseUp(e, node, 'input')}
                    />
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span style={{ color: nodeType?.color, fontSize: 16 }}>
                        {nodeType?.icon}
                      </span>
                      <div>
                        <div style={{ fontWeight: 500 }}>{node.name}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>
                          {nodeType?.name}
                        </div>
                      </div>
                    </div>
                    <div
                      className="node-port output"
                      onMouseDown={(e) => handlePortMouseDown(e, node, 'output')}
                    />
                  </div>
                );
              })}

              {nodes.length === 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: '#999',
                  }}
                >
                  <DatabaseOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                  <div>从左侧拖拽节点到画布开始设计工作流</div>
                  <div style={{ fontSize: 12, marginTop: 8 }}>
                    支持拖拽移动节点，从输出端口拖动到输入端口建立连接
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card
            title="属性面板"
            style={{ width: 280, flexShrink: 0 }}
            bodyStyle={{ padding: 16 }}
          >
            {selectedNode ? (
              <div>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="节点名称">
                    {selectedNode.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="节点类型">
                    <Tag color={getNodeTypeInfo(selectedNode.type)?.color}>
                      {getNodeTypeInfo(selectedNode.type)?.name}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="重试次数">
                    {selectedNode.config.retryCount} 次
                  </Descriptions.Item>
                  <Descriptions.Item label="重试间隔">
                    {selectedNode.config.retryDelay} 秒
                  </Descriptions.Item>
                  <Descriptions.Item label="失败告警">
                    {selectedNode.config.alertOnFailure ? (
                      <Tag color="green">已启用</Tag>
                    ) : (
                      <Tag color="default">未启用</Tag>
                    )}
                  </Descriptions.Item>
                </Descriptions>
                <div style={{ marginTop: 16 }}>
                  <Space>
                    <Button
                      type="primary"
                      size="small"
                      icon={<SettingOutlined />}
                      onClick={() => {
                        form.setFieldsValue({
                          name: selectedNode.name,
                          retryCount: selectedNode.config.retryCount,
                          retryDelay: selectedNode.config.retryDelay,
                          alertOnFailure: selectedNode.config.alertOnFailure,
                          alertEmail: selectedNode.config.alertEmail,
                        });
                        setPropertyDrawer(true);
                      }}
                    >
                      编辑配置
                    </Button>
                    <Popconfirm
                      title="确定删除此节点?"
                      onConfirm={() => deleteNode(selectedNode.id)}
                    >
                      <Button danger size="small" icon={<DeleteOutlined />}>
                        删除
                      </Button>
                    </Popconfirm>
                  </Space>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: 24 }}>
                <div>点击节点查看属性</div>
                <div style={{ fontSize: 12, marginTop: 8 }}>
                  双击节点可编辑配置
                </div>
              </div>
            )}
          </Card>
        </div>
      </Card>

      <Drawer
        title="节点配置"
        placement="right"
        onClose={() => setPropertyDrawer(false)}
        open={propertyDrawer}
        width={400}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={updateNodeConfig}
          initialValues={{
            alertOnFailure: true,
            retryCount: 3,
            retryDelay: 5,
          }}
        >
          <Form.Item
            label="节点名称"
            name="name"
            rules={[{ required: true, message: '请输入节点名称' }]}
          >
            <Input placeholder="请输入节点名称" />
          </Form.Item>

          <Form.Item label="重试配置" style={{ marginBottom: 8 }} />

          <Form.Item label="重试次数" name="retryCount">
            <InputNumber min={0} max={10} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="重试间隔(秒)" name="retryDelay">
            <InputNumber min={1} max={60} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="告警配置" style={{ marginBottom: 8 }} />

          <Form.Item label="失败时告警" name="alertOnFailure" valuePropName="checked">
            <Radio.Group>
              <Radio value={true}>是</Radio>
              <Radio value={false}>否</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label="告警邮箱"
            name="alertEmail"
            rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
          >
            <Input placeholder="请输入告警邮箱" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </Drawer>

      <Modal
        title="保存 DAG"
        open={saveModal}
        onOk={saveDAG}
        onCancel={() => setSaveModal(false)}
      >
        <Form layout="vertical">
          <Form.Item label="DAG 名称" required>
            <Input
              value={dagName}
              onChange={(e) => setDagName(e.target.value)}
              placeholder="请输入 DAG 名称"
            />
          </Form.Item>
          <Form.Item label="描述">
            <TextArea
              value={dagDescription}
              onChange={(e) => setDagDescription(e.target.value)}
              placeholder="请输入描述"
              rows={3}
            />
          </Form.Item>
          <Form.Item label="调度间隔">
            <Select value={scheduleInterval} onChange={setScheduleInterval}>
              <Option value="@once">一次性执行</Option>
              <Option value="@hourly">每小时</Option>
              <Option value="@daily">每天</Option>
              <Option value="@weekly">每周</Option>
              <Option value="@monthly">每月</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DAGDesigner;
