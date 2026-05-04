import React, { useState, useEffect, useCallback } from 'react'
import DynamicSankeyChart from './components/DynamicSankeyChart'
import RatingComparisonChart from './components/RatingComparisonChart'
import { tasteAnalysisApi, ratingsApi } from './api'

const App = () => {
  const [userId, setUserId] = useState(1)
  const [userName, setUserName] = useState('')
  const [useUserId, setUseUserId] = useState(true)
  const [analysisData, setAnalysisData] = useState(null)
  const [ratings, setRatings] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [chartType, setChartType] = useState('bar')
  const [sankeyData, setSankeyData] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const sampleUsers = [
    { id: 1, name: '电影爱好者小明' },
    { id: 2, name: '文艺青年小红' },
    { id: 3, name: '动作片迷小刚' },
  ]

  const generateSampleSankeyData = useCallback(() => {
    const nodes = [
      { name: '动作片' },
      { name: '剧情片' },
      { name: '喜剧片' },
      { name: '科幻片' },
      { name: '高分佳作 (⭐8+)' },
      { name: '中等评价 (⭐6-8)' },
      { name: '有待提高 (⭐<6)' },
      { name: '您的最爱' },
      { name: '不太对味' },
    ]

    const links = [
      { source: 0, target: 4, value: 15 },
      { source: 0, target: 5, value: 25 },
      { source: 0, target: 6, value: 5 },
      { source: 1, target: 4, value: 20 },
      { source: 1, target: 5, value: 30 },
      { source: 1, target: 6, value: 8 },
      { source: 2, target: 4, value: 10 },
      { source: 2, target: 5, value: 18 },
      { source: 2, target: 6, value: 12 },
      { source: 3, target: 4, value: 25 },
      { source: 3, target: 5, value: 15 },
      { source: 3, target: 6, value: 3 },
      { source: 4, target: 7, value: 50 },
      { source: 4, target: 8, value: 20 },
      { source: 5, target: 7, value: 60 },
      { source: 5, target: 8, value: 28 },
      { source: 6, target: 7, value: 10 },
      { source: 6, target: 8, value: 18 },
    ]

    return { nodes, links }
  }, [])

  const generateSankeyFromAnalysis = useCallback((analysis) => {
    if (!analysis || !analysis.genre_analysis) {
      return generateSampleSankeyData()
    }

    const nodes = []
    const links = []
    const genreMap = new Map()
    const ratingCategoryMap = new Map()
    const preferenceMap = new Map()

    analysis.genre_analysis.forEach((genre) => {
      const genreName = genre.genre_name
      if (!genreMap.has(genreName)) {
        genreMap.set(genreName, nodes.length)
        nodes.push({ name: genreName })
      }
    })

    const highRated = '高分佳作 (⭐8+)'
    const mediumRated = '中等评价 (⭐6-8)'
    const lowRated = '有待提高 (⭐<6)'
    
    ratingCategoryMap.set(highRated, nodes.length)
    nodes.push({ name: highRated })
    ratingCategoryMap.set(mediumRated, nodes.length)
    nodes.push({ name: mediumRated })
    ratingCategoryMap.set(lowRated, nodes.length)
    nodes.push({ name: lowRated })

    const liked = '您的最爱'
    const disliked = '不太对味'
    preferenceMap.set(liked, nodes.length)
    nodes.push({ name: liked })
    preferenceMap.set(disliked, nodes.length)
    nodes.push({ name: disliked })

    analysis.genre_analysis.forEach((genre) => {
      const genreIndex = genreMap.get(genre.genre_name)
      const avgUser = genre.average_user_rating || 7
      
      if (avgUser > 8) {
        links.push({ source: genreIndex, target: ratingCategoryMap.get(highRated), value: genre.total_ratings })
      } else if (avgUser >= 6) {
        links.push({ source: genreIndex, target: ratingCategoryMap.get(mediumRated), value: genre.total_ratings })
      } else {
        links.push({ source: genreIndex, target: ratingCategoryMap.get(lowRated), value: genre.total_ratings })
      }
    })

    links.push({ source: ratingCategoryMap.get(highRated), target: preferenceMap.get(liked), value: 35 })
    links.push({ source: ratingCategoryMap.get(highRated), target: preferenceMap.get(disliked), value: 5 })
    links.push({ source: ratingCategoryMap.get(mediumRated), target: preferenceMap.get(liked), value: 40 })
    links.push({ source: ratingCategoryMap.get(mediumRated), target: preferenceMap.get(disliked), value: 15 })
    links.push({ source: ratingCategoryMap.get(lowRated), target: preferenceMap.get(liked), value: 5 })
    links.push({ source: ratingCategoryMap.get(lowRated), target: preferenceMap.get(disliked), value: 20 })

    return { nodes, links }
  }, [generateSampleSankeyData])

  const fetchAnalysis = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const [analysisResponse, ratingsResponse] = await Promise.all([
        tasteAnalysisApi.analyze(userId),
        ratingsApi.getAll(userId)
      ])
      
      setAnalysisData(analysisResponse.data)
      setRatings(ratingsResponse.data || [])
      setSankeyData(generateSankeyFromAnalysis(analysisResponse.data))
    } catch (err) {
      setError('正在使用示例数据进行演示。请确保后端服务已启动。')
      console.error('API Error:', err)
      setSankeyData(generateSampleSankeyData())
    } finally {
      setIsLoading(false)
    }
  }, [userId, generateSankeyFromAnalysis, generateSampleSankeyData])

  useEffect(() => {
    fetchAnalysis()
  }, [fetchAnalysis])

  const getDeviationClass = (deviation) => {
    if (deviation > 0) return 'deviation-positive'
    if (deviation < 0) return 'deviation-negative'
    return 'deviation-neutral'
  }

  const getDeviationText = (direction) => {
    switch (direction) {
      case 'more_generous':
        return '您的评分风格：比起大众平均评分，您更倾向于给予较高的评价。您是一位慷慨的电影爱好者！'
      case 'more_strict':
        return '您的评分风格：比起大众平均评分，您更倾向于给予较低的评价。您对电影品质有着更高的追求！'
      case 'similar':
        return '您的评分风格：您的评分与大众平均评分非常接近。您的观影品味与大多数人相似！'
      default:
        return '数据收集中... 请继续添加更多电影评分以获得精准分析。'
    }
  }

  const handleRefreshSankey = () => {
    fetchAnalysis()
  }

  const handleUserSelect = (e) => {
    const selectedId = parseInt(e.target.value)
    setUserId(selectedId)
    const selectedUser = sampleUsers.find(u => u.id === selectedId)
    if (selectedUser) {
      setUserName(selectedUser.name)
    }
  }

  const displayName = userName || sampleUsers.find(u => u.id === userId)?.name || `用户 ${userId}`

  return (
    <div className="app-container">
      <header className="header">
        <h1>🎬 电影品味分析系统</h1>
        <p className="subtitle">发现您独特的观影品味与观片习惯</p>
      </header>

      <div className="system-intro">
        <h3>📊 系统简介</h3>
        <p>
          本系统通过分析您的电影评分历史，深入挖掘您的观影偏好和评分模式。
          我们将您的评分与 TMDb（电影数据库）的平均评分进行对比，帮助您了解自己独特的电影品味。
        </p>
        <div className="features">
          <div className="feature-item">
            <span className="feature-icon">📈</span>
            <span className="feature-text">评分偏差分析</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🎭</span>
            <span className="feature-text">类型偏好洞察</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔄</span>
            <span className="feature-text">实时数据更新</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📊</span>
            <span className="feature-text">可视化图表</span>
          </div>
        </div>
      </div>

      <div className="controls">
        <div className="control-group">
          <label>选择用户</label>
          <select value={userId} onChange={handleUserSelect}>
            {sampleUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="control-group">
          <label>图表类型</label>
          <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
            <option value="bar">柱状图</option>
            <option value="line">折线图</option>
            <option value="scatter">散点图</option>
          </select>
        </div>
        
        <div className="control-group">
          <label>自动刷新</label>
          <select 
            value={autoRefresh ? '30000' : '0'} 
            onChange={(e) => setAutoRefresh(e.target.value !== '0')}
          >
            <option value="0">关闭</option>
            <option value="30000">每30秒</option>
            <option value="60000">每分钟</option>
          </select>
        </div>
        
        <div className="control-group" style={{ justifyContent: 'flex-end' }}>
          <label>&nbsp;</label>
          <button className="button" onClick={fetchAnalysis} disabled={isLoading}>
            {isLoading ? '分析中...' : '🔄 刷新分析'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="section">
          <div className="loading">
            <div className="loading-spinner"></div>
            <span>正在分析 {displayName} 的观影数据...</span>
          </div>
        </div>
      )}

      {analysisData && !isLoading && (
        <div className="section">
          <h3 className="section-title">
            <span className="icon">👤</span>
            {displayName} 的观影品味档案
          </h3>
          
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{analysisData.total_ratings}</div>
              <div className="stat-label">已评价电影</div>
            </div>
            <div className="stat-card alt">
              <div className="stat-value">{analysisData.average_user_rating}</div>
              <div className="stat-label">您的平均评分</div>
            </div>
            <div className="stat-card info">
              <div className="stat-value">{analysisData.average_tmdb_rating}</div>
              <div className="stat-label">大众平均评分</div>
            </div>
            <div className="stat-card success">
              <div className="stat-value">
                <span className={getDeviationClass(analysisData.rating_deviation)}>
                  {analysisData.rating_deviation > 0 ? '+' : ''}{analysisData.rating_deviation}
                </span>
              </div>
              <div className="stat-label">评分偏差值</div>
            </div>
          </div>
          
          <div className="taste-insight">
            <p>
              <span className="icon">💡</span>
              {getDeviationText(analysisData.deviation_direction)}
            </p>
          </div>

          {analysisData.genre_analysis && analysisData.genre_analysis.length > 0 && (
            <div className="genre-analysis">
              <h4>🎭 类型偏好分析</h4>
              <div className="genre-list">
                {analysisData.genre_analysis.map((genre, index) => (
                  <div key={index} className="genre-card">
                    <div className="genre-name">{genre.genre_name}</div>
                    <div className="genre-stats">
                      <span>评价了 <strong>{genre.total_ratings}</strong> 部</span>
                      <span className="user-rating">您的评分: {genre.average_user_rating}</span>
                      <span className="tmdb-rating">大众评分: {genre.average_tmdb_rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {sankeyData && (
        <div className="section">
          <div className="chart-explanation">
            <h4>📊 桑基图说明</h4>
            <p>
              此图表展示了您的观影偏好流向：从<b>电影类型</b>（第一列）→ 
              <b>评分区间</b>（第二列）→ <b>最终喜好</b>（第三列）。
              连接线越粗表示该类别的电影数量越多。鼠标悬停可查看详细数据。
            </p>
          </div>
          <DynamicSankeyChart 
            data={sankeyData}
            isLoading={isLoading}
            onRefresh={handleRefreshSankey}
            refreshInterval={autoRefresh ? 30000 : 0}
          />
        </div>
      )}

      {ratings && ratings.length > 0 && (
        <div className="section">
          <div className="chart-explanation">
            <h4>📊 评分对比图说明</h4>
            <p>
              此图表对比了<b>您的评分</b>与<b>TMDb 平均评分</b>。
              <span style={{ color: 'var(--success-color)' }}>绿色点</span>表示您的评分高于平均，
              <span style={{ color: 'var(--danger-color)' }}>红色点</span>表示您的评分低于平均。
              可以通过上方下拉框切换不同的图表展示方式。
            </p>
          </div>
          <RatingComparisonChart 
            data={ratings.map(rating => ({
              media_title: rating.media_title,
              user_rating: rating.rating,
              tmdb_rating: rating.tmdb_vote_average || rating.rating,
              deviation: rating.rating - (rating.tmdb_vote_average || rating.rating)
            }))}
            type={chartType}
          />
        </div>
      )}

      {analysisData && (
        <>
          {analysisData.highest_deviation_media && analysisData.highest_deviation_media.length > 0 && (
            <div className="section">
              <h3 className="section-title">
                <span className="icon">👍</span>
                您评价高于大众的电影
              </h3>
              <div className="chart-explanation">
                <p>
                  这些电影您给的评分显著高于大众平均评分。
                  这说明您可能对这些类型的电影有独特的欣赏视角！
                </p>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>电影名称</th>
                      <th>您的评分</th>
                      <th>大众评分</th>
                      <th>评分差异</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisData.highest_deviation_media.map((item, index) => (
                      <tr key={index}>
                        <td>{item.media_title}</td>
                        <td>{item.user_rating} ⭐</td>
                        <td>{item.tmdb_rating} ⭐</td>
                        <td className="deviation-positive">+{item.deviation} ⭐</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {analysisData.lowest_deviation_media && analysisData.lowest_deviation_media.length > 0 && (
            <div className="section">
              <h3 className="section-title">
                <span className="icon">👎</span>
                您评价低于大众的电影
              </h3>
              <div className="chart-explanation">
                <p>
                  这些电影您给的评分显著低于大众平均评分。
                  这可能意味着您对这类电影有着更高的标准和期待！
                </p>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>电影名称</th>
                      <th>您的评分</th>
                      <th>大众评分</th>
                      <th>评分差异</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisData.lowest_deviation_media.map((item, index) => (
                      <tr key={index}>
                        <td>{item.media_title}</td>
                        <td>{item.user_rating} ⭐</td>
                        <td>{item.tmdb_rating} ⭐</td>
                        <td className="deviation-negative">{item.deviation} ⭐</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <div className="section">
        <h3 className="section-title">
          <span className="icon">📖</span>
          使用说明
        </h3>
        <div style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
          <p><strong>🎯 如何使用本系统：</strong></p>
          <ul style={{ marginTop: '12px', paddingLeft: '24px' }}>
            <li><strong>选择用户</strong>：从顶部下拉框选择要分析的用户</li>
            <li><strong>查看统计卡片</strong>：快速了解该用户的整体评分情况</li>
            <li><strong>解读桑基图</strong>：观察不同类型电影的评分流向和偏好</li>
            <li><strong>对比评分</strong>：通过柱状图/折线图/散点图对比您与大众的评分差异</li>
            <li><strong>分析偏差</strong>：查看哪些电影您的评价与大众差异最大</li>
          </ul>
          <p style={{ marginTop: '16px' }}>
            <strong>💡 提示：</strong>评分偏差为正表示您比更大方，为负表示您更严格。
            偏差值越大，说明您的品味越独特！
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
