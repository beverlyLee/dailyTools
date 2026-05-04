import React, { useState, useEffect } from 'react'
import { Tabs, Card, Row, Col, Spin, Empty, Select, Input, Button, Modal, Image, Tag, message } from 'antd'
import { SearchOutlined, UserOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/index'
import '../App.css'

const { TabPane } = Tabs
const { Search } = Input

function AlbumView() {
  const navigate = useNavigate()
  const [photos, setPhotos] = useState([])
  const [celebrities, setCelebrities] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('celebrities')
  const [searchText, setSearchText] = useState('')
  const [selectedCelebrity, setSelectedCelebrity] = useState(null)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [previewPhoto, setPreviewPhoto] = useState(null)

  useEffect(() => {
    loadCelebrities()
    loadPhotos()
  }, [])

  const loadCelebrities = async () => {
    try {
      const response = await api.getCelebrities()
      setCelebrities(response.data.celebrities || [])
    } catch (error) {
      console.error('加载名人列表失败:', error)
    }
  }

  const loadPhotos = async (celebrityId = null) => {
    setLoading(true)
    try {
      const params = {}
      if (celebrityId) {
        params.celebrity_id = celebrityId
      }
      const response = await api.getPhotos(params)
      setPhotos(response.data.photos || [])
    } catch (error) {
      console.error('加载照片列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCelebrityClick = (celebrity) => {
    setSelectedCelebrity(celebrity)
    loadPhotos(celebrity.id)
    setActiveTab('photos')
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
      loadPhotos(selectedCelebrity?.id)
      loadCelebrities()
    } catch (error) {
      message.error('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const filteredCelebrities = celebrities.filter(celeb =>
    celeb.name.toLowerCase().includes(searchText.toLowerCase())
  )

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>相册管理</h1>
        <Search
          placeholder="搜索名人..."
          allowClear
          style={{ width: 300 }}
          onChange={(e) => setSearchText(e.target.value)}
          prefix={<SearchOutlined />}
        />
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="按名人分类" key="celebrities">
          {loading && activeTab === 'celebrities' ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
            </div>
          ) : filteredCelebrities.length > 0 ? (
            <div className="celebrity-list">
              {filteredCelebrities.map((celebrity) => (
                <div
                  key={celebrity.id}
                  className="celebrity-card"
                  onClick={() => handleCelebrityClick(celebrity)}
                >
                  <img
                    src={celebrity.avatar_url || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=portrait%20of%20a%20celebrity%20placeholder%20image&image_size=square'}
                    alt={celebrity.name}
                    className="celebrity-avatar"
                    onError={(e) => {
                      e.target.src = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=portrait%20of%20a%20celebrity%20placeholder%20image&image_size=square'
                    }}
                  />
                  <div className="celebrity-info">
                    <div className="celebrity-name">{celebrity.name}</div>
                    <div className="celebrity-photo-count">
                      <PictureOutlined style={{ marginRight: '4px' }} />
                      {celebrity.photo_count || 0} 张照片
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              description={
                searchText
                  ? '未找到匹配的名人'
                  : '暂未识别到名人，请先上传照片'
              }
            />
          )}
        </TabPane>

        <TabPane
          tab={
            selectedCelebrity
              ? `${selectedCelebrity.name} 的照片`
              : '所有照片'
          }
          key="photos"
        >
          <div style={{ marginBottom: '16px' }}>
            {selectedCelebrity && (
              <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
                <UserOutlined style={{ marginRight: '4px' }} />
                {selectedCelebrity.name}
                <Button
                  type="text"
                  size="small"
                  style={{ marginLeft: '8px', color: '#1890ff' }}
                  onClick={() => {
                    setSelectedCelebrity(null)
                    loadPhotos()
                  }}
                >
                  查看全部
                </Button>
              </Tag>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
            </div>
          ) : photos.length > 0 ? (
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
                      <span>
                        {photo.faces && photo.faces.length > 0 ? (
                          photo.faces.map((face, idx) => (
                            <span key={idx} style={{ marginRight: '8px' }}>
                              {face.celebrity_name || '未知'}
                            </span>
                          ))
                        ) : (
                          '未识别'
                        )}
                      </span>
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
            <Empty
              description={
                selectedCelebrity
                  ? `${selectedCelebrity.name} 暂无照片`
                  : '暂无照片，请先上传'
              }
            />
          )}
        </TabPane>
      </Tabs>

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

export default AlbumView
