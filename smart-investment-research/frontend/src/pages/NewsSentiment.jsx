import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Table, 
  Select, 
  DatePicker, 
  Row, 
  Col, 
  Statistic,
  Tag
} from 'antd'
import { 
  TrendingUpOutlined, 
  TrendingDownOutlined,
  RiseOutlined,
  WarningOutlined
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { getSentimentData, getSentimentTrend, getHotTopics } from '../services/sentimentService'

const { RangePicker } = DatePicker
const { Option } = Select

function NewsSentiment() {
  const [sentimentData, setSentimentData] = useState([])
  const [trendData, setTrendData] = useState({})
  const [hotTopics, setHotTopics] = useState([])
  const [loading, setLoading] = useState(false)
  const [sourceType, setSourceType] = useState('all')
  const [sentimentType, setSentimentType] = useState('all')

  useEffect(() => {
    loadData()
  }, [sourceType, sentimentType])

  const loadData = async () => {
    setLoading(true)
    try {
      const [sentiment, trend, topics] = await Promise.all([
        getSentimentData({ sourceType, sentimentType }),
        getSentimentTrend(),
        getHotTopics()
      ])
      setSentimentData(sentiment)
      setTrendData(trend)
      setHotTopics(topics)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const trendChartOption = {
    title: {
      text: '舆情情感趋势',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['利好', '利空', '中性'],
      top: 30
    },
    xAxis: {
      type: 'category',
      data: trendData.dates || []
    },
    yAxis: {
      type: 'value',
      name: '数量'
    },
    series: [
      {
        name: '利好',
        type: 'line',
        data: trendData.positive || [],
        smooth: true,
        lineStyle: {
          color: '#52c41a'
        },
        itemStyle: {
          color: '#52c41a'
        }
      },
      {
        name: '利空',
        type: 'line',
        data: trendData.negative || [],
        smooth: true,
        lineStyle: {
          color: '#f5222d'
        },
        itemStyle: {
          color: '#f5222d'
        }
      },
      {
        name: '中性',
        type: 'line',
        data: trendData.neutral || [],
        smooth: true,
        lineStyle: {
          color: '#1890ff'
        },
        itemStyle: {
          color: '#1890ff'
        }
      }
    ]
  }

  const hotTopicsChartOption = {
    title: {
      text: '舆情热度榜',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    xAxis: {
      type: 'value',
      name: '热度指数'
    },
    yAxis: {
      type: 'category',
      data: hotTopics.map(item => item.topic).reverse()
    },
    series: [
      {
        type: 'bar',
        data: hotTopics.map(item => item.heat).reverse(),
        itemStyle: {
          color: function(params) {
            const value = params.value
            if (value > 80) return '#f5222d'
            if (value > 50) return '#faad14'
            return '#1890ff'
          }
        }
      }
    ]
  }

  const sentimentDistributionOption = {
    title: {
      text: '情感分布',
      left: 'center'
    },
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { value: 35, name: '利好', itemStyle: { color: '#52c41a' } },
          { value: 40, name: '中性', itemStyle: { color: '#1890ff' } },
          { value: 25, name: '利空', itemStyle: { color: '#f5222d' } }
        ]
      }
    ]
  }

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 300,
      ellipsis: true
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 120
    },
    {
      title: '情感倾向',
      dataIndex: 'sentiment',
      key: 'sentiment',
      width: 100,
      render: (sentiment) => {
        let color = 'blue'
        let icon = null
        if (sentiment === 'positive') {
          color = 'green'
          icon = <TrendingUpOutlined />
        } else if (sentiment === 'negative') {
          color = 'red'
          icon = <TrendingDownOutlined />
        }
        return (
          <Tag color={color} icon={icon}>
            {sentiment === 'positive' ? '利好' : sentiment === 'negative' ? '利空' : '中性'}
          </Tag>
        )
      }
    },
    {
      title: '情感分值',
      dataIndex: 'score',
      key: 'score',
      width: 100,
      render: (score) => (
        <span style={{ 
          color: score > 0.6 ? '#52c41a' : score < 0.4 ? '#f5222d' : '#1890ff',
          fontWeight: 'bold'
        }}>
          {(score * 100).toFixed(1)}%
        </span>
      )
    },
    {
      title: '发布时间',
      dataIndex: 'publishTime',
      key: 'publishTime',
      width: 180
    },
    {
      title: '相关股票',
      dataIndex: 'relatedStocks',
      key: 'relatedStocks',
      render: (stocks) => (
        <>
          {stocks.map((stock, index) => (
            <Tag key={index}>{stock}</Tag>
          ))}
        </>
      )
    }
  ]

  const mockSentimentData = [
    {
      key: '1',
      title: '央行降准释放流动性，市场预期宽松政策持续',
      source: '财经网',
      sentiment: 'positive',
      score: 0.85,
      publishTime: '2026-05-05 14:30:00',
      relatedStocks: ['000001', '600000']
    },
    {
      key: '2',
      title: '某科技公司营收不及预期，股价大跌',
      source: '东方财富',
      sentiment: 'negative',
      score: 0.25,
      publishTime: '2026-05-05 13:45:00',
      relatedStocks: ['300750']
    },
    {
      key: '3',
      title: '新能源汽车行业分析报告发布',
      source: '同花顺',
      sentiment: 'neutral',
      score: 0.55,
      publishTime: '2026-05-05 12:20:00',
      relatedStocks: ['002594', '600030']
    }
  ]

  const mockTrendData = {
    dates: ['5-1', '5-2', '5-3', '5-4', '5-5', '5-6', '5-7'],
    positive: [120, 150, 130, 180, 200, 170, 190],
    negative: [80, 60, 90, 70, 50, 80, 60],
    neutral: [150, 140, 160, 150, 170, 160, 180]
  }

  const mockHotTopics = [
    { topic: 'AI概念', heat: 95 },
    { topic: '新能源', heat: 85 },
    { topic: '半导体', heat: 75 },
    { topic: '消费电子', heat: 65 },
    { topic: '医药生物', heat: 60 },
    { topic: '金融科技', heat: 55 },
    { topic: '房地产', heat: 50 },
    { topic: '军工', heat: 45 }
  ]

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card title="新闻舆情监控" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={4}>
                <Card bordered={false}>
                  <Statistic
                    title="今日利好"
                    value={128}
                    valueStyle={{ color: '#52c41a' }}
                    prefix={<RiseOutlined />}
                    suffix="条"
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card bordered={false}>
                  <Statistic
                    title="今日利空"
                    value={45}
                    valueStyle={{ color: '#f5222d' }}
                    prefix={<WarningOutlined />}
                    suffix="条"
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card bordered={false}>
                  <Statistic
                    title="监控数据源"
                    value={12}
                    suffix="个"
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card bordered={false}>
                  <Statistic
                    title="监控频率"
                    value={5}
                    suffix="分钟/次"
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card bordered={false}>
                  <Statistic
                    title="舆情热度指数"
                    value={87.5}
                    precision={1}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card bordered={false}>
                  <Statistic
                    title="情感指数"
                    value={62.3}
                    precision={1}
                    valueStyle={{ color: '#52c41a' }}
                    suffix="%"
                  />
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card 
            title="舆情情感趋势" 
            style={{ marginBottom: 16 }}
            extra={
              <div>
                <RangePicker style={{ marginRight: 8 }} />
                <Select 
                  defaultValue="all" 
                  style={{ width: 120, marginRight: 8 }}
                  value={sourceType}
                  onChange={setSourceType}
                >
                  <Option value="all">全部来源</Option>
                  <Option value="news">财经媒体</Option>
                  <Option value="social">社交平台</Option>
                </Select>
                <Select 
                  defaultValue="all" 
                  style={{ width: 120 }}
                  value={sentimentType}
                  onChange={setSentimentType}
                >
                  <Option value="all">全部情感</Option>
                  <Option value="positive">利好</Option>
                  <Option value="neutral">中性</Option>
                  <Option value="negative">利空</Option>
                </Select>
              </div>
            }
          >
            <ReactECharts 
              option={trendChartOption} 
              style={{ height: '400px' }} 
              opts={{ renderer: 'canvas' }}
            />
          </Card>

          <Card title="新闻列表" style={{ marginBottom: 16 }}>
            <Table 
              columns={columns} 
              dataSource={mockSentimentData} 
              pagination={{ pageSize: 10 }}
              loading={loading}
            />
          </Card>
        </Col>

        <Col span={8}>
          <Card title="情感分布" style={{ marginBottom: 16 }}>
            <ReactECharts 
              option={sentimentDistributionOption} 
              style={{ height: '300px' }} 
            />
          </Card>

          <Card title="舆情热度榜">
            <ReactECharts 
              option={hotTopicsChartOption} 
              style={{ height: '500px' }} 
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default NewsSentiment
