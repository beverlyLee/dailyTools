import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Upload, Button, message, Tabs, Empty, Spin } from 'antd';
import { UploadOutlined, UserOutlined, LoadingOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { imageService } from '../services/api';
import './MainPage.css';

const { Dragger } = Upload;

const MainPage = ({ onImageUpload, onNext }) => {
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [keypoints, setKeypoints] = useState(null);
  const [modelImages, setModelImages] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    loadModelImages();
  }, []);

  const loadModelImages = async () => {
    try {
      const response = await imageService.getModelImages();
      if (response.success) {
        setModelImages(response.data);
      }
    } catch (error) {
      console.error('加载模特图片失败:', error);
      setModelImages([
        { id: 1, name: '古典模特1', url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20hanfu%20model%20elegant%20pose%20studio%20light&image_size=portrait_4_3' },
        { id: 2, name: '古典模特2', url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20qipao%20model%20elegant%20pose%20studio%20light&image_size=portrait_4_3' },
        { id: 3, name: '现代模特', url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20fashion%20model%20elegant%20pose%20studio%20light%20portrait&image_size=portrait_4_3' },
        { id: 4, name: '古风场景', url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20garden%20elegant%20woman%20hanfu%20ancient%20style&image_size=portrait_4_3' },
      ]);
    }
  };

  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: 'image/*',
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件!');
        return false;
      }
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('图片大小不能超过10MB!');
        return false;
      }
      return false;
    },
    onChange: (info) => {
      if (info.file.status === 'removed') {
        setUploadedFile(null);
        setImagePreview(null);
        setKeypoints(null);
        return;
      }

      const file = info.file.originFileObj || info.file;
      if (file) {
        setUploadedFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target.result);
          setKeypoints(null);
        };
        reader.readAsDataURL(file);
      }
    },
  };

  const handleUploadToServer = async () => {
    if (!uploadedFile) {
      message.warning('请先选择图片');
      return;
    }

    setLoading(true);
    try {
      const response = await imageService.uploadImage(uploadedFile);
      if (response.success) {
        message.success('图片上传成功');
        await detectKeypoints(response.data.image_path);
      } else {
        message.error('上传失败: ' + response.message);
      }
    } catch (error) {
      message.error('上传失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const detectKeypoints = async (imagePath) => {
    setDetecting(true);
    try {
      const response = await imageService.detectKeypoints(imagePath);
      if (response.success) {
        setKeypoints(response.data.keypoints);
        message.success('关键点检测完成');
        setTimeout(() => {
          onImageUpload(imagePath, response.data.keypoints);
        }, 500);
      } else {
        message.error('关键点检测失败');
      }
    } catch (error) {
      message.error('关键点检测失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setDetecting(false);
    }
  };

  const handleSelectModel = async (model) => {
    setSelectedModel(model);
    setImagePreview(model.url);
    setUploadedFile({
      name: model.name,
      type: 'image/jpeg',
      size: 0,
    });

    try {
      setDetecting(true);
      const mockKeypoints = generateMockKeypoints();
      setKeypoints(mockKeypoints);
      message.success('已选择模特图片');
      setTimeout(() => {
        onImageUpload(model.id.toString(), mockKeypoints);
      }, 500);
    } finally {
      setDetecting(false);
    }
  };

  const generateMockKeypoints = () => {
    return {
      nose: { x: 0.5, y: 0.15, confidence: 0.95 },
      left_eye: { x: 0.45, y: 0.13, confidence: 0.93 },
      right_eye: { x: 0.55, y: 0.13, confidence: 0.93 },
      left_shoulder: { x: 0.35, y: 0.25, confidence: 0.90 },
      right_shoulder: { x: 0.65, y: 0.25, confidence: 0.90 },
      left_elbow: { x: 0.25, y: 0.35, confidence: 0.88 },
      right_elbow: { x: 0.75, y: 0.35, confidence: 0.88 },
      left_wrist: { x: 0.20, y: 0.45, confidence: 0.85 },
      right_wrist: { x: 0.80, y: 0.45, confidence: 0.85 },
      left_hip: { x: 0.40, y: 0.45, confidence: 0.87 },
      right_hip: { x: 0.60, y: 0.45, confidence: 0.87 },
      left_knee: { x: 0.38, y: 0.65, confidence: 0.82 },
      right_knee: { x: 0.62, y: 0.65, confidence: 0.82 },
      left_ankle: { x: 0.38, y: 0.85, confidence: 0.80 },
      right_ankle: { x: 0.62, y: 0.85, confidence: 0.80 },
    };
  };

  const renderUploadContent = () => (
    <div className="upload-section">
      <UploadOutlined className="upload-icon" />
      <div className="upload-title">点击或拖拽图片到此区域上传</div>
      <div className="upload-desc">支持 JPG、PNG、WEBP 格式，文件大小不超过 10MB</div>
    </div>
  );

  const renderPreview = () => (
    <div className="preview-container">
      <img src={imagePreview} alt="预览" className="preview-image" />
      {keypoints && (
        <div className="keypoints-badge">
          <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
          关键点已检测
        </div>
      )}
    </div>
  );

  const tabItems = [
    {
      key: 'upload',
      label: <span><UploadOutlined /> 上传照片</span>,
      children: (
        <>
          {!imagePreview ? (
            <Dragger {...uploadProps}>
              {renderUploadContent()}
            </Dragger>
          ) : (
            <div>
              {renderPreview()}
              <Row gutter={16} style={{ marginTop: 16 }}>
                <Col>
                  <Button 
                    type="primary" 
                    className="btn-primary"
                    onClick={handleUploadToServer}
                    loading={loading || detecting}
                    disabled={!uploadedFile}
                  >
                    {loading || detecting ? <Spin indicator={<LoadingOutlined spin />} /> : null}
                    {detecting ? '检测关键点中...' : '开始处理'}
                  </Button>
                </Col>
                <Col>
                  <Button 
                    className="btn-secondary"
                    onClick={() => {
                      setUploadedFile(null);
                      setImagePreview(null);
                      setKeypoints(null);
                    }}
                  >
                    重新选择
                  </Button>
                </Col>
              </Row>
            </div>
          )}
        </>
      ),
    },
    {
      key: 'model',
      label: <span><UserOutlined /> 选择模特</span>,
      children: (
        <>
          <Row gutter={[16, 16]}>
            {modelImages.map((model) => (
              <Col span={6} key={model.id}>
                <div
                  className={`model-item ${selectedModel?.id === model.id ? 'selected' : ''}`}
                  onClick={() => handleSelectModel(model)}
                >
                  <img 
                    src={model.url} 
                    alt={model.name} 
                    className="model-image"
                    loading="lazy"
                  />
                  <div className="model-name">{model.name}</div>
                </div>
              </Col>
            ))}
          </Row>
          {selectedModel && (
            <div style={{ marginTop: 16 }}>
              <Button 
                type="primary" 
                className="btn-primary"
                onClick={onNext}
                disabled={detecting}
              >
                {detecting ? <Spin indicator={<LoadingOutlined spin />} /> : null}
                继续换装
              </Button>
            </div>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Row gutter={24}>
        <Col span={16}>
          <Card
            title="上传图片"
            className="page-card"
            styles={{
              header: { 
                background: 'linear-gradient(90deg, #FFFAF0, #FFF8DC)', 
                borderBottom: '1px solid #DEB887' 
              }
            }}
          >
            <Tabs defaultActiveKey="upload" className="tabs-container" items={tabItems} />
          </Card>
        </Col>

        <Col span={8}>
          <Card
            title="操作指南"
            className="page-card"
            styles={{
              header: { 
                background: 'linear-gradient(90deg, #FFFAF0, #FFF8DC)', 
                borderBottom: '1px solid #DEB887' 
              }
            }}
          >
            <div style={{ lineHeight: 2 }}>
              <h4 style={{ color: '#8B4513', marginBottom: 12 }}>📸 上传照片</h4>
              <p style={{ color: '#666', marginBottom: 16 }}>
                上传您的个人照片或选择预设的模特图片，系统将自动检测人体关键点。
              </p>
              
              <h4 style={{ color: '#8B4513', marginBottom: 12 }}>✨ 关键点检测</h4>
              <p style={{ color: '#666', marginBottom: 16 }}>
                系统使用姿态估计模型自动识别17个人体关键点，包括骨骼和轮廓信息。
              </p>
              
              <h4 style={{ color: '#8B4513', marginBottom: 12 }}>👗 选择服饰</h4>
              <p style={{ color: '#666', marginBottom: 16 }}>
                在风格换装页面选择汉服、旗袍等传统服饰，体验虚拟换装效果。
              </p>
              
              <h4 style={{ color: '#8B4513', marginBottom: 12 }}>🎨 细节调整</h4>
              <p style={{ color: '#666' }}>
                使用局部重绘功能，对刺绣纹样、盘扣等细节进行精细调整。
              </p>
            </div>

            <div className="section-divider" />

            <div className="tips-box">
              <h4 style={{ color: '#8B4513', marginBottom: 8 }}>💡 拍摄建议</h4>
              <ul style={{ color: '#666', marginLeft: 16, lineHeight: 1.8 }}>
                <li>选择光线充足的环境拍摄</li>
                <li>保持全身或半身入镜</li>
                <li>穿着贴身衣物效果更佳</li>
                <li>背景简洁可提高检测精度</li>
              </ul>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MainPage;
