import { useState, useEffect, useCallback } from 'react'
import { 
  Layout, Tabs, Card, Table, Statistic, Row, Col, Tag, Space, 
  Spin, Alert, Select, Button, Radio, Tooltip, Skeleton, Badge
} from 'antd'
import { 
  BookOutlined, BarChartOutlined, TrophyOutlined, FireOutlined,
  ReloadOutlined, FilterOutlined, ClockCircleOutlined, CheckCircleOutlined
} from '@ant-design/icons'
import { BidirectionalBar, Bar } from '@ant-design/charts'
import axios from 'axios'
import './App.css'

const { Header, Content } = Layout
const { Option } = Select
const { Group: RadioGroup } = Radio

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api` 
  : '/api'

const CATEGORIES = ['全部', '文学', '科幻', '古典文学', '历史', '悬疑', '童话', '网络小说']
const TOP_OPTIONS = [5, 10, 15]
const COMPARISON_SORT_OPTIONS = [
  { value: 'library_rank', label: '借阅排名' },
  { value: 'bookstore_rank', label: '销售排名' },
  { value: 'rank_diff', label: '排名差异' }
]
const LIBRARY_SORT_OPTIONS = [
  { value: 'rank', label: '借阅排名' },
  { value: 'borrow_count', label: '借阅次数' }
]
const BOOKSTORE_SORT_OPTIONS = [
  { value: 'rank', label: '销售排名' },
  { value: 'sales_count', label: '销量' }
]

const fetchWithRetry = async (url, maxRetries = 3, timeout = 10000) => {
  let lastError
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      const response = await axios.get(url, { signal: controller.signal })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      lastError = error
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  }
  throw lastError
}

function App() {
  const [loading, setLoading] = useState(true)
  const [skeletonLoading, setSkeletonLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [libraryData, setLibraryData] = useState([])
  const [bookstoreData, setBookstoreData] = useState([])
  const [comparisonData, setComparisonData] = useState([])
  const [classicBooks, setClassicBooks] = useState([])
  const [popularBooks, setPopularBooks] = useState([])
  const [statistics, setStatistics] = useState({})
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  
  const [chartCategory, setChartCategory] = useState('全部')
  const [chartSortBy, setChartSortBy] = useState('library_rank')
  const [chartTopN, setChartTopN] = useState(10)
  
  const [libraryCategory, setLibraryCategory] = useState('全部')
  const [librarySortBy, setLibrarySortBy] = useState('rank')
  const [libraryTopN, setLibraryTopN] = useState(15)
  
  const [bookstoreCategory, setBookstoreCategory] = useState('全部')
  const [bookstoreSortBy, setBookstoreSortBy] = useState('rank')
  const [bookstoreTopN, setBookstoreTopN] = useState(15)
  
  const [classicTopN, setClassicTopN] = useState(15)
  const [popularTopN, setPopularTopN] = useState(15)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
      setSkeletonLoading(true)
    }
    setError(null)

    try {
      const [libRes, storeRes, compRes, classicRes, popularRes] = await Promise.all([
        fetchWithRetry(`${API_BASE}/library-ranking`),
        fetchWithRetry(`${API_BASE}/bookstore-ranking`),
        fetchWithRetry(`${API_BASE}/comparison`),
        fetchWithRetry(`${API_BASE}/classic-books`),
        fetchWithRetry(`${API_BASE}/popular-books`)
      ])

      setLibraryData(libRes.data.data)
      setBookstoreData(storeRes.data.data)
      setComparisonData(compRes.data.comparison)
      setStatistics(compRes.data.statistics)
      setClassicBooks(classicRes.data.data)
      setPopularBooks(popularRes.data.data)
      setLastUpdate(new Date().toLocaleString('zh-CN'))
      setError(null)
    } catch (err) {
      setError('数据加载失败，请确保后端服务已启动')
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
      setTimeout(() => setSkeletonLoading(false), 500)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = () => {
    fetchData(true)
  }

  const filteredComparisonData = comparisonData
    .filter(item => {
      if (chartCategory === '全部') return true
      return item.category === chartCategory
    })
    .filter(item => item.both_listed)

  const sortedComparisonData = [...filteredComparisonData].sort((a, b) => {
    switch (chartSortBy) {
      case 'library_rank':
        return a.library_rank - b.library_rank
      case 'bookstore_rank':
        return a.bookstore_rank - b.bookstore_rank
      case 'rank_diff':
        return Math.abs(b.rank_diff) - Math.abs(a.rank_diff)
      default:
        return 0
    }
  })

  const chartData = sortedComparisonData
    .slice(0, chartTopN)
    .map(item => ({
      title: item.title,
      借阅排名: item.library_rank,
      销售排名: item.bookstore_rank,
      rank_diff: item.rank_diff,
      category: item.category,
      borrow_count: item.borrow_count || 0,
      sales_count: item.sales_count || 0
    }))

  const miniBarConfig = (data, color, title) => ({
    data,
    xField: 'type',
    yField: 'value',
    color,
    width: 120,
    height: 40,
    xAxis: false,
    yAxis: false,
    legend: false,
    tooltip: {
      showTitle: false,
      formatter: (d) => ({ name: title, value: d.value })
    }
  })

  const chartConfig = {
    data: chartData,
    xField: 'title',
    yField: ['借阅排名', '销售排名'],
    color: ['#1890ff', '#f5222d'],
    layout: 'vertical',
    meta: {
      借阅排名: {
        alias: '借阅排名',
        min: 0,
        max: 20,
        formatter: (v) => `第${v}名`
      },
      销售排名: {
        alias: '销售排名',
        min: 0,
        max: 20,
        formatter: (v) => `第${v}名`
      }
    },
    yAxis: {
      借阅排名: {
        position: 'left',
        title: {
          text: '借阅排名 ← 越短越靠前',
          style: {
            fill: '#1890ff',
            fontSize: 12,
            fontWeight: 'bold'
          }
        },
        label: {
          formatter: (v) => `第${v}名`
        },
        grid: {
          line: {
            style: {
              stroke: '#e8e8e8',
              lineDash: [4, 4]
            }
          }
        }
      },
      销售排名: {
        position: 'right',
        title: {
          text: '销售排名 → 越短越靠前',
          style: {
            fill: '#f5222d',
            fontSize: 12,
            fontWeight: 'bold'
          }
        },
        label: {
          formatter: (v) => `第${v}名`
        }
      }
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
        style: {
          fontSize: 12
        }
      }
    },
    label: {
      借阅排名: {
        position: 'middle',
        style: {
          fill: '#fff',
          fontSize: 14,
          fontWeight: 'bold',
          textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
        },
        formatter: (item) => `第${item['借阅排名']}名`
      },
      销售排名: {
        position: 'middle',
        style: {
          fill: '#fff',
          fontSize: 14,
          fontWeight: 'bold',
          textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
        },
        formatter: (item) => `第${item['销售排名']}名`
      }
    },
    tooltip: {
      showMarkers: true,
      showTitle: true,
      fields: ['借阅排名', '销售排名', 'rank_diff', 'category'],
      customContent: (title, items) => {
        const item = items[0]?.data || {}
        const diffText = item.rank_diff > 0 
          ? `<span style="color:#1890ff;font-weight:bold">借阅领先 ${item.rank_diff} 位</span>`
          : item.rank_diff < 0 
            ? `<span style="color:#f5222d;font-weight:bold">销售领先 ${Math.abs(item.rank_diff)} 位</span>`
            : '<span style="color:#52c41a;font-weight:bold">排名持平</span>'
        
        const miniChartData = [
          { type: '借阅', value: 20 - item['借阅排名'] },
          { type: '销售', value: 20 - item['销售排名'] }
        ]
        
        return `
          <div style="padding: 12px; min-width: 220px;">
            <div style="font-weight:bold;font-size:14px;margin-bottom:10px;border-bottom:1px solid #eee;padding-bottom:8px;">
              📖 ${title}
            </div>
            <div style="margin-bottom: 8px;">
              <span style="color:#1890ff">📚 借阅排名:</span>
              <strong style="margin-left:8px">第${item['借阅排名']}名</strong>
            </div>
            <div style="margin-bottom: 8px;">
              <span style="color:#f5222d">🛒 销售排名:</span>
              <strong style="margin-left:8px">第${item['销售排名']}名</strong>
            </div>
            <div style="margin-bottom: 10px;">
              <span style="color:#666">🏷️ 分类:</span>
              <span style="margin-left:8px">${item.category || '-'}</span>
            </div>
            <div style="margin-bottom: 10px;padding:8px;background:#f5f5f5;border-radius:4px;text-align:center">
              ${diffText}
            </div>
            <div style="padding-top:8px;border-top:1px dashed #eee;">
              <div style="font-size:12px;color:#999;margin-bottom:6px;">📊 排名对比</div>
              <div style="display:flex;gap:8px;align-items:flex-end;height:50px;">
                <div style="flex:1;text-align:center;">
                  <div style="background:linear-gradient(180deg,#1890ff,#69c0ff);width:100%;height:${(20 - item['借阅排名']) * 2.5}px;border-radius:4px 4px 0 0;"></div>
                  <div style="font-size:10px;color:#1890ff;margin-top:4px;">借阅</div>
                </div>
                <div style="flex:1;text-align:center;">
                  <div style="background:linear-gradient(180deg,#f5222d,#ff7875);width:100%;height:${(20 - item['销售排名']) * 2.5}px;border-radius:4px 4px 0 0;"></div>
                  <div style="font-size:10px;color:#f5222d;margin-top:4px;">销售</div>
                </div>
              </div>
            </div>
          </div>
        `
      }
    },
    legend: {
      position: 'top',
      itemSpacing: 20,
      marker: {
        symbol: 'square'
      }
    },
    interactions: [
      {
        type: 'element-active',
        cfg: {
          start: [
            {
              trigger: 'element:mouseenter',
              action: ['element-style:highlight', 'cursor:pointer']
            }
          ]
        }
      }
    ],
    animation: {
      appear: {
        animation: 'scale-in-x',
        duration: 800,
        easing: 'easeOutCubic'
      },
      update: {
        animation: 'fade-in',
        duration: 500
      }
    },
    state: {
      active: {
        style: {
          stroke: '#000',
          lineWidth: 2,
          shadowBlur: 10,
          shadowColor: 'rgba(0,0,0,0.3)'
        }
      },
      inactive: {
        style: {
          opacity: 0.5
        }
      }
    }
  }

  const filteredLibraryData = libraryData
    .filter(item => {
      if (libraryCategory === '全部') return true
      return item.category === libraryCategory
    })
    .sort((a, b) => {
      switch (librarySortBy) {
        case 'rank':
          return a.rank - b.rank
        case 'borrow_count':
          return b.borrow_count - a.borrow_count
        default:
          return 0
      }
    })
    .slice(0, libraryTopN)

  const filteredBookstoreData = bookstoreData
    .filter(item => {
      if (bookstoreCategory === '全部') return true
      return item.category === bookstoreCategory
    })
    .sort((a, b) => {
      switch (bookstoreSortBy) {
        case 'rank':
          return a.rank - b.rank
        case 'sales_count':
          return b.sales_count - a.sales_count
        default:
          return 0
      }
    })
    .slice(0, bookstoreTopN)

  const filteredClassicBooks = classicBooks.slice(0, classicTopN)
  const filteredPopularBooks = popularBooks.slice(0, popularTopN)

  const libraryColumns = [
    { title: '排名', dataIndex: 'rank', key: 'rank', width: 80,
      render: (val) => <Badge count={val} showZero color={val <= 3 ? '#f5222d' : '#1890ff'} />
    },
    { title: '书名', dataIndex: 'title', key: 'title',
      render: (val) => <span style={{ fontWeight: 500 }}>{val}</span>
    },
    { title: '作者', dataIndex: 'author', key: 'author', width: 120 },
    { title: '借阅次数', dataIndex: 'borrow_count', key: 'borrow_count', width: 120,
      render: (val) => <Tag color="blue">{val.toLocaleString()}</Tag>
    },
    { title: '分类', dataIndex: 'category', key: 'category', width: 100,
      render: (cat) => <Tag color="blue">{cat}</Tag>
    }
  ]

  const bookstoreColumns = [
    { title: '排名', dataIndex: 'rank', key: 'rank', width: 80,
      render: (val) => <Badge count={val} showZero color={val <= 3 ? '#f5222d' : '#fa8c16'} />
    },
    { title: '书名', dataIndex: 'title', key: 'title',
      render: (val) => <span style={{ fontWeight: 500 }}>{val}</span>
    },
    { title: '作者', dataIndex: 'author', key: 'author', width: 120 },
    { title: '销量', dataIndex: 'sales_count', key: 'sales_count', width: 120,
      render: (val) => <Tag color="red">{val.toLocaleString()}</Tag>
    },
    { title: '分类', dataIndex: 'category', key: 'category', width: 120,
      render: (cat) => <Tag color="red">{cat}</Tag>
    }
  ]

  const classicColumns = [
    { title: '书名', dataIndex: 'title', key: 'title',
      render: (val) => <span style={{ fontWeight: 500 }}>{val}</span>
    },
    { title: '作者', dataIndex: 'author', key: 'author', width: 120 },
    { title: '借阅排名', dataIndex: 'rank', key: 'rank', width: 100,
      render: (val) => <Badge count={val} showZero color="#1890ff" />
    },
    { title: '销售排名', dataIndex: 'bookstore_rank', key: 'bookstore_rank', width: 100,
      render: (val) => val || <Tag color="default">未上榜</Tag>
    },
    { title: '排名差', dataIndex: 'rank_diff', key: 'rank_diff', width: 100,
      render: (val) => val ? <Tag color="blue">借阅领先 +{val}</Tag> : '-'
    },
    { title: '类型', dataIndex: 'type', key: 'type', width: 150,
      render: (type) => type === 'classic_only' ? 
        <Tag color="purple">借阅榜独有</Tag> : 
        <Tag color="blue">借阅领先</Tag>
    }
  ]

  const popularColumns = [
    { title: '书名', dataIndex: 'title', key: 'title',
      render: (val) => <span style={{ fontWeight: 500 }}>{val}</span>
    },
    { title: '作者', dataIndex: 'author', key: 'author', width: 120 },
    { title: '销售排名', dataIndex: 'rank', key: 'rank', width: 100,
      render: (val) => <Badge count={val} showZero color="#f5222d" />
    },
    { title: '借阅排名', dataIndex: 'library_rank', key: 'library_rank', width: 100,
      render: (val) => val || <Tag color="default">未上榜</Tag>
    },
    { title: '排名差', dataIndex: 'rank_diff', key: 'rank_diff', width: 100,
      render: (val) => val ? <Tag color="red">销售领先 +{val}</Tag> : '-'
    },
    { title: '类型', dataIndex: 'type', key: 'type', width: 150,
      render: (type) => type === 'popular_only' ? 
        <Tag color="orange">销售榜独有</Tag> : 
        <Tag color="red">销售领先</Tag>
    }
  ]

  const FilterBar = ({ 
    showCategory = true, 
    category, 
    onCategoryChange, 
    sortBy, 
    onSortChange, 
    sortOptions,
    topN,
    onTopNChange,
    dataCount,
    totalCount
  }) => (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Row gutter={[16, 8]} align="middle">
        {showCategory && (
          <Col>
            <Space>
              <span style={{ color: '#666' }}>分类:</span>
              <Select 
                value={category} 
                onChange={onCategoryChange}
                style={{ width: 120 }}
                size="small"
              >
                {CATEGORIES.map(cat => (
                  <Option key={cat} value={cat}>{cat}</Option>
                ))}
              </Select>
            </Space>
          </Col>
        )}
        <Col>
          <Space>
            <span style={{ color: '#666' }}>排序:</span>
            <Select 
              value={sortBy} 
              onChange={onSortChange}
              style={{ width: 120 }}
              size="small"
            >
              {sortOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Space>
        </Col>
        <Col>
          <Space>
            <span style={{ color: '#666' }}>显示:</span>
            <RadioGroup value={topN} onChange={e => onTopNChange(e.target.value)} size="small">
              {TOP_OPTIONS.map(n => (
                <Radio.Button key={n} value={n}>TOP{n}</Radio.Button>
              ))}
            </RadioGroup>
          </Space>
        </Col>
        <Col flex="auto" style={{ textAlign: 'right' }}>
          <Tag color="processing">
            显示 {dataCount}/{totalCount} 条
          </Tag>
        </Col>
      </Row>
    </Card>
  )

  const tabItems = [
    {
      key: '1',
      label: '📊 对比可视化',
      children: (
        <Card 
          title="图书排名对比：借阅榜 vs 销售榜" 
          extra={
            <Space>
              <Tag color="blue">📚 蓝色: 借阅排名</Tag>
              <Tag color="red">🛒 红色: 销售排名</Tag>
              <Tooltip title="刷新数据">
                <Button 
                  type="text" 
                  icon={<ReloadOutlined spin={refreshing} />} 
                  onClick={handleRefresh}
                />
              </Tooltip>
            </Space>
          }
        >
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ 
              padding: '16px', 
              background: 'linear-gradient(135deg, #e6f7ff 0%, #fff7e6 100%)', 
              borderRadius: 8, 
              border: '1px solid #91d5ff' 
            }}>
              <p style={{ margin: 0, color: '#333', lineHeight: 1.8 }}>
                <strong>📊 图表解读指南：</strong><br/>
                • 条形<strong>越短</strong>表示排名<strong>越靠前</strong>（第1名是最好排名）<br/>
                • 蓝色条形在左侧Y轴（借阅排名），红色条形在右侧Y轴（销售排名）<br/>
                • 鼠标悬停可查看详细排名、差异对比和迷你柱状图
              </p>
            </div>

            <FilterBar
              category={chartCategory}
              onCategoryChange={setChartCategory}
              sortBy={chartSortBy}
              onSortChange={setChartSortBy}
              sortOptions={COMPARISON_SORT_OPTIONS}
              topN={chartTopN}
              onTopNChange={setChartTopN}
              dataCount={Math.min(sortedComparisonData.length, chartTopN)}
              totalCount={filteredComparisonData.length}
            />

            {skeletonLoading ? (
              <Skeleton active paragraph={{ rows: 8 }} />
            ) : (
              <div className="chart-container">
                <BidirectionalBar {...chartConfig} height={420} key={`${chartSortBy}-${chartTopN}-${chartCategory}`} />
              </div>
            )}
          </Space>
        </Card>
      )
    },
    {
      key: '2',
      label: '📚 图书馆借阅榜',
      children: (
        <Card 
          title="公共图书馆年度借阅排行"
          extra={
            <Button 
              type="text" 
              icon={<ReloadOutlined spin={refreshing} />} 
              onClick={handleRefresh}
            >
              刷新
            </Button>
          }
        >
          <FilterBar
            category={libraryCategory}
            onCategoryChange={setLibraryCategory}
            sortBy={librarySortBy}
            onSortChange={setLibrarySortBy}
            sortOptions={LIBRARY_SORT_OPTIONS}
            topN={libraryTopN}
            onTopNChange={setLibraryTopN}
            dataCount={filteredLibraryData.length}
            totalCount={libraryData.length}
          />
          {skeletonLoading ? (
            <Skeleton active paragraph={{ rows: 15 }} />
          ) : (
            <Table
              dataSource={filteredLibraryData}
              columns={libraryColumns}
              rowKey="rank"
              pagination={false}
            />
          )}
        </Card>
      )
    },
    {
      key: '3',
      label: '🛒 电商销售榜',
      children: (
        <Card 
          title="电商平台图书销量排行"
          extra={
            <Button 
              type="text" 
              icon={<ReloadOutlined spin={refreshing} />} 
              onClick={handleRefresh}
            >
              刷新
            </Button>
          }
        >
          <FilterBar
            category={bookstoreCategory}
            onCategoryChange={setBookstoreCategory}
            sortBy={bookstoreSortBy}
            onSortChange={setBookstoreSortBy}
            sortOptions={BOOKSTORE_SORT_OPTIONS}
            topN={bookstoreTopN}
            onTopNChange={setBookstoreTopN}
            dataCount={filteredBookstoreData.length}
            totalCount={bookstoreData.length}
          />
          {skeletonLoading ? (
            <Skeleton active paragraph={{ rows: 15 }} />
          ) : (
            <Table
              dataSource={filteredBookstoreData}
              columns={bookstoreColumns}
              rowKey="rank"
              pagination={false}
            />
          )}
        </Card>
      )
    },
    {
      key: '4',
      label: '🏆 经典长销书',
      children: (
        <Card 
          title="经典长销书分析 - 借阅榜独有或排名显著高于销售榜"
          extra={
            <Button 
              type="text" 
              icon={<ReloadOutlined spin={refreshing} />} 
              onClick={handleRefresh}
            >
              刷新
            </Button>
          }
        >
          <Card size="small" style={{ marginBottom: 16 }}>
            <Row gutter={[16, 8]} align="middle">
              <Col>
                <Space>
                  <span style={{ color: '#666' }}>显示:</span>
                  <RadioGroup value={classicTopN} onChange={e => setClassicTopN(e.target.value)} size="small">
                    {TOP_OPTIONS.map(n => (
                      <Radio.Button key={n} value={n}>TOP{n}</Radio.Button>
                    ))}
                  </RadioGroup>
                </Space>
              </Col>
              <Col flex="auto" style={{ textAlign: 'right' }}>
                <Tag color="processing">
                  显示 {filteredClassicBooks.length}/{classicBooks.length} 条
                </Tag>
              </Col>
            </Row>
          </Card>
          {skeletonLoading ? (
            <Skeleton active paragraph={{ rows: 10 }} />
          ) : (
            <Table
              dataSource={filteredClassicBooks}
              columns={classicColumns}
              rowKey="title"
              pagination={false}
            />
          )}
        </Card>
      )
    },
    {
      key: '5',
      label: '🔥 流行畅销书',
      children: (
        <Card 
          title="流行畅销书分析 - 销售榜独有或排名显著高于借阅榜"
          extra={
            <Button 
              type="text" 
              icon={<ReloadOutlined spin={refreshing} />} 
              onClick={handleRefresh}
            >
              刷新
            </Button>
          }
        >
          <Card size="small" style={{ marginBottom: 16 }}>
            <Row gutter={[16, 8]} align="middle">
              <Col>
                <Space>
                  <span style={{ color: '#666' }}>显示:</span>
                  <RadioGroup value={popularTopN} onChange={e => setPopularTopN(e.target.value)} size="small">
                    {TOP_OPTIONS.map(n => (
                      <Radio.Button key={n} value={n}>TOP{n}</Radio.Button>
                    ))}
                  </RadioGroup>
                </Space>
              </Col>
              <Col flex="auto" style={{ textAlign: 'right' }}>
                <Tag color="processing">
                  显示 {filteredPopularBooks.length}/{popularBooks.length} 条
                </Tag>
              </Col>
            </Row>
          </Card>
          {skeletonLoading ? (
            <Skeleton active paragraph={{ rows: 10 }} />
          ) : (
            <Table
              dataSource={filteredPopularBooks}
              columns={popularColumns}
              rowKey="title"
              pagination={false}
            />
          )}
        </Card>
      )
    }
  ]

  if (loading && !skeletonLoading) {
    return (
      <div className="loading-container">
        <Spin size="large" description="数据加载中..." />
      </div>
    )
  }

  return (
    <Layout className="layout">
      <Header className="header">
        <div className="header-content">
          <BookOutlined className="logo-icon" />
          <h1 className="title">图书榜单对比分析</h1>
          <p className="subtitle">公共图书馆借阅 vs 电商平台销售</p>
          {lastUpdate && (
            <Tag icon={<CheckCircleOutlined />} color="success" className="update-tag">
              数据已同步
            </Tag>
          )}
        </div>
      </Header>
      <Content className="content">
        {error && (
          <Alert
            message="数据加载失败"
            description={
              <Space>
                <span>{error}</span>
                <Button type="primary" size="small" onClick={handleRefresh}>
                  重试
                </Button>
              </Space>
            }
            type="error"
            showIcon
            closable
            style={{ marginBottom: 20 }}
          />
        )}

        <Skeleton loading={skeletonLoading} active paragraph={{ rows: 2 }}>
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="图书馆借阅榜书籍"
                  value={statistics.total_library || 0}
                  prefix={<BookOutlined />}
                  styles={{ content: { color: '#1890ff' } }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="电商销售榜书籍"
                  value={statistics.total_bookstore || 0}
                  prefix={<BarChartOutlined />}
                  styles={{ content: { color: '#f5222d' } }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="经典长销书"
                  value={(statistics.only_library || 0) + (statistics.classic_dominant || 0)}
                  prefix={<TrophyOutlined />}
                  styles={{ content: { color: '#722ed1' } }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="流行畅销书"
                  value={(statistics.only_bookstore || 0) + (statistics.popular_dominant || 0)}
                  prefix={<FireOutlined />}
                  styles={{ content: { color: '#fa8c16' } }}
                />
              </Card>
            </Col>
          </Row>
        </Skeleton>

        <Card title="验证说明" style={{ marginBottom: 20 }}>
          <Space orientation="vertical">
            <Tag color="success">✓ 《平凡的世界》在借阅榜排名第1，销售榜排名第15，排名差显著</Tag>
            <Tag color="success">✓ 网络小说（如《斗破苍穹》《完美世界》等）在销售榜靠前但未进入借阅榜</Tag>
          </Space>
        </Card>

        <Tabs defaultActiveKey="1" size="large" items={tabItems} />
      </Content>
    </Layout>
  )
}

export default App
