import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Button,
  DatePicker,
  Space,
  Spin,
  message,
  Descriptions,
  Tag,
  Statistic,
} from 'antd';
import {
  ReloadOutlined,
  LineChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import dayjs from 'dayjs';
import { getForecast, getHistoryData } from '../api/demand';

const { RangePicker } = DatePicker;
const { Option } = Select;

const products = [
  { id: 'PROD-001', name: '产品A', sku: 'SKU-001' },
  { id: 'PROD-002', name: '产品B', sku: 'SKU-002' },
  { id: 'PROD-003', name: '产品C', sku: 'SKU-003' },
];

const ForecastPage = () => {
  const [selectedProduct, setSelectedProduct] = useState('PROD-001');
  const [forecastDays, setForecastDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [forecastData, setForecastData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchData();
  }, [selectedProduct, forecastDays]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [forecastRes, historyRes] = await Promise.all([
        getForecast(selectedProduct, forecastDays),
        getHistoryData(selectedProduct, 60),
      ]);

      setForecastData(forecastRes.data[0] || forecastRes.data);
      setHistoryData(historyRes.data);

      const combinedData = combineChartData(historyRes.data, forecastRes.data[0] || forecastRes.data);
      setChartData(combinedData);
    } catch (error) {
      message.error('加载预测数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const combineChartData = (history, forecast) => {
    const data = [];

    if (history && history.data) {
      history.data.slice(-30).forEach((item) => {
        data.push({
          date: item.date,
          actual: item.sales,
          forecast: null,
          lowerBound: null,
          upperBound: null,
        });
      });
    }

    if (forecast && forecast.forecast) {
      forecast.forecast.forEach((item) => {
        data.push({
          date: item.date,
          actual: null,
          forecast: item.forecasted,
          lowerBound: item.lowerBound,
          upperBound: item.upperBound,
        });
      });
    }

    return data;
  };

  const getForecastRange = (entry) => {
    if (entry.lowerBound && entry.upperBound) {
      return [entry.lowerBound, entry.upperBound];
    }
    return null;
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <LineChartOutlined />
            <span>需求预测</span>
          </Space>
        }
        extra={
          <Space>
            <Select
              value={selectedProduct}
              onChange={setSelectedProduct}
              style={{ width: 200 }}
            >
              {products.map((p) => (
                <Option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </Option>
              ))}
            </Select>
            <Select value={forecastDays} onChange={setForecastDays} style={{ width: 150 }}>
              <Option value={7}>未来7天</Option>
              <Option value={14}>未来14天</Option>
              <Option value={30}>未来30天</Option>
              <Option value={60}>未来60天</Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              刷新
            </Button>
          </Space>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px' }}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="预测周期"
                    value={forecastDays}
                    suffix="天"
                    prefix={<ClockCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="模型MAE"
                    value={forecastData?.modelInfo?.MAE || 0}
                    precision={2}
                    valueStyle={{ color: '#52c41a' }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="模型RMSE"
                    value={forecastData?.modelInfo?.RMSE || 0}
                    precision={2}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="预测置信度"
                    value={75}
                    suffix="%"
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col span={24}>
                <Card title="需求预测趋势图">
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1890ff" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#1890ff" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          interval={Math.floor(chartData.length / 8)}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ background: '#fff', border: '1px solid #ccc' }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="forecast"
                          stroke="#1890ff"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorForecast)"
                          name="预测值"
                        />
                        <Line
                          type="monotone"
                          dataKey="actual"
                          stroke="#52c41a"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                          name="实际销量"
                        />
                        <Area
                          type="monotone"
                          dataKey="upperBound"
                          stroke="none"
                          fill="rgba(24, 144, 255, 0.1)"
                          name="预测上限"
                        />
                        <Area
                          type="monotone"
                          dataKey="lowerBound"
                          stroke="none"
                          fill="rgba(24, 144, 255, 0.1)"
                          name="预测下限"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>
            </Row>

            {forecastData && (
              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col span={24}>
                  <Card title="模型信息" className="model-info">
                    <Descriptions bordered column={3}>
                      <Descriptions.Item label="产品名称">
                        {forecastData.productName}
                      </Descriptions.Item>
                      <Descriptions.Item label="SKU">
                        {forecastData.sku}
                      </Descriptions.Item>
                      <Descriptions.Item label="预测周期">
                        {forecastDays}天
                      </Descriptions.Item>
                      <Descriptions.Item label="模型名称">
                        <Tag color="blue">{forecastData.modelInfo?.modelName}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="MAE">
                        {forecastData.modelInfo?.MAE?.toFixed(2)}
                      </Descriptions.Item>
                      <Descriptions.Item label="RMSE">
                        {forecastData.modelInfo?.RMSE?.toFixed(2)}
                      </Descriptions.Item>
                      <Descriptions.Item label="最后训练时间" span={3}>
                        {forecastData.modelInfo?.lastTrained}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
              </Row>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default ForecastPage;
