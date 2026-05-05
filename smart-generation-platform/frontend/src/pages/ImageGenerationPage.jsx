import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Row,
  Col,
  Card,
  Upload,
  Button,
  Select,
  Slider,
  Spin,
  message,
  Tabs,
  List,
  Image,
  Modal,
  Space,
  Typography,
  Divider,
  Tag,
} from 'antd'
import {
  UploadOutlined,
  ScanOutlined,
  MagicOutlined,
  DownloadOutlined,
  HistoryOutlined,
  ReloadOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { fabric } from 'fabric'
import { imageApi } from '../api'
import './ImageGenerationPage.css'

const { Title, Text } = Typography
const { Option } = Select
const { TabPane } = Tabs

const ImageGenerationPage = () => {
  const [loading, setLoading] = useState(false)
  const [detectingKeypoints, setDetectingKeypoints] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [pollingTask, setPollingTask] = useState(null)

  const [originalImage, setOriginalImage] = useState(null)
  const [originalFile, setOriginalFile] = useState(null)
  const [keypoints, setKeypoints] = useState([])
  const [selectedStyle, setSelectedStyle] = useState('hanfu')
  const [availableStyles, setAvailableStyles] = useState([])
  const [generatedImage, setGeneratedImage] = useState(null)
  const [currentTaskId, setCurrentTaskId] = useState(null)
  const [taskStatus, setTaskStatus] = useState(null)

  const [historyList, setHistoryList] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const [inpaintPrompt, setInpaintPrompt] = useState('')
  const [inpaintStrength, setInpaintStrength] = useState(0.75)
  const [showInpaintModal, setShowInpaintModal] = useState(false)

  const canvasRef = useRef(null)
  const fabricCanvasRef = useRef(null)
  const imageObjectRef = useRef(null)
  const keypointObjectsRef = useRef([])
  const lineObjectsRef = useRef([])

  // 初始化
  useEffect(() => {
    loadStyles()
    loadHistory()

    return () => {
      if (pollingTask) {
        clearInterval(pollingTask)
      }
    }
  }, [])

  // 初始化Fabric画布
  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
        width: 600,
        height: 500,
        backgroundColor: '#fafafa',
        selection: true,
      })
    }
  }, [])

  // 加载可用风格
  const loadStyles = async () => {
    try {
      const response = await imageApi.getStyles()
      if (response.data.success) {
        setAvailableStyles(response.data.styles)
      }
    } catch (error) {
      console.error('加载风格列表失败:', error)
    }
  }

  // 加载历史记录
  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const response = await imageApi.getHistory(1)
      if (response.data.success) {
        setHistoryList(response.data.data)
      }
    } catch (error) {
      console.error('加载历史记录失败:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  // 处理图片上传
  const handleUpload = useCallback((file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target.result
      setOriginalImage(dataUrl)
      setOriginalFile(file)
      setGeneratedImage(null)
      setKeypoints([])

      // 在画布上显示图片
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.clear()
        fabric.Image.fromURL(dataUrl, (img) => {
          const canvas = fabricCanvasRef.current
          const scale = Math.min(
            canvas.width / img.width,
            canvas.height / img.height
          )
          img.scale(scale)
          img.set({
            left: canvas.width / 2 - (img.width * scale) / 2,
            top: canvas.height / 2 - (img.height * scale) / 2,
            selectable: false,
          })
          canvas.add(img)
          canvas.renderAll()
          imageObjectRef.current = img
        })
      }
    }
    reader.readAsDataURL(file)
    return false
  }, [])

  // 检测关键点
  const handleDetectKeypoints = async () => {
    if (!originalFile) {
      message.warning('请先上传图片')
      return
    }

    setDetectingKeypoints(true)
    try {
      const response = await imageApi.detectKeypoints(originalFile)
      if (response.data.success) {
        const kps = response.data.keypoints
        setKeypoints(kps)
        drawKeypoints(kps)
        message.success('关键点检测完成')
      }
    } catch (error) {
      message.error('关键点检测失败')
      console.error(error)
    } finally {
      setDetectingKeypoints(false)
    }
  }

  // 绘制关键点
  const drawKeypoints = (kps) => {
    if (!fabricCanvasRef.current || !imageObjectRef.current) return

    const canvas = fabricCanvasRef.current
    const img = imageObjectRef.current
    
    // 清除旧的关键点
    keypointObjectsRef.current.forEach((kp) => canvas.remove(kp))
    lineObjectsRef.current.forEach((line) => canvas.remove(line))
    keypointObjectsRef.current = []
    lineObjectsRef.current = []

    const imgLeft = img.left
    const imgTop = img.top
    const imgWidth = img.width * img.scaleX
    const imgHeight = img.height * img.scaleY

    // 定义骨骼连接关系
    const skeletonConnections = [
      [0, 1], [0, 2], [1, 2],
      [3, 4], [3, 5], [4, 6],
      [5, 6],
    ]

    // 绘制骨架线
    skeletonConnections.forEach(([from, to]) => {
      const fromKp = kps.find((k) => k.id === from)
      const toKp = kps.find((k) => k.id === to)
      if (fromKp && toKp) {
        const x1 = imgLeft + fromKp.x * imgWidth
        const y1 = imgTop + fromKp.y * imgHeight
        const x2 = imgLeft + toKp.x * imgWidth
        const y2 = imgTop + toKp.y * imgHeight

        const line = new fabric.Line([x1, y1, x2, y2], {
          stroke: '#1890ff',
          strokeWidth: 3,
          strokeLineCap: 'round',
          strokeLineJoin: 'round',
          opacity: 0.8,
          selectable: false,
        })
        canvas.add(line)
        lineObjectsRef.current.push(line)
      }
    })

    // 绘制关键点
    kps.forEach((kp, index) => {
      const x = imgLeft + kp.x * imgWidth
      const y = imgTop + kp.y * imgHeight

      const circle = new fabric.Circle({
        left: x - 8,
        top: y - 8,
        radius: 8,
        fill: '#1890ff',
        stroke: '#fff',
        strokeWidth: 2,
        selectable: true,
        hasControls: false,
        hasBorders: true,
        borderColor: '#ff4d4f',
        name: `keypoint-${kp.id}`,
        originX: 'left',
        originY: 'top',
      })

      // 添加移动事件
      circle.on('moving', (e) => {
        const target = e.target
        const newX = (target.left + 8 - imgLeft) / imgWidth
        const newY = (target.top + 8 - imgTop) / imgHeight
        
        setKeypoints((prev) =>
          prev.map((k) =>
            k.id === kp.id ? { ...k, x: newX, y: newY } : k
          )
        )
      })

      canvas.add(circle)
      keypointObjectsRef.current.push(circle)
    })

    canvas.renderAll()
  }

  // 开始风格迁移
  const handleGenerate = async () => {
    if (!originalFile) {
      message.warning('请先上传图片')
      return
    }
    if (keypoints.length === 0) {
      message.warning('请先检测关键点')
      return
    }

    setGenerating(true)
    try {
      const response = await imageApi.generateStyleTransfer(
        originalFile,
        selectedStyle,
        keypoints,
        1
      )

      if (response.data.success) {
        const taskId = response.data.task_id
        setCurrentTaskId(taskId)
        setTaskStatus('processing')
        message.info('风格迁移任务已提交，正在处理中...')

        // 开始轮询任务状态
        const interval = setInterval(async () => {
          try {
            const statusResponse = await imageApi.getTaskStatus(taskId)
            if (statusResponse.data.success) {
              const status = statusResponse.data.status
              setTaskStatus(status)

              if (status === 'completed') {
                clearInterval(interval)
                setPollingTask(null)
                
                // 设置生成的图片
                if (statusResponse.data.generated_image) {
                  setGeneratedImage(statusResponse.data.generated_image)
                }
                setGenerating(false)
                message.success('风格迁移完成！')
                loadHistory()
              } else if (status === 'failed') {
                clearInterval(interval)
                setPollingTask(null)
                setGenerating(false)
                message.error('风格迁移失败')
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
      setGenerating(false)
    }
  }

  // 下载生成的图片
  const handleDownload = () => {
    if (!generatedImage) return

    const link = document.createElement('a')
    link.href = generatedImage
    link.download = `style-transfer-${Date.now()}.png`
    link.click()
    message.success('开始下载')
  }

  // 重新生成
  const handleRegenerate = () => {
    setGeneratedImage(null)
    setCurrentTaskId(null)
    setTaskStatus(null)
  }

  // 局部重绘
  const handleInpaint = () => {
    if (!generatedImage) {
      message.warning('请先生成图片')
      return
    }
    setShowInpaintModal(true)
  }

  return (
    <div className="page-container">
      <Title level={2} className="page-title">
        <MagicOutlined style={{ marginRight: 12 }} />
        智能图像风格迁移
      </Title>

      <Tabs defaultActiveKey="generate" size="large">
        <TabPane
          tab={
            <span>
              <MagicOutlined /> 风格迁移
            </span>
          }
          key="generate"
        >
          <Row gutter={[24, 24]}>
            {/* 左侧：画布区域 */}
            <Col xs={24} lg={16}>
              <Card
                title={
                  <Space>
                    <ScanOutlined />
                    <span>图像编辑画布</span>
                    {keypoints.length > 0 && (
                      <Tag color="blue">已检测 {keypoints.length} 个关键点</Tag>
                    )}
                  </Space>
                }
                extra={
                  <Space>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => {
                        setOriginalImage(null)
                        setOriginalFile(null)
                        setGeneratedImage(null)
                        setKeypoints([])
                        if (fabricCanvasRef.current) {
                          fabricCanvasRef.current.clear()
                        }
                      }}
                    >
                      重置
                    </Button>
                  </Space>
                }
              >
                <div className="canvas-wrapper">
                  {!originalImage ? (
                    <Upload.Dragger
                      accept="image/*"
                      beforeUpload={handleUpload}
                      showUploadList={false}
                      className="upload-dragger"
                    >
                      <p className="ant-upload-drag-icon">
                        <UploadOutlined />
                      </p>
                      <p className="ant-upload-text">
                        点击或拖拽图片到此处上传
                      </p>
                      <p className="ant-upload-hint">
                        支持 JPG、PNG 格式，建议上传清晰的人物照片
                      </p>
                    </Upload.Dragger>
                  ) : (
                    <div className="canvas-container-wrapper">
                      <canvas
                        ref={canvasRef}
                        className="fabric-canvas"
                      />
                    </div>
                  )}
                </div>
              </Card>
            </Col>

            {/* 右侧：控制面板 */}
            <Col xs={24} lg={8}>
              <Card
                title={
                  <Space>
                    <MagicOutlined />
                    <span>控制面板</span>
                  </Space>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  {/* 步骤1：关键点检测 */}
                  <div>
                    <Text strong>步骤1：检测关键点</Text>
                    <Divider style={{ margin: '12px 0' }} />
                    <Button
                      type="primary"
                      icon={<ScanOutlined />}
                      onClick={handleDetectKeypoints}
                      loading={detectingKeypoints}
                      disabled={!originalImage}
                      block
                      size="large"
                    >
                      检测人体关键点
                    </Button>
                    <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                      检测完成后可手动调整关键点位置
                    </Text>
                  </div>

                  {/* 步骤2：选择风格 */}
                  <div>
                    <Text strong>步骤2：选择服饰风格</Text>
                    <Divider style={{ margin: '12px 0' }} />
                    <Select
                      value={selectedStyle}
                      onChange={setSelectedStyle}
                      size="large"
                      style={{ width: '100%' }}
                      optionLabelProp="label"
                    >
                      {availableStyles.map((style) => (
                        <Option key={style.id} value={style.id} label={style.name}>
                          <div>
                            <Text strong>{style.name}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {style.description}
                            </Text>
                          </div>
                        </Option>
                      ))}
                    </Select>
                  </div>

                  {/* 步骤3：生成 */}
                  <div>
                    <Text strong>步骤3：开始生成</Text>
                    <Divider style={{ margin: '12px 0' }} />
                    <Button
                      type="primary"
                      icon={<MagicOutlined />}
                      onClick={handleGenerate}
                      loading={generating}
                      disabled={!originalImage || keypoints.length === 0}
                      block
                      size="large"
                      danger
                    >
                      {generating ? '生成中...' : '开始风格迁移'}
                    </Button>
                    {taskStatus === 'processing' && (
                      <div style={{ marginTop: 12, textAlign: 'center' }}>
                        <Spin size="small" />
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          正在使用ControlNet进行风格迁移...
                        </Text>
                      </div>
                    )}
                  </div>
                </Space>
              </Card>

              {/* 生成结果 */}
              {generatedImage && (
                <Card
                  title={
                    <Space>
                      <DownloadOutlined />
                      <span>生成结果</span>
                    </Space>
                  }
                  style={{ marginTop: 24 }}
                  extra={
                    <Space>
                      <Button icon={<EditOutlined />} onClick={handleInpaint}>
                        局部重绘
                      </Button>
                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={handleDownload}
                      >
                        下载PNG
                      </Button>
                    </Space>
                  }
                >
                  <Image
                    src={generatedImage}
                    alt="生成结果"
                    style={{ width: '100%', borderRadius: 8 }}
                  />
                </Card>
              )}
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
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 4 }}
            dataSource={historyList}
            loading={historyLoading}
            locale={{ emptyText: '暂无历史记录' }}
            renderItem={(item) => (
              <List.Item>
                <Card
                  hoverable
                  cover={
                    item.generated_image ? (
                      <Image
                        src={item.generated_image}
                        alt={item.style_type}
                        style={{ height: 200, objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          height: 200,
                          backgroundColor: '#f5f5f5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text type="secondary">无预览图</Text>
                      </div>
                    )
                  }
                  actions={[
                    item.generated_image && (
                      <Button
                        type="link"
                        icon={<DownloadOutlined />}
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = item.generated_image
                          link.download = `history-${item.id}.png`
                          link.click()
                        }}
                      >
                        下载
                      </Button>
                    ),
                  ].filter(Boolean)}
                >
                  <Card.Meta
                    title={
                      <Space>
                        <Tag color="blue">{item.style_type}</Tag>
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
                    description={new Date(item.created_at).toLocaleString('zh-CN')}
                  />
                </Card>
              </List.Item>
            )}
          />
        </TabPane>
      </Tabs>

      {/* 局部重绘模态框 */}
      <Modal
        title="局部重绘"
        open={showInpaintModal}
        onCancel={() => setShowInpaintModal(false)}
        onOk={() => {
          message.info('局部重绘功能开发中')
          setShowInpaintModal(false)
        }}
        okText="开始重绘"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>重绘提示词</Text>
            <Text type="secondary" style={{ marginLeft: 8 }}>
              描述想要重绘的内容（如：精美的刺绣纹样）
            </Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={inpaintPrompt}
              onChange={setInpaintPrompt}
              placeholder="选择或输入重绘描述"
              allowClear
            >
              <Option value="精美刺绣纹样">精美刺绣纹样</Option>
              <Option value="传统盘扣设计">传统盘扣设计</Option>
              <Option value="祥云纹饰">祥云纹饰</Option>
              <Option value="龙凤图案">龙凤图案</Option>
            </Select>
          </div>
          <div>
            <Text strong>重绘强度</Text>
            <Text type="secondary" style={{ marginLeft: 8 }}>
              {inpaintStrength.toFixed(2)} - 越高变化越大
            </Text>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={inpaintStrength}
              onChange={setInpaintStrength}
              style={{ marginTop: 8 }}
            />
          </div>
        </Space>
      </Modal>
    </div>
  )
}

export default ImageGenerationPage
