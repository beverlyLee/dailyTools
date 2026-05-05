import React, { useState, useEffect, useCallback } from 'react'
import {
  Layout,
  Card,
  Button,
  List,
  Modal,
  Form,
  Input,
  message,
  Space,
  Typography,
  Empty,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { storyApi } from '../services/api'
import { Story, StoryCreate } from '../types'
import StoryPlayer from './StoryPlayer'
import SlideEditor from './SlideEditor'

const { Header, Content, Sider } = Layout
const { Title, Paragraph } = Typography

const StoryEditor: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([])
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false)
  const [isPlayerVisible, setIsPlayerVisible] = useState(false)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const loadStories = useCallback(async () => {
    try {
      setLoading(true)
      const response = await storyApi.getStories()
      setStories(response.data)
    } catch (error) {
      console.error('加载故事列表失败:', error)
      message.error('加载故事列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStories()
  }, [loadStories])

  const handleCreateStory = async (values: StoryCreate) => {
    try {
      const response = await storyApi.createStory(values)
      message.success('故事创建成功')
      setIsCreateModalVisible(false)
      form.resetFields()
      loadStories()
      setSelectedStory(response.data)
    } catch (error) {
      console.error('创建故事失败:', error)
      message.error('创建故事失败')
    }
  }

  const handleDeleteStory = async (storyId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个故事吗？此操作不可恢复。',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await storyApi.deleteStory(storyId)
          message.success('故事删除成功')
          if (selectedStory?.id === storyId) {
            setSelectedStory(null)
          }
          loadStories()
        } catch (error) {
          console.error('删除故事失败:', error)
          message.error('删除故事失败')
        }
      },
    })
  }

  const handleCreateSampleData = async () => {
    try {
      await storyApi.createSampleData()
      message.success('示例数据创建成功')
      loadStories()
    } catch (error) {
      console.error('创建示例数据失败:', error)
      message.error('创建示例数据失败')
    }
  }

  const handleStoryUpdate = (updatedStory: Story) => {
    setSelectedStory(updatedStory)
    loadStories()
  }

  return (
    <Layout style={{ minHeight: '80vh', background: '#f0f2f5' }}>
      <Sider width={300} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: 16 }}>
          <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
            <Title level={4} style={{ margin: 0 }}>
              <FileTextOutlined style={{ marginRight: 8 }} />
              数据故事
            </Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalVisible(true)}>
              新建
            </Button>
          </Space>
          
          <Button 
            type="dashed" 
            block 
            style={{ marginBottom: 16 }}
            onClick={handleCreateSampleData}
          >
            创建示例数据
          </Button>

          <List
            loading={loading}
            dataSource={stories}
            locale={{ emptyText: <Empty description="暂无故事，请创建新故事" /> }}
            renderItem={(story) => (
              <List.Item
                style={{
                  cursor: 'pointer',
                  background: selectedStory?.id === story.id ? '#e6f7ff' : 'transparent',
                  padding: '8px 12px',
                  marginBottom: 8,
                  borderRadius: 6,
                }}
                onClick={() => setSelectedStory(story)}
                actions={[
                  <Button 
                    type="text" 
                    icon={<PlayCircleOutlined />} 
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedStory(story)
                      setIsPlayerVisible(true)
                    }}
                  >
                    预览
                  </Button>,
                  <Button 
                    type="text" 
                    danger 
                    icon={<DeleteOutlined />} 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteStory(story.id)
                    }}
                  >
                    删除
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={story.title}
                  description={
                    <span style={{ color: '#999' }}>
                      {story.slides.length} 张幻灯片 | 
                      更新于 {new Date(story.updatedAt).toLocaleDateString()}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      </Sider>

      <Layout>
        <Content style={{ padding: 24 }}>
          {selectedStory ? (
            <SlideEditor 
              story={selectedStory} 
              onStoryUpdate={handleStoryUpdate}
              onPlay={() => setIsPlayerVisible(true)}
            />
          ) : (
            <Card style={{ textAlign: 'center', padding: 48 }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span>
                    请从左侧选择一个故事进行编辑，或创建新故事
                  </span>
                }
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalVisible(true)}>
                  创建新故事
                </Button>
              </Empty>
            </Card>
          )}
        </Content>
      </Layout>

      <Modal
        title="创建新故事"
        open={isCreateModalVisible}
        onCancel={() => setIsCreateModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateStory}
        >
          <Form.Item
            name="title"
            label="故事标题"
            rules={[{ required: true, message: '请输入故事标题' }]}
          >
            <Input placeholder="请输入故事标题" />
          </Form.Item>
          <Form.Item
            name="description"
            label="故事描述"
          >
            <Input.TextArea rows={4} placeholder="请输入故事描述" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsCreateModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {selectedStory && (
        <StoryPlayer
          story={selectedStory}
          visible={isPlayerVisible}
          onClose={() => setIsPlayerVisible(false)}
        />
      )}
    </Layout>
  )
}

export default StoryEditor
