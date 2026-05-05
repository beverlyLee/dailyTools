import React, { useState, useCallback } from 'react'
import { Modal, Button, Space, Typography, Steps, Empty } from 'antd'
import {
  LeftOutlined,
  RightOutlined,
  StepForwardOutlined,
  StepBackwardOutlined,
  PauseOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'
import { Story } from '../types'
import SlidePreview from './SlidePreview'

const { Title, Text } = Typography

interface StoryPlayerProps {
  story: Story
  visible: boolean
  onClose: () => void
}

const StoryPlayer: React.FC<StoryPlayerProps> = ({ story, visible, onClose }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [slideStates, setSlideStates] = useState<Record<string, Record<string, string | number>>>({})

  const currentSlide = story.slides[currentSlideIndex]

  const handleNext = useCallback(() => {
    if (currentSlideIndex < story.slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1)
    }
  }, [currentSlideIndex, story.slides.length])

  const handlePrev = useCallback(() => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1)
    }
  }, [currentSlideIndex])

  const handleParameterChange = useCallback(
    (parameterId: string, value: string | number) => {
      if (!currentSlide) return
      setSlideStates((prev) => ({
        ...prev,
        [currentSlide.id]: {
          ...prev[currentSlide.id],
          [parameterId]: value,
        },
      }))
    },
    [currentSlide]
  )

  React.useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying) {
      timer = setInterval(() => {
        if (currentSlideIndex < story.slides.length - 1) {
          setCurrentSlideIndex((prev) => prev + 1)
        } else {
          setIsPlaying(false)
        }
      }, 5000)
    }
    return () => clearInterval(timer)
  }, [isPlaying, currentSlideIndex, story.slides.length])

  React.useEffect(() => {
    if (visible) {
      setCurrentSlideIndex(0)
      setSlideStates({})
    }
  }, [visible])

  if (!visible) return null

  return (
    <Modal
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            {story.title}
          </Title>
          <Text type="secondary">
            幻灯片 {currentSlideIndex + 1} / {story.slides.length}
          </Text>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
      style={{ top: 20 }}
    >
      {story.slides.length === 0 ? (
        <Empty description="暂无幻灯片" />
      ) : (
        <>
          <Steps
            current={currentSlideIndex}
            items={story.slides.map((slide) => ({
              title: slide.title,
            }))}
            onChange={(index) => setCurrentSlideIndex(index)}
            style={{ marginBottom: 24 }}
          />

          {currentSlide && (
            <SlidePreview
              slide={currentSlide}
              onParameterChange={handleParameterChange}
            />
          )}

          <div style={{ textAlign: 'center', marginTop: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
            <Space size="large">
              <Button
                icon={<StepBackwardOutlined />}
                onClick={() => setCurrentSlideIndex(0)}
                disabled={currentSlideIndex === 0}
              >
                开始
              </Button>
              <Button
                icon={<LeftOutlined />}
                onClick={handlePrev}
                disabled={currentSlideIndex === 0}
              >
                上一张
              </Button>
              <Button
                type="primary"
                size="large"
                icon={isPlaying ? <PauseOutlined /> : <PlayCircleOutlined />}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? '暂停' : '自动播放'}
              </Button>
              <Button
                icon={<RightOutlined />}
                onClick={handleNext}
                disabled={currentSlideIndex === story.slides.length - 1}
              >
                下一张
              </Button>
              <Button
                icon={<StepForwardOutlined />}
                onClick={() => setCurrentSlideIndex(story.slides.length - 1)}
                disabled={currentSlideIndex === story.slides.length - 1}
              >
                结束
              </Button>
            </Space>
          </div>
        </>
      )}
    </Modal>
  )
}

export default StoryPlayer
