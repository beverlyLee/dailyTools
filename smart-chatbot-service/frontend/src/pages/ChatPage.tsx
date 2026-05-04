import React, { useState, useEffect, useRef } from 'react';
import { 
  Layout, 
  Menu, 
  Input, 
  Button, 
  List, 
  Avatar, 
  Card, 
  Badge, 
  message, 
  Empty,
  Tag,
  Space,
  Modal,
  Form
} from 'antd';
import {
  MessageOutlined,
  SendOutlined,
  PlusOutlined,
  DeleteOutlined,
  RobotOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { chatApi } from '../services/api';
import { Conversation, Message, TicketInfo } from '../types';
import dayjs from 'dayjs';

const { Sider, Content, Header } = Layout;
const { TextArea } = Input;

const ChatPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [currentTicketInfo, setCurrentTicketInfo] = useState<TicketInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await chatApi.getConversations();
      setConversations(response.conversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    setCurrentConversation(conversation);
    try {
      const response = await chatApi.getConversation(conversation.id);
      setMessages(response.messages || []);
    } catch (error) {
      console.error('Failed to load conversation:', error);
      message.error('加载对话失败');
    }
  };

  const handleNewChat = () => {
    setCurrentConversation(null);
    setMessages([]);
    setInputValue('');
  };

  const handleDeleteConversation = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    try {
      await chatApi.deleteConversation(conversationId);
      setConversations((prev) => prev.filter((conv) => conv.id !== conversationId));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
      message.success('对话已删除');
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      message.error('删除对话失败');
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage({
        content: userInput,
        conversation_id: currentConversation?.id,
      });

      const assistantMessage: Message = {
        ...response.assistant_message,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (response.ticket_created && response.ticket_info) {
        setCurrentTicketInfo(response.ticket_info);
        setTicketModalVisible(true);
      }

      if (!currentConversation) {
        const newConversation: Conversation = {
          id: response.conversation_id,
          title: response.user_message.content.slice(0, 50),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setConversations((prev) => [newConversation, ...prev]);
        setCurrentConversation(newConversation);
      } else {
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === currentConversation.id
              ? { ...conv, updated_at: new Date().toISOString() }
              : conv
          )
        );
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，发送消息时发生错误。请检查后端服务是否正常运行。',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      message.error('发送消息失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      open: { color: 'red', text: '待处理' },
      in_progress: { color: 'orange', text: '处理中' },
      resolved: { color: 'green', text: '已解决' },
      closed: { color: 'default', text: '已关闭' },
    };
    const info = statusMap[status] || { color: 'default', text: status };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const renderMessage = (msg: Message) => {
    const isUser = msg.role === 'user';
    
    return (
      <div
        key={msg.id}
        style={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginBottom: 16,
          padding: '0 16px',
        }}
      >
        {!isUser && (
          <Avatar
            icon={<RobotOutlined />}
            style={{ backgroundColor: '#1890ff', marginRight: 12 }}
          />
        )}
        <div
          style={{
            maxWidth: '70%',
          }}
        >
          <Card
            size="small"
            style={{
              backgroundColor: isUser ? '#1890ff' : '#f0f0f0',
              border: 'none',
            }}
            bodyStyle={{
              padding: '8px 12px',
            }}
          >
            <div style={{ 
              whiteSpace: 'pre-wrap', 
              wordBreak: 'break-word',
              color: isUser ? '#fff' : 'rgba(0, 0, 0, 0.85)'
            }}>
              {msg.content}
            </div>
          </Card>
          <div
            style={{
              fontSize: 12,
              color: '#999',
              marginTop: 4,
              textAlign: isUser ? 'right' : 'left',
            }}
          >
            {dayjs(msg.created_at).format('HH:mm')}
            {msg.intent && (
              <Tag style={{ marginLeft: 8, fontSize: 10 }} size="small">
                {msg.intent}
              </Tag>
            )}
          </div>
        </div>
        {isUser && (
          <Avatar
            icon={<UserOutlined />}
            style={{ backgroundColor: '#52c41a', marginLeft: 12 }}
          />
        )}
      </div>
    );
  };

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider width={280} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }}>
          <Button
            type="primary"
            block
            icon={<PlusOutlined />}
            onClick={handleNewChat}
          >
            新建对话
          </Button>
        </div>
        
        <div style={{ height: 'calc(100vh - 80px)', overflow: 'auto' }}>
          {conversations.length === 0 ? (
            <Empty
              description="暂无对话"
              style={{ marginTop: 40 }}
            />
          ) : (
            <List
              dataSource={conversations}
              renderItem={(conv) => (
                <List.Item
                  style={{
                    cursor: 'pointer',
                    padding: '12px 16px',
                    backgroundColor: currentConversation?.id === conv.id ? '#e6f7ff' : 'transparent',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                  onClick={() => handleSelectConversation(conv)}
                  actions={[
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                    />,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        icon={<MessageOutlined />}
                        style={{ backgroundColor: '#1890ff' }}
                      />
                    }
                    title={
                      <div style={{ 
                        fontWeight: currentConversation?.id === conv.id ? 600 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 180,
                      }}>
                        {conv.title || '新对话'}
                      </div>
                    }
                    description={dayjs(conv.updated_at).format('MM-DD HH:mm')}
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      </Sider>

      <Layout>
        <Header
          style={{
            backgroundColor: '#fff',
            borderBottom: '1px solid #f0f0f0',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            <RobotOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            智能客服
          </div>
          <Tag color="blue">
            <ExclamationCircleOutlined style={{ marginRight: 4 }} />
            问题超出知识库范围将自动创建工单
          </Tag>
        </Header>

        <Content
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#f5f5f5',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              paddingTop: 16,
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#999',
                }}
              >
                <Avatar size={64} icon={<RobotOutlined />} style={{ marginBottom: 16, backgroundColor: '#1890ff' }} />
                <h3>欢迎使用智能客服</h3>
                <p>请输入您的问题，我会尽力为您解答。</p>
                <Space wrap style={{ marginTop: 16 }}>
                  <Tag icon={<FileTextOutlined />} color="blue">
                    基于企业知识库回答
                  </Tag>
                  <Tag icon={<ExclamationCircleOutlined />} color="orange">
                    问题超出范围自动创建工单
                  </Tag>
                </Space>
              </div>
            ) : (
              <>
                {messages.map(renderMessage)}
                {isLoading && (
                  <div style={{ padding: '0 16px', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar
                        icon={<RobotOutlined />}
                        style={{ backgroundColor: '#1890ff', marginRight: 12 }}
                      />
                      <Badge status="processing" text="AI 正在思考..." />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div
            style={{
              padding: 16,
              backgroundColor: '#fff',
              borderTop: '1px solid #f0f0f0',
            }}
          >
            <Form layout="inline" style={{ width: '100%' }}>
              <Form.Item style={{ flex: 1, marginBottom: 0 }}>
                <TextArea
                  placeholder="输入您的问题..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={isLoading}
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  style={{ borderRadius: 20 }}
                />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0, marginLeft: 8 }}>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  loading={isLoading}
                  disabled={!inputValue.trim()}
                  size="large"
                  style={{ borderRadius: 20 }}
                >
                  发送
                </Button>
              </Form.Item>
            </Form>
          </div>
        </Content>
      </Layout>

      <Modal
        title="工单已创建"
        open={ticketModalVisible}
        onOk={() => setTicketModalVisible(false)}
        onCancel={() => setTicketModalVisible(false)}
        okText="知道了"
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        {currentTicketInfo && (
          <div>
            <p style={{ marginBottom: 16 }}>
              非常抱歉，根据当前知识库，我无法直接回答您的问题。
              为了更好地帮助您，系统已自动为您创建了一个工单。
            </p>
            <Card size="small">
              <p>
                <strong>工单号：</strong>
                <Tag color="blue">{currentTicketInfo.ticket_number}</Tag>
              </p>
              <p>
                <strong>工单标题：</strong>
                {currentTicketInfo.title}
              </p>
              <p>
                <strong>当前状态：</strong>
                {getStatusBadge(currentTicketInfo.status)}
              </p>
            </Card>
            <p style={{ marginTop: 16, color: '#666' }}>
              我们的人工客服会尽快查看并处理您的问题。
            </p>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default ChatPage;
