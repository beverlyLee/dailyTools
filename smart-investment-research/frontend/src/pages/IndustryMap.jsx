import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Table, 
  Select, 
  Row, 
  Col, 
  Statistic,
  Tag,
  Modal,
  Descriptions
} from 'antd'
import { 
  RiseOutlined,
  FallOutlined,
  EyeOutlined,
  GlobalOutlined,
  TeamOutlined,
  WalletOutlined
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { getIndustryChain, getCompanyDetail, getFinancialData } from '../services/industryService'

const { Option } = Select

function IndustryMap() {
  const [industryChain, setIndustryChain] = useState({})
  const [companyList, setCompanyList] = useState([])
  const [selectedIndustry, setSelectedIndustry] = useState('新能源')
  const [companyDetail, setCompanyDetail] = useState(null)
  const [financialData, setFinancialData] = useState({})
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)

  useEffect(() => {
    loadData()
  }, [selectedIndustry])

  const loadData = async () => {
    setLoading(true)
    try {
      const [chain, companies, financial] = await Promise.all([
        getIndustryChain(selectedIndustry),
        getCompanyList(selectedIndustry),
        getFinancialData(selectedIndustry)
      ])
      setIndustryChain(chain)
      setCompanyList(companies)
      setFinancialData(financial)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const viewCompanyDetail = async (record) => {
    setLoading(true)
    try {
      const detail = await getCompanyDetail(record.id)
      setCompanyDetail(detail)
      setModalVisible(true)
    } catch (error) {
      console.error('加载公司详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const industryChainChartOption = {
    title: {
      text: `${selectedIndustry}产业链图谱`,
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}'
    },
    legend: {
      data: ['上游', '中游', '下游', '关联企业'],
      bottom: 10
    },
    series: [
      {
        type: 'graph',
        layout: 'force',
        animation: true,
        label: {
          show: true,
          position: 'bottom',
          formatter: '{b}'
        },
        draggable: true,
        data: [
          { 
            name: '锂矿资源', 
            value: 80, 
            symbolSize: 50, 
            category: '上游',
            itemStyle: { color: '#52c41a' }
          },
          { 
            name: '正极材料', 
            value: 70, 
            symbolSize: 45, 
            category: '上游',
            itemStyle: { color: '#52c41a' }
          },
          { 
            name: '负极材料', 
            value: 65, 
            symbolSize: 40, 
            category: '上游',
            itemStyle: { color: '#52c41a' }
          },
          { 
            name: '电解液', 
            value: 60, 
            symbolSize: 38, 
            category: '上游',
            itemStyle: { color: '#52c41a' }
          },
          { 
            name: '隔膜', 
            value: 55, 
            symbolSize: 35, 
            category: '上游',
            itemStyle: { color: '#52c41a' }
          },
          { 
            name: '动力电池', 
            value: 90, 
            symbolSize: 55, 
            category: '中游',
            itemStyle: { color: '#1890ff' }
          },
          { 
            name: '电机电控', 
            value: 85, 
            symbolSize: 50, 
            category: '中游',
            itemStyle: { color: '#1890ff' }
          },
          { 
            name: '整车制造', 
            value: 95, 
            symbolSize: 60, 
            category: '下游',
            itemStyle: { color: '#f5222d' }
          },
          { 
            name: '充电桩', 
            value: 75, 
            symbolSize: 48, 
            category: '下游',
            itemStyle: { color: '#f5222d' }
          },
          { 
            name: '回收利用', 
            value: 65, 
            symbolSize: 40, 
            category: '下游',
            itemStyle: { color: '#f5222d' }
          },
          { 
            name: '宁德时代', 
            value: 88, 
            symbolSize: 52, 
            category: '关联企业',
            itemStyle: { color: '#faad14' }
          },
          { 
            name: '比亚迪', 
            value: 85, 
            symbolSize: 50, 
            category: '关联企业',
            itemStyle: { color: '#faad14' }
          },
          { 
            name: '特斯拉', 
            value: 92, 
            symbolSize: 58, 
            category: '关联企业',
            itemStyle: { color: '#faad14' }
          }
        ],
        links: [
          { source: '锂矿资源', target: '正极材料' },
          { source: '正极材料', target: '动力电池' },
          { source: '负极材料', target: '动力电池' },
          { source: '电解液', target: '动力电池' },
          { source: '隔膜', target: '动力电池' },
          { source: '动力电池', target: '整车制造' },
          { source: '电机电控', target: '整车制造' },
          { source: '整车制造', target: '充电桩' },
          { source: '动力电池', target: '回收利用' },
          { source: '宁德时代', target: '动力电池' },
          { source: '比亚迪', target: '整车制造' },
          { source: '比亚迪', target: '动力电池' },
          { source: '特斯拉', target: '整车制造' }
        ],
        categories: [
          { name: '上游' },
          { name: '中游' },
          { name: '下游' },
          { name: '关联企业' }
        ],
        lineStyle: {
          opacity: 0.9,
          width: 2,
          curveness: 0.2
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 10
          }
        },
        force: {
          repulsion: 200,
          edgeLength: 80
        }
      }
    ]
  }

  const financialComparisonOption = {
    title: {
      text: '估值指标对比',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['PE(市盈率)', 'PB(市净率)', 'ROE(净资产收益率)'],
      top: 30
    },
    xAxis: {
      type: 'category',
      data: ['宁德时代', '比亚迪', '特斯拉', 'LG新能源', '国轩高科']
    },
    yAxis: [
      {
        type: 'value',
        name: '倍数',
        position: 'left'
      },
      {
        type: 'value',
        name: 'ROE(%)',
        position: 'right'
      }
    ],
    series: [
      {
        name: 'PE(市盈率)',
        type: 'bar',
        data: [35.2, 28.5, 45.8, 22.3, 18.7],
        itemStyle: { color: '#52c41a' }
      },
      {
        name: 'PB(市净率)',
        type: 'bar',
        data: [8.5, 6.2, 12.3, 5.8, 4.2],
        itemStyle: { color: '#1890ff' }
      },
      {
        name: 'ROE(净资产收益率)',
        type: 'line',
        yAxisIndex: 1,
        data: [18.5, 22.3, 25.8, 15.2, 12.7],
        itemStyle: { color: '#f5222d' },
        lineStyle: { width: 3 }
      }
    ]
  }

  const industryDistributionOption = {
    title: {
      text: '行业公司分布',
      left: 'center'
    },
    tooltip: {
      trigger: 'item'
    },
    series: [
      {
        type: 'pie',
        radius: '50%',
        data: [
          { value: 45, name: '上游材料', itemStyle: { color: '#52c41a' } },
          { value: 30, name: '中游制造', itemStyle: { color: '#1890ff' } },
          { value: 25, name: '下游应用', itemStyle: { color: '#f5222d' } }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }

  const columns = [
    {
      title: '公司名称',
      dataIndex: 'name',
      key: 'name',
      width: 180
    },
    {
      title: '股票代码',
      dataIndex: 'code',
      key: 'code',
      width: 120
    },
    {
      title: '产业链环节',
      dataIndex: 'segment',
      key: 'segment',
      width: 120,
      render: (segment) => {
        let color = 'blue'
        if (segment === '上游') color = 'green'
        else if (segment === '下游') color = 'red'
        return <Tag color={color}>{segment}</Tag>
      }
    },
    {
      title: 'PE(市盈率)',
      dataIndex: 'pe',
      key: 'pe',
      width: 100,
      render: (pe) => (
        <span style={{ fontWeight: 'bold' }}>{pe}x</span>
      )
    },
    {
      title: 'PB(市净率)',
      dataIndex: 'pb',
      key: 'pb',
      width: 100,
      render: (pb) => (
        <span style={{ fontWeight: 'bold' }}>{pb}x</span>
      )
    },
    {
      title: 'ROE(%)',
      dataIndex: 'roe',
      key: 'roe',
      width: 100,
      render: (roe) => (
        <span style={{ 
          color: roe > 20 ? '#52c41a' : roe > 10 ? '#1890ff' : '#f5222d',
          fontWeight: 'bold'
        }}>
          {roe}%
        </span>
      )
    },
    {
      title: '市值(亿元)',
      dataIndex: 'marketCap',
      key: 'marketCap',
      width: 120,
      render: (value) => (
        <span style={{ fontWeight: 'bold' }}>{value.toLocaleString()}</span>
      )
    },
    {
      title: '涨跌幅',
      dataIndex: 'change',
      key: 'change',
      width: 100,
      render: (change) => (
        <span style={{ 
          color: change > 0 ? '#52c41a' : '#f5222d',
          fontWeight: 'bold'
        }}>
          {change > 0 ? <RiseOutlined /> : <FallOutlined />}
          {Math.abs(change)}%
        </span>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <a onClick={() => viewCompanyDetail(record)}>
          <EyeOutlined /> 查看详情
        </a>
      )
    }
  ]

  const mockCompanyList = [
    {
      key: '1',
      id: '1',
      name: '宁德时代',
      code: '300750',
      segment: '中游',
      pe: 35.2,
      pb: 8.5,
      roe: 18.5,
      marketCap: 8500,
      change: 2.3
    },
    {
      key: '2',
      id: '2',
      name: '比亚迪',
      code: '002594',
      segment: '下游',
      pe: 28.5,
      pb: 6.2,
      roe: 22.3,
      marketCap: 7200,
      change: -1.2
    },
    {
      key: '3',
      id: '3',
      name: '特斯拉',
      code: 'TSLA',
      segment: '下游',
      pe: 45.8,
      pb: 12.3,
      roe: 25.8,
      marketCap: 15000,
      change: 3.5
    },
    {
      key: '4',
      id: '4',
      name: 'LG新能源',
      code: '373220',
      segment: '中游',
      pe: 22.3,
      pb: 5.8,
      roe: 15.2,
      marketCap: 3200,
      change: 0.8
    },
    {
      key: '5',
      id: '5',
      name: '国轩高科',
      code: '002074',
      segment: '中游',
      pe: 18.7,
      pb: 4.2,
      roe: 12.7,
      marketCap: 650,
      change: -0.5
    }
  ]

  const mockCompanyDetail = {
    name: '宁德时代',
    code: '300750',
    segment: '中游',
    industry: '动力电池',
    marketCap: 8500,
    pe: 35.2,
    pb: 8.5,
    roe: 18.5,
    eps: 12.5,
    revenue: '3285.9亿',
    profit: '457.8亿',
    growth: {
      revenue: 38.5,
      profit: 42.3
    },
    shareholders: [
      { name: '宁波梅山保税港区瑞庭投资有限公司', ratio: 24.53 },
      { name: '香港中央结算有限公司', ratio: 8.76 },
      { name: '黄世霖', ratio: 5.42 },
      { name: '李平', ratio: 4.28 }
    ],
    relatedCompanies: [
      { name: '特斯拉', type: '客户', relation: '核心供应商' },
      { name: '比亚迪', type: '竞争对手', relation: '主要竞争者' },
      { name: '天齐锂业', type: '供应商', relation: '锂矿供应商' }
    ]
  }

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card title="产业链图谱" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={4}>
                <Card bordered={false}>
                  <Statistic
                    title="产业链环节"
                    value={3}
                    prefix={<GlobalOutlined />}
                    suffix="个"
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card bordered={false}>
                  <Statistic
                    title="关联公司"
                    value={85}
                    prefix={<TeamOutlined />}
                    suffix="家"
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card bordered={false}>
                  <Statistic
                    title="平均PE"
                    value={30.1}
                    precision={1}
                    prefix={<WalletOutlined />}
                    suffix="x"
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card bordered={false}>
                  <Statistic
                    title="平均ROE"
                    value={18.9}
                    precision={1}
                    valueStyle={{ color: '#52c41a' }}
                    suffix="%"
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card bordered={false}>
                  <Statistic
                    title="总市值"
                    value={4.2}
                    precision={1}
                    suffix="万亿"
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card bordered={false}>
                  <Statistic
                    title="行业选择"
                    value={selectedIndustry}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card 
            title="产业链关系图" 
            extra={
              <Select 
                defaultValue="新能源" 
                style={{ width: 200 }}
                value={selectedIndustry}
                onChange={setSelectedIndustry}
              >
                <Option value="新能源">新能源</Option>
                <Option value="半导体">半导体</Option>
                <Option value="人工智能">人工智能</Option>
                <Option value="生物医药">生物医药</Option>
                <Option value="消费电子">消费电子</Option>
              </Select>
            }
          >
            <ReactECharts 
              option={industryChainChartOption} 
              style={{ height: '600px' }} 
              opts={{ renderer: 'canvas' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card 
            title="估值指标对比" 
            style={{ marginBottom: 16 }}
          >
            <ReactECharts 
              option={financialComparisonOption} 
              style={{ height: '400px' }} 
            />
          </Card>

          <Card title="上市公司列表">
            <Table 
              columns={columns} 
              dataSource={mockCompanyList} 
              pagination={{ pageSize: 10 }}
              loading={loading}
            />
          </Card>
        </Col>

        <Col span={8}>
          <Card title="行业公司分布" style={{ marginBottom: 16 }}>
            <ReactECharts 
              option={industryDistributionOption} 
              style={{ height: '300px' }} 
            />
          </Card>

          <Card title="产业链导航">
            <div style={{ padding: '10px 0' }}>
              <div style={{ 
                marginBottom: 20, 
                padding: 15, 
                background: '#f6ffed', 
                borderRadius: 8 
              }}>
                <h4 style={{ marginBottom: 10, color: '#52c41a' }}>上游</h4>
                <div>
                  <Tag color="green" style={{ marginBottom: 5 }}>锂矿资源</Tag>
                  <Tag color="green" style={{ marginBottom: 5 }}>正极材料</Tag>
                  <Tag color="green" style={{ marginBottom: 5 }}>负极材料</Tag>
                  <Tag color="green" style={{ marginBottom: 5 }}>电解液</Tag>
                  <Tag color="green" style={{ marginBottom: 5 }}>隔膜</Tag>
                </div>
              </div>

              <div style={{ 
                marginBottom: 20, 
                padding: 15, 
                background: '#e6f7ff', 
                borderRadius: 8 
              }}>
                <h4 style={{ marginBottom: 10, color: '#1890ff' }}>中游</h4>
                <div>
                  <Tag color="blue" style={{ marginBottom: 5 }}>动力电池</Tag>
                  <Tag color="blue" style={{ marginBottom: 5 }}>电机电控</Tag>
                  <Tag color="blue" style={{ marginBottom: 5 }}>BMS系统</Tag>
                  <Tag color="blue" style={{ marginBottom: 5 }}>热管理</Tag>
                </div>
              </div>

              <div style={{ 
                padding: 15, 
                background: '#fff1f0', 
                borderRadius: 8 
              }}>
                <h4 style={{ marginBottom: 10, color: '#f5222d' }}>下游</h4>
                <div>
                  <Tag color="red" style={{ marginBottom: 5 }}>整车制造</Tag>
                  <Tag color="red" style={{ marginBottom: 5 }}>充电桩</Tag>
                  <Tag color="red" style={{ marginBottom: 5 }}>回收利用</Tag>
                  <Tag color="red" style={{ marginBottom: 5 }}>运营服务</Tag>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Modal
        title="公司详情"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        {companyDetail && (
          <div>
            <Descriptions title="基本信息" bordered>
              <Descriptions.Item label="公司名称">{companyDetail.name}</Descriptions.Item>
              <Descriptions.Item label="股票代码">{companyDetail.code}</Descriptions.Item>
              <Descriptions.Item label="产业链环节">{companyDetail.segment}</Descriptions.Item>
              <Descriptions.Item label="所属行业">{companyDetail.industry}</Descriptions.Item>
              <Descriptions.Item label="市值(亿元)">{companyDetail.marketCap.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="PE(市盈率)">{companyDetail.pe}x</Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 20 }}>
              <Descriptions title="财务指标" bordered>
                <Descriptions.Item label="PB(市净率)">{companyDetail.pb}x</Descriptions.Item>
                <Descriptions.Item label="ROE(净资产收益率)">{companyDetail.roe}%</Descriptions.Item>
                <Descriptions.Item label="EPS(每股收益)">{companyDetail.eps}元</Descriptions.Item>
                <Descriptions.Item label="营业收入">{companyDetail.revenue}</Descriptions.Item>
                <Descriptions.Item label="净利润">{companyDetail.profit}</Descriptions.Item>
                <Descriptions.Item label="营收增长率">
                  <span style={{ color: companyDetail.growth.revenue > 0 ? '#52c41a' : '#f5222d' }}>
                    {companyDetail.growth.revenue > 0 ? '+' : ''}{companyDetail.growth.revenue}%
                  </span>
                </Descriptions.Item>
              </Descriptions>
            </div>

            <div style={{ marginTop: 20 }}>
              <h4>主要股东</h4>
              <Table
                dataSource={companyDetail.shareholders}
                columns={[
                  { title: '股东名称', dataIndex: 'name', key: 'name' },
                  { title: '持股比例', dataIndex: 'ratio', key: 'ratio', render: (ratio) => `${ratio}%` }
                ]}
                pagination={false}
                size="small"
              />
            </div>

            <div style={{ marginTop: 20 }}>
              <h4>关联公司</h4>
              <Table
                dataSource={companyDetail.relatedCompanies}
                columns={[
                  { title: '公司名称', dataIndex: 'name', key: 'name' },
                  { title: '关系类型', dataIndex: 'type', key: 'type', render: (type) => (
                    <Tag color={type === '客户' ? 'green' : type === '供应商' ? 'blue' : 'orange'}>
                      {type}
                    </Tag>
                  )},
                  { title: '关系说明', dataIndex: 'relation', key: 'relation' }
                ]}
                pagination={false}
                size="small"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function getCompanyList(industry) {
  return Promise.resolve(mockCompanyList)
}

export default IndustryMap
