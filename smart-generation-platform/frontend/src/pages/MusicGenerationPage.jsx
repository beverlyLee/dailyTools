import React, { useState, useEffect, useRef } from 'react'
import {
  Row,
  Col,
  Card,
  Input,
  Button,
  Slider,
  Select,
  Spin,
  message,
  Tabs,
  List,
  Space,
  Typography,
  Divider,
  Tag,
  Empty,
} from 'antd'
import {
  SoundOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  DownloadOutlined,
  HistoryOutlined,
  ReloadOutlined,
  SettingOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { musicApi } from '../api'
import './MusicGenerationPage.css'

const { Title, Text } = Typography
const { Option } = Select
const { TabPane } = Tabs
const { TextArea } = Input

const MusicGenerationPage = () => {
  const [loading, setLoading] = useState(false)
  const [pollingTask, setPollingTask] = useState(null)

  const [prompt, setPrompt] = useState('')
  const [folkRatio, setFolkRatio] = useState(0.5)
  const [modernity, setModernity] = useState(0.5)
  const [selectedModel, setSelectedModel] = useState('ernie')
  const [availableModels, setAvailableModels] = useState([])

  const [currentTaskId, setCurrentTaskId] = useState(null)
  const [taskStatus, setTaskStatus] = useState(null)
  const [generatedMidi, setGeneratedMidi] = useState(null)
  const [generatedAudioPath, setGeneratedAudioPath] = useState(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [selectedNote, setSelectedNote] = useState(null)

  const [historyList, setHistoryList] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const pianoRollRef = useRef(null)
  const audioContextRef = useRef(null)

  // 预设示例
  const presetPrompts = [
    { label: '赛博朋克 + 古筝', value: '赛博朋克风格的电子音乐，融合古筝的东方韵味' },
    { label: '古风 + 钢琴', value: '中国古风音乐，以钢琴为主奏乐器，优雅宁静' },
    { label: '现代流行 + 二胡', value: '现代流行曲风，融入二胡的深情表达' },
    { label: '爵士 + 笛子', value: '轻快的爵士风格，搭配竹笛的清新音色' },
  ]

  useEffect(() => {
    loadModels()
    loadHistory()

    // 初始化AudioContext
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }

    return () => {
      if (pollingTask) {
        clearInterval(pollingTask)
      }
    }
  }, [])

  // 加载可用模型
  const loadModels = async () => {
    try {
      const response = await musicApi.getModels()
      if (response.data.success) {
        setAvailableModels(response.data.models)
      }
    } catch (error) {
      console.error('加载模型列表失败:', error)
    }
  }

  // 加载历史记录
  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const response = await musicApi.getHistory(1)
      if (response.data.success) {
        setHistoryList(response.data.data)
      }
    } catch (error) {
      console.error('加载历史记录失败:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  // 生成音乐
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      message.warning('请输入音乐描述')
      return
    }

    setLoading(true)
    try {
      const response = await musicApi.generateMusic(
        prompt,
        folkRatio,
        modernity,
        selectedModel,
        1
      )

      if (response.data.success) {
        const taskId = response.data.task_id
        setCurrentTaskId(taskId)
        setTaskStatus('processing')
        message.info('音乐生成任务已提交，正在处理中...')

        // 轮询任务状态
        const interval = setInterval(async () => {
          try {
            const statusResponse = await musicApi.getTaskStatus(taskId)
            if (statusResponse.data.success) {
              const status = statusResponse.data.status
              setTaskStatus(status)

              if (status === 'completed') {
                clearInterval(interval)
                setPollingTask(null)
                
                setGeneratedMidi(statusResponse.data.midi_data)
                setGeneratedAudioPath(statusResponse.data.audio_path)
                setLoading(false)
                message.success('音乐生成完成！')
                loadHistory()
              } else if (status === 'failed') {
                clearInterval(interval)
                setPollingTask(null)
                setLoading(false)
                message.error('音乐生成失败')
              }
            }
          } catch (error) {
            console.error('轮询任务状态失败:', error)
          }
        }, 2000)

        setPollingTask(interval)
      }
    } catch (error) {
      message.error('提交任务失败')
      console.error(error)
      setLoading(false)
    }
  }

  // 播放/暂停
  const handlePlayPause = () => {
    if (!generatedMidi) {
      message.warning('请先生成音乐')
      return
    }

    setIsPlaying(!isPlaying)
    
    if (!isPlaying) {
      playMidiNotes(generatedMidi)
    }
  }

  // 播放MIDI音符（简单实现）
  const playMidiNotes = (midiData) => {
    if (!audioContextRef.current || !midiData.notes) return

    const ctx = audioContextRef.current
    const tempo = midiData.tempo || 120
    const beatDuration = 60 / tempo // 每拍的秒数

    midiData.notes.forEach((note, index) => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      // 将MIDI音高转换为频率
      const frequency = 440 * Math.pow(2, (note.pitch - 69) / 12)
      
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

      // 设置音量包络
      const startTime = ctx.currentTime + note.start_time * beatDuration
      const duration = note.duration * beatDuration
      
      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01)
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration)

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.start(startTime)
      oscillator.stop(startTime + duration)
    })

    // 自动停止播放状态
    const totalDuration = midiData.notes.reduce(
      (max, note) => Math.max(max, note.start_time + note.duration),
      0
    ) * (60 / (midiData.tempo || 120))

    setTimeout(() => {
      setIsPlaying(false)
      setCurrentTime(0)
    }, totalDuration * 1000)
  }

  // 下载
  const handleDownload = () => {
    if (!generatedAudioPath && !generatedMidi) {
      message.warning('没有可下载的内容')
      return
    }

    if (generatedAudioPath) {
      // 实际项目中应该下载音频文件
      message.info('音频下载功能开发中')
    } else if (generatedMidi) {
      // 下载MIDI数据为JSON
      const dataStr = JSON.stringify(generatedMidi, null, 2)
      const blob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `music-${Date.now()}.json`
      link.click()
      URL.revokeObjectURL(url)
      message.success('MIDI数据已下载')
    }
  }

  // 选择预设
  const handleSelectPreset = (value) => {
    setPrompt(value)
  }

  // 渲染钢琴卷帘
  const renderPianoRoll = () => {
    if (!generatedMidi || !generatedMidi.notes) {
      return (
        <div className="piano-roll-empty">
          <Empty
            description="暂无MIDI数据，请先生成音乐"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      )
    }

    const { notes, tempo = 120 } = generatedMidi
    const beatDuration = 60 / tempo

    // 计算画布尺寸
    const totalTime = notes.reduce(
      (max, note) => Math.max(max, note.start_time + note.duration),
      0
    )
    const minPitch = Math.min(...notes.map((n) => n.pitch))
    const maxPitch = Math.max(...notes.map((n) => n.pitch))
    const pitchRange = maxPitch - minPitch + 1

    const width = Math.max(600, totalTime * 80 + 80)
    const height = Math.max(300, pitchRange * 20 + 40)

    // 音高到音符名的映射
    const pitchToNote = (pitch) => {
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
      const octave = Math.floor(pitch / 12) - 1
      const note = noteNames[pitch % 12]
      return `${note}${octave}`
    }

    return (
      <div className="piano-roll-container" ref={pianoRollRef}>
        <svg width={width} height={height} className="piano-roll-svg">
          {/* 网格线 */}
          {Array.from({ length: Math.ceil(totalTime) + 1 }).map((_, i) => (
            <line
              key={`v-${i}`}
              x1={40 + i * 80}
              y1={20}
              x2={40 + i * 80}
              y2={height - 20}
              stroke="#e8e8e8"
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: pitchRange + 1 }).map((_, i) => (
            <line
              key={`h-${i}`}
              x1={40}
              y1={20 + i * 20}
              x2={width - 20}
              y2={20 + i * 20}
              stroke="#e8e8e8"
              strokeWidth={1}
            />
          ))}

          {/* 音符标签 */}
          {Array.from({ length: pitchRange }).map((_, i) => {
            const pitch = minPitch + i
            const y = height - 40 - i * 20
            return (
              <text
                key={`label-${pitch}`}
                x={35}
                y={y + 12}
                textAnchor="end"
                fontSize={10}
                fill="#666"
              >
                {pitchToNote(pitch)}
              </text>
            )
          })}

          {/* 时间标签 */}
          {Array.from({ length: Math.ceil(totalTime) + 1 }).map((_, i) => (
            <text
              key={`time-${i}`}
              x={40 + i * 80}
              y={height - 5}
              textAnchor="middle"
              fontSize={10}
              fill="#666"
            >
              {i.toFixed(1)}s
            </text>
          ))}

          {/* 音符块 */}
          {notes.map((note, index) => {
            const x = 40 + note.start_time * 80
            const y = height - 40 - (note.pitch - minPitch) * 20
            const w = note.duration * 80
            const h = 18

            const isSelected = selectedNote === index

            return (
              <g key={index} onClick={() => setSelectedNote(index)} style={{ cursor: 'pointer' }}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={2}
                  ry={2}
                  fill={isSelected ? '#ff4d4f' : '#1890ff'}
                  stroke={isSelected ? '#ff7875' : '#40a9ff'}
                  strokeWidth={isSelected ? 2 : 1}
                  className="note-rect"
                />
                <text
                  x={x + w / 2}
                  y={y + h / 2 + 3}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#fff"
                  pointerEvents="none"
                >
                  {pitchToNote(note.pitch)}
                </text>
              </g>
            )
          })}

          {/* 播放指示器 */}
          {isPlaying && (
            <line
              x1={40 + currentTime * 80}
              y1={20}
              x2={40 + currentTime * 80}
              y2={height - 20}
              stroke="#ff4d4f"
              strokeWidth={2}
              opacity={0.8}
            />
          )}
        </svg>
      </div>
    )
  }

  // 调整选中的音符
  const adjustSelectedNote = (field, value) => {
    if (selectedNote === null || !generatedMidi) return

    const newMidi = { ...generatedMidi }
    newMidi.notes = [...newMidi.notes]
    newMidi.notes[selectedNote] = {
      ...newMidi.notes[selectedNote],
      [field]: value,
    }
    setGeneratedMidi(newMidi)
  }

  return (
    <div className="page-container">
      <Title level={2} className="page-title">
        <SoundOutlined style={{ marginRight: 12 }} />
        智能音乐生成
      </Title>

      <Tabs defaultActiveKey="generate" size="large">
        <TabPane
          tab={
            <span>
              <SoundOutlined /> 音乐生成
            </span>
          }
          key="generate"
        >
          <Row gutter={[24, 24]}>
            {/* 左侧：参数控制 */}
            <Col xs={24} lg={8}>
              <Card
                title={
                  <Space>
                    <SettingOutlined />
                    <span>生成参数</span>
                  </Space>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  {/* 预设提示 */}
                  <div>
                    <Text strong>快速预设</Text>
                    <Divider style={{ margin: '12px 0' }} />
                    <div className="preset-buttons">
                      {presetPrompts.map((preset) => (
                        <Button
                          key={preset.label}
                          size="small"
                          onClick={() => handleSelectPreset(preset.value)}
                          style={{ margin: '4px' }}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* 音乐描述 */}
                  <div>
                    <Text strong>音乐描述</Text>
                    <Divider style={{ margin: '12px 0' }} />
                    <TextArea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="请描述你想要的音乐风格，例如：赛博朋克风格的电子音乐，融合古筝的东方韵味..."
                      rows={4}
                      showCount
                      maxLength={200}
                    />
                  </div>

                  {/* 模型选择 */}
                  <div>
                    <Text strong>选择模型</Text>
                    <Divider style={{ margin: '12px 0' }} />
                    <Select
                      value={selectedModel}
                      onChange={setSelectedModel}
                      style={{ width: '100%' }}
                      optionLabelProp="label"
                    >
                      {availableModels.map((model) => (
                        <Option key={model.id} value={model.id} label={model.name}>
                          <div>
                            <Text strong>{model.name}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {model.description}
                            </Text>
                          </div>
                        </Option>
                      ))}
                    </Select>
                  </div>

                  {/* 民乐占比 */}
                  <div>
                    <Text strong>民乐占比</Text>
                    <Tag color="blue" style={{ marginLeft: 8 }}>
                      {Math.round(folkRatio * 100)}%
                    </Tag>
                    <Divider style={{ margin: '12px 0' }} />
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={folkRatio}
                      onChange={setFolkRatio}
                      marks={{
                        0: '纯现代',
                        0.5: '平衡',
                        1: '纯民乐',
                      }}
                    />
                  </div>

                  {/* 现代感 */}
                  <div>
                    <Text strong>现代感</Text>
                    <Tag color="orange" style={{ marginLeft: 8 }}>
                      {Math.round(modernity * 100)}%
                    </Tag>
                    <Divider style={{ margin: '12px 0' }} />
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={modernity}
                      onChange={setModernity}
                      marks={{
                        0: '古典',
                        0.5: '适中',
                        1: '现代',
                      }}
                    />
                  </div>

                  {/* 生成按钮 */}
                  <Button
                    type="primary"
                    icon={<SoundOutlined />}
                    onClick={handleGenerate}
                    loading={loading}
                    block
                    size="large"
                    danger
                  >
                    {loading ? '生成中...' : '开始生成音乐'}
                  </Button>

                  {taskStatus === 'processing' && (
                    <div style={{ textAlign: 'center' }}>
                      <Spin size="small" />
                      <Text type="secondary" style={{ marginLeft: 8 }}>
                        AI正在创作音乐，请稍候...
                      </Text>
                    </div>
                  )}
                </Space>
              </Card>
            </Col>

            {/* 右侧：钢琴卷帘编辑器 */}
            <Col xs={24} lg={16}>
              <Card
                title={
                  <Space>
                    <PlayCircleOutlined />
                    <span>钢琴卷帘编辑器</span>
                    {generatedMidi && (
                      <Tag color="green">
                        {generatedMidi.notes?.length || 0} 个音符
                      </Tag>
                    )}
                  </Space>
                }
                extra={
                  <Space>
                    <Button
                      icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                      onClick={handlePlayPause}
                      disabled={!generatedMidi}
                    >
                      {isPlaying ? '暂停' : '播放'}
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={handleDownload}
                      disabled={!generatedMidi}
                    >
                      下载
                    </Button>
                  </Space>
                }
              >
                {/* 钢琴卷帘 */}
                <div className="piano-roll-wrapper">
                  {renderPianoRoll()}
                </div>

                {/* 音符编辑面板 */}
                {selectedNote !== null && generatedMidi && generatedMidi.notes[selectedNote] && (
                  <div className="note-editor-panel">
                    <Divider />
                    <Title level={5}>编辑音符 #{selectedNote + 1}</Title>
                    <Row gutter={[16, 16]}>
                      <Col xs={12} sm={6}>
                        <Text strong>音高</Text>
                        <Input.Number
                          value={generatedMidi.notes[selectedNote].pitch}
                          onChange={(v) => adjustSelectedNote('pitch', v)}
                          min={0}
                          max={127}
                          style={{ width: '100%', marginTop: 8 }}
                        />
                      </Col>
                      <Col xs={12} sm={6}>
                        <Text strong>开始时间</Text>
                        <Input.Number
                          value={generatedMidi.notes[selectedNote].start_time}
                          onChange={(v) => adjustSelectedNote('start_time', v)}
                          min={0}
                          step={0.1}
                          style={{ width: '100%', marginTop: 8 }}
                        />
                      </Col>
                      <Col xs={12} sm={6}>
                        <Text strong>持续时间</Text>
                        <Input.Number
                          value={generatedMidi.notes[selectedNote].duration}
                          onChange={(v) => adjustSelectedNote('duration', v)}
                          min={0.1}
                          step={0.1}
                          style={{ width: '100%', marginTop: 8 }}
                        />
                      </Col>
                      <Col xs={12} sm={6}>
                        <Text strong>力度</Text>
                        <Input.Number
                          value={generatedMidi.notes[selectedNote].velocity}
                          onChange={(v) => adjustSelectedNote('velocity', v)}
                          min={1}
                          max={127}
                          style={{ width: '100%', marginTop: 8 }}
                        />
                      </Col>
                    </Row>
                    <div style={{ marginTop: 16, textAlign: 'right' }}>
                      <Button icon={<SaveOutlined />} type="primary">
                        保存修改
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane
          tab={
            <span>
              <HistoryOutlined /> 历史记录
            </span>
          }
          key="history"
        >
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3, xl: 4 }}
            dataSource={historyList}
            loading={historyLoading}
            locale={{ emptyText: '暂无历史记录' }}
            renderItem={(item) => (
              <List.Item>
                <Card
                  hoverable
                  actions={[
                    <Button
                      type="link"
                      icon={<PlayCircleOutlined />}
                      onClick={() => {
                        message.info('播放历史音乐功能开发中')
                      }}
                    >
                      播放
                    </Button>,
                    <Button
                      type="link"
                      icon={<DownloadOutlined />}
                      onClick={() => {
                        message.info('下载历史音乐功能开发中')
                      }}
                    >
                      下载
                    </Button>,
                  ]}
                >
                  <Card.Meta
                    title={
                      <Space>
                        <Tag
                          color={
                            item.status === 'completed'
                              ? 'green'
                              : item.status === 'failed'
                              ? 'red'
                              : 'orange'
                          }
                        >
                          {item.status === 'completed'
                            ? '已完成'
                            : item.status === 'failed'
                            ? '失败'
                            : '处理中'}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text ellipsis={{ tooltip: item.prompt }}>
                          {item.prompt}
                        </Text>
                        <Space>
                          <Text type="secondary">民乐: {Math.round(item.folk_ratio * 100)}%</Text>
                          <Text type="secondary">现代: {Math.round(item.modernity * 100)}%</Text>
                        </Space>
                        <Text type="secondary">
                          {new Date(item.created_at).toLocaleString('zh-CN')}
                        </Text>
                      </Space>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        </TabPane>
      </Tabs>
    </div>
  )
}

export default MusicGenerationPage
