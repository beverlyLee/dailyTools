import React, { useState, useEffect, useRef } from 'react';
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
  Image as AntImage
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  UserOutlined,
  CameraOutlined
} from '@ant-design/icons';
import { fabric } from 'fabric';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = require('antd').Input;

const costumeOptions = [
  { value: 'hanfu_ming', label: '明制汉服' },
  { value: 'hanfu_tang', label: '唐制汉服' },
  { value: 'qipao', label: '旗袍' },
  { value: 'qipao_modern', label: '改良旗袍' },
  { value: 'hanfu_song', label: '宋制汉服' },
];

const modelOptions = [
  { value: 'model1', label: '模特1 (推荐)' },
  { value: 'model2', label: '模特2' },
  { value: 'model3', label: '模特3' },
];

const detailOptions = [
  { value: 'none', label: '无特殊细节' },
  { value: 'embroidery', label: '刺绣纹样' },
  { value: 'button', label: '传统盘扣' },
  { value: 'both', label: '刺绣+盘扣' },
];

function TryOnCanvas() {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [sourceImage, setSourceImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [selectedCostume, setSelectedCostume] = useState('hanfu_ming');
  const [selectedModel, setSelectedModel] = useState('model1');
  const [selectedDetail, setSelectedDetail] = useState('none');
  const [imageSource, setImageSource] = useState('model');
  const [posePoints, setPosePoints] = useState([]);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [currentDrawingPath, setCurrentDrawingPath] = useState(null);

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
    
    const canvas = new fabric.Canvas('tryOnCanvas', {
      width: 800,
      height: 600,
      backgroundColor: '#fafafa',
    });
    
    fabricCanvasRef.current = canvas;

    canvas.on('mouse:down', (options) => {
      if (!isDrawingMode) return;
      
      const pointer = canvas.getPointer(options.e);
      const path = new fabric.Path(`M ${pointer.x} ${pointer.y}`, {
        stroke: 'rgba(255, 0, 0, 0.5)',
        strokeWidth: brushSize,
        fill: '',
        selectable: false,
        evented: false,
      });
      canvas.add(path);
      setCurrentDrawingPath(path);
    });

    canvas.on('mouse:move', (options) => {
      if (!isDrawingMode || !currentDrawingPath) return;
      
      const pointer = canvas.getPointer(options.e);
      const path = currentDrawingPath;
      const newPath = path.path + ` L ${pointer.x} ${pointer.y}`;
      path.set({ path: fabric.util.parsePath(newPath) });
      canvas.renderAll();
    });

    canvas.on('mouse:up', () => {
      setCurrentDrawingPath(null);
    });
  };

  const handleImageUpload = (info) => {
    const { file } = info;
    const { status } = file;
    
    if (status === 'done') {
      message.success('图片上传成功！');
      const imageUrl = URL.createObjectURL(file.originFileObj);
      setSourceImage(imageUrl);
      loadImageToCanvas(imageUrl);
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
      });
      canvas.add(img);
      canvas.renderAll();
      message.info('图片已加载，请标记关键点或直接开始换装');
    });
  };

  const handleModelSelect = (value) => {
    setSelectedModel(value);
    loadModelImage(value);
  };

  const loadModelImage = (modelId) => {
    const modelImages = {
      model1: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20young%20asian%20woman%20standing%20straight%20posture%20neutral%20background%20professional%20photo&image_size=square_hd',
      model2: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=handsome%20young%20asian%20man%20standing%20straight%20neutral%20background%20professional%20photo&image_size=square_hd',
      model3: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=elegant%20asian%20woman%20full%20body%20standing%20studio%20background%20professional%20photo&image_size=square_hd',
    };
    
    const url = modelImages[modelId];
    setSourceImage(url);
    loadImageToCanvas(url);
    message.info('模特图片已加载');
  };

  const handleStartTryOn = async () => {
    if (!sourceImage) {
      message.warning('请先上传图片或选择模特');
      return;
    }

    setLoading(true);
    message.loading('正在进行虚拟换装，请稍候...', 0);

    try {
      const formData = new FormData();
      formData.append('costume_type', selectedCostume);
      formData.append('detail_style', selectedDetail);
      formData.append('image_source', imageSource);
      
      if (posePoints.length > 0) {
        formData.append('pose_points', JSON.stringify(posePoints));
      }

      const response = await axios.post('/api/try-on', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      message.destroy();
      
      if (response.data.success) {
        const resultUrl = response.data.result_url;
        setResultImage(resultUrl);
        message.success('换装完成！');
        
        if (fabricCanvasRef.current) {
          const canvas = fabricCanvasRef.current;
          canvas.clear();
          fabric.Image.fromURL(resultUrl, (img) => {
            const scale = Math.min(
              canvas.width / img.width,
              canvas.height / img.height
            );
            img.scale(scale);
            img.set({
              left: (canvas.width - img.width * scale) / 2,
              top: (canvas.height - img.height * scale) / 2,
              selectable: false,
            });
            canvas.add(img);
            canvas.renderAll();
          });
        }
      } else {
        message.error(response.data.message || '换装失败，请重试');
      }
    } catch (error) {
      message.destroy();
      console.error('Try-on error:', error);
      message.error('换装过程中出错，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) {
      message.warning('没有可下载的结果图片');
      return;
    }
    
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `virtual-try-on-${Date.now()}.png`;
    link.click();
    message.success('下载已开始');
  };

  const handleSaveToHistory = async () => {
    if (!resultImage) {
      message.warning('没有可保存的结果');
      return;
    }

    try {
      await axios.post('/api/history/save', {
        source_image: sourceImage,
        result_image: resultImage,
        costume_type: selectedCostume,
        detail_style: selectedDetail,
      });
      message.success('已保存到创作历史');
    } catch (error) {
      console.error('Save history error:', error);
      message.error('保存失败，请重试');
    }
  };

  const handleReset = () => {
    setSourceImage(null);
    setResultImage(null);
    setPosePoints([]);
    setIsDrawingMode(false);
    
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.backgroundColor = '#fafafa';
      fabricCanvasRef.current.renderAll();
    }
    message.info('画布已重置');
  };

  const toggleDrawingMode = () => {
    setIsDrawingMode(!isDrawingMode);
    message.info(isDrawingMode ? '已退出局部重绘模式' : '已进入局部重绘模式，在需要调整服饰细节');
  };

  const beforeUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
    }
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('图片大小不能超过10MB！');
    }
    return isImage && isLt10M;
  };

  return (
    <div>
      <Row gutter={24}>
        <Col span={16}>
          <Card 
        title="换装画布"
        extra={
          <Space>
            <Button 
              type={isDrawingMode ? 'primary' : 'default'}
              icon={<CameraOutlined />}
              onClick={toggleDrawingMode}
            >
              {isDrawingMode ? '退出局部重绘' : '局部重绘'}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
          </Space>
        }
      >
        <div 
          ref={canvasRef}
          className="canvas-container"
          style={{ position: 'relative' }}
        >
          <canvas id="tryOnCanvas" />
          {loading && (
            <div className="loading-overlay">
              <Spin size="large" tip="正在进行AI处理，请稍候..." />
            </div>
          )}
          {!sourceImage && !loading && (
            <div className="image-upload-area" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
              <UploadOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
              <p style={{ marginTop: '16px', color: '#666' }}>
                请上传图片或从右侧选择模特开始体验虚拟换装
              </p>
            </div>
          )}
        </div>
        
        {isDrawingMode && (
          <div style={{ marginTop: '16px' }}>
            <Divider>局部重绘工具</Divider>
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
                <TextArea
                  rows={2}
                  placeholder="描述您想要修改的细节，例如：在袖口添加梅花刺绣纹样"
                  style={{ marginTop: '8px' }}
                />
              </Col>
            </Row>
          </div>
        )}
      </Card>
    </Col>
    
    <Col span={8}>
      <Card title="图片来源">
        <Radio.Group 
          value={imageSource}
          onChange={(e) => setImageSource(e.target.value)}
          style={{ width: '100%' }}
        >
          <Radio value="model" style={{ marginBottom: '12px', display: 'block' }}>
            选择模特
          </Radio>
          <Select
            style={{ width: '100%', marginBottom: '16px', marginLeft: '24px' }}
            value={selectedModel}
            onChange={handleModelSelect}
            disabled={imageSource !== 'model'}
          >
            {modelOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
          
          <Radio value="upload" style={{ marginBottom: '12px', display: 'block' }}>
            上传照片
          </Radio>
          <Upload.Dragger
            name="image"
            multiple={false}
            beforeUpload={beforeUpload}
            onChange={handleImageUpload}
            showUploadList={false}
            disabled={imageSource !== 'upload'}
            style={{ marginLeft: '24px', opacity: imageSource !== 'upload' ? 0.5 : 1 }}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽上传个人照片</p>
            <p className="ant-upload-hint">支持 JPG、PNG 格式，不超过 10MB</p>
          </Upload.Dragger>
        </Radio.Group>
      </Card>

      <Card title="服饰选择" style={{ marginTop: '16px' }}>
        <Select
          style={{ width: '100%', marginBottom: '16px' }}
          value={selectedCostume}
          onChange={setSelectedCostume}
          size="large"
        >
          {costumeOptions.map(option => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>
        
        <Divider>细节选项</Divider>
        
        <Select
          style={{ width: '100%' }}
          value={selectedDetail}
          onChange={setSelectedDetail}
        >
          {detailOptions.map(option => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>
      </Card>

      <Card title="操作" style={{ marginTop: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            type="primary"
            size="large"
            block
            icon={<PlayCircleOutlined />}
            onClick={handleStartTryOn}
            loading={loading}
            disabled={!sourceImage}
          >
            开始虚拟换装
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
        <Card title="结果预览" style={{ marginTop: '16px' }}>
          <AntImage
            width="100%"
            src={resultImage}
            className="image-preview"
          />
        </Card>
      )}
    </Col>
  </Row>
</div>
  );
}

export default TryOnCanvas;
