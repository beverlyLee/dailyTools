import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Upload, Button, message, Spin, Empty } from 'antd'
import { UploadOutlined, UserOutlined, PictureOutlined, ScanOutlined } from '@ant-design/icons'
import { api } from '../api/index'
import '../App.css'

function HomeView() {
  const [stats, setStats] = useState({ photos: 0, celebrities: 0, detections: 0 })
  const [recentPhotos, setRecentPhotos] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)

  useEffect(() => {
    loadStats()
    loadRecentPhotos()
  }, [])

  const loadStats = async () => {
    try {
      const response = await api.getStats()
      setStats(response.data)
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  }

  const loadRecentPhotos = async () => {
    setLoading(true)
    try {
      const response = await api.getPhotos({ limit: 6 })
      setRecentPhotos(response.data.photos || [])
    } catch (error) {
      console.error('加载最近照片失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (options) => {
    const { file, onSuccess, onError } = options
    setUploadLoading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await api.uploadPhoto(formData)
      message.success('照片上传成功，正在进行人脸识别...')
      onSuccess(response.data)
      
      setTimeout(() => {
        loadStats()
        loadRecentPhotos()
      }, 1000)
    } catch (error) {
      message.error('照片上传失败: ' + (error.response?.data?.detail || error.message))
      onError(error)
    } finally {
      setUploadLoading(false)
    }
  }

  const uploadProps = {
    name: 'file',
    multiple: true,
    accept: 'image/*',
    customRequest: handleUpload,
    showUploadList: false
  }

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '28px', fontWeight: 'bold' }}>
        欢迎使用名人脸识别相册
      </h1>

      <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
        <Col xs={24} sm={8}>
          <div className="stats-card">
            <div className="stats-number">{stats.photos}</div>
            <div className="stats-label">
              <PictureOutlined style={{ marginRight: '4px' }} />
              照片总数
            </div>
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className="stats-card">
            <div className="stats-number">{stats.celebrities}</div>
            <div className="stats-label">
              <UserOutlined style={{ marginRight: '4px' }} />
              识别名人
            </div>
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className="stats-card">
            <div className="stats-number">{stats.detections}</div>
            <div className="stats-label">
              <ScanOutlined style={{ marginRight: '4px' }} />
              人脸检测
            </div>
          </div>
        </Col>
      </Row>

      <Card title="上传照片" style={{ marginBottom: '32px' }}>
        <Upload {...uploadProps}>
          <div className="upload-area">
            <Spin spinning={uploadLoading}>
              <Button type="primary" icon={<UploadOutlined />} size="large">
                点击上传照片
              </Button>
              <p style={{ marginTop: '16px', color: '#666' }}>
                支持 JPG、PNG 格式，系统将自动识别照片中的名人
              </p>
            </Spin>
          </div>
        </Upload>
      </Card>

      <Card title="最近上传的照片">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : recentPhotos.length > 0 ? (
          <div className="photo-grid">
            {recentPhotos.map((photo) => (
              <div key={photo.id} className="photo-card">
                <img 
                  src={`/api/photos/${photo.id}/image`} 
                  alt={photo.filename}
                />
                <div className="photo-tags">
                  {photo.faces && photo.faces.length > 0 ? (
                    photo.faces.map((face, idx) => (
                      <span key={idx} style={{ marginRight: '8px' }}>
                        {face.celebrity_name || '未知'}
                      </span>
                    ))
                  ) : (
                    '未识别到人脸'
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty description="暂无照片，请先上传" />
        )}
      </Card>
    </div>
  )
}

export default HomeView
