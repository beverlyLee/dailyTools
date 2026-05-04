import React, { useState, useRef, useCallback } from 'react'
import { projectsAPI } from '../services/api'
import ImageCanvas from '../components/ImageCanvas'
import ComparisonSlider from '../components/ComparisonSlider'

const UploadPage = () => {
  const fileInputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [currentProject, setCurrentProject] = useState(null)
  const [originalImage, setOriginalImage] = useState(null)
  const [processedImage, setProcessedImage] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const [annotations, setAnnotations] = useState([])
  const [activeTool, setActiveTool] = useState('select')
  const [brushSize, setBrushSize] = useState(10)
  const [error, setError] = useState(null)
  
  const [options, setOptions] = useState({
    upscale_factor: 4,
    enable_inpainting: false,
    enable_colorization: false
  })

  const handleFileSelect = useCallback(async (file) => {
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件')
      return
    }
    
    setError(null)
    setIsProcessing(true)
    setShowComparison(false)
    setProcessedImage(null)
    setAnnotations([])
    
    try {
      const result = await projectsAPI.upload(file)
      setCurrentProject(result.project)
      setOriginalImage(result.original_image)
    } catch (err) {
      setError(err.response?.data?.detail || '上传失败，请重试')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback((e) => {
    const files = e.target.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleProcess = useCallback(async () => {
    if (!currentProject) return
    
    setIsProcessing(true)
    setError(null)
    
    try {
      const processOptions = {
        ...options,
        annotations: options.enable_inpainting ? annotations : null
      }
      
      await projectsAPI.process(currentProject.id, processOptions)
      
      const result = await projectsAPI.getResult(currentProject.id)
      
      setProcessedImage(result.processed_image)
      setCurrentProject(result.project)
      setShowComparison(true)
      
    } catch (err) {
      setError(err.response?.data?.detail || '处理失败，请重试')
    } finally {
      setIsProcessing(false)
    }
  }, [currentProject, options, annotations])

  const handleAnnotationsChange = useCallback((newAnnotations) => {
    setAnnotations(newAnnotations)
  }, [])

  const resetUpload = useCallback(() => {
    setCurrentProject(null)
    setOriginalImage(null)
    setProcessedImage(null)
    setShowComparison(false)
    setAnnotations([])
    setError(null)
    setOptions({
      upscale_factor: 4,
      enable_inpainting: false,
      enable_colorization: false
    })
  }, [])

  const handleDownload = useCallback(() => {
    if (!processedImage) return
    
    const link = document.createElement('a')
    link.href = processedImage
    link.download = `restored_${currentProject?.id || Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [processedImage, currentProject])

  return (
    <div>
      <div className="flex-between mb-6">
        <h1 className="page-title">老照片超分辨率修复</h1>
        {(currentProject || showComparison) && (
          <button className="btn btn-outline btn-sm" onClick={resetUpload}>
            重新上传
          </button>
        )}
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
          <p style={{ color: '#991b1b', margin: 0 }}>{error}</p>
        </div>
      )}

      {!currentProject && !showComparison && (
        <div className="card">
          <div className="card-body">
            <div
              className={`upload-zone ${isDragging ? 'dragover' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                style={{ display: 'none' }}
              />
              <div className="upload-icon">📷</div>
              <p className="upload-text">
                拖拽图片到这里，或点击选择图片
              </p>
              <p className="upload-hint">
                支持 JPG、PNG、WebP 格式，最大 50MB
              </p>
            </div>
          </div>
        </div>
      )}

      {currentProject && !showComparison && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header flex-between">
              <h3 className="card-title">图片预览</h3>
              <span className="status-badge status-pending">待处理</span>
            </div>
            <div className="card-body" style={{ position: 'relative' }}>
              <div style={{ minHeight: '500px' }}>
                {options.enable_inpainting ? (
                  <ImageCanvas
                    imageSrc={originalImage}
                    onAnnotationsChange={handleAnnotationsChange}
                    brushSize={brushSize}
                    activeTool={activeTool}
                  />
                ) : (
                  <div className="image-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <img 
                      src={originalImage} 
                      alt="原图" 
                      style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
                    />
                  </div>
                )}
              </div>
              
              {isProcessing && (
                <div className="processing-overlay">
                  <div className="processing-spinner"></div>
                  <p className="processing-text">正在上传图片...</p>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">处理选项</h3>
            </div>
            <div className="card-body">
              <div className="settings-panel">
                <div className="setting-section">
                  <h4 className="setting-section-title">超分辨率设置</h4>
                  <div className="form-group">
                    <label className="form-label">放大倍数</label>
                    <select 
                      className="form-select"
                      value={options.upscale_factor}
                      onChange={(e) => setOptions(prev => ({ ...prev, upscale_factor: parseInt(e.target.value) }))}
                    >
                      <option value={2}>2 倍 (快速)</option>
                      <option value={4}>4 倍 (推荐)</option>
                      <option value={8}>8 倍 (高精度)</option>
                    </select>
                    <p className="help-text">倍数越高，清晰度和文件大小也越大</p>
                  </div>
                </div>

                <div className="setting-section">
                  <h4 className="setting-section-title">划痕修复 (Inpainting)</h4>
                  <div className="form-group">
                    <label className="checkbox-group">
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={options.enable_inpainting}
                        onChange={(e) => {
                          setOptions(prev => ({ ...prev, enable_inpainting: e.target.checked }))
                          if (e.target.checked) {
                            setActiveTool('brush')
                          }
                        }}
                      />
                      <span className="checkbox-label">启用划痕/破损修复</span>
                    </label>
                    <p className="help-text mt-2">
                      启用后，使用画笔在左侧图片上标记需要修复的划痕、破损区域
                    </p>
                  </div>

                  {options.enable_inpainting && (
                    <div className="mt-4" style={{ padding: '0.75rem', background: 'var(--bg-white)', borderRadius: 'var(--radius-sm)' }}>
                      <div className="form-group">
                        <label className="form-label">绘图工具</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            className={`tool-btn ${activeTool === 'select' ? 'active' : ''}`}
                            onClick={() => setActiveTool('select')}
                          >
                            选择
                          </button>
                          <button
                            className={`tool-btn ${activeTool === 'brush' ? 'active' : ''}`}
                            onClick={() => setActiveTool('brush')}
                          >
                            画笔
                          </button>
                          <button
                            className={`tool-btn ${activeTool === 'rect' ? 'active' : ''}`}
                            onClick={() => setActiveTool('rect')}
                          >
                            矩形
                          </button>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">画笔大小: {brushSize}px</label>
                        <input
                          type="range"
                          className="w-full"
                          min="2"
                          max="50"
                          value={brushSize}
                          onChange={(e) => setBrushSize(parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="setting-section">
                  <h4 className="setting-section-title">智能上色 (Colorization)</h4>
                  <div className="form-group">
                    <label className="checkbox-group">
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={options.enable_colorization}
                        onChange={(e) => setOptions(prev => ({ ...prev, enable_colorization: e.target.checked }))}
                      />
                      <span className="checkbox-label">为黑白照片智能上色</span>
                    </label>
                    <p className="help-text mt-2">
                      适用于黑白老照片，AI 将根据内容自动添加合理的色彩
                    </p>
                  </div>
                </div>
              </div>

              <button
                className="btn btn-primary btn-lg w-full mt-6"
                onClick={handleProcess}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="loading-spinner"></span>
                    处理中...
                  </>
                ) : (
                  '开始处理'
                )}
              </button>

              <div 
                className="mt-4" 
                style={{ 
                  padding: '0.75rem', 
                  background: '#dbeafe', 
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  color: '#1e40af'
                }}
              >
                <strong>提示：</strong> 当前使用 Mock 模型进行演示。真实环境需要安装 Real-ESRGAN、SwinIR 或 DeOldify 等模型。
              </div>
            </div>
          </div>
        </div>
      )}

      {showComparison && processedImage && (
        <div className="card">
          <div className="card-header flex-between">
            <h3 className="card-title">处理完成</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-outline btn-sm" onClick={handleDownload}>
                下载图片
              </button>
              <button className="btn btn-primary btn-sm" onClick={resetUpload}>
                处理新图片
              </button>
            </div>
          </div>
          <div className="card-body">
            <div style={{ marginBottom: '1.5rem' }}>
              <ComparisonSlider
                originalImage={originalImage}
                processedImage={processedImage}
              />
            </div>

            <div className="grid-3">
              <div style={{ 
                padding: '1rem', 
                background: 'var(--bg-color)', 
                borderRadius: 'var(--radius-md)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  放大倍数
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary-color)' }}>
                  {currentProject?.upscale_factor || 4}x
                </div>
              </div>
              <div style={{ 
                padding: '1rem', 
                background: 'var(--bg-color)', 
                borderRadius: 'var(--radius-md)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  划痕修复
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: currentProject?.enable_inpainting ? 'var(--success-color)' : 'var(--text-muted)' }}>
                  {currentProject?.enable_inpainting ? '已启用' : '未启用'}
                </div>
              </div>
              <div style={{ 
                padding: '1rem', 
                background: 'var(--bg-color)', 
                borderRadius: 'var(--radius-md)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  智能上色
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: currentProject?.enable_colorization ? 'var(--success-color)' : 'var(--text-muted)' }}>
                  {currentProject?.enable_colorization ? '已启用' : '未启用'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UploadPage
