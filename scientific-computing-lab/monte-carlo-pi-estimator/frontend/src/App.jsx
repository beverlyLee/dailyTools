import React, { useState, useEffect, useRef, useCallback } from 'react'
import Plot from 'react-plotly.js'
import { estimatePi, getSamplePoints, getHistory, clearHistory } from './api'

function App() {
  const canvasRef = useRef(null)
  const [sampleSize, setSampleSize] = useState(1000000)
  const [workerCount, setWorkerCount] = useState(0)
  const [animationSpeed, setAnimationSpeed] = useState(100)
  
  const [totalPoints, setTotalPoints] = useState(0)
  const [pointsInCircle, setPointsInCircle] = useState(0)
  const [pointsInSquare, setPointsInSquare] = useState(0)
  
  const [estimatedPi, setEstimatedPi] = useState(null)
  const [errorPercentage, setErrorPercentage] = useState(null)
  const [duration, setDuration] = useState(null)
  
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationPoints, setAnimationPoints] = useState([])
  const animationTimerRef = useRef(null)

  const drawBackground = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 2 - 20

    ctx.clearRect(0, 0, width, height)

    ctx.strokeStyle = '#667eea'
    ctx.lineWidth = 2
    ctx.strokeRect(centerX - radius, centerY - radius, radius * 2, radius * 2)

    ctx.strokeStyle = '#e94560'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.stroke()

    ctx.fillStyle = '#888'
    ctx.font = '12px Arial'
    ctx.fillText('蓝色: 正方形 (面积=4)', 10, 20)
    ctx.fillText('红色: 圆 (面积=π)', 10, 40)
  }, [])

  const drawPoint = useCallback((x, y, inCircle) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 2 - 20

    const canvasX = centerX + x * radius
    const canvasY = centerY - y * radius

    ctx.fillStyle = inCircle ? '#38ef7d' : '#feca57'
    ctx.beginPath()
    ctx.arc(canvasX, canvasY, 2, 0, Math.PI * 2)
    ctx.fill()
  }, [])

  const clearPoints = useCallback(() => {
    setTotalPoints(0)
    setPointsInCircle(0)
    setPointsInSquare(0)
    setEstimatedPi(null)
    setErrorPercentage(null)
    setDuration(null)
    setAnimationPoints([])
    stopAnimation()
    drawBackground()
  }, [drawBackground])

  const stopAnimation = useCallback(() => {
    setIsAnimating(false)
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current)
      animationTimerRef.current = null
    }
  }, [])

  const handleEstimate = useCallback(async () => {
    setLoading(true)
    stopAnimation()
    
    try {
      const result = await estimatePi({
        sample_size: sampleSize,
        num_workers: workerCount
      })

      setEstimatedPi(result.estimated_pi)
      setErrorPercentage(result.error_percentage)
      setDuration(result.duration_ms)

      if (animationSpeed > 0) {
        const displayCount = Math.min(sampleSize, 1000)
        const points = await getSamplePoints({ count: displayCount })
        setAnimationPoints(points)
        startAnimation(points, sampleSize, animationSpeed)
      } else {
        setTotalPoints(result.points_in_square)
        setPointsInCircle(result.points_in_circle)
        setPointsInSquare(result.points_in_square - result.points_in_circle)
      }

      loadHistoryData()

    } catch (error) {
      console.error('估算失败:', error)
      alert('估算失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [sampleSize, workerCount, animationSpeed, stopAnimation])

  const startAnimation = useCallback((points, totalCount, speed) => {
    setIsAnimating(true)
    drawBackground()
    setTotalPoints(0)
    setPointsInCircle(0)
    setPointsInSquare(0)

    const ratio = totalCount / points.length
    let displayCircle = 0
    let displaySquare = 0
    let index = 0

    const animate = () => {
      if (index >= points.length || !isAnimating) {
        setTotalPoints(totalCount)
        setPointsInCircle(Math.round(displayCircle * ratio))
        setPointsInSquare(totalCount - Math.round(displayCircle * ratio))
        setIsAnimating(false)
        return
      }

      const batchSize = Math.min(points.length - index, 10)
      for (let i = 0; i < batchSize && index < points.length; i++, index++) {
        const point = points[index]
        drawPoint(point.x, point.y, point.in_circle)
        if (point.in_circle) {
          displayCircle++
        } else {
          displaySquare++
        }
      }

      setTotalPoints(Math.round(index * ratio))
      setPointsInCircle(Math.round(displayCircle * ratio))
      setPointsInSquare(Math.round(index * ratio) - Math.round(displayCircle * ratio))

      animationTimerRef.current = setTimeout(animate, speed)
    }

    animate()
  }, [drawBackground, drawPoint, isAnimating])

  const loadHistoryData = useCallback(async () => {
    try {
      const result = await getHistory({ limit: 50 })
      setHistory(result.data || [])
    } catch (error) {
      console.error('加载历史失败:', error)
    }
  }, [])

  const handleClearHistory = useCallback(async () => {
    if (!window.confirm('确定要清除所有历史记录吗？')) {
      return
    }
    try {
      await clearHistory()
      setHistory([])
    } catch (error) {
      console.error('清除历史失败:', error)
      alert('清除历史失败: ' + error.message)
    }
  }, [])

  useEffect(() => {
    drawBackground()
    loadHistoryData()
    return () => {
      stopAnimation()
    }
  }, [drawBackground, loadHistoryData, stopAnimation])

  const getConvergenceChart = () => {
    if (history.length === 0) return null

    const sortedData = [...history].sort((a, b) => a.sample_size - b.sample_size)
    const actualPi = Math.PI

    return (
      <Plot
        data={[
          {
            x: sortedData.map((_, i) => i + 1),
            y: sortedData.map(r => r.estimated_pi),
            type: 'scatter',
            mode: 'lines+markers',
            name: '估算值',
            line: { color: '#e94560', width: 2 },
            marker: { color: '#e94560', size: 8 }
          },
          {
            x: [0, sortedData.length + 1],
            y: [actualPi, actualPi],
            type: 'scatter',
            mode: 'lines',
            name: '真实值 π',
            line: { color: '#38ef7d', width: 2, dash: 'dash' }
          }
        ]}
        layout={{
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0.2)',
          font: { color: '#fff' },
          title: {
            text: '大数定律收敛过程',
            font: { color: '#fff' }
          },
          xaxis: {
            title: '实验次数 (样本量递增)',
            gridcolor: 'rgba(255,255,255,0.1)',
            color: '#fff'
          },
          yaxis: {
            title: 'π 估算值',
            gridcolor: 'rgba(255,255,255,0.1)',
            color: '#fff',
            range: [Math.PI * 0.95, Math.PI * 1.05]
          },
          legend: {
            bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#fff' }
          },
          margin: { l: 50, r: 20, t: 50, b: 50 },
          autosize: true
        }}
        config={{ responsive: true }}
        style={{ width: '100%', height: '350px' }}
      />
    )
  }

  return (
    <div className="app-container">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <div className="loading-text">Go 并发计算中...</div>
        </div>
      )}

      <header className="app-header">
        <h1>蒙特卡洛圆周率估算模拟器</h1>
        <p className="subtitle">Monte Carlo Pi Estimation Simulator - Go 并发版</p>
      </header>

      <div className="main-grid">
        <div className="canvas-section">
          <h3>投点可视化</h3>
          <div className="canvas-wrapper">
            <canvas 
              ref={canvasRef} 
              id="piCanvas" 
              width="500" 
              height="500"
            />
          </div>
          <div className="canvas-info">
            <div className="info-item">
              <div className="info-label">总投点数</div>
              <div className="info-value total">{totalPoints.toLocaleString()}</div>
            </div>
            <div className="info-item">
              <div className="info-label">圆内点数</div>
              <div className="info-value in-circle">{pointsInCircle.toLocaleString()}</div>
            </div>
            <div className="info-item">
              <div className="info-label">圆外点数</div>
              <div className="info-value out-circle">{pointsInSquare.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="control-panel">
          <div className="control-section">
            <h3>参数设置</h3>
            
            <div className="form-group">
              <label>投点数量</label>
              <select 
                value={sampleSize}
                onChange={(e) => setSampleSize(parseInt(e.target.value))}
              >
                <option value="1000">1,000</option>
                <option value="10000">10,000</option>
                <option value="100000">100,000</option>
                <option value="1000000" selected>1,000,000</option>
                <option value="10000000">10,000,000</option>
                <option value="50000000">50,000,000</option>
                <option value="100000000">100,000,000</option>
              </select>
            </div>

            <div className="form-group">
              <label>并发数 (Goroutines)</label>
              <select
                value={workerCount}
                onChange={(e) => setWorkerCount(parseInt(e.target.value))}
              >
                <option value="0">自动 (使用 CPU 核心数)</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="4">4</option>
                <option value="8">8</option>
                <option value="16">16</option>
                <option value="32">32</option>
              </select>
            </div>

            <div className="form-group">
              <label>动画速度</label>
              <select
                value={animationSpeed}
                onChange={(e) => setAnimationSpeed(parseInt(e.target.value))}
              >
                <option value="0">无动画 (仅统计)</option>
                <option value="10">极快</option>
                <option value="50">快速</option>
                <option value="100" selected>正常</option>
                <option value="200">慢速</option>
                <option value="500">极慢</option>
              </select>
            </div>
          </div>

          <div className="control-section">
            <h3>操作</h3>
            <div className="button-group">
              <button 
                className="btn btn-primary"
                onClick={handleEstimate}
                disabled={loading || isAnimating}
              >
                开始估算
              </button>
              <button 
                className="btn btn-danger"
                onClick={clearPoints}
              >
                重置
              </button>
            </div>
          </div>

          <div className="result-panel">
            <h3>估算结果</h3>
            <div className="result-grid">
              <div className="result-item">
                <label>估算 π 值</label>
                <div className={`value ${estimatedPi ? 'highlight' : ''}`}>
                  {estimatedPi ? estimatedPi.toFixed(15) : '--'}
                </div>
              </div>
              <div className="result-item">
                <label>实际 π 值</label>
                <div className="value">{Math.PI.toFixed(15)}</div>
              </div>
              <div className="result-item">
                <label>误差</label>
                <div className={`value ${errorPercentage !== null ? (errorPercentage < 1 ? 'success' : 'warning') : ''}`}>
                  {errorPercentage !== null ? `${errorPercentage.toFixed(6)}%` : '--'}
                </div>
              </div>
              <div className="result-item">
                <label>执行时间</label>
                <div className="value">{duration !== null ? `${duration} ms` : '--'}</div>
              </div>
            </div>
          </div>

          <div className="method-explanation">
            <h4>蒙特卡洛方法说明</h4>
            <p>在边长为 2 的正方形中内切一个半径为 1 的圆。</p>
            <p>正方形面积 = 4，圆面积 = π</p>
            <p>随机投入 N 个点，落入圆内的概率 = π/4</p>
            <div className="formula">π ≈ 4 × (圆内点数 / 总点数)</div>
            <p><strong>Go 并发优势：</strong>使用 Goroutine 并发生成随机点，充分利用多核 CPU，百万级计算仅需毫秒级！</p>
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="charts-section">
          <h3>收敛过程可视化</h3>
          <div className="chart-container">
            <div className="chart-wrapper">
              {getConvergenceChart()}
            </div>
          </div>
        </div>
      )}

      <div className="history-section">
        <div className="history-header">
          <h3>估算历史 (大数定律展示)</h3>
          <div className="history-controls">
            <button 
              className="btn btn-secondary"
              onClick={loadHistoryData}
            >
              刷新
            </button>
            <button 
              className="btn btn-danger"
              onClick={handleClearHistory}
            >
              清除历史
            </button>
          </div>
        </div>
        <div className="history-table-container">
          {history.length === 0 ? (
            <div className="no-data">暂无历史记录</div>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>样本量</th>
                  <th>估算值</th>
                  <th>误差</th>
                  <th>耗时</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record, index) => (
                  <tr key={index}>
                    <td>{new Date(record.created_at).toLocaleString('zh-CN')}</td>
                    <td className="highlight">{record.sample_size.toLocaleString()}</td>
                    <td className="highlight">{record.estimated_pi.toFixed(10)}</td>
                    <td className={record.error_percentage < 1 ? 'success' : 'warning'}>
                      {record.error_percentage.toFixed(4)}%
                    </td>
                    <td>{record.duration_ms} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
