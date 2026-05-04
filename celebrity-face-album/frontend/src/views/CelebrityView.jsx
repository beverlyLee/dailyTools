import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Row, Col, Spin, Empty, Button, Image, Modal, Tag, message } from 'antd'
import { ArrowLeftOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons'
import { api } from '../api/index'
import '../App.css'

function CelebrityView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [celebrity, setCelebrity] = useState(null)
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(false)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [previewPhoto, setPreviewPhoto] = useState(null)

  useEffect(() => {
    if (id) {
      loadCelebrityData()
    }
  }, [id])

  const loadCelebrityData = async () => {
    setLoading(true)
    try {
      const [celebrityResponse, photosResponse] = await Promise.all([
        api.getCelebrity(id),
        api.getPhotos({ celebrity_id: id })
      ])
      setCelebrity(celebrityResponse.data)
      setPhotos(photosResponse.data.photos || [])
    } catch (error) {
      console.error('加载名人数据失败:', error)
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoPreview = (photo) => {
    setPreviewPhoto(photo)
    setPreviewImage(`/api/photos/${photo.id}/image`)
    setPreviewVisible(true)
  }

  const handleDeletePhoto = async (photoId) => {
    try {
      await api.deletePhoto(photoId)
      message.success('照片删除成功')
      loadCelebrityData()
    } catch (error) {
      message.error('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!celebrity) {
    return (
      <div>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/album')}
          style={{ marginBottom: '24px' }}
        >
          返回相册
        </Button>
        <Empty description="未找到该名人信息" />
      </div>
    )
  }

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/album')}
        style={{ marginBottom: '24px' }}
      >
        返回相册
      </Button>

      <Card>
        <Row gutter={[32, 32]}>
          <Col xs={24} md={8}>
            <div style={{ textAlign: 'center' }}>
              <img
                src={celebrity.avatar_url || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=portrait%20of%20a%20celebrity%20placeholder%20image&image_size=square'}
                alt={celebrity.name}
                style={{
                  width: '200px',
                  height: '200px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                onError={(e) => {
                  e.target.src = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=portrait%20of%20a%20celebrity%20placeholder%20image&image_size=square'
                }}
              />
            </div>
          </Col>
          <Col xs={24} md={16}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px' }}>
              {celebrity.name}
            </h1>
            <div style={{ marginBottom: '16px' }}>
              <Tag color="blue" style={{ fontSize: '16px', padding: '8px 16px' }}>
                {photos.length} 张照片
              </Tag>
              {celebrity.created_at && (
                <Tag color="green" style={{ fontSize: '16px', padding: '8px 16px', marginLeft: '12px' }}>
                  添加于: {new Date(celebrity.created_at).toLocaleDateString()}
                </Tag>
              )}
            </div>
            {celebrity.description && (
              <p style={{ fontSize: '16px', color: '#666', lineHeight: '1.8' }}>
                {celebrity.description}
              </p>
            )}
          </Col>
        </Row>
      </Card>

      <Card title="相关照片" style={{ marginTop: '24px' }}>
        {photos.length > 0 ? (
          <div className="photo-grid">
            {photos.map((photo) => (
              <div key={photo.id} className="photo-card">
                <img
                  src={`/api/photos/${photo.id}/image`}
                  alt={photo.filename}
                  onClick={() => handlePhotoPreview(photo)}
                  style={{ cursor: 'pointer' }}
                />
                <div className="photo-tags">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{photo.filename}</span>
                    <div>
                      <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handlePhotoPreview(photo)}
                        style={{ color: '#fff' }}
                      />
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePhoto(photo.id)
                        }}
                        style={{ color: '#ff4d4f' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty description="暂无相关照片" />
        )}
      </Card>

      <Modal
        open={previewVisible}
        title={previewPhoto?.filename || '照片预览'}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width="80%"
      >
        {previewImage && (
          <div style={{ textAlign: 'center' }}>
            <Image
              src={previewImage}
              style={{ maxHeight: '70vh', maxWidth: '100%' }}
              preview={false}
            />
            {previewPhoto?.faces && previewPhoto.faces.length > 0 && (
              <div style={{ marginTop: '16px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '8px' }}>识别到的名人:</h4>
                <div>
                  {previewPhoto.faces.map((face, idx) => (
                    <Tag key={idx} color="blue" style={{ fontSize: '14px', margin: '4px' }}>
                      {face.celebrity_name || '未知名人'}
                      {face.similarity && ` (相似度: ${(face.similarity * 100).toFixed(1)}%)`}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default CelebrityView
