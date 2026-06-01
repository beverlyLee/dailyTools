import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Cell
} from 'recharts';

const COLORS = {
  student: '#e74c3c',
  official: '#3498db'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">{`${label}年`}</p>
        {payload.map((entry, index) => (
          <p key={index} className="item" style={{ color: entry.color }}>
            {entry.name}: {entry.value}%
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(null);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetchCPI();
  }, []);

  const fetchCPI = async () => {
    try {
      const response = await fetch('/api/cpi');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async (year) => {
    try {
      const response = await fetch(`/api/posts/${year}`);
      const result = await response.json();
      setPosts(result.posts);
      setSelectedYear(year);
    } catch (error) {
      console.error('获取帖子失败:', error);
    }
  };

  const handleChartClick = (data) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const year = data.activePayload[0].payload.year;
      fetchPosts(year);
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  const chartData = data?.yearly_data?.map(item => ({
    year: item.year,
    '学生CPI增速': item.student_cpi_growth,
    '官方CPI增速': item.official_growth,
    student_cpi: item.student_cpi
  })) || [];

  return (
    <div className="app">
      <header className="header">
        <h1>🍜 食堂价格追踪器</h1>
        <p>大学生自制CPI vs 国家统计局CPI 增速对比</p>
      </header>

      <div className="main-content">
        {data && (
          <div className="summary-cards">
            <div className="summary-card student">
              <h3>学生CPI累计涨幅</h3>
              <div className="value">{data.summary.student_total_growth}%</div>
            </div>
            <div className="summary-card official">
              <h3>官方CPI累计涨幅</h3>
              <div className="value">{data.summary.official_total_growth}%</div>
            </div>
            <div className="summary-card gap">
              <h3>涨幅差距</h3>
              <div className="value">{data.summary.growth_gap}%</div>
            </div>
          </div>
        )}

        <div className="chart-card">
          <h2>📈 CPI增速对比 (点击数据点查看当年吐槽)</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              onClick={handleChartClick}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="year" tick={{ fontSize: 14 }} />
              <YAxis tick={{ fontSize: 14 }} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 14 }} />
              <Line
                type="monotone"
                dataKey="学生CPI增速"
                stroke={COLORS.student}
                strokeWidth={3}
                dot={{ r: 8, cursor: 'pointer' }}
                activeDot={{ r: 12 }}
              />
              <Line
                type="monotone"
                dataKey="官方CPI增速"
                stroke={COLORS.official}
                strokeWidth={3}
                dot={{ r: 8, cursor: 'pointer' }}
                activeDot={{ r: 12 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h2>📊 各年度学生CPI指数</h2>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={data?.yearly_data?.map(item => ({
                year: item.year,
                '学生CPI': item.student_cpi,
                '盖饭指数': item.rice_index,
                '面条指数': item.noodle_index
              })) || []}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="year" tick={{ fontSize: 14 }} />
              <YAxis tick={{ fontSize: 14 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 14 }} />
              <Bar dataKey="学生CPI" fill={COLORS.student} radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h2>💡 说明</h2>
          <ul style={{ color: '#666', lineHeight: 2, marginTop: 10 }}>
            <li>学生CPI基于校园贴吧/表白墙中"食堂涨价"相关帖子计算</li>
            <li>包含"盖饭指数"(60%权重)和"面条指数"(40%权重)</li>
            <li>数据来源: 各高校贴吧、微博校园话题等公开社交平台</li>
            <li>点击上方折线图的数据点可查看当年的热门吐槽帖子</li>
          </ul>
        </div>
      </div>

      {selectedYear && (
        <div className="posts-modal" onClick={() => setSelectedYear(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>📢 {selectedYear}年 热门吐槽</h3>
            {posts.map((post, index) => (
              <div key={index} className="post-item">
                <h4>{post.title}</h4>
                <p>{post.content}</p>
                <div className="likes">❤️ {post.likes} 人赞同</div>
              </div>
            ))}
            <button className="close-btn" onClick={() => setSelectedYear(null)}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
