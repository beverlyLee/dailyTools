import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Input,
  Select,
  Radio,
  Space,
  Tabs,
  Typography,
  message,
  Divider,
} from 'antd';
import {
  SearchOutlined,
  FileTextOutlined,
  CodeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { HexViewResult, ViewMode } from '../types';
import { hexViewerApi } from '../lib/api';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Paragraph } = Typography;

const HexViewerPage: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [hexInput, setHexInput] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>({
    mode: 'Split',
    show_hex: true,
    show_ascii: true,
    bytes_per_row: 16,
    encoding: 'Utf8',
  });
  const [searchText, setSearchText] = useState<string>('');
  const [searchHex, setSearchHex] = useState<string>('');
  const [currentData, setCurrentData] = useState<number[]>([]);
  const [hexViewResults, setHexViewResults] = useState<HexViewResult[]>([]);
  const [textView, setTextView] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('input');

  const sampleData = generateSampleData();

  const handleLoadSample = () => {
    setCurrentData(sampleData);
    updateViews(sampleData);
    message.success('已加载示例数据');
  };

  const handleLoadFromText = () => {
    if (!inputText.trim()) {
      message.warning('请输入文本');
      return;
    }
    
    const encoder = new TextEncoder();
    const data = Array.from(encoder.encode(inputText));
    setCurrentData(data);
    updateViews(data);
    message.success(`已加载 ${data.length} 字节`);
  };

  const handleLoadFromHex = () => {
    if (!hexInput.trim()) {
      message.warning('请输入十六进制字符串');
      return;
    }

    try {
      const cleanHex = hexInput.replace(/\s/g, '');
      if (cleanHex.length % 2 !== 0) {
        throw new Error('十六进制字符串长度必须为偶数');
      }

      const data: number[] = [];
      for (let i = 0; i < cleanHex.length; i += 2) {
        const byte = parseInt(cleanHex.substring(i, i + 2), 16);
        if (isNaN(byte)) {
          throw new Error(`无效的十六进制字符: ${cleanHex.substring(i, i + 2)}`);
        }
        data.push(byte);
      }

      setCurrentData(data);
      updateViews(data);
      message.success(`已加载 ${data.length} 字节`);
    } catch (error: any) {
      message.error(error.message || '解析十六进制失败');
    }
  };

  const updateViews = async (data: number[]) => {
    try {
      const results = await hexViewerApi.formatHexView(data, 0);
      setHexViewResults(results);
      
      const text = await hexViewerApi.formatTextView(data);
      setTextView(text);
    } catch (error) {
      const results = formatHexViewLocal(data, 0, viewMode.bytes_per_row);
      setHexViewResults(results);
      
      const decoder = new TextDecoder(viewMode.encoding === 'Utf8' ? 'utf-8' : 'latin-1');
      const text = decoder.decode(new Uint8Array(data));
      setTextView(text);
    }
  };

  const formatHexViewLocal = (data: number[], offset: number, bytesPerRow: number): HexViewResult[] => {
    const results: HexViewResult[] = [];
    
    for (let i = 0; i < data.length; i += bytesPerRow) {
      const chunk = data.slice(i, i + bytesPerRow);
      const hexBytes = chunk.map((b) => b.toString(16).padStart(2, '0'));
      
      const ascii = chunk
        .map((b) => {
          if (b >= 32 && b <= 126) {
            return String.fromCharCode(b);
          }
          return '.';
        })
        .join('');
      
      results.push({
        offset: offset + i,
        hex_bytes: hexBytes,
        ascii,
        raw_bytes: chunk,
      });
    }
    
    return results;
  };

  const handleSearchText = async () => {
    if (!searchText.trim() || currentData.length === 0) {
      return;
    }

    try {
      const positions = await hexViewerApi.searchText(currentData, searchText);
      if (positions.length > 0) {
        message.success(`找到 ${positions.length} 个匹配: 位置 ${positions.join(', ')}`);
      } else {
        message.info('未找到匹配');
      }
    } catch (error) {
      const text = new TextDecoder().decode(new Uint8Array(currentData));
      const regex = new RegExp(searchText, 'g');
      const positions: number[] = [];
      let match;
      while ((match = regex.exec(text)) !== null) {
        positions.push(match.index);
      }
      
      if (positions.length > 0) {
        message.success(`找到 ${positions.length} 个匹配: 位置 ${positions.join(', ')}`);
      } else {
        message.info('未找到匹配');
      }
    }
  };

  const handleSearchHex = async () => {
    if (!searchHex.trim() || currentData.length === 0) {
      return;
    }

    try {
      const positions = await hexViewerApi.searchHex(currentData, searchHex);
      if (positions.length > 0) {
        message.success(`找到 ${positions.length} 个匹配: 位置 ${positions.join(', ')}`);
      } else {
        message.info('未找到匹配');
      }
    } catch (error) {
      try {
        const cleanHex = searchHex.replace(/\s/g, '');
        if (cleanHex.length % 2 !== 0) {
          throw new Error('十六进制字符串长度必须为偶数');
        }

        const pattern: number[] = [];
        for (let i = 0; i < cleanHex.length; i += 2) {
          const byte = parseInt(cleanHex.substring(i, i + 2), 16);
          if (isNaN(byte)) {
            throw new Error('无效的十六进制字符');
          }
          pattern.push(byte);
        }

        const positions: number[] = [];
        for (let i = 0; i <= currentData.length - pattern.length; i++) {
          let match = true;
          for (let j = 0; j < pattern.length; j++) {
            if (currentData[i + j] !== pattern[j]) {
              match = false;
              break;
            }
          }
          if (match) {
            positions.push(i);
          }
        }

        if (positions.length > 0) {
          message.success(`找到 ${positions.length} 个匹配: 位置 ${positions.join(', ')}`);
        } else {
          message.info('未找到匹配');
        }
      } catch (err: any) {
        message.error(err.message || '搜索失败');
      }
    }
  };

  const handleViewModeChange = async (newMode: Partial<ViewMode>) => {
    const updatedMode = { ...viewMode, ...newMode };
    setViewMode(updatedMode);
    
    try {
      await hexViewerApi.setViewMode(updatedMode);
    } catch (error) {
      // Local fallback
    }
    
    if (currentData.length > 0) {
      updateViews(currentData);
    }
  };

  const getViewModeContent = () => {
    switch (viewMode.mode) {
      case 'Hex':
        return (
          <div className="hex-viewer" style={{ maxHeight: 500 }}>
            {hexViewResults.map((row, idx) => (
              <div key={idx} className="hex-row">
                <span className="offset">{row.offset.toString(16).padStart(8, '0')}</span>
                <span className="hex-bytes">
                  {row.hex_bytes.slice(0, 8).map((h, i) => (
                    <span key={i} className="hex-byte">{h}</span>
                  ))}
                  <span className="separator"> </span>
                  {row.hex_bytes.slice(8).map((h, i) => (
                    <span key={i + 8} className="hex-byte">{h}</span>
                  ))}
                  {Array.from({
                    length: Math.max(0, viewMode.bytes_per_row - row.hex_bytes.length),
                  }).map((_, i) => (
                    <span key={`pad-${i}`} className="hex-byte">  </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        );
      case 'Text':
        return (
          <div
            style={{
              background: '#1e1e1e',
              border: '1px solid #434343',
              borderRadius: 6,
              padding: 16,
              fontFamily: "'SF Mono', Monaco, monospace",
              fontSize: 13,
              maxHeight: 500,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              color: '#d4d4d4',
            }}
          >
            {textView || '无数据'}
          </div>
        );
      case 'Split':
      default:
        return (
          <Row gutter={16}>
            <Col span={16}>
              <div className="hex-viewer" style={{ maxHeight: 500 }}>
                {hexViewResults.map((row, idx) => (
                  <div key={idx} className="hex-row">
                    <span className="offset">{row.offset.toString(16).padStart(8, '0')}</span>
                    <span className="hex-bytes">
                      {row.hex_bytes.slice(0, 8).map((h, i) => (
                        <span key={i} className="hex-byte">{h}</span>
                      ))}
                      <span className="separator"> </span>
                      {row.hex_bytes.slice(8).map((h, i) => (
                        <span key={i + 8} className="hex-byte">{h}</span>
                      ))}
                    </span>
                    <span className="ascii">{row.ascii}</span>
                  </div>
                ))}
              </div>
            </Col>
            <Col span={8}>
              <div
                style={{
                  background: '#1e1e1e',
                  border: '1px solid #434343',
                  borderRadius: 6,
                  padding: 16,
                  fontFamily: "'SF Mono', Monaco, monospace",
                  fontSize: 13,
                  maxHeight: 500,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  color: '#d4d4d4',
                }}
              >
                {textView || '无数据'}
              </div>
            </Col>
          </Row>
        );
    }
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            title={
              <Space>
                <CodeOutlined />
                <span>数据输入</span>
              </Space>
            }
            extra={
              <Button icon={<ReloadOutlined />} onClick={handleLoadSample}>
                加载示例
              </Button>
            }
          >
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <TabPane tab="文本输入" key="input">
                <Row gutter={16}>
                  <Col span={20}>
                    <TextArea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="在此输入要查看的文本..."
                      rows={4}
                    />
                  </Col>
                  <Col span={4} style={{ display: 'flex', alignItems: 'center' }}>
                    <Button type="primary" onClick={handleLoadFromText} block>
                      加载文本
                    </Button>
                  </Col>
                </Row>
              </TabPane>
              <TabPane tab="十六进制输入" key="hex">
                <Row gutter={16}>
                  <Col span={20}>
                    <TextArea
                      value={hexInput}
                      onChange={(e) => setHexInput(e.target.value)}
                      placeholder="在此输入十六进制字符串 (例如: 48 65 6C 6C 6F)..."
                      rows={4}
                    />
                  </Col>
                  <Col span={4} style={{ display: 'flex', alignItems: 'center' }}>
                    <Button type="primary" onClick={handleLoadFromHex} block>
                      加载十六进制
                    </Button>
                  </Col>
                </Row>
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>

      <Card
        style={{ marginTop: 16 }}
        title={
          <Space>
            <SearchOutlined />
            <span>搜索</span>
          </Space>
        }
        size="small"
      >
        <Row gutter={[16, 8]}>
          <Col span={10}>
            <Input.Search
              placeholder="搜索文本..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearchText}
              enterButton="搜索文本"
            />
          </Col>
          <Col span={10}>
            <Input.Search
              placeholder="搜索十六进制 (例如: 48 65 6C 6C 6F)..."
              value={searchHex}
              onChange={(e) => setSearchHex(e.target.value)}
              onSearch={handleSearchHex}
              enterButton="搜索十六进制"
            />
          </Col>
          <Col span={4} style={{ textAlign: 'right' }}>
            <span style={{ marginRight: 8 }}>数据大小:</span>
            <Tag color="blue">{currentData.length} 字节</Tag>
          </Col>
        </Row>
      </Card>

      <Card
        style={{ marginTop: 16 }}
        title={
          <Space>
            <FileTextOutlined />
            <span>查看选项</span>
          </Space>
        }
        size="small"
      >
        <Row gutter={[16, 8]} align="middle">
          <Col span={4}>
            <span style={{ marginRight: 8 }}>视图模式:</span>
            <Radio.Group
              value={viewMode.mode}
              onChange={(e) => handleViewModeChange({ mode: e.target.value })}
            >
              <Radio.Button value="Hex">十六进制</Radio.Button>
              <Radio.Button value="Text">文本</Radio.Button>
              <Radio.Button value="Split">分屏</Radio.Button>
            </Radio.Group>
          </Col>
          <Col span={4}>
            <span style={{ marginRight: 8 }}>每行字节:</span>
            <Select
              value={viewMode.bytes_per_row}
              onChange={(v) => handleViewModeChange({ bytes_per_row: v })}
              style={{ width: 100 }}
            >
              <Option value={8}>8</Option>
              <Option value={16}>16</Option>
              <Option value={32}>32</Option>
            </Select>
          </Col>
          <Col span={4}>
            <span style={{ marginRight: 8 }}>编码:</span>
            <Select
              value={viewMode.encoding}
              onChange={(v) => handleViewModeChange({ encoding: v })}
              style={{ width: 120 }}
            >
              <Option value="Utf8">UTF-8</Option>
              <Option value="Latin1">Latin-1</Option>
              <Option value="Utf16">UTF-16</Option>
              <Option value="Ascii">ASCII</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      <Card
        style={{ marginTop: 16 }}
        title={
          <Space>
            <CodeOutlined />
            <span>数据视图</span>
          </Space>
        }
      >
        {currentData.length > 0 ? (
          getViewModeContent()
        ) : (
          <div style={{ textAlign: 'center', padding: 48, color: 'rgba(255,255,255,0.45)' }}>
            <CodeOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <Paragraph>
              请通过以下方式加载数据:
            </Paragraph>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li>1. 在"数据输入"区域输入文本或十六进制字符串</li>
              <li>2. 或点击"加载示例"按钮查看示例数据</li>
              <li>3. 或从嗅探器和会话分析器中选择数据包查看</li>
            </ul>
          </div>
        )}
      </Card>

      <Card
        style={{ marginTop: 16 }}
        title="使用说明"
        size="small"
      >
        <Row gutter={[16, 8]}>
          <Col span={6}>
            <Title level={5}>文本输入</Title>
            <Paragraph>
              输入任意文本，系统将自动转换为字节并显示十六进制视图。
            </Paragraph>
          </Col>
          <Col span={6}>
            <Title level={5}>十六进制输入</Title>
            <Paragraph>
              输入十六进制字符串，支持空格分隔。例如: 48 65 6C 6C 6F
            </Paragraph>
          </Col>
          <Col span={6}>
            <Title level={5}>搜索功能</Title>
            <Paragraph>
              支持文本搜索和十六进制搜索，可以快速定位数据中的特定模式。
            </Paragraph>
          </Col>
          <Col span={6}>
            <Title level={5}>多种视图</Title>
            <Paragraph>
              支持纯十六进制视图、纯文本视图和分屏视图，可调整每行字节数。
            </Paragraph>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

function generateSampleData(): number[] {
  const data: number[] = [];

  const httpRequest =
    'GET /index.html HTTP/1.1\r\n' +
    'Host: example.com\r\n' +
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\n' +
    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8\r\n' +
    'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8\r\n' +
    '\r\n';

  data.push(...Array.from(new TextEncoder().encode(httpRequest)));

  const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const ihdrChunk = [
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00,
    0x00, 0x40, 0x08, 0x06, 0x00, 0x00, 0x00, 0xaa, 0x69, 0x71, 0xde,
  ];

  data.push(...pngHeader, ...ihdrChunk);

  const randomBytes = Array.from({ length: 64 }, () => Math.floor(Math.random() * 256));
  data.push(...randomBytes);

  return data;
}

export default HexViewerPage;
