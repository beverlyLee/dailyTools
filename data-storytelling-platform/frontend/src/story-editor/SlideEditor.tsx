import React, { useState, useCallback } from 'react'
import {
  Card,
  Button,
  List,
  Modal,
  Form,
  Input,
  message,
  Space,
  Typography,
  Tabs,
  Empty,
  Select,
  Slider,
  InputNumber,
  Divider,
  Row,
  Col,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  PictureOutlined,
  BarChartOutlined,
  SettingOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons'
import { v4 as uuidv4 } from 'uuid'
import { Story, Slide, SlideElement, Parameter } from '../types'
import { storyApi } from '../services/api'
import SlidePreview from './SlidePreview'
import ParameterControls from './ParameterControls'

const { Title, Text } = Typography
const { TabPane } = Tabs

interface SlideEditorProps {
  story: Story
  onStoryUpdate: (story: Story) => void
  onPlay: () => void
}

const SlideEditor: React.FC<SlideEditorProps> = ({ story, onStoryUpdate, onPlay }) => {
  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number>(0)
  const [isAddElementModalVisible, setIsAddElementModalVisible] = useState(false)
  const [isAddParameterModalVisible, setIsAddParameterModalVisible] = useState(false)
  const [elementForm] = Form.useForm()
  const [parameterForm] = Form.useForm()

  const selectedSlide = story.slides[selectedSlideIndex]

  const handleAddSlide = async () => {
    const newSlide: Slide = {
      id: uuidv4(),
      title: `幻灯片 ${story.slides.length + 1}`,
      elements: [],
      parameters: [],
    }

    try {
      const response = await storyApi.addSlide(story.id, newSlide)
      message.success('幻灯片添加成功')
      const updatedStory = { ...story, slides: [...story.slides, response.data] }
      onStoryUpdate(updatedStory)
      setSelectedSlideIndex(updatedStory.slides.length - 1)
    } catch (error) {
      console.error('添加幻灯片失败:', error)
      message.error('添加幻灯片失败')
    }
  }

  const handleDeleteSlide = async (slideIndex: number) => {
    const slide = story.slides[slideIndex]
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这张幻灯片吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await storyApi.deleteSlide(story.id, slide.id)
          message.success('幻灯片删除成功')
          const newSlides = story.slides.filter((_, i) => i !== slideIndex)
          const updatedStory = { ...story, slides: newSlides }
          onStoryUpdate(updatedStory)
          if (selectedSlideIndex >= newSlides.length && newSlides.length > 0) {
            setSelectedSlideIndex(newSlides.length - 1)
          }
        } catch (error) {
          console.error('删除幻灯片失败:', error)
          message.error('删除幻灯片失败')
        }
      },
    })
  }

  const handleUpdateSlide = async (updatedSlide: Slide) => {
    try {
      const response = await storyApi.updateSlide(story.id, updatedSlide.id, updatedSlide)
      const newSlides = story.slides.map((s) =>
        s.id === updatedSlide.id ? response.data : s
      )
      const updatedStory = { ...story, slides: newSlides }
      onStoryUpdate(updatedStory)
    } catch (error) {
      console.error('更新幻灯片失败:', error)
      message.error('更新幻灯片失败')
    }
  }

  const handleAddElement = (values: { type: string; content: string }) => {
    if (!selectedSlide) return

    const newElement: SlideElement = {
      id: uuidv4(),
      type: values.type as 'text' | 'image' | 'chart',
      content: values.content,
      style: {},
    }

    const updatedSlide = {
      ...selectedSlide,
      elements: [...selectedSlide.elements, newElement],
    }

    handleUpdateSlide(updatedSlide)
    setIsAddElementModalVisible(false)
    elementForm.resetFields()
    message.success('元素添加成功')
  }

  const handleDeleteElement = (elementId: string) => {
    if (!selectedSlide) return

    const updatedSlide = {
      ...selectedSlide,
      elements: selectedSlide.elements.filter((e) => e.id !== elementId),
    }

    handleUpdateSlide(updatedSlide)
    message.success('元素删除成功')
  }

  const handleAddParameter = (values: {
    name: string
    type: string
    label: string
    value: string | number
    min?: number
    max?: number
    step?: number
    options?: string
  }) => {
    if (!selectedSlide) return

    let options: { label: string; value: string }[] | undefined = undefined
    if (values.type === 'dropdown' && values.options) {
      options = values.options.split(',').map((opt) => {
        const trimmed = opt.trim()
        return { label: trimmed, value: trimmed }
      })
    }

    const newParameter: Parameter = {
      id: uuidv4(),
      name: values.name,
      type: values.type as 'slider' | 'dropdown',
      label: values.label,
      value: values.type === 'slider' ? Number(values.value) : values.value,
      min: values.type === 'slider' ? values.min : undefined,
      max: values.type === 'slider' ? values.max : undefined,
      step: values.type === 'slider' ? values.step : undefined,
      options,
    }

    const updatedSlide = {
      ...selectedSlide,
      parameters: [...selectedSlide.parameters, newParameter],
    }

    handleUpdateSlide(updatedSlide)
    setIsAddParameterModalVisible(false)
    parameterForm.resetFields()
    message.success('参数添加成功')
  }

  const handleDeleteParameter = (parameterId: string) => {
    if (!selectedSlide) return

    const updatedSlide = {
      ...selectedSlide,
      parameters: selectedSlide.parameters.filter((p) => p.id !== parameterId),
    }

    handleUpdateSlide(updatedSlide)
    message.success('参数删除成功')
  }

  const handleMoveSlide = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
    if (toIndex < 0 || toIndex >= story.slides.length) return

    const newSlides = [...story.slides]
    ;[newSlides[fromIndex], newSlides[toIndex]] = [newSlides[toIndex], newSlides[fromIndex]]
    
    const updatedStory = { ...story, slides: newSlides }
    onStoryUpdate(updatedStory)
    setSelectedSlideIndex(toIndex)
  }

  const handleParameterChange = (parameterId: string, value: string | number) => {
    if (!selectedSlide) return

    const updatedSlide = {
      ...selectedSlide,
      parameters: selectedSlide.parameters.map((p) =>
        p.id === parameterId ? { ...p, value } : p
      ),
    }

    handleUpdateSlide(updatedSlide)
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ width: 200, paddingRight: 16, borderRight: '1px solid #f0f0f0' }}>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Text strong>幻灯片列表</Text>
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddSlide}>
            添加
          </Button>
        </Space>

        {story.slides.length === 0 ? (
          <Empty description="暂无幻灯片" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={story.slides}
            renderItem={(slide, index) => (
              <List.Item
                style={{
                  cursor: 'pointer',
                  background: selectedSlideIndex === index ? '#e6f7ff' : 'transparent',
                  padding: '8px 12px',
                  marginBottom: 8,
                  borderRadius: 6,
                }}
                onClick={() => setSelectedSlideIndex(index)}
                actions={[
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowUpOutlined />}
                    disabled={index === 0}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMoveSlide(index, 'up')
                    }}
                  />,
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowDownOutlined />}
                    disabled={index === story.slides.length - 1}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMoveSlide(index, 'down')
                    }}
                  />,
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteSlide(index)
                    }}
                  />,
                ]}
              >
                <List.Item.Meta title={slide.title} description={`${slide.elements.length} 个元素`} />
              </List.Item>
            )}
          />
        )}
      </div>

      <div style={{ flex: 1, paddingLeft: 16 }}>
        {selectedSlide ? (
          <Card
            title={
              <Space>
                <Input
                  value={selectedSlide.title}
                  onChange={(e) => {
                    const updatedSlide = { ...selectedSlide, title: e.target.value }
                    handleUpdateSlide(updatedSlide)
                  }}
                  style={{ width: 300 }}
                />
                <Button type="primary" icon={<PlayCircleOutlined />} onClick={onPlay}>
                  预览故事
                </Button>
              </Space>
            }
            size="small"
          >
            <Tabs defaultActiveKey="elements">
              <TabPane
                tab={
                  <span>
                    <FileTextOutlined />
                    幻灯片元素
                  </span>
                }
                key="elements"
              >
                <Space style={{ marginBottom: 16 }}>
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => setIsAddElementModalVisible(true)}
                  >
                    添加元素
                  </Button>
                </Space>

                {selectedSlide.elements.length === 0 ? (
                  <Empty description="暂无元素，请添加元素" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <List
                    grid={{ gutter: 16, column: 1 }}
                    dataSource={selectedSlide.elements}
                    renderItem={(element) => (
                      <List.Item>
                        <Card
                          size="small"
                          title={
                            <Space>
                              {element.type === 'text' && <FileTextOutlined />}
                              {element.type === 'image' && <PictureOutlined />}
                              {element.type === 'chart' && <BarChartOutlined />}
                              {element.type === 'text' && '文本'}
                              {element.type === 'image' && '图片'}
                              {element.type === 'chart' && '图表'}
                            </Space>
                          }
                          extra={
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleDeleteElement(element.id)}
                            />
                          }
                        >
                          <Text type="secondary">
                            {element.type === 'text' && element.content.substring(0, 100) + (element.content.length > 100 ? '...' : '')}
                            {element.type === 'image' && element.content}
                            {element.type === 'chart' && `图表数据源: ${element.dataSource || '默认'}`}
                          </Text>
                        </Card>
                      </List.Item>
                    )}
                  />
                )}
              </TabPane>

              <TabPane
                tab={
                  <span>
                    <SettingOutlined />
                    参数控件
                  </span>
                }
                key="parameters"
              >
                <Space style={{ marginBottom: 16 }}>
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => setIsAddParameterModalVisible(true)}
                  >
                    添加参数
                  </Button>
                </Space>

                {selectedSlide.parameters.length === 0 ? (
                  <Empty description="暂无参数，请添加参数控件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <List
                    grid={{ gutter: 16, column: 2 }}
                    dataSource={selectedSlide.parameters}
                    renderItem={(parameter) => (
                      <List.Item>
                        <Card
                          size="small"
                          title={
                            <Space>
                              <SettingOutlined />
                              {parameter.label}
                              <Text type="secondary">({parameter.type === 'slider' ? '滑块' : '下拉框'})</Text>
                            </Space>
                          }
                          extra={
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleDeleteParameter(parameter.id)}
                            />
                          }
                        >
                          <ParameterControls
                            parameters={[parameter]}
                            onChange={handleParameterChange}
                          />
                        </Card>
                      </List.Item>
                    )}
                  />
                )}
              </TabPane>

              <TabPane
                tab={
                  <span>
                    <PlayCircleOutlined />
                    预览
                  </span>
                }
                key="preview"
              >
                <SlidePreview
                  slide={selectedSlide}
                  onParameterChange={handleParameterChange}
                />
              </TabPane>
            </Tabs>
          </Card>
        ) : (
          <Empty description="请先添加幻灯片" />
        )}
      </div>

      <Modal
        title="添加元素"
        open={isAddElementModalVisible}
        onCancel={() => setIsAddElementModalVisible(false)}
        footer={null}
      >
        <Form
          form={elementForm}
          layout="vertical"
          onFinish={handleAddElement}
        >
          <Form.Item
            name="type"
            label="元素类型"
            rules={[{ required: true, message: '请选择元素类型' }]}
          >
            <Select placeholder="请选择元素类型">
              <Select.Option value="text">文本</Select.Option>
              <Select.Option value="image">图片</Select.Option>
              <Select.Option value="chart">图表</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入内容" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsAddElementModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                添加
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加参数控件"
        open={isAddParameterModalVisible}
        onCancel={() => setIsAddParameterModalVisible(false)}
        footer={null}
      >
        <Form
          form={parameterForm}
          layout="vertical"
          onFinish={handleAddParameter}
        >
          <Form.Item
            name="name"
            label="参数名称"
            rules={[{ required: true, message: '请输入参数名称' }]}
          >
            <Input placeholder="请输入参数名称（如：year, threshold）" />
          </Form.Item>
          <Form.Item
            name="label"
            label="显示标签"
            rules={[{ required: true, message: '请输入显示标签' }]}
          >
            <Input placeholder="请输入显示标签（如：年份，销售额阈值）" />
          </Form.Item>
          <Form.Item
            name="type"
            label="控件类型"
            rules={[{ required: true, message: '请选择控件类型' }]}
          >
            <Select placeholder="请选择控件类型">
              <Select.Option value="slider">滑块</Select.Option>
              <Select.Option value="dropdown">下拉框</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
          >
            {({ getFieldValue }) => {
              const type = getFieldValue('type')
              if (type === 'slider') {
                return (
                  <>
                    <Form.Item
                      name="min"
                      label="最小值"
                      rules={[{ required: true, message: '请输入最小值' }]}
                    >
                      <InputNumber style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                      name="max"
                      label="最大值"
                      rules={[{ required: true, message: '请输入最大值' }]}
                    >
                      <InputNumber style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                      name="step"
                      label="步长"
                      rules={[{ required: true, message: '请输入步长' }]}
                    >
                      <InputNumber style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                      name="value"
                      label="默认值"
                      rules={[{ required: true, message: '请输入默认值' }]}
                    >
                      <InputNumber style={{ width: '100%' }} />
                    </Form.Item>
                  </>
                )
              }
              if (type === 'dropdown') {
                return (
                  <>
                    <Form.Item
                      name="options"
                      label="选项（用逗号分隔）"
                      rules={[{ required: true, message: '请输入选项' }]}
                    >
                      <Input placeholder="例如：选项1, 选项2, 选项3" />
                    </Form.Item>
                    <Form.Item
                      name="value"
                      label="默认值"
                      rules={[{ required: true, message: '请输入默认值' }]}
                    >
                      <Input placeholder="请输入默认值" />
                    </Form.Item>
                  </>
                )
              }
              return null
            }}
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsAddParameterModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                添加
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default SlideEditor
