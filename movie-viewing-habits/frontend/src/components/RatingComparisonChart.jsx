import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine
} from 'recharts'

const COLORS = {
  user: '#e50914',
  tmdb: '#46d369',
  imdb: '#ffa00a'
}

const RatingComparisonChart = ({ data, type = 'bar' }) => {
  if (!data || !data.length) {
    return (
      <div className="section">
        <div className="empty-state">
          <span className="icon">📊</span>
          <p>暂无评分数据可供展示</p>
        </div>
      </div>
    )
  }

  const chartData = data.map((item, index) => ({
    name: item.media_title || `电影 ${index + 1}`,
    '您的评分': item.user_rating,
    'TMDb 评分': item.tmdb_rating,
    deviation: item.deviation
  }))

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = data.find(d => d.media_title === label)
      const deviation = dataPoint?.deviation || 0
      
      return (
        <div style={{ 
          background: '#1f1f1f', 
          padding: '16px', 
          borderRadius: '8px', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          border: '1px solid #333'
        }}>
          <p style={{ margin: '0 0 12px 0', fontWeight: 'bold', color: '#e50914', fontSize: '1rem' }}>
            🎬 {label}
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '6px 0', color: '#b3b3b3', fontSize: '0.9rem' }}>
              <span style={{ color: entry.color, fontWeight: '500' }}>{entry.name}:</span>
              <strong style={{ color: '#fff', marginLeft: '8px' }}>{entry.value} ⭐</strong>
            </p>
          ))}
          {deviation !== 0 && (
            <p style={{ 
              margin: '12px 0 0 0', 
              paddingTop: '12px', 
              borderTop: '1px solid #333',
              fontSize: '0.9rem'
            }}>
              <span style={{ color: '#b3b3b3' }}>评分差异:</span>
              <strong style={{ 
                color: deviation > 0 ? '#46d369' : '#e87c03',
                marginLeft: '8px'
              }}>
                {deviation > 0 ? '+' : ''}{deviation.toFixed(1)} ⭐
              </strong>
              <span style={{ color: '#666', marginLeft: '8px', fontSize: '0.8rem' }}>
                ({deviation > 0 ? '您更大方' : '您更严格'})
              </span>
            </p>
          )}
        </div>
      )
    }
    return null
  }

  if (type === 'scatter') {
    const scatterData = data.map((item, index) => ({
      x: item.tmdb_rating,
      y: item.user_rating,
      z: Math.abs(item.deviation) * 80,
      name: item.media_title || `电影 ${index + 1}`,
      deviation: item.deviation
    }))

    return (
      <div className="section">
        <h3 className="section-title">
          <span className="icon">🎯</span>
          评分偏差散点图分析
        </h3>
        
        <div className="chart-explanation">
          <h4>📊 图表说明</h4>
          <p>
            <strong>X轴（水平）</strong>：TMDb 平均评分 &nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>Y轴（垂直）</strong>：您的评分 &nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>点的大小</strong>：偏差绝对值（越大差异越明显）
          </p>
          <p style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            💡 <span style={{ color: '#46d369' }}>对角线上方（绿色）</span> = 您的评分更高 | 
            <span style={{ color: '#e87c03' }}> 对角线下方（橙色）</span> = 您的评分更低
          </p>
        </div>

        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 30, right: 30, bottom: 60, left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="TMDb 评分" 
                domain={[0, 10]}
                label={{ value: 'TMDb 平均评分', position: 'bottom', offset: 10, fill: '#b3b3b3' }}
                tick={{ fill: '#b3b3b3' }}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="您的评分" 
                domain={[0, 10]}
                label={{ value: '您的评分', angle: -90, position: 'insideLeft', fill: '#b3b3b3' }}
                tick={{ fill: '#b3b3b3' }}
              />
              <ZAxis type="number" dataKey="z" range={[60, 400]} name="偏差程度" />
              
              <ReferenceLine x={5} y={5} stroke="#555" strokeDasharray="3 3" />
              <ReferenceLine x={5} y={5} stroke="#555" strokeDasharray="3 3" />
              
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#555' }} />
              
              <Legend 
                wrapperStyle={{ color: '#b3b3b3' }}
                iconType="circle"
              />
              
              <Scatter 
                name="评分对比" 
                data={scatterData}
                fill={COLORS.user}
              >
                {scatterData.map((entry, index) => (
                  <circle
                    key={`dot-${index}`}
                    cx={0}
                    cy={0}
                    r={8}
                    fill={entry.deviation > 0.1 ? '#46d369' : entry.deviation < -0.1 ? '#e87c03' : '#888'}
                    fillOpacity={0.8}
                    stroke={entry.deviation > 0.1 ? '#46d369' : entry.deviation < -0.1 ? '#e87c03' : '#888'}
                    strokeWidth={2}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-hover)', borderRadius: '8px' }}>
          <h5 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>图例说明</h5>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#46d369' }}></div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>您的评分高于大众</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#e87c03' }}></div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>您的评分低于大众</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#888' }}></div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>评分接近大众</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'line') {
    return (
      <div className="section">
        <h3 className="section-title">
          <span className="icon">📈</span>
          评分趋势对比（折线图）
        </h3>
        
        <div className="chart-explanation">
          <h4>📊 图表说明</h4>
          <p>
            此图表用<strong>折线</strong>形式展示每部电影的评分对比。
            观察<strong>红色线（您的评分）</strong>与<strong>绿色线（TMDb 评分）</strong>的走势差异，
            可以直观地看出您在哪些电影上与大众品味不同。
          </p>
        </div>

        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={100} 
                interval={0}
                tick={{ fill: '#b3b3b3', fontSize: 11 }}
              />
              <YAxis 
                domain={[0, 10]} 
                tick={{ fill: '#b3b3b3' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ color: '#b3b3b3' }}
                iconType="line"
              />
              <Line 
                type="monotone" 
                dataKey="您的评分" 
                stroke={COLORS.user} 
                strokeWidth={3} 
                dot={{ r: 5, fill: COLORS.user }} 
                activeDot={{ r: 8 }}
              />
              <Line 
                type="monotone" 
                dataKey="TMDb 评分" 
                stroke={COLORS.tmdb} 
                strokeWidth={3} 
                dot={{ r: 5, fill: COLORS.tmdb }} 
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  return (
    <div className="section">
      <h3 className="section-title">
        <span className="icon">📊</span>
        评分对比（柱状图）
      </h3>
      
      <div className="chart-explanation">
        <h4>📊 图表说明</h4>
        <p>
          此图表用<strong>柱状</strong>形式直接对比每部电影的评分。
          <span style={{ color: COLORS.user }}> 红色柱</span> 代表您的评分，
          <span style={{ color: COLORS.tmdb }}> 绿色柱</span> 代表 TMDb 大众平均评分。
          观察柱子高度的差异，即可看出您与大众品味的不同。
        </p>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              height={100} 
              interval={0}
              tick={{ fill: '#b3b3b3', fontSize: 11 }}
            />
            <YAxis 
              domain={[0, 10]} 
              tick={{ fill: '#b3b3b3' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ color: '#b3b3b3' }}
              iconType="rect"
            />
            <Bar 
              dataKey="您的评分" 
              fill={COLORS.user} 
              radius={[4, 4, 0, 0]}
              name="您的评分"
            />
            <Bar 
              dataKey="TMDb 评分" 
              fill={COLORS.tmdb} 
              radius={[4, 4, 0, 0]}
              name="TMDb 平均评分"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-hover)', borderRadius: '8px' }}>
        <h5 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>💡 快速解读</h5>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '6px' }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <strong style={{ color: COLORS.user }}>红柱更高</strong> = 您比大众更喜欢这部电影
            </p>
          </div>
          <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '6px' }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <strong style={{ color: COLORS.tmdb }}>绿柱更高</strong> = 您比大众更不喜欢这部电影
            </p>
          </div>
          <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '6px' }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <strong>柱子等高</strong> = 您的品味与大众非常接近
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RatingComparisonChart
