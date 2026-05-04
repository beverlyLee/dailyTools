import React, { useState, useEffect } from 'react';
import {
  Layout,
  Button,
  Upload,
  Select,
  Space,
  Typography,
  message,
  Form,
  Modal,
  Input,
  Card,
  Row,
  Col,
  Tag,
  Divider,
  Drawer,
  Tooltip
} from 'antd';
import {
  UploadOutlined,
  PlusOutlined,
  ReloadOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  AreaChartOutlined,
  DatabaseOutlined,
  DragOutlined,
  SaveOutlined,
  InfoCircleOutlined,
  MenuOutlined
} from '@ant-design/icons';
import { LayoutProvider, useLayout } from './context/LayoutContext';
import { DashboardGrid } from './components/DashboardGrid';
import { useCSVLoader } from './hooks/useCSVLoader';
import { useDuckDB } from './hooks/useDuckDB';
import { CSVData, ChartType, ChartDataPoint } from './types';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;

const FEATURES = [
  {
    icon: <DatabaseOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
    title: '多数据支持',
    description: '支持上传 CSV 数据文件，可在同一图表中多选多个数据列进行对比分析'
  },
  {
    icon: <BarChartOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
    title: '多种图表类型',
    description: '支持折线图、柱状图、饼图、面积图四种图表类型，满足不同数据可视化需求'
  },
  {
    icon: <DragOutlined style={{ fontSize: 32, color: '#faad14' }} />,
    title: '拖拽布局',
    description: '支持拖拽调整图表位置，自由组合仪表板，打造个性化数据视图'
  },
  {
    icon: <SaveOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
    title: '布局持久化',
    description: '仪表板布局自动保存到 localStorage，刷新页面后自动恢复'
  }
];

const QUICK_START = [
  '点击"加载示例数据"快速体验',
  '或点击"上传 CSV"上传您的数据文件',
  '加载数据后点击"添加图表"创建可视化',
  '拖拽图表调整布局，完成后自动保存'
];

const AppContent: React.FC = () => {
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [queryResult, setQueryResult] = useState<ChartDataPoint[]>([]);
  const [sqlQuery, setSqlQuery] = useState('');
  const [isAddWidgetModalOpen, setIsAddWidgetModalOpen] = useState(false);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [numericColumns, setNumericColumns] = useState<string[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { addWidget, resetLayout } = useLayout();
  const { loadFromFile, loadFromURL, loading: csvLoading } = useCSVLoader();
  const {
    loadCSV: loadToDuckDB,
    query: executeQuery,
    initialized: duckDBInitialized,
    initDuckDB
  } = useDuckDB();

  const [form] = Form.useForm();

  useEffect(() => {
    initDuckDB().catch(console.error);
  }, [initDuckDB]);

  const handleFileUpload = async (file: File) => {
    try {
      const data = await loadFromFile(file);
      setCsvData(data);
      setAvailableColumns(data.columns);

      const numericCols = data.columns.filter(col => {
        const firstValue = data.rows[0]?.[col];
        return typeof firstValue === 'number';
      });
      setNumericColumns(numericCols);

      setQueryResult(data.rows as ChartDataPoint[]);
      setSqlQuery(`SELECT * FROM main.${data.fileName.replace('.csv', '')}`);

      if (duckDBInitialized) {
        try {
          const csvText = await file.text();
          const tableName = data.fileName.replace('.csv', '').replace(/[^a-zA-Z0-9_]/g, '_');
          await loadToDuckDB(tableName, csvText);
          message.success(`数据已加载，表名: ${tableName}`);
        } catch (err) {
          console.warn('DuckDB 加载失败:', err);
        }
      }

      message.success(`成功加载 ${data.fileName}，共 ${data.rows.length} 条数据`);
    } catch (err) {
      message.error('文件加载失败');
    }
    return false;
  };

  const handleLoadSampleData = async () => {
    try {
      const data = await loadFromURL('/data/sales.csv');
      setCsvData(data);
      setAvailableColumns(data.columns);

      const numericCols = data.columns.filter(col => {
        const firstValue = data.rows[0]?.[col];
        return typeof firstValue === 'number';
      });
      setNumericColumns(numericCols);
      setQueryResult(data.rows as ChartDataPoint[]);
      message.success('示例数据加载成功！点击"添加图表"开始可视化');
    } catch (err) {
      message.error('示例数据加载失败，请先启动开发服务器');
    }
  };

  const handleExecuteQuery = async () => {
    if (!sqlQuery.trim()) {
      message.warning('请输入 SQL 查询');
      return;
    }

    try {
      const result = await executeQuery(sqlQuery);
      setQueryResult(result.rows as ChartDataPoint[]);
      message.success(`查询成功，返回 ${result.rows.length} 条记录`);
    } catch (err) {
      message.error('查询执行失败');
    }
  };

  const handleAddWidget = (values: {
    title: string;
    chartType: ChartType;
    dataKeys: string[];
    labelKey: string;
    size: 'small' | 'medium' | 'large';
  }) => {
    addWidget({
      ...values,
      id: `widget-${Date.now()}`
    });
    setIsAddWidgetModalOpen(false);
    form.resetFields();
    message.success('图表添加成功！');
  };

  const uploadProps = {
    accept: '.csv',
    beforeUpload: handleFileUpload,
    showUploadList: false
  };

  const renderWelcomePage = () => (
    <div style={{ minHeight: '100%', padding: '40px 24px', background: 'linear-gradient(180deg, #f0f5ff 0%, #ffffff 100%)' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <Title level={2} style={{ marginBottom: 16, color: '#1890ff' }}>
          <DatabaseOutlined style={{ marginRight: 12 }} />
          个人数据仪表板
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          轻松管理和分析您的个人数据，让数据说话
        </Text>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Row gutter={[24, 24]} style={{ marginBottom: 48 }}>
          {FEATURES.map((feature, index) => (
            <Col xs={24} md={12} lg={6} key={index}>
              <Card
                hoverable
                style={{ height: '100%', borderRadius: 8, border: '1px solid #e8e8e8' }}
                styles={{ body: { padding: 24, textAlign: 'center' } }}
              >
                <div style={{ marginBottom: 16 }}>{feature.icon}</div>
                <Title level={5} style={{ marginBottom: 8 }}>
                  {feature.title}
                </Title>
                <Text type="secondary">{feature.description}</Text>
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <InfoCircleOutlined style={{ color: '#1890ff' }} />
                  <span>快速开始</span>
                </Space>
              }
              style={{ borderRadius: 8 }}
            >
              <ol style={{ paddingLeft: 20, margin: 0 }}>
                {QUICK_START.map((step, index) => (
                  <li key={index} style={{ marginBottom: 12, lineHeight: 1.8 }}>
                    <Text>{step}</Text>
                  </li>
                ))}
              </ol>
              <Divider style={{ margin: '16px 0' }} />
              <Space wrap size="middle">
                <Upload {...uploadProps}>
                  <Button type="primary" icon={<UploadOutlined />} size="large">
                    上传 CSV 文件
                  </Button>
                </Upload>
                <Button icon={<BarChartOutlined />} size="large" onClick={handleLoadSampleData}>
                  加载示例数据
                </Button>
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <LineChartOutlined style={{ color: '#52c41a' }} />
                  <span>支持的图表类型</span>
                </Space>
              }
              style={{ borderRadius: 8 }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={12}>
                  <Card size="small" style={{ textAlign: 'center', borderRadius: 6 }}>
                    <LineChartOutlined style={{ fontSize: 28, color: '#1890ff' }} />
                    <div style={{ marginTop: 8, fontWeight: 500 }}>折线图</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>趋势分析</Text>
                  </Card>
                </Col>
                <Col xs={12}>
                  <Card size="small" style={{ textAlign: 'center', borderRadius: 6 }}>
                    <BarChartOutlined style={{ fontSize: 28, color: '#52c41a' }} />
                    <div style={{ marginTop: 8, fontWeight: 500 }}>柱状图</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>对比分析</Text>
                  </Card>
                </Col>
                <Col xs={12}>
                  <Card size="small" style={{ textAlign: 'center', borderRadius: 6 }}>
                    <PieChartOutlined style={{ fontSize: 28, color: '#faad14' }} />
                    <div style={{ marginTop: 8, fontWeight: 500 }}>饼图</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>占比分析</Text>
                  </Card>
                </Col>
                <Col xs={12}>
                  <Card size="small" style={{ textAlign: 'center', borderRadius: 6 }}>
                    <AreaChartOutlined style={{ fontSize: 28, color: '#722ed1' }} />
                    <div style={{ marginTop: 8, fontWeight: 500 }}>面积图</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>累积分析</Text>
                  </Card>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
          lineHeight: '64px',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setIsDrawerOpen(true)}
            style={{ display: 'inline-flex' }}
          />
          <DatabaseOutlined style={{ fontSize: 20, color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0, fontSize: 18 }}>
            个人数据仪表板
          </Title>
        </div>

        <Space wrap size="middle" style={{ flex: 1, justifyContent: 'flex-end', marginLeft: 24 }}>
          {csvData && (
            <Space size="small">
              <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />} loading={csvLoading}>
                  上传 CSV
                </Button>
              </Upload>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsAddWidgetModalOpen(true)}
              >
                添加图表
              </Button>
              <Button icon={<ReloadOutlined />} onClick={resetLayout}>
                重置布局
              </Button>
            </Space>
          )}
        </Space>
      </Header>

      <Layout>
        {csvData && (
          <Sider
            width={300}
            style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}
            breakpoint="lg"
            collapsedWidth="0"
          >
            <div style={{ padding: 16 }}>
              <Title level={5} style={{ marginBottom: 16 }}>
                <DatabaseOutlined style={{ marginRight: 8 }} />
                数据信息
              </Title>

              <Card size="small" style={{ marginBottom: 16, borderRadius: 6 }}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div>
                    <Text strong>文件名:</Text>
                    <br />
                    <Tag color="blue">{csvData.fileName}</Tag>
                  </div>
                  <div>
                    <Text strong>行数:</Text> {csvData.rows.length}
                  </div>
                  <div>
                    <Text strong>列数:</Text> {csvData.columns.length}
                  </div>
                  <div>
                    <Text strong>列名:</Text>
                    <br />
                    <Space size={[4, 4]} wrap style={{ marginTop: 4 }}>
                      {csvData.columns.map((col, index) => (
                        <Tag key={index} color="default" style={{ fontSize: 11 }}>
                          {col}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                </Space>
              </Card>

              {duckDBInitialized && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <Title level={5} style={{ marginBottom: 12 }}>
                    <BarChartOutlined style={{ marginRight: 8 }} />
                    DuckDB 查询
                  </Title>
                  <Input.TextArea
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    placeholder="输入 SQL 查询语句..."
                    rows={4}
                    style={{ marginBottom: 8, fontSize: 12 }}
                  />
                  <Button type="primary" block onClick={handleExecuteQuery}>
                    执行查询
                  </Button>
                  <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
                    提示：查询结果将自动更新图表数据
                  </Text>
                </>
              )}
            </div>
          </Sider>
        )}

        <Content style={{ background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
          {!csvData ? (
            renderWelcomePage()
          ) : (
            <div style={{ padding: 24 }}>
              <DashboardGrid data={queryResult} />
            </div>
          )}
        </Content>
      </Layout>

      <Drawer
        title={
          <Space>
            <InfoCircleOutlined />
            <span>功能说明</span>
          </Space>
        }
        placement="left"
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        width={360}
      >
        <div style={{ paddingBottom: 24 }}>
          <Title level={5}>核心功能</Title>
          {FEATURES.map((feature, index) => (
            <Card
              key={index}
              size="small"
              style={{ marginBottom: 12, borderRadius: 6 }}
            >
              <Space>
                {feature.icon}
                <div>
                  <Text strong>{feature.title}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {feature.description}
                  </Text>
                </div>
              </Space>
            </Card>
          ))}

          <Divider />

          <Title level={5}>使用步骤</Title>
          <ol style={{ paddingLeft: 20 }}>
            {QUICK_START.map((step, index) => (
              <li key={index} style={{ marginBottom: 8, lineHeight: 1.8 }}>
                <Text>{step}</Text>
              </li>
            ))}
          </ol>

          {!csvData && (
            <>
              <Divider />
              <Space wrap>
                <Upload {...uploadProps}>
                  <Button type="primary" icon={<UploadOutlined />}>
                    上传 CSV
                  </Button>
                </Upload>
                <Button onClick={handleLoadSampleData}>加载示例数据</Button>
              </Space>
            </>
          )}
        </div>
      </Drawer>

      <Modal
        title={
          <Space>
            <PlusOutlined style={{ color: '#1890ff' }} />
            <span>添加图表组件</span>
          </Space>
        }
        open={isAddWidgetModalOpen}
        onCancel={() => setIsAddWidgetModalOpen(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddWidget}
          initialValues={{
            chartType: 'line' as ChartType,
            size: 'medium'
          }}
        >
          <Form.Item
            name="title"
            label="图表标题"
            rules={[{ required: true, message: '请输入图表标题' }]}
          >
            <Input placeholder="例如：月度销售趋势对比" />
          </Form.Item>

          <Form.Item
            name="chartType"
            label="图表类型"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'line' as ChartType, label: '折线图 - 适合趋势分析' },
                { value: 'bar' as ChartType, label: '柱状图 - 适合对比分析' },
                { value: 'pie' as ChartType, label: '饼图 - 适合占比分析' },
                { value: 'area' as ChartType, label: '面积图 - 适合累积分析' }
              ]}
            />
          </Form.Item>

          <Form.Item
            name="labelKey"
            label="标签列 (X轴)"
            rules={[{ required: true, message: '请选择标签列' }]}
            tooltip="用于图表的横轴或饼图的名称"
          >
            <Select
              options={availableColumns.map(col => ({
                value: col,
                label: col
              }))}
              placeholder="选择标签列（如：月份、日期）"
            />
          </Form.Item>

          <Form.Item
            name="dataKeys"
            label="数据列 (Y轴) - 可多选"
            rules={[{ required: true, message: '请选择至少一个数据列' }]}
            tooltip="用于图表的数值轴，可多选进行对比分析"
          >
            <Select
              mode="multiple"
              options={numericColumns.map(col => ({
                value: col,
                label: col
              }))}
              placeholder="选择数值列（可多选，如：销售额、利润）"
              maxTagCount={3}
            />
          </Form.Item>

          <Form.Item
            name="size"
            label="组件大小"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'small' as const, label: '小 (单栏，适合小屏幕)' },
                { value: 'medium' as const, label: '中 (两栏，默认)' },
                { value: 'large' as const, label: '大 (全宽，适合展示重要数据)' }
              ]}
            />
          </Form.Item>

          <Form.Item className="text-right mb-0" style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsAddWidgetModalOpen(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                添加图表
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <LayoutProvider>
      <AppContent />
    </LayoutProvider>
  );
};

export default App;
