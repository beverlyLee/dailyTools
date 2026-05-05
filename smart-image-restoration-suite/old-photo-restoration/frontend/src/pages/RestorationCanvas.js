import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Row,
  Col,
  Card,
  Button,
  Upload,
  Select,
  Slider,
  Spin,
  message,
  Radio,
  Space,
  Divider,
  Image as AntImage,
  Switch,
  Tag,
  Progress
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  PictureOutlined,
  ZoomInOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { fabric } from 'fabric';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = require('antd').Input;

const srModelOptions = [
  { value: 'realesrgan_x4plus', label: 'Real-ESRGAN x4 (推荐)' },
  { value: 'realesrgan_x2plus', label: 'Real-ESRGAN x2' },
  { value: 'realesrgan_x8', label: 'Real-ESRGAN x8' },
  { value: 'swinir_lightweight_x4', label: 'SwinIR Lightweight x4' },
  { value: 'swinir_classical_x4', label: 'SwinIR Classical x4' },
];

const scaleOptions = [
  { value: 2, label: '2倍' },
  { value: 4, label: '4倍 (推荐)' },
  { value: 8, label: '8倍' },
];

const processingSteps = [
  { id: 'upload', name: '图片上传', icon: '📤' },
  { id: 'preprocess', name: '预处理', icon: '🔧' },
  { id: 'super_resolution', name: '超分辨率重建', icon: '🔍' },
  { id: 'inpainting', name: '划痕修复', icon: '🎨' },
  { id: 'colorization', name: '智能上色', icon: '🌈' },
  { id: 'postprocess', name: '后处理', icon: '✨' },
];

function RestorationCanvas() {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [sourceImage, setSourceImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  
  // 修复参数
  const [selectedModel, setSelectedModel] = useState('realesrgan_x4plus');
  const [scaleFactor, setScaleFactor] = useState(4);
  const [enableInpainting, setEnableInpainting] = useState(true);
  const [enableColorization, setEnableColorization] = useState(false);
  const [isDrawingMask, setIsDrawingMask] = useState(false);
  const [brushSize, setBrushSize] = useState(15);
  
  // 处理进度
  const [currentStep, setCurrentStep] = useState(null);
  const [stepStatuses, setStepStatuses] = useState({});
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    initCanvas();
    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }
    };
  }, []);

  const initCanvas = () => {
    if (!canvasRef.current) return;
    
    const canvas = new fabric.Canvas('restorationCanvas', {
      width: 800,
      height: 500,
      backgroundColor: '#fafafa',
      selection: false,
    });
    
    fabricCanvasRef.current = canvas;
  };

  const handleImageUpload = (info) => {
    const { file } = info;
    const { status } = file;
    
    if (status === 'done') {
      message.success('图片上传成功！');
      const imageUrl = URL.createObjectURL(file.originFileObj);
      setSourceImage(imageUrl);
      setResultImage(null);
      setShowComparison(false);
      loadImageToCanvas(imageUrl);
      resetProcessingSteps();
    } else if (status === 'error') {
      message.error('图片上传失败！');
    }
  };

  const loadImageToCanvas = (url) => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    canvas.clear();
    
    fabric.Image.fromURL(url, (img) => {
      const scale = Math.min(
        canvas.width / img.width,
        canvas.height / img.height
      );
      img.scale(scale);
      img.set({
        left: (canvas.width - img.width * scale) / 2,
        top: (canvas.height - img.height * scale) / 2,
        selectable: false,
        evented: false,
      });
      canvas.add(img);
      canvas.renderAll();
      
      // 初始化遮罩画布
      initMaskCanvas(img.width * scale, img.height * scale);
      
      message.info('图片已加载，可使用画笔标记需要修复的区域');
    }, { crossOrigin: 'anonymous' });
  };

  const initMaskCanvas = (width, height) => {
    if (!maskCanvasRef.current) {
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      maskCanvasRef.current = maskCanvas;
    } else {
      maskCanvasRef.current.width = width;
      maskCanvasRef.current.height = height;
    }
    
    const ctx = maskCanvasRef.current.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, width, height);
  };

  const resetProcessingSteps = () => {
    setCurrentStep(null);
    setStepStatuses({});
    setProgress(0);
  };

  const updateStepStatus = (stepId, status) => {
    setStepStatuses(prev => ({
      ...prev,
      [stepId]: status
    }));
    setCurrentStep(stepId);
    
    // 更新进度
    const stepIndex = processingSteps.findIndex(s => s.id === stepId);
    if (status === 'processing') {
      setProgress((stepIndex / processingSteps.length) * 100);
    } else if (status === 'completed') {
      setProgress(((stepIndex + 1) / processingSteps.length) * 100);
    }
  };

  const handleStartRestoration = async () => {
    if (!sourceImage) {
      message.warning('请先上传老照片');
      return;
    }

    setLoading(true);
    resetProcessingSteps();
    message.loading('正在进行照片修复，请稍候...', 0);

    try {
      // 步骤1: 图片上传（已完成）
      updateStepStatus('upload', 'completed');
      
      // 步骤2: 预处理
      updateStepStatus('preprocess', 'processing');
      await simulateDelay(500);
      updateStepStatus('preprocess', 'completed');
      
      // 步骤3: 超分辨率重建
      updateStepStatus('super_resolution', 'processing');
      
      // 构建请求参数
      const formData = new FormData();
      formData.append('model', selectedModel);
      formData.append('scale', scaleFactor);
      formData.append('enable_inpainting', enableInpainting);
      formData.append('enable_colorization', enableColorization);
      
      // 如果有遮罩，添加遮罩数据
      if (maskCanvasRef.current && enableInpainting) {
        const maskDataUrl = maskCanvasRef.current.toDataURL('image/png');
        formData.append('mask', maskDataUrl);
      }
      
      await simulateDelay(2000);
      updateStepStatus('super_resolution', 'completed');
      
      // 步骤4: 划痕修复
      if (enableInpainting) {
        updateStepStatus('inpainting', 'processing');
        await simulateDelay(1500);
        updateStepStatus('inpainting', 'completed');
      }
      
      // 步骤5: 智能上色
      if (enableColorization) {
        updateStepStatus('colorization', 'processing');
        await simulateDelay(1500);
        updateStepStatus('colorization', 'completed');
      }
      
      // 步骤6: 后处理
      updateStepStatus('postprocess', 'processing');
      await simulateDelay(500);
      updateStepStatus('postprocess', 'completed');
      
      // TODO: 实际应该调用后端API
      // const response = await axios.post('/api/restore', formData, {
      //   headers: { 'Content-Type': 'multipart/form-data' },
      //   timeout: 180000,
      // });
      
      message.destroy();
      
      // 模拟结果
      const mockResultUrl = sourceImage; // 实际应该是后端返回的结果URL
      setResultImage(mockResultUrl);
      setShowComparison(true);
      setProgress(100);
      
      message.success('修复完成！拖动滑块对比修复前后效果');
      
    } catch (error) {
      message.destroy();
      console.error('Restoration error:', error);
      message.error('修复过程中出错，请稍后重试');
      // 标记失败的步骤
      if (currentStep) {
        updateStepStatus(currentStep, 'failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const simulateDelay = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  const handleDownload = () => {
    if (!resultImage) {
      message.warning('没有可下载的修复结果');
      return;
    }
    
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `restored-photo-${Date.now()}.png`;
    link.click();
    message.success('下载已开始');
  };

  const handleSaveToHistory = async () => {
    if (!resultImage) {
      message.warning('没有可保存的修复结果');
      return;
    }

    try {
      await axios.post('/api/history/save', {
        source_image: sourceImage,
        result_image: resultImage,
        model: selectedModel,
        scale: scaleFactor,
        enable_inpainting: enableInpainting,
        enable_colorization: enableColorization,
      });
      message.success('已保存到修复历史');
    } catch (error) {
      console.error('Save history error:', error);
      message.error('保存失败，请重试');
    }
  };

  const handleReset = () => {
    setSourceImage(null);
    setResultImage(null);
    setShowComparison(false);
    setIsDrawingMask(false);
    resetProcessingSteps();
    
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.backgroundColor = '#fafafa';
      fabricCanvasRef.current.renderAll();
    }
    
    if (maskCanvasRef.current) {
      const ctx = maskCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    }
    
    message.info('画布已重置');
  };

  const toggleMaskDrawing = () => {
    if (!sourceImage) {
      message.warning('请先上传图片');
      return;
    }
    setIsDrawingMask(!isDrawingMask);
    message.info(isDrawingMask ? '已退出划痕标记模式' : '已进入划痕标记模式，用画笔在图片上标记需要修复的划痕和破损区域');
  };

  const clearMask = () => {
    if (maskCanvasRef.current) {
      const ctx = maskCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0)';
      ctx.fillRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    }
    message.info('划痕标记已清除');
  };

  const beforeUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
    }
    const isLt20M = file.size / 1024 / 1024 < 20;
    if (!isLt20M) {
      message.error('图片大小不能超过20MB！');
    }
    return isImage && isLt20M;
  };

  const getStepStatusClass = (stepId) => {
    const status = stepStatuses[stepId];
    if (status === 'completed') return 'step-completed';
    if (status === 'processing') return 'step-processing';
    if (status === 'failed') return 'step-failed';
    return 'step-pending';
  };

  const getStepStatusIcon = (stepId) => {
    const status = stepStatuses[stepId];
    if (status === 'completed') return '✓';
    if (status === 'processing') return '⟳';
    if (status === 'failed') return '✗';
    return stepId;
  };

  return (
    <div>
      <Row gutter={24}>
        <Col span={16}>
          <Card 
            title="修复画布"
            extra={
              <Space>
                {sourceImage && (
                  <Button 
                    type={isDrawingMask ? 'primary' : 'default'}
                    icon={<DeleteOutlined />}
                    onClick={toggleMaskDrawing}
                    disabled={!sourceImage}
                  >
                    {isDrawingMask ? '退出标记' : '标记划痕'}
                  </Button>
                )}
                {isDrawingMask && (
                  <Button 
                    danger
                    icon={<ReloadOutlined />}
                    onClick={clearMask}
                  >
                    清除标记
                  </Button>
                )}
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重置
                </Button>
              </Space>
            }
          >
            <div 
              className="canvas-container"
              style={{ position: 'relative', minHeight: '500px' }}
            >
              {showComparison && resultImage ? (
                // 对比模式
                <div 
                  className="comparison-container"
                  style={{ height: '500px', position: 'relative' }}
                >
                  {/* 修复后图片（底层） */}
                  <img
                    src={resultImage}
                    alt="修复后"
                    className="comparison-image"
                    style={{ objectFit: 'contain', position: 'absolute', width: '100%', height: '100%' }}
                  />
                  
                  {/* 修复前图片（上层，被裁剪） */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: `${sliderPosition}%`,
                      height: '100%',
                      overflow: 'hidden',
                      zIndex: 5
                    }}
                  >
                    <img
                      src={sourceImage}
                      alt="修复前"
                      className="comparison-image"
                      style={{ 
                        objectFit: 'contain', 
                        position: 'absolute', 
                        width: '100%', 
                        height: '100%',
                        maxWidth: 'none',
                        clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`
                      }}
                    />
                  </div>
                  
                  {/* 滑块 */}
                  <div
                    className="comparison-slider"
                    style={{ left: `${sliderPosition}%` }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const handleMouseMove = (moveEvent) => {
                        const container = e.currentTarget.parentElement;
                        const rect = container.getBoundingClientRect();
                        const newPosition = ((moveEvent.clientX - rect.left) / rect.width) * 100;
                        setSliderPosition(Math.max(0, Math.min(100, newPosition)));
                      };
                      
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  />
                  
                  {/* 标签 */}
                  <div style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: '#fff',
                    padding: '4px 12px',
                    borderRadius: 4,
                    fontSize: 14,
                    zIndex: 6
                  }}>
                    修复前
                  </div>
                  <div style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: '#fff',
                    padding: '4px 12px',
                    borderRadius: 4,
                    fontSize: 14,
                    zIndex: 6
                  }}>
                    修复后
                  </div>
                </div>
              ) : (
                // 普通模式
                <>
                  <canvas id="restorationCanvas" />
                  {loading && (
                    <div className="loading-overlay">
                      <Spin size="large" tip="正在进行AI修复，请稍候..." />
                    </div>
                  )}
                  {!sourceImage && !loading && (
                    <div className="image-upload-area" style={{ 
                      position: 'absolute', 
                      top: 0, 
                      left: 0, 
                      right: 0, 
                      bottom: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <UploadOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                      <p style={{ marginTop: '16px', color: '#666' }}>
                        请上传需要修复的老照片
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* 处理进度 */}
            {(loading || progress > 0) && (
              <div style={{ marginTop: 16 }}>
                <Divider>处理进度</Divider>
                <Progress percent={Math.round(progress)} status={loading ? 'active' : 'success'} />
                
                <div className="processing-steps" style={{ marginTop: 12 }}>
                  <Row gutter={16}>
                    {processingSteps.map((step, index) => {
                      const shouldShow = 
                        (enableInpainting || step.id !== 'inpainting') &&
                        (enableColorization || step.id !== 'colorization');
                      
                      if (!shouldShow) return null;
                      
                      return (
                        <Col span={enableInpainting && enableColorization ? 4 : (enableInpainting || enableColorization ? 5 : 6)} key={step.id}>
                          <div className="step-item" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            <div className={`step-status ${getStepStatusClass(step.id)}`}>
                              {getStepStatusIcon(step.id)}
                            </div>
                            <div style={{ fontSize: 12, marginTop: 4, color: '#666' }}>
                              {step.name}
                            </div>
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                </div>
              </div>
            )}
            
            {/* 划痕标记工具 */}
            {isDrawingMask && (
              <div style={{ marginTop: 16 }}>
                <Divider>划痕标记工具</Divider>
                <Row gutter={16}>
                  <Col span={8}>
                    <p>画笔大小: {brushSize}px</p>
                    <Slider
                      min={5}
                      max={50}
                      value={brushSize}
                      onChange={setBrushSize}
                    />
                  </Col>
                  <Col span={16}>
                    <p style={{ color: '#666', fontSize: 12 }}>
                      提示：在图片上用画笔涂抹需要修复的划痕、污渍或破损区域。红色标记的区域将被AI自动修复。
                    </p>
                  </Col>
                </Row>
              </div>
            )}
          </Card>
        </Col>
        
        <Col span={8}>
          <Card title="图片上传">
            <Upload.Dragger
              name="image"
              multiple={false}
              beforeUpload={beforeUpload}
              onChange={handleImageUpload}
              showUploadList={false}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽上传老照片</p>
              <p className="ant-upload-hint">支持 JPG、PNG、BMP 格式，不超过 20MB</p>
            </Upload.Dragger>
            
            {sourceImage && (
              <div style={{ marginTop: 16 }}>
                <AntImage
                  width="100%"
                  src={sourceImage}
                  className="image-preview"
                  style={{ maxHeight: 200, objectFit: 'contain' }}
                />
                <p style={{ marginTop: 8, textAlign: 'center', color: '#666', fontSize: 12 }}>
                  原图预览
                </p>
              </div>
            )}
          </Card>

          <Card title="修复设置" style={{ marginTop: '16px' }}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ marginBottom: 8, fontWeight: 'bold' }}>超分辨率模型</p>
              <Select
                style={{ width: '100%' }}
                value={selectedModel}
                onChange={setSelectedModel}
                disabled={loading}
              >
                {srModelOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <p style={{ marginBottom: 8, fontWeight: 'bold' }}>放大倍数</p>
              <Radio.Group 
                value={scaleFactor}
                onChange={(e) => setScaleFactor(e.target.value)}
                disabled={loading}
              >
                <Space>
                  {scaleOptions.map(option => (
                    <Radio.Button key={option.value} value={option.value}>
                      {option.label}
                    </Radio.Button>
                  ))}
                </Space>
              </Radio.Group>
            </div>
            
            <Divider>高级功能</Divider>
            
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 'bold' }}>划痕修复 (Inpainting)</span>
                <p style={{ fontSize: 12, color: '#666', margin: 0 }}>自动修复照片中的划痕和破损</p>
              </div>
              <Switch
                checked={enableInpainting}
                onChange={setEnableInpainting}
                disabled={loading}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 'bold' }}>智能上色 (Colorization)</span>
                <p style={{ fontSize: 12, color: '#666', margin: 0 }}>将黑白照片智能上色</p>
              </div>
              <Switch
                checked={enableColorization}
                onChange={setEnableColorization}
                disabled={loading}
              />
            </div>
          </Card>

          <Card title="操作" style={{ marginTop: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                size="large"
                block
                icon={<PlayCircleOutlined />}
                onClick={handleStartRestoration}
                loading={loading}
                disabled={!sourceImage}
              >
                开始修复
              </Button>
              
              <Row gutter={8}>
                <Col span={12}>
                  <Button
                    block
                    icon={<DownloadOutlined />}
                    onClick={handleDownload}
                    disabled={!resultImage}
                  >
                    下载PNG
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    block
                    icon={<SaveOutlined />}
                    onClick={handleSaveToHistory}
                    disabled={!resultImage}
                  >
                    保存历史
                  </Button>
                </Col>
              </Row>
            </Space>
          </Card>
          
          {resultImage && (
            <Card title="修复结果" style={{ marginTop: '16px' }}>
              <AntImage
                width="100%"
                src={resultImage}
                className="image-preview"
                style={{ maxHeight: 200, objectFit: 'contain' }}
              />
              <div style={{ marginTop: 12 }}>
                <Space>
                  <Tag color="blue">{srModelOptions.find(o => o.value === selectedModel)?.label}</Tag>
                  <Tag color="green">{scaleFactor}倍放大</Tag>
                  {enableInpainting && <Tag color="gold">划痕修复</Tag>}
                  {enableColorization && <Tag color="purple">智能上色</Tag>}
                </Space>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}

export default RestorationCanvas;
