import React, { useState, useEffect, useCallback } from 'react'
import { projectsAPI } from '../services/api'

const GalleryPage = () => {
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState(null)
  const [error, setError] = useState(null)

  const fetchProjects = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await projectsAPI.list()
      setProjects(result.projects || [])
    } catch (err) {
      setError('加载作品集失败，请刷新重试')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleDelete = useCallback(async (projectId, e) => {
    e.stopPropagation()
    
    if (!confirm('确定要删除这个项目吗？此操作不可撤销。')) {
      return
    }
    
    try {
      await projectsAPI.delete(projectId)
      setProjects(prev => prev.filter(p => p.id !== projectId))
      if (selectedProject?.id === projectId) {
        setSelectedProject(null)
      }
    } catch (err) {
      setError('删除失败，请重试')
    }
  }, [selectedProject])

  const handleViewDetail = useCallback(async (project) => {
    try {
      const result = await projectsAPI.getResult(project.id)
      setSelectedProject({
        ...project,
        original_image: result.original_image,
        processed_image: result.processed_image
      })
    } catch (err) {
      setError('加载详情失败，请重试')
    }
  }, [])

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': { text: '待处理', class: 'status-pending' },
      'processing': { text: '处理中', class: 'status-processing' },
      'completed': { text: '已完成', class: 'status-completed' },
      'error': { text: '错误', class: 'status-error' }
    }
    return statusMap[status] || { text: status, class: 'status-pending' }
  }

  const handleDownload = useCallback(() => {
    if (!selectedProject?.processed_image) return
    
    const link = document.createElement('a')
    link.href = selectedProject.processed_image
    link.download = `restored_${selectedProject.id}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [selectedProject])

  return (
    <div>
      <div className="flex-between mb-6">
        <h1 className="page-title">我的作品集</h1>
        <button 
          className="btn btn-outline btn-sm"
          onClick={fetchProjects}
          disabled={isLoading}
        >
          刷新
        </button>
      </div>

      {error && (
        <div 
          className="card mb-4"
          style={{ 
            background: '#fee2e2', 
            border: '1px solid #fca5a5',
            padding: '1rem'
          }}
        >
          <div className="flex-between">
            <p style={{ color: '#991b1b', margin: 0 }}>{error}</p>
            <button 
              className="btn btn-sm"
              style={{ background: 'transparent', color: '#991b1b', border: '1px solid #fca5a5' }}
              onClick={() => setError(null)}
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {selectedProject && (
        <div className="card mb-6">
          <div className="card-header flex-between">
            <h3 className="card-title">{selectedProject.original_filename}</h3>
            <button 
              className="btn btn-sm"
              style={{ background: 'var(--bg-color)', color: 'var(--text-secondary)' }}
              onClick={() => setSelectedProject(null)}
            >
              关闭
            </button>
          </div>
          <div className="card-body">
            <div className="grid-2 mb-6">
              <div>
                <h4 style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '600', 
                  color: 'var(--text-secondary)',
                  marginBottom: '0.75rem'
                }}>
                  原图
                </h4>
                <div className="image-container" style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  minHeight: '300px',
                  background: 'repeating-conic-gradient(#e2e8f0 0% 25%, #f1f5f9 0% 50%) 50% / 20px 20px'
                }}>
                  {selectedProject.original_image ? (
                    <img 
                      src={selectedProject.original_image} 
                      alt="原图" 
                      style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>暂无图片</span>
                  )}
                </div>
              </div>
              <div>
                <h4 style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '600', 
                  color: 'var(--text-secondary)',
                  marginBottom: '0.75rem'
                }}>
                  处理后
                </h4>
                <div className="image-container" style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  minHeight: '300px',
                  background: 'repeating-conic-gradient(#e2e8f0 0% 25%, #f1f5f9 0% 50%) 50% / 20px 20px'
                }}>
                  {selectedProject.processed_image ? (
                    <img 
                      src={selectedProject.processed_image} 
                      alt="处理后" 
                      style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>暂无处理结果</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid-3">
              <div style={{ 
                padding: '1rem', 
                background: 'var(--bg-color)', 
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  放大倍数
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary-color)' }}>
                  {selectedProject.upscale_factor || 4}x
                </div>
              </div>
              <div style={{ 
                padding: '1rem', 
                background: 'var(--bg-color)', 
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  处理时间
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {formatDate(selectedProject.updated_at)}
                </div>
              </div>
              <div style={{ 
                padding: '1rem', 
                background: 'var(--bg-color)', 
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  状态
                </div>
                <span className={`status-badge ${getStatusBadge(selectedProject.status).class}`}>
                  {getStatusBadge(selectedProject.status).text}
                </span>
              </div>
            </div>

            <div className="mt-6" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              {selectedProject.processed_image && (
                <button 
                  className="btn btn-primary"
                  onClick={handleDownload}
                >
                  下载处理结果
                </button>
              )}
              <button 
                className="btn btn-danger"
                onClick={(e) => handleDelete(selectedProject.id, e)}
              >
                删除项目
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="card">
          <div className="card-body flex-center" style={{ minHeight: '300px' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="processing-spinner" style={{ margin: '0 auto 1rem' }}></div>
              <p style={{ color: 'var(--text-secondary)' }}>加载中...</p>
            </div>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-icon">📷</div>
              <p className="empty-text">还没有处理过的图片</p>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                上传一张老照片开始修复之旅
              </p>
              <button 
                className="btn btn-primary btn-lg"
                onClick={() => window.location.hash = '/'}
              >
                开始处理图片
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="gallery-grid">
          {projects.map((project) => {
            const statusInfo = getStatusBadge(project.status)
            return (
              <div 
                key={project.id} 
                className="gallery-item"
                onClick={() => handleViewDetail(project)}
                style={{ cursor: 'pointer' }}
              >
                <div className="gallery-image" style={{ position: 'relative' }}>
                  <div 
                    style={{ 
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      zIndex: 1
                    }}
                  >
                    <span className={`status-badge ${statusInfo.class}`}>
                      {statusInfo.text}
                    </span>
                  </div>
                  <div 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      fontSize: '3rem'
                    }}
                  >
                    📷
                  </div>
                </div>
                <div className="gallery-info">
                  <h4 className="gallery-title" title={project.original_filename}>
                    {project.original_filename}
                  </h4>
                  <div className="gallery-meta">
                    <span className="gallery-date">{formatDate(project.created_at)}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {project.upscale_factor}x
                    </span>
                  </div>
                  <div className="gallery-actions">
                    <button 
                      className="btn btn-sm"
                      style={{ flex: 1, background: 'var(--bg-color)', color: 'var(--text-secondary)' }}
                      onClick={(e) => handleViewDetail(project)}
                    >
                      查看
                    </button>
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={(e) => handleDelete(project.id, e)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {projects.length > 0 && (
        <div 
          className="mt-6"
          style={{ 
            textAlign: 'center', 
            fontSize: '0.875rem', 
            color: 'var(--text-muted)' 
          }}
        >
          共 {projects.length} 个项目
        </div>
      )}
    </div>
  )
}

export default GalleryPage
