import React, { useState, useEffect } from 'react';
import { Layout, Input, Row, Col, Card, Statistic, Spin, message } from 'antd';
import { StockOutlined, FundOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons';
import StockChart from './components/StockChart';
import MoneyFlowChart from './components/MoneyFlowChart';
import NewsList from './components/NewsList';
import { stockApi } from './services/api';

const { Header, Content } = Layout;
const { Search } = Input;

function App() {
  const [stockCode, setStockCode] = useState('600519');
  const [stockInfo, setStockInfo] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [moneyFlowData, setMoneyFlowData] = useState([]);
  const [newsData, setNewsData] = useState([]);
  const [newsStats, setNewsStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStockData = async (code) => {
    setLoading(true);
    try {
      const [stockRes, chartRes, moneyFlowRes, newsRes] = await Promise.all([
        stockApi.getStockInfo(code),
        stockApi.getStockChart(code),
        stockApi.getMoneyFlow(code),
        stockApi.getNews(code)
      ]);

      if (stockRes.data.success) {
        setStockInfo(stockRes.data.data);
      }
      if (chartRes.data.success) {
        setChartData(chartRes.data.data);
      }
      if (moneyFlowRes.data.success) {
        setMoneyFlowData(moneyFlowRes.data.data);
      }
      if (newsRes.data.success) {
        setNewsData(newsRes.data.data);
        setNewsStats(newsRes.data.stats);
      }
      message.success('数据加载成功');
    } catch (error) {
      message.error(`获取数据失败: ${error.message}`);
      console.error('API Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData(stockCode);
  }, [stockCode]);

  const handleSearch = (value) => {
    if (value.trim()) {
      setStockCode(value.trim());
    }
  };

  const getSentimentColor = () => {
    if (!newsStats) return '#8c8c8c';
    if (newsStats.avg_score > 0.2) return '#52c41a';
    if (newsStats.avg_score < -0.2) return '#ff4d4f';
    return '#8c8c8c';
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <StockOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <h1 style={{ margin: 0, fontSize: 20 }}>股票情绪分析仪表盘</h1>
          </div>
          <Search
            placeholder="输入股票代码，如 600519"
            allowClear
            enterButton="查询"
            size="large"
            onSearch={handleSearch}
            style={{ width: 300 }}
            defaultValue={stockCode}
          />
        </div>
      </Header>
      <Content style={{ padding: '24px' }}>
        <Spin spinning={loading} tip="加载中...">
          {stockInfo && (
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} md={6}>
                <Card className="stock-card">
                  <Statistic
                    title={stockInfo.name || '股票名称'}
                    value={stockInfo.close || 0}
                    precision={2}
                    valueStyle={{ color: '#3f8600' }}
                    prefix={<RiseOutlined />}
                    suffix="元"
                  />
                  <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                    {stockInfo.ts_code} | {stockInfo.industry}
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="stock-card">
                  <Statistic
                    title="市盈率(PE)"
                    value={stockInfo.pe || 0}
                    precision={2}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="stock-card">
                  <Statistic
                    title="主力净流入"
                    value={(stockInfo.main_net_inflow || 0) / 100000000}
                    precision={2}
                    valueStyle={{ color: stockInfo.main_net_inflow > 0 ? '#52c41a' : '#ff4d4f' }}
                    prefix={stockInfo.main_net_inflow > 0 ? <RiseOutlined /> : <FallOutlined />}
                    suffix="亿"
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="stock-card">
                  <Statistic
                    title="新闻情绪指数"
                    value={newsStats ? newsStats.avg_score : 0}
                    precision={2}
                    valueStyle={{ color: getSentimentColor() }}
                    prefix={<FundOutlined />}
                  />
                  {newsStats && (
                    <div style={{ fontSize: 12, marginTop: 8 }}>
                      <span style={{ color: '#52c41a', marginRight: 8 }}>利好: {newsStats.positive}</span>
                      <span style={{ color: '#ff4d4f', marginRight: 8 }}>利空: {newsStats.negative}</span>
                      <span style={{ color: '#8c8c8c' }}>中性: {newsStats.neutral}</span>
                    </div>
                  )}
                </Card>
              </Col>
            </Row>
          )}

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <Card title="分时走势图" style={{ marginBottom: 16 }}>
                {chartData && <StockChart data={chartData} />}
              </Card>
              <Card title="主力资金流向">
                <MoneyFlowChart data={moneyFlowData} />
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="相关新闻" style={{ height: '100%' }}>
                <NewsList news={newsData} />
              </Card>
            </Col>
          </Row>
        </Spin>
      </Content>
    </Layout>
  );
}

export default App;
