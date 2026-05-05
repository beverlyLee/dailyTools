import React, { useState, useEffect, useCallback } from 'react'
import Plot from 'react-plotly.js'
import { generateSignal, performFFT, performSTFT, applyFilter, saveExperiment, getHistory } from './api'

function App() {
  const [signalType, setSignalType] = useState('sine')
  const [frequencies, setFrequencies] = useState([{ id: 1, value: 50 }])
  const [amplitudes, setAmplitudes] = useState([{ id: 1, value: 1 }])
  const [sampleRate, setSampleRate] = useState(1000)
  const [duration, setDuration] = useState(1)
  const [noiseLevel, setNoiseLevel] = useState(0)
  const [phase, setPhase] = useState(0)
  const [dutyCycle, setDutyCycle] = useState(50)

  const [filterType, setFilterType] = useState('none')
  const [lowCutoff, setLowCutoff] = useState(100)
  const [highCutoff, setHighCutoff] = useState(500)
  const [filterEnabled, setFilterEnabled] = useState(false)

  const [timeData, setTimeData] = useState(null)
  const [freqData, setFreqData] = useState(null)
  const [stftData, setStftData] = useState(null)
  const [displayMode, setDisplayMode] = useState('frequency')

  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [experimentName, setExperimentName] = useState('')

  const generateAndAnalyze = useCallback(async () => {
    setLoading(true)
    try {
      const freqValues = frequencies.map(f => f.value)
      const ampValues = amplitudes.map(a => a.value)

      const signalResult = await generateSignal({
        signal_type: signalType,
        frequencies: freqValues,
        amplitudes: ampValues,
        sample_rate: sampleRate,
        duration: duration,
        noise_level: noiseLevel,
        phase: phase,
        duty_cycle: dutyCycle
      })

      let timeDataNew = {
        time: signalResult.time,
        signal: signalResult.signal,
        filtered_signal: signalResult.signal
      }

      if (filterEnabled && filterType !== 'none') {
        const filterResult = await applyFilter({
          signal: signalResult.signal,
          sample_rate: sampleRate,
          filter_type: filterType,
          low_cutoff: lowCutoff,
          high_cutoff: highCutoff
        })
        timeDataNew.filtered_signal = filterResult.filtered_signal
      }

      setTimeData(timeDataNew)

      const fftResult = await performFFT({
        signal: timeDataNew.filtered_signal || timeDataNew.signal,
        sample_rate: sampleRate
      })
      setFreqData(fftResult)

      const stftResult = await performSTFT({
        signal: timeDataNew.filtered_signal || timeDataNew.signal,
        sample_rate: sampleRate
      })
      setStftData(stftResult)

    } catch (error) {
      console.error('Error generating signal:', error)
      alert('生成信号失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [signalType, frequencies, amplitudes, sampleRate, duration, noiseLevel, phase, dutyCycle,
      filterType, lowCutoff, highCutoff, filterEnabled])

  useEffect(() => {
    generateAndAnalyze()
  }, [])

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const result = await getHistory()
      setHistory(result.data || [])
    } catch (error) {
      console.error('Error loading history:', error)
    }
  }

  const handleSaveExperiment = async () => {
    if (!experimentName.trim()) {
      alert('请输入实验名称')
      return
    }
    try {
      await saveExperiment({
        name: experimentName,
        signal_type: signalType,
        frequencies: frequencies.map(f => f.value),
        amplitudes: amplitudes.map(a => a.value),
        sample_rate: sampleRate,
        duration: duration,
        noise_level: noiseLevel,
        filter_type: filterType,
        low_cutoff: lowCutoff,
        high_cutoff: highCutoff,
        filter_enabled: filterEnabled
      })
      setExperimentName('')
      loadHistory()
      alert('实验已保存！')
    } catch (error) {
      console.error('Error saving experiment:', error)
      alert('保存失败: ' + error.message)
    }
  }

  const addFrequency = () => {
    const newId = Math.max(...frequencies.map(f => f.id), 0) + 1
    setFrequencies([...frequencies, { id: newId, value: 100 }])
    setAmplitudes([...amplitudes, { id: newId, value: 0.5 }])
  }

  const removeFrequency = (id) => {
    if (frequencies.length > 1) {
      setFrequencies(frequencies.filter(f => f.id !== id))
      setAmplitudes(amplitudes.filter(a => a.id !== id))
    }
  }

  const updateFrequency = (id, value) => {
    setFrequencies(frequencies.map(f => 
      f.id === id ? { ...f, value: parseFloat(value) || 0 } : f
    ))
  }

  const updateAmplitude = (id, value) => {
    setAmplitudes(amplitudes.map(a => 
      a.id === id ? { ...a, value: parseFloat(value) || 0 } : a
    ))
  }

  const getTimeDomainPlot = () => {
    if (!timeData) return null

    const traces = [
      {
        x: timeData.time,
        y: timeData.signal,
        type: 'scatter',
        mode: 'lines',
        name: '原始信号',
        line: { color: '#667eea', width: 1.5 }
      }
    ]

    if (timeData.filtered_signal && filterEnabled) {
      traces.push({
        x: timeData.time,
        y: timeData.filtered_signal,
        type: 'scatter',
        mode: 'lines',
        name: '滤波后信号',
        line: { color: '#38ef7d', width: 1.5 }
      })
    }

    return (
      <Plot
        data={traces}
        layout={{
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0.2)',
          font: { color: '#fff' },
          xaxis: {
            title: '时间 (s)',
            gridcolor: 'rgba(255,255,255,0.1)',
            color: '#fff'
          },
          yaxis: {
            title: '幅度',
            gridcolor: 'rgba(255,255,255,0.1)',
            color: '#fff'
          },
          legend: {
            bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#fff' }
          },
          margin: { l: 50, r: 20, t: 20, b: 50 },
          autosize: true
        }}
        config={{ responsive: true }}
        style={{ width: '100%', height: '350px' }}
      />
    )
  }

  const getFrequencyPlot = () => {
    if (!freqData) return null

    return (
      <Plot
        data={[{
          x: freqData.frequencies,
          y: freqData.magnitude,
          type: 'bar',
          marker: { color: '#667eea' },
          name: '频谱'
        }]}
        layout={{
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0.2)',
          font: { color: '#fff' },
          xaxis: {
            title: '频率 (Hz)',
            gridcolor: 'rgba(255,255,255,0.1)',
            color: '#fff'
          },
          yaxis: {
            title: '幅度',
            type: 'log',
            gridcolor: 'rgba(255,255,255,0.1)',
            color: '#fff'
          },
          margin: { l: 50, r: 20, t: 20, b: 50 },
          autosize: true
        }}
        config={{ responsive: true }}
        style={{ width: '100%', height: '350px' }}
      />
    )
  }

  const getSTFTPlot = () => {
    if (!stftData) return null

    const z = stftData.magnitude.map(row => 
      row.map(v => 20 * Math.log10(Math.max(v, 1e-10)))
    )

    return (
      <Plot
        data={[{
          z: z,
          x: stftData.time,
          y: stftData.frequencies,
          type: 'heatmap',
          colorscale: 'Viridis',
          showscale: true,
          colorbar: {
            title: 'dB',
            titlefont: { color: '#fff' },
            tickfont: { color: '#fff' }
          }
        }]}
        layout={{
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0.2)',
          font: { color: '#fff' },
          xaxis: {
            title: '时间 (s)',
            gridcolor: 'rgba(255,255,255,0.1)',
            color: '#fff'
          },
          yaxis: {
            title: '频率 (Hz)',
            gridcolor: 'rgba(255,255,255,0.1)',
            color: '#fff'
          },
          margin: { l: 50, r: 50, t: 20, b: 50 },
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
          <div className="loading-text">处理中...</div>
        </div>
      )}

      <header className="app-header">
        <h1>傅里叶变换信号分析实验台</h1>
        <p className="subtitle">Fourier Transform Signal Analyzer</p>
      </header>

      <div className="main-grid">
        <div className="control-panel">
          <div className="control-section">
            <h3>信号发生器</h3>
            
            <div className="form-group">
              <label>信号类型</label>
              <select 
                value={signalType} 
                onChange={(e) => setSignalType(e.target.value)}
              >
                <option value="sine">正弦波</option>
                <option value="square">方波</option>
                <option value="triangle">三角波</option>
                <option value="sawtooth">锯齿波</option>
                <option value="white_noise">白噪声</option>
                <option value="chirp">线性扫频信号</option>
              </select>
            </div>

            {signalType !== 'white_noise' && (
              <>
                <div className="form-group">
                  <label>频率分量 (Hz)</label>
                  <div className="frequency-grid">
                    {frequencies.map((freq, index) => (
                      <div key={freq.id} className="frequency-item">
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.8em', color: '#888', marginBottom: '4px' }}>
                            频率 {index + 1}
                          </div>
                          <input
                            type="number"
                            value={freq.value}
                            onChange={(e) => updateFrequency(freq.id, e.target.value)}
                            min="0.1"
                            step="0.1"
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.8em', color: '#888', marginBottom: '4px' }}>
                            幅度
                          </div>
                          <input
                            type="number"
                            value={amplitudes[index]?.value || 1}
                            onChange={(e) => updateAmplitude(freq.id, e.target.value)}
                            min="0"
                            step="0.1"
                          />
                        </div>
                        {frequencies.length > 1 && (
                          <button 
                            className="remove-btn"
                            onClick={() => removeFrequency(freq.id)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button 
                    className="add-frequency-btn"
                    onClick={addFrequency}
                  >
                    + 添加频率分量
                  </button>
                </div>
              </>
            )}

            <div className="form-group">
              <label>采样率 (Hz)</label>
              <input
                type="number"
                value={sampleRate}
                onChange={(e) => setSampleRate(parseInt(e.target.value) || 1000)}
                min="100"
                max="10000"
              />
            </div>

            <div className="form-group">
              <label>持续时间 (s)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseFloat(e.target.value) || 1)}
                min="0.1"
                max="10"
                step="0.1"
              />
            </div>

            {signalType !== 'white_noise' && (
              <div className="slider-container">
                <div className="slider-label">
                  <span>相位偏移</span>
                  <span className="slider-value">{phase.toFixed(2)}π</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.01"
                  value={phase}
                  onChange={(e) => setPhase(parseFloat(e.target.value))}
                />
              </div>
            )}

            {signalType === 'square' && (
              <div className="slider-container">
                <div className="slider-label">
                  <span>占空比</span>
                  <span className="slider-value">{dutyCycle}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="99"
                  value={dutyCycle}
                  onChange={(e) => setDutyCycle(parseInt(e.target.value))}
                />
              </div>
            )}

            <div className="slider-container">
              <div className="slider-label">
                <span>噪声水平</span>
                <span className="slider-value">{noiseLevel.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={noiseLevel}
                onChange={(e) => setNoiseLevel(parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="control-section">
            <h3>滤波器</h3>
            
            <div className="checkbox-container">
              <input
                type="checkbox"
                id="filterEnabled"
                checked={filterEnabled}
                onChange={(e) => setFilterEnabled(e.target.checked)}
              />
              <label htmlFor="filterEnabled">启用滤波器</label>
            </div>

            {filterEnabled && (
              <>
                <div className="form-group" style={{ marginTop: '15px' }}>
                  <label>滤波器类型</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="none">无</option>
                    <option value="lowpass">低通</option>
                    <option value="highpass">高通</option>
                    <option value="bandstop">带阻</option>
                    <option value="bandpass">带通</option>
                  </select>
                </div>

                {(filterType === 'lowpass' || filterType === 'highpass' || 
                  filterType === 'bandstop' || filterType === 'bandpass') && (
                  <div className="slider-container">
                    <div className="slider-label">
                      <span>低截止频率 (Hz)</span>
                      <span className="slider-value">{lowCutoff}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max={sampleRate / 2}
                      value={lowCutoff}
                      onChange={(e) => setLowCutoff(parseInt(e.target.value))}
                    />
                  </div>
                )}

                {(filterType === 'bandstop' || filterType === 'bandpass') && (
                  <div className="slider-container">
                    <div className="slider-label">
                      <span>高截止频率 (Hz)</span>
                      <span className="slider-value">{highCutoff}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max={sampleRate / 2}
                      value={highCutoff}
                      onChange={(e) => setHighCutoff(parseInt(e.target.value))}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="control-section">
            <h3>操作</h3>
            <div className="button-group">
              <button 
                className="btn btn-primary"
                onClick={generateAndAnalyze}
                disabled={loading}
              >
                生成并分析
              </button>
            </div>

            <div style={{ marginTop: '15px' }}>
              <div className="form-group">
                <label>实验名称</label>
                <input
                  type="text"
                  value={experimentName}
                  onChange={(e) => setExperimentName(e.target.value)}
                  placeholder="输入实验名称以便保存"
                />
              </div>
              <button 
                className="btn btn-success"
                onClick={handleSaveExperiment}
                style={{ width: '100%' }}
              >
                保存实验快照
              </button>
            </div>
          </div>

          <div className="info-box">
            <div className="info-box-title">操作提示</div>
            <div className="info-box-content">
              • 选择信号类型并调整参数<br/>
              • 可添加多个频率分量生成复合信号<br/>
              • 启用滤波器可实时观察滤波效果<br/>
              • 保存实验以便后续复盘
            </div>
          </div>
        </div>

        <div className="charts-section">
          <div className="chart-container">
            <h3>时域波形</h3>
            <div className="chart-wrapper">
              {getTimeDomainPlot()}
            </div>
          </div>

          <div className="chart-container">
            <h3>频域分析</h3>
            <div className="chart-mode-selector">
              <button 
                className={`chart-mode-btn ${displayMode === 'frequency' ? 'active' : ''}`}
                onClick={() => setDisplayMode('frequency')}
              >
                频谱 (FFT)
              </button>
              <button 
                className={`chart-mode-btn ${displayMode === 'stft' ? 'active' : ''}`}
                onClick={() => setDisplayMode('stft')}
              >
                时频谱 (STFT)
              </button>
            </div>
            <div className="chart-wrapper">
              {displayMode === 'frequency' ? getFrequencyPlot() : getSTFTPlot()}
            </div>
          </div>

          {timeData && (
            <div className="status-bar">
              <div className="status-item">
              <span className="status-label">采样点数:</span>
              <span className="status-value">{timeData.time?.time?.length || 0}</span>
            </div>
              <div className="status-item">
              <span className="status-label">采样率:</span>
              <span className="status-value">{sampleRate} Hz</span>
            </div>
              <div className="status-item">
              <span className="status-label">持续时间:</span>
              <span className="status-value">{duration} s</span>
            </div>
            </div>
          )}
        </div>
      </div>

      <div className="history-section">
        <div className="history-header">
          <h3>实验历史记录</h3>
          <button 
            className="btn btn-secondary"
            onClick={loadHistory}
          >
            刷新
          </button>
        </div>
        <div className="history-table-container">
          {history.length === 0 ? (
            <div className="no-data">暂无历史记录</div>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>实验名称</th>
                  <th>信号类型</th>
                  <th>频率分量</th>
                  <th>滤波器</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record, index) => (
                  <tr key={index}>
                    <td>{new Date(record.created_at).toLocaleString('zh-CN')}</td>
                    <td className="highlight">{record.name}</td>
                    <td>{record.signal_type}</td>
                    <td>{record.frequencies?.join(', ') || 'N/A'} Hz</td>
                    <td className={record.filter_enabled ? 'success' : ''}>
                      {record.filter_enabled ? record.filter_type : '未启用'}
                    </td>
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
