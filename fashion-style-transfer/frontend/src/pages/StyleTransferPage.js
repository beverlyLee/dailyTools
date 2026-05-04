import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Button, Slider, Select, Tabs, message, Spin, Radio, Modal, Input } from 'antd';
import {
  ShopOutlined,
  EditOutlined,
  DownloadOutlined,
  UndoOutlined,
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  RestOutlined,
  SaveOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { Stage, Layer, Image, Circle, Line, Rect } from 'react-konva';
import Konva from 'konva';
import { imageService, styleTransferService, downloadService, historyService } from '../services/api';
import './StyleTransferPage.css';

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const StyleTransferPage = ({ uploadedImage, keypoints }) => {
  const [fashionStyles, setFashionStyles] = useState([]);
  const [selectedFashion, setSelectedFashion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [transferStrength, setTransferStrength] = useState(0.8);
  const [activeTab, setActiveTab] = useState('select');
  
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [showKeypoints, setShowKeypoints] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  
  const [inpaintMode, setInpaintMode] = useState(false);
  const [maskPoints, setMaskPoints] = useState([]);
  const [currentMask, setCurrentMask] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [inpaintPrompt, setInpaintPrompt] = useState('');
  
  const [sourceImageObj, setSourceImageObj] = useState(null);
  const [resultImageObj, setResultImageObj] = useState(null);
  const stageRef = useRef(null);
  const layerRef = useRef(null);

  const SKELETON_CONNECTIONS = [
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_elbow'],
    ['right_shoulder', 'right_elbow'],
    ['left_elbow', 'left_wrist'],
    ['right_elbow', 'right_wrist'],
    ['left_shoulder', 'left_hip'],
    ['right_shoulder', 'right_hip'],
    ['left_hip', 'right_hip'],
    ['left_hip', 'left_knee'],
    ['right_hip', 'right_knee'],
    ['left_knee', 'left_ankle'],
    ['right_knee', 'right_ankle'],
  ];

  useEffect(() => {
    loadFashionStyles();
    loadImage();
  }, []);

  const loadFashionStyles = async () => {
    try {
      const response = await imageService.getFashionStyles();
      if (response.success) {
        setFashionStyles(response.data);
      }
    } catch (error) {
      console.error('加载服饰风格失败:', error);
      setFashionStyles([
        {
          id: 'hanfu_ming',
          name: '明制汉服',
          description: '端庄典雅的明代传统服饰',
          category: '汉服',
          image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20ming%20dynasty%20hanfu%20red%20gold%20embroidery%20elegant&image_size=square_hd',
          prompt: 'wearing traditional Chinese Ming Dynasty hanfu, red and gold color scheme, elegant dragon embroidery, silk fabric',
        },
        {
          id: 'hanfu_tang',
          name: '唐制汉服',
          description: '华丽飘逸的唐代传统服饰',
          category: '汉服',
          image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20tang%20dynasty%20hanfu%20flowing%20silk%20peony%20patterns&image_size=square_hd',
          prompt: 'wearing traditional Chinese Tang Dynasty hanfu, flowing silk dress with peony embroidery, vibrant colors',
        },
        {
          id: 'qipao_modern',
          name: '现代旗袍',
          description: '优雅时尚的改良旗袍',
          category: '旗袍',
          image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20chinese%20qipao%20cheongsam%20elegant%20silk%20floral%20pattern&image_size=square_hd',
          prompt: 'wearing elegant modern Chinese qipao (cheongsam), silk fabric with floral patterns, body-hugging silhouette',
        },
        {
          id: 'qipao_classic',
          name: '经典旗袍',
          description: '传统经典的老上海旗袍',
          category: '旗袍',
          image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=classic%20shanghai%20qipao%20cheongsam%20vintage%20style%20red%20velvet&image_size=square_hd',
          prompt: 'wearing classic vintage Shanghai qipao, red velvet fabric with traditional Chinese knot buttons, elegant 1930s style',
        },
        {
          id: 'hanfu_song',
          name: '宋制汉服',
          description: '素雅清新的宋代传统服饰',
          category: '汉服',
          image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20song%20dynasty%20hanfu%20light%20blue%20elegant%20simple&image_size=square_hd',
          prompt: 'wearing traditional Chinese Song Dynasty hanfu, light blue elegant dress with simple embroidery, refined and graceful',
        },
        {
          id: 'wedding_hanfu',
          name: '婚礼汉服',
          description: '华丽隆重的中式婚礼服饰',
          category: '汉服',
          image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20wedding%20hanfu%20red%20gold%20phoenix%20crown%20ceremonial&image_size=square_hd',
          prompt: 'wearing traditional Chinese wedding hanfu, red and gold ceremonial dress with phoenix embroidery, phoenix crown, luxurious and grand',
        },
      ]);
    }
  };

  const loadImage = () => {
    if (typeof uploadedImage === 'string') {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setSourceImageObj(img);
      };
      img.src = uploadedImage;
    }
  };

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clampedScale = Math.max(0.5, Math.min(3, newScale));
    
    stage.scale({ x: clampedScale, y: clampedScale });
    setStageScale(clampedScale);
    
    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };
    stage.position(newPos);
    setStagePos(newPos);
  };

  const handleMouseDown = (e) => {
    if (!inpaintMode) return;
    
    const stage = stageRef.current;
    const pos = stage.getPointerPosition();
    const scaledPos = {
      x: (pos.x - stagePos.x) / stageScale,
      y: (pos.y - stagePos.y) / stageScale,
    };
    
    setIsDrawing(true);
    setCurrentMask([scaledPos]);
  };

  const handleMouseMove = (e) => {
    if (!inpaintMode || !isDrawing) return;
    
    const stage = stageRef.current;
    const pos = stage.getPointerPosition();
    const scaledPos = {
      x: (pos.x - stagePos.x) / stageScale,
      y: (pos.y - stagePos.y) / stageScale,
    };
    
    setCurrentMask([...currentMask, scaledPos]);
  };

  const handleMouseUp = () => {
    if (!inpaintMode || !isDrawing) return;
    
    setIsDrawing(false);
    if (currentMask.length > 0) {
      setMaskPoints([...maskPoints, currentMask]);
      setCurrentMask([]);
    }
  };

  const handleApplyStyle = async () => {
    if (!selectedFashion) {
      message.warning('请先选择一款服饰风格');
      return;
    }

    setProcessing(true);
    try {
      message.info('正在进行风格迁移，请稍候...（这可能需要30-60秒）');
      
      const response = await styleTransferService.transferStyle({
        sourceImage: uploadedImage,
        targetFashion: selectedFashion,
        keypoints: keypoints,
        strength: transferStrength,
        preserveStructure: true,
      });

      if (response.success) {
        message.success('风格迁移完成！');
        setResultImage(response.data.result_image);
        
        if (typeof response.data.result_image === 'string') {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            setResultImageObj(img);
          };
          img.src = response.data.result_image;
        }
      } else {
        message.error('风格迁移失败: ' + response.message);
      }
    } catch (error) {
      console.error('风格迁移错误:', error);
      message.error('风格迁移失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setProcessing(false);
    }
  };

  const handleInpaint = async () => {
    if (maskPoints.length === 0) {
      message.warning('请先在图片上绘制重绘区域');
      return;
    }
    if (!inpaintPrompt.trim()) {
      message.warning('请输入重绘描述提示词');
      return;
    }

    setProcessing(true);
    try {
      message.info('正在进行局部重绘...');
      
      const response = await styleTransferService.inpaintRegion({
        imagePath: resultImage || uploadedImage,
        maskPoints: maskPoints,
        prompt: inpaintPrompt,
        strength: 0.6,
      });

      if (response.success) {
        message.success('局部重绘完成！');
        setResultImage(response.data.result_image);
        setMaskPoints([]);
        setInpaintMode(false);
      } else {
        message.error('局部重绘失败: ' + response.message);
      }
    } catch (error) {
      message.error('局部重绘失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!resultImage) {
      message.warning('请先生成结果图片');
      return;
    }

    try {
      message.loading('准备下载高清图片...', 1);
      setTimeout(() => {
        downloadService.downloadHighQuality(resultImage, {
          format: 'png',
          quality: 100,
        });
        message.success('下载已开始');
      }, 1000);
    } catch (error) {
      message.error('下载失败');
    }
  };

  const handleSaveHistory = async () => {
    if (!resultImage) {
      message.warning('请先生成结果图片');
      return;
    }

    try {
      const response = await historyService.saveHistory({
        sourceImage: uploadedImage,
        resultImage: resultImage,
        fashionStyle: selectedFashion,
        metadata: {
          strength: transferStrength,
          timestamp: Date.now(),
        },
      });

      if (response.success) {
        message.success('已保存到历史记录');
      }
    } catch (error) {
      message.error('保存失败');
    }
  };

  const handleResetView = () => {
    setStageScale(1);
    setStagePos({ x: 0, y: 0 });
    if (stageRef.current) {
      stageRef.current.scale({ x: 1, y: 1 });
      stageRef.current.position({ x: 0, y: 0 });
    }
  };

  const handleClearMask = () => {
    setMaskPoints([]);
    setCurrentMask([]);
  };

  const renderKeypoints = () => {
    if (!keypoints || !showKeypoints) return null;

    return Object.entries(keypoints).map(([key, point]) => {
      if (!point || point.confidence < 0.5) return null;
      
      const x = point.x * 800;
      const y = point.y * 600;
      
      return (
        <Circle
          key={key}
          x={x}
          y={y}
          radius={6}
          fill="#1890ff"
          stroke="#fff"
          strokeWidth={2}
        />
      );
    });
  };

  const renderSkeleton = () => {
    if (!keypoints || !showSkeleton) return null;

    return SKELETON_CONNECTIONS.map(([start, end], index) => {
      const startPoint = keypoints[start];
      const endPoint = keypoints[end];
      
      if (!startPoint || !endPoint || 
          startPoint.confidence < 0.5 || 
          endPoint.confidence < 0.5) {
        return null;
      }
      
      const points = [
        startPoint.x * 800, startPoint.y * 600,
        endPoint.x * 800, endPoint.y * 600,
      ];
      
      return (
        <Line
          key={index}
          points={points}
          stroke="#52c41a"
          strokeWidth={3}
          lineCap="round"
          lineJoin="round"
        />
      );
    });
  };

  const renderMask = () => {
    const allMasks = [...maskPoints, ...(currentMask.length > 0 ? [currentMask] : [])];
    
    return allMasks.map((mask, maskIndex) => {
      if (mask.length < 2) return null;
      
      const points = mask.flatMap(p => [p.x, p.y]);
      
      return (
        <Line
          key={`mask-${maskIndex}`}
          points={points}
          stroke="#ff4d4f"
          strokeWidth={20}
          lineCap="round"
          lineJoin="round"
          opacity={0.5}
        />
      );
    });
  };

  const displayImage = resultImageObj || sourceImageObj;

  return (
    <div className="style-transfer-page">
      <Row gutter={24}>
        <Col span={16}>
          <Card
            title="交互式画布"
            className="page-card canvas-card"
            headStyle={{ background: 'linear-gradient(90deg, #FFFAF0, #FFF8DC)', borderBottom: '1px solid #DEB887' }}
            extra={
              <div className="canvas-controls">
                <Button.Group>
                  <Button 
                    icon={<ZoomInOutlined />} 
                    onClick={() => {
                      const newScale = Math.min(3, stageScale * 1.2);
                      setStageScale(newScale);
                      if (stageRef.current) stageRef.current.scale({ x: newScale, y: newScale });
                    }}
                  />
                  <Button 
                    icon={<ZoomOutOutlined />} 
                    onClick={() => {
                      const newScale = Math.max(0.5, stageScale / 1.2);
                      setStageScale(newScale);
                      if (stageRef.current) stageRef.current.scale({ x: newScale, y: newScale });
                    }}
                  />
                  <Button 
                    icon={<RestOutlined />} 
                    onClick={handleResetView}
                  />
                </Button.Group>
                <Button.Group style={{ marginLeft: 8 }}>
                  <Button 
                    type={showKeypoints ? 'primary' : 'default'}
                    onClick={() => setShowKeypoints(!showKeypoints)}
                  >
                    关键点
                  </Button>
                  <Button 
                    type={showSkeleton ? 'primary' : 'default'}
                    onClick={() => setShowSkeleton(!showSkeleton)}
                  >
                    骨骼
                  </Button>
                </Button.Group>
              </div>
            }
          >
            <div className="canvas-wrapper">
              {displayImage ? (
                <Stage
                  ref={stageRef}
                  width={800}
                  height={600}
                  scaleX={stageScale}
                  scaleY={stageScale}
                  x={stagePos.x}
                  y={stagePos.y}
                  onWheel={handleWheel}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  style={{ cursor: inpaintMode ? 'crosshair' : 'grab' }}
                  draggable={!inpaintMode}
                  onDragEnd={(e) => {
                    setStagePos({
                      x: e.target.x(),
                      y: e.target.y(),
                    });
                  }}
                >
                  <Layer ref={layerRef}>
                    <Image
                      image={displayImage}
                      width={800}
                      height={600}
                    />
                    {renderSkeleton()}
                    {renderKeypoints()}
                    {renderMask()}
                  </Layer>
                </Stage>
              ) : (
                <div className="canvas-placeholder">
                  <p>请先上传图片或选择模特</p>
                </div>
              )}
            </div>
            
            {inpaintMode && (
              <div className="inpaint-tips">
                <p>🎨 局部重绘模式：在图片上拖动鼠标绘制重绘区域</p>
                <Row gutter={16}>
                  <Col>
                    <Button 
                      type="primary" 
                      icon={<EditOutlined />}
                      onClick={handleInpaint}
                      loading={processing}
                    >
                      执行重绘
                    </Button>
                  </Col>
                  <Col>
                    <Button onClick={handleClearMask}>
                      清除绘制
                    </Button>
                  </Col>
                  <Col>
                    <Button 
                      danger
                      onClick={() => {
                        setInpaintMode(false);
                        setMaskPoints([]);
                        setCurrentMask([]);
                      }}
                    >
                      退出模式
                    </Button>
                  </Col>
                </Row>
              </div>
            )}
          </Card>

          {resultImage && (
            <Card
              title="结果预览"
              className="page-card"
              style={{ marginTop: 24 }}
              headStyle={{ background: 'linear-gradient(90deg, #FFFAF0, #FFF8DC)', borderBottom: '1px solid #DEB887' }}
              extra={
                <div>
                  <Button.Group>
                    <Button 
                      type="primary" 
                      icon={<DownloadOutlined />}
                      onClick={handleDownload}
                      className="btn-primary"
                    >
                      下载高清图
                    </Button>
                    <Button 
                      icon={<SaveOutlined />}
                      onClick={handleSaveHistory}
                    >
                      保存记录
                    </Button>
                  </Button.Group>
                </div>
              }
            >
              <Row gutter={24}>
                <Col span={12}>
                  <div className="compare-item">
                    <div className="compare-title">原图</div>
                    <div className="compare-image">
                      {displayImage && (
                        <img 
                          src={typeof uploadedImage === 'string' ? uploadedImage : ''} 
                          alt="原图" 
                          style={{ width: '100%', borderRadius: 8 }}
                        />
                      )}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="compare-item">
                    <div className="compare-title">换装效果</div>
                    <div className="compare-image">
                      <img 
                        src={resultImage} 
                        alt="结果" 
                        style={{ width: '100%', borderRadius: 8 }}
                      />
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>
          )}
        </Col>

        <Col span={8}>
          <Card
            title="服饰风格"
            className="page-card"
            headStyle={{ background: 'linear-gradient(90deg, #FFFAF0, #FFF8DC)', borderBottom: '1px solid #DEB887' }}
          >
            <Tabs defaultActiveKey="汉服" className="fashion-tabs">
              {['汉服', '旗袍'].map((category) => (
                <TabPane tab={category} key={category}>
                  <div className="fashion-grid">
                    {fashionStyles
                      .filter(f => f.category === category)
                      .map((fashion) => (
                        <div
                          key={fashion.id}
                          className={`fashion-card ${selectedFashion?.id === fashion.id ? 'selected' : ''}`}
                          onClick={() => setSelectedFashion(fashion)}
                        >
                          <img 
                            src={fashion.image} 
                            alt={fashion.name} 
                            className="fashion-image"
                            loading="lazy"
                          />
                          <div className="fashion-info">
                            <div className="fashion-name">{fashion.name}</div>
                            <div className="fashion-desc">{fashion.description}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </TabPane>
              ))}
            </Tabs>
          </Card>

          <Card
            title="风格迁移参数"
            className="page-card"
            style={{ marginTop: 24 }}
            headStyle={{ background: 'linear-gradient(90deg, #FFFAF0, #FFF8DC)', borderBottom: '1px solid #DEB887' }}
          >
            <div className="parameter-section">
              <div className="parameter-label">迁移强度</div>
              <Slider
                min={0}
                max={1}
                step={0.1}
                value={transferStrength}
                onChange={setTransferStrength}
                tooltip={{ formatter: (value) => `${(value * 100).toFixed(0)}%` }}
              />
              <div className="parameter-hint">
                较高的值会更强烈地应用服饰风格，较低的值会更多保留原图特征
              </div>
            </div>

            <div className="section-divider" />

            <div className="action-buttons">
              <Button
                type="primary"
                size="large"
                block
                icon={processing ? <Spin indicator={<LoadingOutlined spin />} /> : <ShopOutlined />}
                onClick={handleApplyStyle}
                loading={processing}
                disabled={!selectedFashion}
                className="btn-primary"
              >
                {processing ? '风格迁移中...' : '应用风格迁移'}
              </Button>
            </div>
          </Card>

          <Card
            title="高级工具"
            className="page-card"
            style={{ marginTop: 24 }}
            headStyle={{ background: 'linear-gradient(90deg, #FFFAF0, #FFF8DC)', borderBottom: '1px solid #DEB887' }}
          >
            <div className="tool-section">
              <div className="tool-label">局部重绘</div>
              <p className="tool-desc">
                对服饰细节（如刺绣纹样、盘扣）进行局部重绘和调整
              </p>
              <Button
                type={inpaintMode ? 'primary' : 'default'}
                block
                icon={<EditOutlined />}
                onClick={() => {
                  setInpaintMode(!inpaintMode);
                  if (!inpaintMode) {
                    setMaskPoints([]);
                    setCurrentMask([]);
                  }
                }}
              >
                {inpaintMode ? '退出重绘模式' : '进入重绘模式'}
              </Button>

              {inpaintMode && (
                <div className="inpaint-input-section">
                  <div className="parameter-label" style={{ marginTop: 16 }}>重绘描述</div>
                  <TextArea
                    rows={3}
                    placeholder="描述您想要的效果，例如：添加金色龙纹刺绣、改为红色盘扣、添加珍珠装饰等"
                    value={inpaintPrompt}
                    onChange={(e) => setInpaintPrompt(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="section-divider" />

            <div className="tool-section">
              <div className="tool-label">历史操作</div>
              <Button.Group block>
                <Button icon={<UndoOutlined />}>撤销</Button>
                <Button icon={<RedoOutlined />}>重做</Button>
              </Button.Group>
            </div>
          </Card>
        </Col>
      </Row>

      {processing && (
        <div className="loading-mask">
          <div className="loading-content">
            <Spin size="large" indicator={<LoadingOutlined spin />} />
            <div className="loading-text">正在进行AI风格迁移...</div>
            <div className="loading-tip">这可能需要30-60秒，请耐心等待</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StyleTransferPage;
