import React, { useState, useEffect, useMemo } from 'react'
import { Sankey, Tooltip, Layer, Rectangle } from 'recharts'

const COLORS = [
  '#e50914', '#46d369', '#ffa00a', '#e87c03',
  '#564d4d', '#831010', '#db0000', '#564d4d',
  '#831010', '#db0000', '#f4f4f4', '#dcdcdc'
]

const CustomNode = ({ x, y, width, height, index, payload }) => {
  return (
    <Layer key={`CustomNode${index}`}>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={COLORS[index % COLORS.length]}
        fillOpacity="0.9"
        rx={4}
        ry={4}
      />
      <text
        x={x < 500 ? x + width + 8 : x - 8}
        y={y + height / 2}
        textAnchor={x < 500 ? 'start' : 'end'}
        dominantBaseline="middle"
        fontSize={13}
        fill="#e5e5e5"
        fontWeight="500"
      >
        {payload.name}
      </text>
    </Layer>
  )
}

const CustomLink = ({ sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index }) => {
  const gradientId = `linkGradient${index}`
  
  return (
    <Layer key={`CustomLink${index}`}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.4} />
          <stop offset="100%" stopColor={COLORS[(index + 1) % COLORS.length]} stopOpacity={0.4} />
        </linearGradient>
      </defs>
      <path
        d={`
          M${sourceX},${sourceY}
          C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
          L${targetX},${targetY + linkWidth}
          C${targetControlX},${targetY + linkWidth} ${sourceControlX},${sourceY + linkWidth} ${sourceX},${sourceY + linkWidth}
          Z
        `}
        fill={`url(#${gradientId})`}
        strokeWidth={0}
        stroke="none"
      />
    </Layer>
  )
}

const DynamicSankeyChart = ({ data, isLoading, onRefresh, refreshInterval = 0 }) => {
  const [chartData, setChartData] = useState(data || { nodes: [], links: [] })
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [hoveredLink, setHoveredLink] = useState(null)

  useEffect(() => {
    if (data) {
      setChartData(data)
    }
  }, [data])

  useEffect(() => {
    if (refreshInterval > 0 && onRefresh) {
      const interval = setInterval(() => {
        onRefresh()
        setLastUpdate(new Date())
      }, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval, onRefresh])

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh()
      setLastUpdate(new Date())
    }
  }

  const memoizedData = useMemo(() => {
    if (!chartData || !chartData.nodes || !chartData.links) {
      return { nodes: [], links: [] }
    }
    return chartData
  }, [chartData])

  if (isLoading) {
    return (
      <div className="section">
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>正在加载图表数据...</span>
        </div>
      </div>
    )
  }

  if (!memoizedData.nodes.length || !memoizedData.links.length) {
    return (
      <div className="section">
        <div className="empty-state">
          <span className="icon">📊</span>
          <p>暂无数据可供可视化展示</p>
        </div>
      </div>
    )
  }

  const calculateColumnTotals = () => {
    const nodeValues = new Array(memoizedData.nodes.length).fill(0)
    
    memoizedData.links.forEach(link => {
      nodeValues[link.source] += link.value
      nodeValues[link.target] += link.value
    })
    
    return nodeValues
  }

  const nodeValues = calculateColumnTotals()

  return (
    <div className="section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 className="section-title" style={{ marginBottom: 0, borderBottom: 'none' }}>
          <span className="icon">🌊</span>
          观影偏好流向分析（桑基图）
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="last-update">
            ⏰ 最后更新: {lastUpdate.toLocaleTimeString()}
          </span>
          <button 
            className="button secondary"
            onClick={handleRefresh}
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          >
            🔄 刷新
          </button>
        </div>
      </div>
      
      <div className="chart-container">
        <Sankey
          width={1200}
          height={450}
          data={memoizedData}
          node={<CustomNode />}
          link={<CustomLink />}
          margin={{ top: 30, right: 160, bottom: 30, left: 30 }}
          nodeWidth={18}
          nodePadding={50}
        >
          <Tooltip
            content={({ payload }) => {
              if (payload && payload.length) {
                const data = payload[0].payload
                if (data.source && data.target) {
                  return (
                    <div style={{ 
                      background: '#1f1f1f', 
                      padding: '16px', 
                      borderRadius: '8px', 
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                      border: '1px solid #333'
                    }}>
                      <p style={{ margin: 0, fontWeight: 'bold', color: '#e50914', fontSize: '1rem' }}>
                        🎬 {data.source.name} → {data.target.name}
                      </p>
                      <p style={{ margin: '8px 0 0 0', color: '#b3b3b3', fontSize: '0.9rem' }}>
                        📊 电影数量: <strong style={{ color: '#fff' }}>{data.value}</strong> 部
                      </p>
                    </div>
                  )
                }
                const nodeIndex = memoizedData.nodes.findIndex(n => n.name === data.name)
                return (
                  <div style={{ 
                    background: '#1f1f1f', 
                    padding: '16px', 
                    borderRadius: '8px', 
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                    border: '1px solid #333'
                  }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#e50914', fontSize: '1rem' }}>
                      🎯 {data.name}
                    </p>
                    <p style={{ margin: '8px 0 0 0', color: '#b3b3b3', fontSize: '0.9rem' }}>
                      📊 总计: <strong style={{ color: '#fff' }}>{nodeValues[nodeIndex] || data.value || 0}</strong>
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
        </Sankey>
      </div>
      
      <div style={{ marginTop: '24px', padding: '20px', background: 'var(--bg-hover)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
          📖 图表解读指南
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '6px' }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              <strong style={{ color: 'var(--text-primary)' }}>节点（方框）：</strong>
              表示不同的分类。第一列是<strong>电影类型</strong>，第二列是<strong>评分区间</strong>，第三列是<strong>最终喜好</strong>。
            </p>
          </div>
          <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '6px' }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              <strong style={{ color: 'var(--text-primary)' }}>连接线：</strong>
              表示从一个分类到另一个分类的<strong>电影数量</strong>。线条越粗，说明该类别的电影数量越多。
            </p>
          </div>
          <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '6px' }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              <strong style={{ color: 'var(--text-primary)' }}>交互提示：</strong>
              将鼠标悬停在节点或连接线上，可以查看<strong>详细数据</strong>。点击"刷新"按钮可以更新图表数据。
            </p>
          </div>
        </div>
        
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <h5 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
            🎨 图例说明
          </h5>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            {memoizedData.nodes.map((node, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div 
                  style={{ 
                    width: '16px', 
                    height: '16px', 
                    background: COLORS[index % COLORS.length],
                    borderRadius: '4px'
                  }} 
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{node.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DynamicSankeyChart
