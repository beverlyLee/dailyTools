import React, { useState, useEffect, useCallback } from 'react'
import {
  Layout,
  Card,
  Button,
  List,
  Modal,
  Form,
  Input,
  message,
  Space,
  Typography,
  Empty,
  Tabs,
  Select,
  Tag,
  Table,
  Switch,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  ScheduleOutlined,
  MailOutlined,
  DownloadOutlined,
  PlayCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { reportApi } from '../services/api'
import { ReportTemplate, ReportSchedule, Parameter } from '../types'

const { Header, Content, Sider } = Layout
const { Title, Text, Paragraph } = Typography
const { TabPane } = Tabs
const { TextArea } = Input

const ReportGenerator: React.FC = () => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [schedules, setSchedules] = useState<ReportSchedule[]>([])
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null)
  const [loading, setLoading] = useState(false)
  
  const [isCreateTemplateModalVisible, setIsCreateTemplateModalVisible] = useState(false)
  const [isGenerateReportModalVisible, setIsGenerateReportModalVisible] = useState(false)
  const [isAddScheduleModalVisible, setIsAddScheduleModalVisible] = useState(false)
  const [isEditTemplateModalVisible, setIsEditTemplateModalVisible] = useState(false)
  
  const [templateForm] = Form.useForm()
  const [generateForm] = Form.useForm()
  const [scheduleForm] = Form.useForm()
  const [editTemplateForm] = Form.useForm()
  
  const [activeTab, setActiveTab] = useState('templates')
  const [reportParameters, setReportParameters] = useState<Record<string, string | number>>({})

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [templatesRes, schedulesRes] = await Promise.all([
        reportApi.getTemplates(),
        reportApi.getSchedules(),
      ])
      setTemplates(templatesRes.data)
      setSchedules(schedulesRes.data)
    } catch (error) {
      console.error('加载数据失败:', error)
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateTemplate = async (values: { name: string; description?: string }) => {
    try {
      await reportApi.createTemplate(values)
      message.success('模板创建成功')
      setIsCreateTemplateModalVisible(false)
      templateForm.resetFields()
      loadData()
    } catch (error) {
      console.error('创建模板失败:', error)
      message.error('创建模板失败')
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个模板吗？此操作不可恢复。',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await reportApi.deleteTemplate(templateId)
          message.success('模板删除成功')
          if (selectedTemplate?.id === templateId) {
            setSelectedTemplate(null)
          }
          loadData()
        } catch (error) {
          console.error('删除模板失败:', error)
          message.error('删除模板失败')
        }
      },
    })
  }

  const handleCreateSampleTemplates = async () => {
    try {
      await reportApi.createSampleTemplates()
      message.success('示例模板创建成功')
      loadData()
    } catch (error) {
      console.error('创建示例模板失败:', error)
      message.error('创建示例模板失败')
    }
  }

  const handleGenerateReport = async (values: { format: string }) => {
    if (!selectedTemplate) return

    try {
      const response = await reportApi.generateReport({
        templateId: selectedTemplate.id,
        parameters: reportParameters,
        format: values.format,
      })
      message.success('报告生成成功')
      setIsGenerateReportModalVisible(false)
      generateForm.resetFields()
      
      if (response.data.downloadUrl) {
        window.open(response.data.downloadUrl, '_blank')
      }
    } catch (error) {
      console.error('生成报告失败:', error)
      message.error('生成报告失败')
    }
  }

  const handleAddSchedule = async (values: {
    schedule: string
    format: string
    emailRecipients: string
    enabled: boolean
  }) => {
    if (!selectedTemplate) return

    try {
      const emailRecipients = values.emailRecipients.split(',').map((e) => e.trim()).filter(Boolean)
      
      await reportApi.createSchedule({
        templateId: selectedTemplate.id,
        parameters: reportParameters,
        emailRecipients,
        schedule: values.schedule,
        format: values.format,
        enabled: values.enabled,
      })
      message.success('定时任务创建成功')
      setIsAddScheduleModalVisible(false)
      scheduleForm.resetFields()
      loadData()
    } catch (error) {
      console.error('创建定时任务失败:', error)
      message.error('创建定时任务失败')
    }
  }

  const handleToggleSchedule = async (scheduleId: string, enabled: boolean) => {
    try {
      await reportApi.updateSchedule(scheduleId, { enabled })
      message.success(enabled ? '定时任务已启用' : '定时任务已禁用')
      loadData()
    } catch (error) {
      console.error('更新定时任务失败:', error)
      message.error('更新定时任务失败')
    }
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个定时任务吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await reportApi.deleteSchedule(scheduleId)
          message.success('定时任务删除成功')
          loadData()
        } catch (error) {
          console.error('删除定时任务失败:', error)
          message.error('删除定时任务失败')
        }
      },
    })
  }

  const handleEditTemplate = async (values: {
    name?: string
    description?: string
    content?: string
    parameters?: Parameter[]
  }) => {
    if (!selectedTemplate) return

    try {
      await reportApi.updateTemplate(selectedTemplate.id, values)
      message.success('模板更新成功')
      setIsEditTemplateModalVisible(false)
      editTemplateForm.resetFields()
      loadData()
    } catch (error) {
      console.error('更新模板失败:', error)
      message.error('更新模板失败')
    }
  }

  const handleParameterChange = (name: string, value: string | number) => {
    setReportParameters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const scheduleColumns = [
    {
      title: '模板名称',
      dataIndex: 'templateId',
      key: 'templateId',
      render: (templateId: string) => {
        const template = templates.find((t) => t.id === templateId)
        return template?.name || templateId
      },
    },
    {
      title: '调度时间',
      dataIndex: 'schedule',
      key: 'schedule',
    },
    {
      title: '格式',
      dataIndex: 'format',
      key: 'format',
      render: (format: string) => {
        let color = 'default'
        if (format === 'pdf') color = 'red'
        if (format === 'pptx') color = 'orange'
        return <Tag color={color}>{format.toUpperCase()}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean, record: ReportSchedule) => (
        <Switch
          checked={enabled}
          onChange={(checked) => handleToggleSchedule(record.id, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: ReportSchedule) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteSchedule(record.id)}
        >
          删除
        </Button>
      ),
    },
  ]

  return (
    <Layout style={{ minHeight: '80vh', background: '#f0f2f5' }}>
      <Sider width={300} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: 16 }}>
          <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
            <Title level={4} style={{ margin: 0 }}>
              <FilePdfOutlined style={{ marginRight: 8 }} />
              报告模板
            </Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateTemplateModalVisible(true)}>
              新建
            </Button>
          </Space>
          
          <Button 
            type="dashed" 
            block 
            style={{ marginBottom: 16 }}
            onClick={handleCreateSampleTemplates}
          >
            创建示例模板
          </Button>

          <List
            loading={loading}
            dataSource={templates}
            locale={{ emptyText: <Empty description="暂无模板，请创建新模板" /> }}
            renderItem={(template) => (
              <List.Item
                style={{
                  cursor: 'pointer',
                  background: selectedTemplate?.id === template.id ? '#e6f7ff' : 'transparent',
                  padding: '8px 12px',
                  marginBottom: 8,
                  borderRadius: 6,
                }}
                onClick={() => {
                  setSelectedTemplate(template)
                  const params: Record<string, string | number> = {}
                  template.parameters.forEach((p) => {
                    params[p.name] = p.value
                  })
                  setReportParameters(params)
                }}
                actions={[
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedTemplate(template)
                      editTemplateForm.setFieldsValue({
                        name: template.name,
                        description: template.description,
                        content: template.content,
                      })
                      setIsEditTemplateModalVisible(true)
                    }}
                  >
                    编辑
                  </Button>,
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteTemplate(template.id)
                    }}
                  >
                    删除
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={template.name}
                  description={
                    <span style={{ color: '#999' }}>
                      {template.parameters.length} 个参数 | 
                      更新于 {new Date(template.updatedAt).toLocaleDateString()}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      </Sider>

      <Layout>
        <Content style={{ padding: 24 }}>
          {selectedTemplate ? (
            <Card
              title={
                <Space>
                  <FileTextOutlined />
                  {selectedTemplate.name}
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={() => setIsGenerateReportModalVisible(true)}
                  >
                    生成报告
                  </Button>
                  <Button
                    icon={<ScheduleOutlined />}
                    onClick={() => setIsAddScheduleModalVisible(true)}
                  >
                    设置定时任务
                  </Button>
                </Space>
              }
              size="small"
            >
              <Tabs defaultActiveKey="info" onChange={setActiveTab}>
                <TabPane
                  tab={
                    <span>
                      <SettingOutlined />
                      模板信息
                    </span>
                  }
                  key="info"
                >
                  <Card size="small" style={{ marginBottom: 16 }} title="描述">
                    <Paragraph>{selectedTemplate.description || '暂无描述'}</Paragraph>
                  </Card>

                  <Card size="small" title="参数配置">
                    {selectedTemplate.parameters.length === 0 ? (
                      <Empty description="暂无参数配置" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                      <List
                        grid={{ gutter: 16, column: 2 }}
                        dataSource={selectedTemplate.parameters}
                        renderItem={(parameter) => (
                          <List.Item>
                            <Card
                              size="small"
                              title={
                                <Space>
                                  <SettingOutlined />
                                  {parameter.label}
                                  <Tag>{parameter.type === 'slider' ? '滑块' : '下拉框'}</Tag>
                                </Space>
                              }
                            >
                              <Text strong>参数名: </Text>
                              <Text code>{parameter.name}</Text>
                              <br />
                              <Text strong>当前值: </Text>
                              <Text>{String(parameter.value)}</Text>
                            </Card>
                          </List.Item>
                        )}
                      />
                    )}
                  </Card>
                </TabPane>

                <TabPane
                  tab={
                    <span>
                      <ScheduleOutlined />
                      定时任务
                    </span>
                  }
                  key="schedules"
                >
                  <Card size="small">
                    <Table
                      dataSource={schedules.filter((s) => s.templateId === selectedTemplate.id)}
                      columns={scheduleColumns}
                      rowKey="id"
                      locale={{ emptyText: <Empty description="暂无定时任务" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                    />
                  </Card>
                </TabPane>
              </Tabs>
            </Card>
          ) : (
            <Card style={{ textAlign: 'center', padding: 48 }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span>
                    请从左侧选择一个报告模板，或创建新模板
                  </span>
                }
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateTemplateModalVisible(true)}>
                  创建新模板
                </Button>
              </Empty>
            </Card>
          )}
        </Content>
      </Layout>

      <Modal
        title="创建新模板"
        open={isCreateTemplateModalVisible}
        onCancel={() => setIsCreateTemplateModalVisible(false)}
        footer={null}
      >
        <Form
          form={templateForm}
          layout="vertical"
          onFinish={handleCreateTemplate}
        >
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="请输入模板名称" />
          </Form.Item>
          <Form.Item
            name="description"
            label="模板描述"
          >
            <TextArea rows={4} placeholder="请输入模板描述" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsCreateTemplateModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑模板"
        open={isEditTemplateModalVisible}
        onCancel={() => setIsEditTemplateModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={editTemplateForm}
          layout="vertical"
          onFinish={handleEditTemplate}
        >
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="请输入模板名称" />
          </Form.Item>
          <Form.Item
            name="description"
            label="模板描述"
          >
            <TextArea rows={2} placeholder="请输入模板描述" />
          </Form.Item>
          <Form.Item
            name="content"
            label="模板内容 (HTML)"
          >
            <TextArea rows={12} placeholder="请输入模板 HTML 内容，支持 Jinja2 模板语法" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsEditTemplateModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {selectedTemplate && (
        <Modal
          title="生成报告"
          open={isGenerateReportModalVisible}
          onCancel={() => setIsGenerateReportModalVisible(false)}
          footer={null}
        >
          <Form
            form={generateForm}
            layout="vertical"
            onFinish={handleGenerateReport}
            initialValues={{ format: 'html' }}
          >
            {selectedTemplate.parameters.length > 0 && (
              <Card size="small" style={{ marginBottom: 16 }} title="参数设置">
                <List
                  dataSource={selectedTemplate.parameters}
                  renderItem={(parameter) => (
                    <List.Item>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>
                        {parameter.label}
                      </Text>
                      {parameter.type === 'slider' && (
                        <Slider
                          min={parameter.min || 0}
                          max={parameter.max || 100}
                          step={parameter.step || 1}
                          value={typeof reportParameters[parameter.name] === 'number' ? reportParameters[parameter.name] as number : 0}
                          onChange={(value) => handleParameterChange(parameter.name, value)}
                          marks={{
                            [parameter.min || 0]: `${parameter.min || 0}`,
                            [parameter.max || 100]: `${parameter.max || 100}`,
                          }}
                        />
                      )}
                      {parameter.type === 'dropdown' && (
                        <Select
                          style={{ width: '100%' }}
                          value={reportParameters[parameter.name]}
                          onChange={(value) => handleParameterChange(parameter.name, value)}
                          options={parameter.options?.map((opt) => ({
                            label: opt.label,
                            value: opt.value,
                          }))}
                        />
                      )}
                    </List.Item>
                  )}
                />
              </Card>
            )}

            <Form.Item
              name="format"
              label="导出格式"
              rules={[{ required: true, message: '请选择导出格式' }]}
            >
              <Select placeholder="请选择导出格式">
                <Select.Option value="html">HTML (可交互)</Select.Option>
                <Select.Option value="pdf">PDF</Select.Option>
                <Select.Option value="pptx">PPTX</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setIsGenerateReportModalVisible(false)}>
                  取消
                </Button>
                <Button type="primary" icon={<DownloadOutlined />} htmlType="submit">
                  生成并下载
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      )}

      {selectedTemplate && (
        <Modal
          title="设置定时任务"
          open={isAddScheduleModalVisible}
          onCancel={() => setIsAddScheduleModalVisible(false)}
          footer={null}
        >
          <Form
            form={scheduleForm}
            layout="vertical"
            onFinish={handleAddSchedule}
            initialValues={{ format: 'html', enabled: true, schedule: 'daily 09:00' }}
          >
            {selectedTemplate.parameters.length > 0 && (
              <Card size="small" style={{ marginBottom: 16 }} title="参数设置">
                <List
                  dataSource={selectedTemplate.parameters}
                  renderItem={(parameter) => (
                    <List.Item>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>
                        {parameter.label}
                      </Text>
                      {parameter.type === 'slider' && (
                        <Slider
                          min={parameter.min || 0}
                          max={parameter.max || 100}
                          step={parameter.step || 1}
                          value={typeof reportParameters[parameter.name] === 'number' ? reportParameters[parameter.name] as number : 0}
                          onChange={(value) => handleParameterChange(parameter.name, value)}
                          marks={{
                            [parameter.min || 0]: `${parameter.min || 0}`,
                            [parameter.max || 100]: `${parameter.max || 100}`,
                          }}
                        />
                      )}
                      {parameter.type === 'dropdown' && (
                        <Select
                          style={{ width: '100%' }}
                          value={reportParameters[parameter.name]}
                          onChange={(value) => handleParameterChange(parameter.name, value)}
                          options={parameter.options?.map((opt) => ({
                            label: opt.label,
                            value: opt.value,
                          }))}
                        />
                      )}
                    </List.Item>
                  )}
                />
              </Card>
            )}

            <Form.Item
              name="schedule"
              label="调度时间"
              rules={[{ required: true, message: '请选择调度时间' }]}
            >
              <Select placeholder="请选择调度时间">
                <Select.Option value="daily 09:00">每天 09:00</Select.Option>
                <Select.Option value="daily 18:00">每天 18:00</Select.Option>
                <Select.Option value="weekly monday 09:00">每周一 09:00</Select.Option>
                <Select.Option value="weekly friday 18:00">每周五 18:00</Select.Option>
                <Select.Option value="hourly">每小时</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="format"
              label="报告格式"
              rules={[{ required: true, message: '请选择报告格式' }]}
            >
              <Select placeholder="请选择报告格式">
                <Select.Option value="html">HTML</Select.Option>
                <Select.Option value="pdf">PDF</Select.Option>
                <Select.Option value="pptx">PPTX</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="emailRecipients"
              label="邮件接收人（多个用逗号分隔）"
              rules={[{ required: true, message: '请输入邮件接收人' }]}
            >
              <Input placeholder="例如: user1@example.com, user2@example.com" />
            </Form.Item>

            <Form.Item
              name="enabled"
              label="立即启用"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setIsAddScheduleModalVisible(false)}>
                  取消
                </Button>
                <Button type="primary" icon={<ScheduleOutlined />} htmlType="submit">
                  创建定时任务
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      )}
    </Layout>
  )
}

export default ReportGenerator
