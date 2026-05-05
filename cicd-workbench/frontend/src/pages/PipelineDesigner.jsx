import React, { useState, useCallback } from 'react';
import { Button, Space, Modal, message, Input, Popconfirm, Tag } from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import yaml from 'js-yaml';
import { invoke } from '@tauri-apps/api/tauri';
import { save } from '@tauri-apps/api/dialog';
import { writeTextFile } from '@tauri-apps/api/fs';

const STAGE_TYPES = [
  { id: 'build', name: '构建', icon: '🔨', color: 'blue' },
  { id: 'test', name: '测试', icon: '🧪', color: 'green' },
  { id: 'deploy', name: '部署', icon: '🚀', color: 'purple' },
  { id: 'notify', name: '通知', icon: '📢', color: 'orange' },
];

const JOB_TEMPLATES = {
  build: [
    { id: 'npm-install', name: 'npm install', description: '安装依赖' },
    { id: 'npm-build', name: 'npm run build', description: '构建项目' },
    { id: 'docker-build', name: 'Docker Build', description: '构建Docker镜像' },
  ],
  test: [
    { id: 'unit-test', name: '单元测试', description: '运行单元测试' },
    { id: 'integration-test', name: '集成测试', description: '运行集成测试' },
    { id: 'lint', name: '代码检查', description: '代码风格检查' },
  ],
  deploy: [
    { id: 'deploy-dev', name: '部署开发环境', description: '部署到开发服务器' },
    { id: 'deploy-prod', name: '部署生产环境', description: '部署到生产服务器' },
    { id: 'rollback', name: '回滚', description: '回滚到上一版本' },
  ],
  notify: [
    { id: 'slack-notify', name: 'Slack通知', description: '发送Slack消息' },
    { id: 'email-notify', name: '邮件通知', description: '发送邮件通知' },
  ],
};

function PipelineDesigner() {
  const [stages, setStages] = useState([
    {
      id: 'stage-1',
      name: '构建阶段',
      type: 'build',
      jobs: [
        { id: 'job-1', name: 'npm install', description: '安装依赖', template: 'npm-install' },
        { id: 'job-2', name: 'npm run build', description: '构建项目', template: 'npm-build' },
      ],
    },
    {
      id: 'stage-2',
      name: '测试阶段',
      type: 'test',
      jobs: [
        { id: 'job-3', name: '单元测试', description: '运行单元测试', template: 'unit-test' },
      ],
    },
  ]);

  const [validationResult, setValidationResult] = useState(null);
  const [yamlPreviewModal, setYamlPreviewModal] = useState(false);
  const [yamlContent, setYamlContent] = useState('');
  const [editingStage, setEditingStage] = useState(null);
  const [stageNameInput, setStageNameInput] = useState('');

  const handleDragEnd = useCallback((result) => {
    const { source, destination, type } = result;

    if (!destination) return;

    if (type === 'stage') {
      const newStages = Array.from(stages);
      const [removed] = newStages.splice(source.index, 1);
      newStages.splice(destination.index, 0, removed);
      setStages(newStages);
      return;
    }

    const sourceStage = stages.find((s) => s.id === source.droppableId);
    const destStage = stages.find((s) => s.id === destination.droppableId);

    if (!sourceStage || !destStage) return;

    if (source.droppableId === destination.droppableId) {
      const newJobs = Array.from(sourceStage.jobs);
      const [removed] = newJobs.splice(source.index, 1);
      newJobs.splice(destination.index, 0, removed);

      setStages(
        stages.map((s) =>
          s.id === source.droppableId ? { ...s, jobs: newJobs } : s
        )
      );
    } else {
      const sourceJobs = Array.from(sourceStage.jobs);
      const destJobs = Array.from(destStage.jobs);
      const [removed] = sourceJobs.splice(source.index, 1);
      destJobs.splice(destination.index, 0, removed);

      setStages(
        stages.map((s) => {
          if (s.id === source.droppableId) return { ...s, jobs: sourceJobs };
          if (s.id === destination.droppableId) return { ...s, jobs: destJobs };
          return s;
        })
      );
    }
  }, [stages]);

  const addStage = (stageType) => {
    const newStage = {
      id: `stage-${Date.now()}`,
      name: `${stageType.name}阶段`,
      type: stageType.id,
      jobs: [],
    };
    setStages([...stages, newStage]);
  };

  const removeStage = (stageId) => {
    setStages(stages.filter((s) => s.id !== stageId));
  };

  const startEditStage = (stage) => {
    setEditingStage(stage.id);
    setStageNameInput(stage.name);
  };

  const saveStageName = () => {
    if (!stageNameInput.trim()) {
      message.error('阶段名称不能为空');
      return;
    }
    setStages(
      stages.map((s) =>
        s.id === editingStage ? { ...s, name: stageNameInput } : s
      )
    );
    setEditingStage(null);
    setStageNameInput('');
  };

  const addJob = (stageId, jobTemplate) => {
    const newJob = {
      id: `job-${Date.now()}`,
      name: jobTemplate.name,
      description: jobTemplate.description,
      template: jobTemplate.id,
    };

    setStages(
      stages.map((s) =>
        s.id === stageId ? { ...s, jobs: [...s.jobs, newJob] } : s
      )
    );
  };

  const removeJob = (stageId, jobId) => {
    setStages(
      stages.map((s) =>
        s.id === stageId ? { ...s, jobs: s.jobs.filter((j) => j.id !== jobId) } : s
      )
    );
  };

  const validatePipeline = async () => {
    try {
      const result = await invoke('validate_pipeline', { pipeline: { stages } });
      setValidationResult(result);
      if (result.valid) {
        message.success('流水线配置验证通过！');
      } else {
        message.error(`验证失败：${result.errors.join(', ')}`);
      }
    } catch (error) {
      message.error('验证失败：' + error);
    }
  };

  const exportToYAML = async () => {
    const pipelineConfig = {
      name: 'My Pipeline',
      version: '1.0',
      stages: stages.map((stage) => ({
        name: stage.name,
        type: stage.type,
        jobs: stage.jobs.map((job) => ({
          name: job.name,
          description: job.description,
          template: job.template,
        })),
      })),
    };

    try {
      const yamlStr = yaml.dump(pipelineConfig);
      setYamlContent(yamlStr);
      setYamlPreviewModal(true);
    } catch (error) {
      message.error('生成YAML失败：' + error);
    }
  };

  const downloadYAML = async () => {
    try {
      const filePath = await save({
        title: '保存流水线配置',
        defaultPath: 'pipeline.yaml',
        filters: [{ name: 'YAML', extensions: ['yaml', 'yml'] }],
      });

      if (filePath) {
        await writeTextFile(filePath, yamlContent);
        message.success('配置文件已保存');
        setYamlPreviewModal(false);
      }
    } catch (error) {
      message.error('保存文件失败：' + error);
    }
  };

  const getStageColor = (type) => {
    const stageType = STAGE_TYPES.find((t) => t.id === type);
    return stageType ? stageType.color : 'default';
  };

  const getStageIcon = (type) => {
    const stageType = STAGE_TYPES.find((t) => t.id === type);
    return stageType ? stageType.icon : '📋';
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>流水线可视化设计器</h2>
        <Space>
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={validatePipeline}>
            验证配置
          </Button>
          <Button icon={<DownloadOutlined />} onClick={exportToYAML}>
            导出YAML
          </Button>
        </Space>
      </div>

      {validationResult && (
        <div className={`validation-result ${validationResult.valid ? 'validation-success' : 'validation-error'}`}>
          <Space>
            {validationResult.valid ? (
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
            ) : (
              <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            )}
            <span>
              {validationResult.valid
                ? '配置验证通过'
                : `验证失败：${validationResult.errors?.join('; ')}`}
            </span>
          </Space>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="pipeline-designer">
          <div className="palette">
            <h3 style={{ marginBottom: 16, fontSize: 14, color: '#666' }}>
              组件面板
            </h3>
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8, fontSize: 12, color: '#999' }}>
                阶段类型
              </h4>
              {STAGE_TYPES.map((type) => (
                <div
                  key={type.id}
                  className="palette-item"
                  onClick={() => addStage(type)}
                >
                  <Space>
                    <span>{type.icon}</span>
                    <span>{type.name}</span>
                  </Space>
                </div>
              ))}
            </div>
          </div>

          <div className="designer-canvas">
            <Droppable droppableId="stages" type="stage">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={snapshot.isDraggingOver ? 'drag-over' : ''}
                >
                  {stages.length === 0 && (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: 40,
                        color: '#999',
                        border: '2px dashed #d9d9d9',
                        borderRadius: 8,
                      }}
                    >
                      从左侧面板拖拽阶段到此处开始设计流水线
                    </div>
                  )}

                  {stages.map((stage, stageIndex) => (
                    <Draggable
                      key={stage.id}
                      draggableId={stage.id}
                      index={stageIndex}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`stage-container ${snapshot.isDragging ? 'is-dragging' : ''}`}
                        >
                          <div className="stage-header">
                            <Space>
                              <div {...provided.dragHandleProps} style={{ cursor: 'grab' }}>
                                <span style={{ fontSize: 18 }}>
                                  {getStageIcon(stage.type)}
                                </span>
                              </div>
                              {editingStage === stage.id ? (
                                <Input
                                  value={stageNameInput}
                                  onChange={(e) => setStageNameInput(e.target.value)}
                                  onPressEnter={saveStageName}
                                  onBlur={saveStageName}
                                  autoFocus
                                  style={{ width: 200 }}
                                />
                              ) : (
                                <>
                                  <Tag color={getStageColor(stage.type)}>
                                    {STAGE_TYPES.find((t) => t.id === stage.type)?.name}
                                  </Tag>
                                  <strong>{stage.name}</strong>
                                </>
                              )}
                            </Space>
                            <Space>
                              {editingStage !== stage.id && (
                                <>
                                  <Button
                                    type="text"
                                    icon={<EditOutlined />}
                                    onClick={() => startEditStage(stage)}
                                  />
                                  <Popconfirm
                                    title="确定删除此阶段吗？"
                                    onConfirm={() => removeStage(stage.id)}
                                    okText="确定"
                                    cancelText="取消"
                                  >
                                    <Button
                                      type="text"
                                      danger
                                      icon={<DeleteOutlined />}
                                    />
                                  </Popconfirm>
                                </>
                              )}
                            </Space>
                          </div>

                          <Droppable droppableId={stage.id} type="job">
                            {(jobProvided, jobSnapshot) => (
                              <div
                                ref={jobProvided.innerRef}
                                {...jobProvided.droppableProps}
                                className={`job-list ${jobSnapshot.isDraggingOver ? 'drag-over' : ''}`}
                              >
                                {stage.jobs.length === 0 && (
                                  <div
                                    style={{
                                      textAlign: 'center',
                                      color: '#999',
                                      padding: 8,
                                    }}
                                  >
                                    拖拽任务到此处或从下方添加
                                  </div>
                                )}

                                {stage.jobs.map((job, jobIndex) => (
                                  <Draggable
                                    key={job.id}
                                    draggableId={job.id}
                                    index={jobIndex}
                                  >
                                    {(jobDraggableProvided, jobDraggableSnapshot) => (
                                      <div
                                        ref={jobDraggableProvided.innerRef}
                                        {...jobDraggableProvided.draggableProps}
                                        {...jobDraggableProvided.dragHandleProps}
                                        className={`job-item ${jobDraggableSnapshot.isDragging ? 'is-dragging' : ''}`}
                                      >
                                        <div>
                                          <strong>{job.name}</strong>
                                          <div style={{ fontSize: 12, color: '#666' }}>
                                            {job.description}
                                          </div>
                                        </div>
                                        <Popconfirm
                                          title="确定删除此任务吗？"
                                          onConfirm={() => removeJob(stage.id, job.id)}
                                          okText="确定"
                                          cancelText="取消"
                                        >
                                          <Button
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined />}
                                            size="small"
                                          />
                                        </Popconfirm>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {jobProvided.placeholder}
                              </div>
                            )}
                          </Droppable>

                          <div style={{ marginTop: 12 }}>
                            <h4 style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
                              快速添加任务：
                            </h4>
                            <Space wrap>
                              {(JOB_TEMPLATES[stage.type] || []).map((template) => (
                                <Button
                                  key={template.id}
                                  size="small"
                                  icon={<PlusOutlined />}
                                  onClick={() => addJob(stage.id, template)}
                                >
                                  {template.name}
                                </Button>
                              ))}
                            </Space>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </DragDropContext>

      <Modal
        title="YAML 配置预览"
        open={yamlPreviewModal}
        onCancel={() => setYamlPreviewModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setYamlPreviewModal(false)}>
            关闭
          </Button>,
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={downloadYAML}>
            下载文件
          </Button>,
        ]}
        width={700}
      >
        <div className="yaml-preview">{yamlContent}</div>
      </Modal>
    </div>
  );
}

export default PipelineDesigner;
