import React, { useState, useEffect } from 'react'
import {
  Row,
  Col,
  Card,
  Input,
  Button,
  Select,
  Spin,
  message,
  Tabs,
  Table,
  Space,
  Typography,
  Divider,
  Tag,
  Empty,
  Alert,
} from 'antd'
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  SearchOutlined,
  HistoryOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  TableOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
import { chartApi } from '../api'
import './ChartGenerationPage.css'

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { TabPane } = Tabs
const { TextArea } = Input

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2']

const ChartGenerationPage = () => {
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(false)

  const [query, setQuery] = useState('')
  const [exampleQueries, setExampleQueries] = useState([])
  const [schema, setSchema] = useState(null)

  const [result, setResult] = useState(null)
  const [sqlQuery, setSqlQuery] = useState(null)
  const [chartRecommendation, setChartRecommendation] = useState(null)
  const [selectedChartType, setSelectedChartType] = useState(null)

  // 初始化
  useEffect(() => {
    loadExampleQueries()
    loadSchema()
  }, [])

  // 加载示例查询
  const loadExampleQueries = async () => {
    try {
      const response = await chartApi.getExampleQueries()
      if (response.data.success) {
        setExampleQueries(response.data.examples)
      }
    } catch (error) {
      console.error('加载示例查询失败:', error)
    }
  }

  // 加载数据库schema
  const loadSchema = async () => {
    try {
      const response = await chartApi.getSchema()
      if (response.data.success) {
        setSchema(response.data.schema)
      }
    } catch (error) {
      console.error('加载Schema失败:', error)
    }
  }

  // 初始化示例数据
  const handleInitSampleData = async () => {
    setInitializing(true)
    try {
      const response = await chartApi.initSampleData()
      if (response.data.success) {
        message.success('示例数据初始化成功！')
      } else {
        message.error(response.data.error || '初始化失败')
      }
    } catch (error) {
      message.error('初始化示例数据失败')
      console.error(error)
    } finally {
      setInitializing(false)
    }
  }

  // 执行查询
  const handleQuery = async () => {
    if (!query.trim()) {
      message.warning('请输入查询语句')
      return
    }

    setLoading(true)
    setResult(null)
    setSqlQuery(null)
    setChartRecommendation(null)
    setSelectedChartType(null)

    try {
      const response = await chartApi.query(query)
      const data = response.data

      if (data.success) {
        setSqlQuery(data.sql)
        setResult(data.result)
        setChartRecommendation(data.chart_recommendation)
        setSelectedChartType(data.chart_recommendation?.recommended_type || 'table')
        message.success('查询成功！')
      } else {
        message.error(data.error || '查询失败')
      }
    } catch (error) {
      message.error('查询执行失败')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // 选择示例查询
  const handleSelectExample = (exampleQuery) => {
    setQuery(exampleQuery)
  }

  // 准备表格数据
  const getTableColumns = () => {
    if (!result?.columns) return []
    return result.columns.map((col) => ({
      title: col,
      dataIndex: col,
      key: col,
      render: (text) => {
        if (typeof text === 'number') {
          // 格式化数字
          return text.toLocaleString('zh-CN')
        }
        return text
      },
    }))
  }

  // 准备图表数据
  const getChartData = () => {
    if (!result?.data) return []
    return result.data
  }

  // 渲染图表
  const renderChart = () => {
    const data = getChartData()
    if (!data || data.length === 0) {
      return (
        <div className="chart-empty">
          <Empty description="暂无数据可展示" />
        </div>
      )
    }

    const columns = result?.columns || []
    
    // 尝试自动识别X轴和Y轴
    let xAxisKey = null
    let yAxisKeys = []

    // 优先使用推荐的轴
    if (chartRecommendation) {
      xAxisKey = chartRecommendation.x_axis
      yAxisKeys = chartRecommendation.y_axis || []
    }

    // 如果没有推荐，自动识别
    if (!xAxisKey) {
      // 找时间相关的列
      const timeColumns = ['year', 'quarter', 'month', 'date', 'time']
      xAxisKey = columns.find((col) => timeColumns.includes(col.toLowerCase()))
    }

    if (!xAxisKey && columns.length > 0) {
      xAxisKey = columns[0]
    }

    if (yAxisKeys.length === 0) {
      // 找出数值列
      const firstRow = data[0]
      yAxisKeys = columns.filter((col) => {
        const val = firstRow[col]
        return typeof val === 'number' && col !== xAxisKey
      })
    }

    if (yAxisKeys.length === 0) {
      // 如果没有数值列，使用除了x轴之外的所有列
      yAxisKeys = columns.filter((col) => col !== xAxisKey)
    }

    switch (selectedChartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip formatter={(value) => typeof value === 'number' ? value.toLocaleString('zh-CN') : value} />
              <Legend />
              {yAxisKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip formatter={(value) => typeof value === 'number' ? value.toLocaleString('zh-CN') : value} />
              <Legend />
              {yAxisKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip formatter={(value) => typeof value === 'number' ? value.toLocaleString('zh-CN') : value} />
              <Legend />
              {yAxisKeys.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[index % COLORS.length]}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.3}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'pie':
        // 饼图需要特殊处理
        const pieData = data.map((item, index) => ({
          name: item[xAxisKey] || `数据${index + 1}`,
          value: item[yAxisKeys[0]] || 0,
        }))

        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => typeof value === 'number' ? value.toLocaleString('zh-CN') : value} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )

      case 'table':
      default:
        return (
          <Table
            columns={getTableColumns()}
            dataSource={data.map((item, index) => ({ ...item, key: index }))}
            pagination={{ pageSize: 10 }}
            bordered
            size="middle"
          />
        )
    }
  }

  return (
    <div className="page-container">
      <Title level={2} className="page-title">
        <BarChartOutlined style={{ marginRight: 12 }} />
        智能图表生成 (NL2SQL)
      </Title>

      {/* 初始化提示 */}
      {!schema && (
        <Alert
          message="首次使用提示"
          description="建议先初始化示例财报数据，以便体验NL2SQL功能。"
          type="info"
          showIcon
          action={
            <Button
              type="primary"
              size="small"
              onClick={handleInitSampleData}
              loading={initializing}
            >
              初始化示例数据
            </Button>
          }
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={[24, 24]}>
        {/* 左侧：查询输入 */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <SearchOutlined />
                <span>自然语言查询</span>
              </Space>
            }
            extra={
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setQuery('')
                  setResult(null)
                  setSqlQuery(null)
                  setChartRecommendation(null)
                }}
              >
                重置
              </Button>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* 示例查询 */}
              <div>
                <Text strong>示例查询</Text>
                <Divider style={{ margin: '12px 0' }} />
                <div className="example-queries">
                  {exampleQueries.map((example, index) => (
                    <Button
                      key={index}
                      size="small"
                      onClick={() => handleSelectExample(example.query)}
                      style={{ margin: '4px' }}
                    >
                      {example.query}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 查询输入 */}
              <div>
                <Text strong>输入查询</Text>
                <Divider style={{ margin: '12px 0' }} />
                <TextArea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="用自然语言描述你想要查询的数据，例如：显示过去一年各季度的营收和利润..."
                  rows={4}
                  showCount
                  maxLength={200}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault()
                      handleQuery()
                    }
                  }}
                />
              </div>

              {/* 查询按钮 */}
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleQuery}
                loading={loading}
                block
                size="large"
                danger
              >
                {loading ? '查询中...' : '执行查询'}
              </Button>

              {/* Schema信息 */}
              {schema && (
                <div>
                  <Text strong>
                    <DatabaseOutlined style={{ marginRight: 4 }} />
                    数据库结构
                  </Text>
                  <Divider style={{ margin: '12px 0' }} />
                  <div className="schema-info">
                    {Object.entries(schema).map(([tableName, tableInfo]) => (
                      <div key={tableName} className="schema-table">
                        <Tag color="blue" style={{ marginBottom: 8 }}>
                          {tableName}
                        </Tag>
                        <Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 12 }}>
                          {tableInfo.description}
                        </Paragraph>
                        <div className="schema-columns">
                          {tableInfo.columns?.map((col) => (
                            <Tag key={col.name} size="small" style={{ margin: '2px' }}>
                              {col.name}
                              <Text type="secondary" style={{ marginLeft: 4 }}>
                                ({col.type})
                              </Text>
                            </Tag>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Space>
          </Card>
        </Col>

        {/* 右侧：结果展示 */}
        <Col xs={24} lg={16}>
          {/* SQL查询展示 */}
          {sqlQuery && (
            <Card
              title={
                <Space>
                  <TableOutlined />
                  <span>生成的SQL查询</span>
                </Space>
              }
              style={{ marginBottom: 24 }}
              size="small"
            >
              <div className="sql-display">
                <code>{sqlQuery}</code>
              </div>
            </Card>
          )}

          {/* 图表类型选择和推荐 */}
          {result && (
            <Card
              title={
                <Space>
                  <BarChartOutlined />
                  <span>查询结果</span>
                  {chartRecommendation && (
                    <Tag color="green">
                      推荐: {chartRecommendation.recommended_type === 'line' ? '折线图' :
                             chartRecommendation.recommended_type === 'bar' ? '柱状图' :
                             chartRecommendation.recommended_type === 'pie' ? '饼图' :
                             chartRecommendation.recommended_type === 'area' ? '面积图' : '表格'}
                    </Tag>
                  )}
                </Space>
              }
              extra={
                result && (
                  <Space>
                    <Select
                      value={selectedChartType}
                      onChange={setSelectedChartType}
                      style={{ width: 120 }}
                    >
                      <Option value="table">表格</Option>
                      <Option value="line">折线图</Option>
                      <Option value="bar">柱状图</Option>
                      <Option value="area">面积图</Option>
                      <Option value="pie">饼图</Option>
                    </Select>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => {
                        message.info('导出功能开发中')
                      }}
                    >
                      导出
                    </Button>
                  </Space>
                )
              }
            >
              {loading ? (
                <div className="chart-loading">
                  <Spin size="large" tip="正在处理查询..." />
                </div>
              ) : (
                <div className="chart-container">
                  {renderChart()}
                </div>
              )}

              {/* 推荐说明 */}
              {chartRecommendation && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                  <Text strong>图表推荐说明</Text>
                  <Paragraph type="secondary" style={{ marginTop: 8 }}>
                    {chartRecommendation.reason}
                  </Paragraph>
                  {chartRecommendation.possible_types && chartRecommendation.possible_types.length > 1 && (
                    <div>
                      <Text type="secondary">可选图表类型: </Text>
                      {chartRecommendation.possible_types.map((type) => (
                        <Tag key={type} style={{ marginLeft: 4 }}>
                          {type === 'line' ? '折线图' :
                           type === 'bar' ? '柱状图' :
                           type === 'pie' ? '饼图' :
                           type === 'area' ? '面积图' :
                           type === 'horizontal_bar' ? '横向柱状图' :
                           type === 'bubble' ? '气泡图' :
                           type === 'scatter' ? '散点图' : type}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* 空状态 */}
          {!result && !loading && (
            <Card>
              <div className="empty-state">
                <Empty
                  description={
                    <Space direction="vertical">
                      <Text>输入自然语言查询，让AI为你生成图表</Text>
                      <Text type="secondary">
                        例如：显示过去一年各季度的营收和利润
                      </Text>
                    </Space>
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  )
}

export default ChartGenerationPage
