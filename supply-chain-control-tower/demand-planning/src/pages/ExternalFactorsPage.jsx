import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Button,
  Space,
  Spin,
  message,
  Tag,
  Descriptions,
} from 'antd';
import {
  EnvironmentOutlined,
  ReloadOutlined,
  CalendarOutlined,
  SunOutlined,
  CloudOutlined,
  CloudRainOutlined,
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
} from 'recharts';
import { getExternalFactors, getHistoryData } from '../api/demand';

const { Option } = Select;

const weatherIcons = {
  晴: <SunOutlined />,
  多云: <CloudOutlined />,
  小雨: <CloudRainOutlined />,
  大雨: <CloudRainOutlined />,
};

const ExternalFactorsPage = () => {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [factors, setFactors] = useState([]);
  const [historyData, setHistoryData] = useState(null);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchData();
  }, [days]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [factorsRes, historyRes] = await Promise.all([
        getExternalFactors(days),
        getHistoryData('PROD-001', days),
      ]);

      setFactors(factorsRes.data);
      setHistoryData(historyRes.data);

      const combined = combineChartData(factorsRes.data, historyRes.data);
      setChartData(combined);
    } catch (error) {
      message.error('加载外部因子数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const combineChartData = (factors, history) => {
    const data = [];
    const historyMap = {};

    if (history && history.data) {
      history.data.forEach((item) => {
        historyMap[item.date] = item;
      });
    }

    factors.forEach((factor) => {
      const historyItem = historyMap[factor.date];
      data.push({
        date: factor.date,
        temperature: factor.temperature,
        sales: historyItem?.sales || null,
        isHoliday: factor.isHoliday ? 1 : 0,
        holidayName: factor.holidayName,
        weather: factor.weather,
        economicIndicator: factor.economicIndicator,
      });
    });

    return data;
  };

  const stats = {
    totalDays: factors.length,
    holidays: factors.filter((f) => f.isHoliday).length,
    avgTemperature:
      factors.length > 0
        ? factors.reduce((sum, f) => sum + f.temperature, 0) / factors.length
        : 0,
    avgEconomicIndicator:
      factors.length > 0
        ? factors.reduce((sum, f) => sum + f.economicIndicator, 0) / factors.length
        : 0,
  };

  const getHolidayCount = (weatherType) => {
    return factors.filter((f) => f.weather === weatherType).length;
  };

  const weatherDistribution = [
    { name: '晴', value: getHolidayCount('晴'), color: '#faad14' },
    { name: '多云', value: getHolidayCount('多云'), color: '#1890ff' },
    { name: '小雨', value: getHolidayCount('小雨'), color: '#8c8c8c' },
    { name: '大雨', value: getHolidayCount('大雨'), color: '#595959' },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <EnvironmentOutlined />
            <span>外部因子分析</span>
          </Space>
        }
        extra={
          <Space>
            <Select value={days} onChange={setDays} style={{ width: 150 }}>
              <Option value={7}>近7天</Option>
              <Option value={14}>近14天</Option>
              <Option value={30}>近30天</Option>
              <Option value={60}>近60天</Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              刷新
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Card>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="分析周期">
                  <Tag color="blue">{stats.totalDays} 天</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="节假日">
                  <Tag color="orange">
                    <CalendarOutlined /> {stats.holidays} 天
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="平均气温">
                  <span style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                    {stats.avgTemperature.toFixed(1)}°C
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="天气分布">
                  <Space>
                    {weatherDistribution
                      .filter((w) => w.value > 0)
                      .map((w) => (
                        <Tag key={w.name} color={w.color}>
                          {w.name}: {w.value}天
                        </Tag>
                      ))}
                  </Space>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="经济指标">
                  <span style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                    {stats.avgEconomicIndicator.toFixed(2)}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={stats.avgEconomicIndicator >= 100 ? 'green' : 'orange'}>
                    {stats.avgEconomicIndicator >= 100 ? '扩张' : '收缩'}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="因子相关性">
                  <div>
                    <p style={{ margin: 0 }}>
                      节假日影响: <Tag color="red">+20-50%</Tag>
                    </p>
                    <p style={{ margin: 0, marginTop: 8 }}>
                      气温影响: <Tag color="blue">±15%</Tag>
                    </p>
                  </div>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card title="气温与销量趋势对比">
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      interval={Math.floor(chartData.length / 8)}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 12 }}
                      label={{ value: '销量', angle: -90, position: 'insideLeft' }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12 }}
                      label={{ value: '气温 (°C)', angle: 90, position: 'insideRight' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <Card size="small" style={{ minWidth: 200 }}>
                              <p style={{ margin: 0, fontWeight: 'bold' }}>{data.date}</p>
                              <p style={{ margin: 0 }}>气温: {data.temperature?.toFixed(1)}°C</p>
                              <p style={{ margin: 0 }}>
                                天气: {weatherIcons[data.weather]} {data.weather}
                              </p>
                              {data.isHoliday && (
                                <Tag color="orange">节假日: {data.holidayName}</Tag>
                              )}
                              {data.sales && (
                                <p style={{ margin: 0 }}>
                                  销量: {data.sales?.toFixed(0)}
                                </p>
                              )}
                            </Card>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="sales"
                      fill="rgba(82, 196, 26, 0.3)"
                      stroke="#52c41a"
                      strokeWidth={2}
                      name="销量"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="temperature"
                      stroke="#1890ff"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      name="气温"
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="isHoliday"
                      fill="#faad14"
                      opacity={0.5}
                      name="节假日"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card title="经济指标趋势">
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      interval={Math.floor(chartData.length / 8)}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      domain={[80, 120]}
                      label={{ value: '经济指标', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="economicIndicator"
                      fill="#1890ff"
                      name="经济指标"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
        </Row>

        {factors.filter((f) => f.isHoliday).length > 0 && (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Card title="近期节假日">
                <div className="external-factors">
                  {factors
                    .filter((f) => f.isHoliday)
                    .slice(0, 10)
                    .map((factor, index) => (
                      <div key={index} className="factor-card holiday">
                        <p style={{ margin: 0, fontWeight: 'bold' }}>
                          <CalendarOutlined /> {factor.holidayName}
                        </p>
                        <p style={{ margin: 0, marginTop: 8, color: '#666' }}>
                          日期: {factor.date}
                        </p>
                        <p style={{ margin: 0, marginTop: 4, color: '#666' }}>
                          预计需求影响: <Tag color="red">+20-50%</Tag>
                        </p>
                      </div>
                    ))}
                </div>
              </Card>
            </Col>
          </Row>
        )}
      </Card>
    </div>
  );
};

export default ExternalFactorsPage;
