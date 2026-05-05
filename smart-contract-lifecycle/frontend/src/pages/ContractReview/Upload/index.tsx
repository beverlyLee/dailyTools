import React, { useState } from 'react';
import {
  Upload,
  Button,
  Card,
  message,
  Spin,
  Descriptions,
  List,
  Tag,
  Divider,
  Typography,
  Row,
  Col,
  Alert,
  Space,
} from 'antd';
import {
  UploadOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import { UploadProps } from 'antd/lib/upload/interface';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;

interface ReviewResult {
  success: boolean;
  message: string;
  data: {
    contractTitle: string;
    contractType: string;
    amount: number | null;
    keyClauses: Array<{
      clauseType: string;
      content: string;
      extractedText: string;
    }>;
    riskPoints: Array<{
      riskType: string;
      description: string;
      riskLevel: string;
      suggestion: string;
      relatedClause: string;
    }>;
    templateComparisons: Array<{
      templateClause: string;
      contractClause: string;
      difference: string;
      isSignificant: boolean;
      riskLevel: string;
    }>;
    reviewOpinion: string;
    overallRiskLevel: string;
  };
}

const ContractReviewUpload: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [fileList, setFileList] = useState<any[]>([]);
  const [templateFile, setTemplateFile] = useState<any | null>(null);
  const [useTemplate, setUseTemplate] = useState(false);

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('请先选择要审查的合同文件');
      return;
    }

    setLoading(true);
    setReviewResult(null);

    try {
      const formData = new FormData();
      formData.append('file', fileList[0].originFileObj);

      let url = '/api/contract-review/upload';
      
      if (useTemplate && templateFile) {
        formData.append('contractFile', fileList[0].originFileObj);
        formData.append('templateFile', templateFile.originFileObj);
        url = '/api/contract-review/compare-with-template';
      }

      const response = await axios.post<ReviewResult>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setReviewResult(response.data);
        message.success('合同审查完成');
      } else {
        message.error(response.data.message || '合同审查失败');
      }
    } catch (error: any) {
      console.error('审查失败:', error);
      message.error(error.response?.data?.message || '合同审查失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    fileList,
    beforeUpload: (file) => {
      const isPdfOrWord =
        file.type === 'application/pdf' ||
        file.type ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.toLowerCase().endsWith('.pdf') ||
        file.name.toLowerCase().endsWith('.docx') ||
        file.name.toLowerCase().endsWith('.doc');
      if (!isPdfOrWord) {
        message.error('只能上传 PDF、DOCX 或 DOC 格式的文件!');
        return false;
      }
      const isLt50M = file.size / 1024 / 1024 < 50;
      if (!isLt50M) {
        message.error('文件大小不能超过 50MB!');
        return false;
      }
      setFileList([
        {
          uid: file.uid,
          name: file.name,
          status: 'done',
          originFileObj: file,
        },
      ]);
      return false;
    },
    onRemove: () => {
      setFileList([]);
      setReviewResult(null);
    },
  };

  const templateUploadProps: UploadProps = {
    beforeUpload: (file) => {
      const isPdfOrWord =
        file.type === 'application/pdf' ||
        file.type ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.toLowerCase().endsWith('.pdf') ||
        file.name.toLowerCase().endsWith('.docx') ||
        file.name.toLowerCase().endsWith('.doc');
      if (!isPdfOrWord) {
        message.error('模板文件只能上传 PDF、DOCX 或 DOC 格式的文件!');
        return false;
      }
      const isLt50M = file.size / 1024 / 1024 < 50;
      if (!isLt50M) {
        message.error('模板文件大小不能超过 50MB!');
        return false;
      }
      setTemplateFile({
        uid: file.uid,
        name: file.name,
        status: 'done',
        originFileObj: file,
      });
      return false;
    },
    onRemove: () => {
      setTemplateFile(null);
    },
    fileList: templateFile ? [templateFile] : [],
  };

  const getRiskLevelTag = (level: string) => {
    switch (level) {
      case 'HIGH':
        return <Tag color="error">高风险</Tag>;
      case 'MEDIUM':
        return <Tag color="warning">中风险</Tag>;
      case 'LOW':
        return <Tag color="success">低风险</Tag>;
      default:
        return <Tag color="default">未知</Tag>;
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'HIGH':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: '24px' }} />;
      case 'MEDIUM':
        return <WarningOutlined style={{ color: '#faad14', fontSize: '24px' }} />;
      case 'LOW':
        return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '24px' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff', fontSize: '24px' }} />;
    }
  };

  const renderRiskSummary = () => {
    if (!reviewResult?.data) return null;

    const { riskPoints, overallRiskLevel } = reviewResult.data;
    const highRiskCount = riskPoints?.filter((r) => r.riskLevel === 'HIGH').length || 0;
    const mediumRiskCount = riskPoints?.filter((r) => r.riskLevel === 'MEDIUM').length || 0;
    const lowRiskCount = riskPoints?.filter((r) => r.riskLevel === 'LOW').length || 0;

    let alertType: 'success' | 'warning' | 'error' | 'info' = 'info';
    let alertMessage = '';

    if (overallRiskLevel === 'HIGH') {
      alertType = 'error';
      alertMessage = '高风险：合同中发现多个高风险条款，建议慎重审查并与对方协商修改。';
    } else if (overallRiskLevel === 'MEDIUM') {
      alertType = 'warning';
      alertMessage = '中风险：合同中存在一些需要关注的风险点，建议审查并考虑是否需要修改。';
    } else if (overallRiskLevel === 'LOW') {
      alertType = 'success';
      alertMessage = '低风险：合同未发现明显的高风险条款，整体较为规范。';
    } else {
      alertType = 'info';
      alertMessage = '风险未知：无法评估合同风险水平。';
    }

    return (
      <Alert
        message={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ marginRight: '12px' }}>{getRiskLevelIcon(overallRiskLevel)}</div>
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                总体风险评估：{getRiskLevelTag(overallRiskLevel)}
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                <span>
                  高风险: <Tag color="error">{highRiskCount}</Tag>
                </span>
                <span>
                  中风险: <Tag color="warning">{mediumRiskCount}</Tag>
                </span>
                <span>
                  低风险: <Tag color="success">{lowRiskCount}</Tag>
                </span>
              </div>
            </div>
          </div>
        }
        description={alertMessage}
        type={alertType}
        showIcon
        style={{ marginBottom: '24px' }}
      />
    );
  };

  return (
    <div>
      <Title level={4}>
        <FileSearchOutlined style={{ marginRight: '8px' }} />
        合同智能审查
      </Title>

      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Title level={5}>上传合同文件</Title>
            <Upload.Dragger {...uploadProps} accept=".pdf,.docx,.doc" listType="picture">
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽合同文件到此处</p>
              <p className="ant-upload-hint">支持 PDF、DOCX、DOC 格式，文件大小不超过 50MB</p>
            </Upload.Dragger>
          </Col>

          <Col xs={24} lg={12}>
            <Title level={5}>对比模板审查（可选）</Title>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={useTemplate}
                  onChange={(e) => setUseTemplate(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                <span>使用模板进行对比审查</span>
              </label>
            </div>
            {useTemplate && (
              <Upload.Dragger {...templateUploadProps} accept=".pdf,.docx,.doc" listType="picture">
                <p className="ant-upload-drag-icon">
                  <FileTextOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽模板文件到此处</p>
                <p className="ant-upload-hint">支持 PDF、DOCX、DOC 格式，文件大小不超过 50MB</p>
              </Upload.Dragger>
            )}
          </Col>
        </Row>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Button
            type="primary"
            size="large"
            icon={<FileSearchOutlined />}
            onClick={handleUpload}
            loading={loading}
            disabled={fileList.length === 0}
          >
            开始智能审查
          </Button>
        </div>
      </Card>

      {loading && (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px' }}>
              <Text>正在进行智能审查，请稍候...</Text>
            </div>
            <div style={{ marginTop: '8px', color: '#999' }}>
              <Text type="secondary">系统正在分析合同内容、提取关键条款、识别风险点...</Text>
            </div>
          </div>
        </Card>
      )}

      {reviewResult && !loading && (
        <div>
          {renderRiskSummary()}

          <Card title="合同基本信息" style={{ marginBottom: '24px' }}>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="合同标题">
                {reviewResult.data.contractTitle || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="合同类型">
                <Tag color="blue">{reviewResult.data.contractType || '未识别'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="合同金额">
                {reviewResult.data.amount ? `¥${reviewResult.data.amount.toLocaleString()}` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="关键条款数">
                <Tag color="green">{reviewResult.data.keyClauses?.length || 0} 个</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {reviewResult.data.keyClauses && reviewResult.data.keyClauses.length > 0 && (
            <Card title="提取的关键条款" style={{ marginBottom: '24px' }}>
              <List
                dataSource={reviewResult.data.keyClauses}
                renderItem={(item, index) => (
                  <List.Item key={index}>
                    <List.Item.Meta
                      avatar={
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#e6f7ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <FileTextOutlined style={{ color: '#1890ff' }} />
                        </div>
                      }
                      title={
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <Tag color="blue" style={{ marginRight: '8px' }}>
                            {item.clauseType}
                          </Tag>
                        </div>
                      }
                      description={
                        <div>
                          <Paragraph
                            ellipsis={{ rows: 3, expandable: true, symbol: '查看更多' }}
                            style={{ margin: 0 }}
                          >
                            <Text strong>提取内容：</Text>
                            {item.extractedText || item.content}
                          </Paragraph>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}

          {reviewResult.data.riskPoints && reviewResult.data.riskPoints.length > 0 && (
            <Card title="发现的风险点" style={{ marginBottom: '24px' }}>
              <List
                dataSource={reviewResult.data.riskPoints}
                renderItem={(item, index) => (
                  <List.Item key={index}>
                    <List.Item.Meta
                      avatar={
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background:
                              item.riskLevel === 'HIGH'
                                ? '#fff1f0'
                                : item.riskLevel === 'MEDIUM'
                                ? '#fffbe6'
                                : '#f6ffed',
                          }}
                        >
                          {item.riskLevel === 'HIGH' ? (
                            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                          ) : item.riskLevel === 'MEDIUM' ? (
                            <WarningOutlined style={{ color: '#faad14' }} />
                          ) : (
                            <InfoCircleOutlined style={{ color: '#52c41a' }} />
                          )}
                        </div>
                      }
                      title={
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ marginRight: '8px', fontWeight: 500 }}>
                            {index + 1}. {item.riskType}
                          </span>
                          {getRiskLevelTag(item.riskLevel)}
                        </div>
                      }
                      description={
                        <div>
                          <div style={{ marginBottom: '8px' }}>
                            <Text strong>描述：</Text>
                            {item.description}
                          </div>
                          {item.suggestion && (
                            <div>
                              <Text strong>建议：</Text>
                              <Text type="success">{item.suggestion}</Text>
                            </div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}

          {reviewResult.data.templateComparisons && reviewResult.data.templateComparisons.length > 0 && (
            <Card title="模板对比分析" style={{ marginBottom: '24px' }}>
              <List
                dataSource={reviewResult.data.templateComparisons}
                renderItem={(item, index) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: item.isSignificant ? '#fffbe6' : '#e6f7ff',
                          }}
                        >
                          {item.isSignificant ? (
                            <WarningOutlined style={{ color: '#faad14' }} />
                          ) : (
                            <InfoCircleOutlined style={{ color: '#1890ff' }} />
                          )}
                        </div>
                      }
                      title={
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ marginRight: '8px', fontWeight: 500 }}>
                            {index + 1}. {item.difference}
                          </span>
                          {item.isSignificant && <Tag color="warning">重大差异</Tag>}
                          {getRiskLevelTag(item.riskLevel)}
                        </div>
                      }
                      description={
                        <div>
                          <div style={{ marginBottom: '4px' }}>
                            <Text strong>模板条款：</Text>
                            {item.templateClause}
                          </div>
                          <div>
                            <Text strong>合同条款：</Text>
                            {item.contractClause}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}

          <Card title="审查意见书" style={{ marginBottom: '24px' }}>
            <div
              style={{
                background: '#fafafa',
                padding: '20px',
                borderRadius: '4px',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.8',
              }}
            >
              {reviewResult.data.reviewOpinion}
            </div>
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <Button icon={<DownloadOutlined />}>下载审查意见书</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ContractReviewUpload;
