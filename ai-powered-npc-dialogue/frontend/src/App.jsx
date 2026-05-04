import { useState, useEffect, useRef } from 'react';
import { 
  getNPCs, 
  sendMessage, 
  clearConversation, 
  createNPC, 
  deleteNPC,
  getConversationHistory,
  getNPCMemories
} from './services/api';
import './App.css';

const AVAILABLE_AVATARS = ['👤', '🏪', '⚒️', '🏨', '👨‍🌾', '👩‍🍳', '🧙', '🧝', '💂', '👸', '🤴', '🧛', '👻'];

function App() {
  const [npcs, setNpcs] = useState([]);
  const [selectedNPC, setSelectedNPC] = useState(null);
  
  const [npcStates, setNpcStates] = useState({});
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState('连接中...');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMemoriesModal, setShowMemoriesModal] = useState(false);
  const [currentMemories, setCurrentMemories] = useState([]);
  
  const [newNPCData, setNewNPCData] = useState({
    npc_id: '',
    name: '',
    description: '',
    system_prompt: '',
    avatar: '👤'
  });
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadNPCs();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [npcStates, selectedNPC]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getCurrentState = () => {
    if (!selectedNPC) return null;
    return npcStates[selectedNPC.npc_id] || { conversationId: null, messages: [] };
  };

  const updateNpcState = (npcId, updates) => {
    setNpcStates(prev => ({
      ...prev,
      [npcId]: {
        ...(prev[npcId] || { conversationId: null, messages: [] }),
        ...updates
      }
    }));
  };

  const loadNPCs = async () => {
    try {
      const response = await getNPCs();
      setNpcs(response.npcs);
      if (response.npcs.length > 0 && !selectedNPC) {
        setSelectedNPC(response.npcs[0]);
      }
      setSystemStatus('已连接');
    } catch (error) {
      console.error('加载NPC失败:', error);
      setSystemStatus('连接失败');
    }
  };

  const loadNPCConversationHistory = async (npcId) => {
    try {
      const conversationsResponse = await fetch(`/api/v1/npcs/${npcId}/conversations`);
      if (conversationsResponse.ok) {
        const conversationsData = await conversationsResponse.json();
        const conversations = conversationsData.conversations || [];
        
        if (conversations.length > 0) {
          const latestConv = conversations[0];
          const historyResponse = await getConversationHistory(latestConv.conversation_id);
          
          if (historyResponse.history && historyResponse.history.length > 0) {
            const messages = [];
            for (const h of historyResponse.history) {
              messages.push({
                type: 'user',
                content: h.user_message,
                timestamp: new Date(h.timestamp)
              });
              messages.push({
                type: 'npc',
                content: h.npc_response,
                npcName: selectedNPC?.name || 'NPC',
                timestamp: new Date(h.timestamp)
              });
            }
            
            updateNpcState(npcId, {
              conversationId: latestConv.conversation_id,
              messages: messages
            });
            
            return messages;
          }
        }
      }
    } catch (error) {
      console.log('没有找到历史对话或加载失败:', error);
    }
    return [];
  };

  const handleNPCSelect = async (npc) => {
    if (selectedNPC?.npc_id === npc.npc_id) {
      return;
    }
    
    setSelectedNPC(npc);
    
    if (!npcStates[npc.npc_id]) {
      setIsLoading(true);
      try {
        const existingMessages = await loadNPCConversationHistory(npc.npc_id);
        if (existingMessages.length === 0) {
          updateNpcState(npc.npc_id, {
            conversationId: null,
            messages: []
          });
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedNPC || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    const currentState = getCurrentState();
    
    updateNpcState(selectedNPC.npc_id, {
      messages: [...(currentState?.messages || []), {
        type: 'user',
        content: userMessage,
        timestamp: new Date()
      }]
    });

    setIsLoading(true);

    try {
      const response = await sendMessage({
        conversation_id: currentState?.conversationId,
        npc_id: selectedNPC.npc_id,
        message: userMessage,
        use_rag: true,
        use_memory: true,
        auto_save_memory: true
      });

      const state = getCurrentState();
      const newMessages = [...(state?.messages || []), {
        type: 'npc',
        content: response.response,
        npcName: response.npc_name,
        contextInfo: response.context_info,
        timestamp: new Date()
      }];
      
      updateNpcState(selectedNPC.npc_id, {
        conversationId: response.conversation_id,
        messages: newMessages
      });

      if (response.context_info?.new_memory_extracted) {
        console.log('新记忆被提取:', response.context_info.new_memory_extracted);
      }
      
    } catch (error) {
      console.error('发送消息失败:', error);
      const state = getCurrentState();
      updateNpcState(selectedNPC.npc_id, {
        messages: [...(state?.messages || []), {
          type: 'system',
          content: `发送失败: ${error.message}`,
          timestamp: new Date()
        }]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearConversation = async () => {
    const state = getCurrentState();
    if (!state?.conversationId) {
      updateNpcState(selectedNPC.npc_id, {
        conversationId: null,
        messages: []
      });
      return;
    }

    try {
      await clearConversation(state.conversationId);
      updateNpcState(selectedNPC.npc_id, {
        conversationId: null,
        messages: []
      });
    } catch (error) {
      console.error('清除对话失败:', error);
    }
  };

  const handleCreateNPC = async () => {
    if (!newNPCData.npc_id.trim() || !newNPCData.name.trim() || !newNPCData.system_prompt.trim()) {
      alert('请填写NPC ID、名称和系统提示词');
      return;
    }

    try {
      await createNPC(newNPCData);
      setShowCreateModal(false);
      setNewNPCData({
        npc_id: '',
        name: '',
        description: '',
        system_prompt: '',
        avatar: '👤'
      });
      await loadNPCs();
    } catch (error) {
      alert(`创建NPC失败: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleDeleteNPC = async (npcId) => {
    const npc = npcs.find(n => n.npc_id === npcId);
    if (npc?.is_default) {
      alert('不能删除默认NPC');
      return;
    }
    
    if (!confirm(`确定要删除NPC "${npc?.name}" 吗？`)) {
      return;
    }

    try {
      await deleteNPC(npcId);
      
      setNpcStates(prev => {
        const newStates = { ...prev };
        delete newStates[npcId];
        return newStates;
      });
      
      if (selectedNPC?.npc_id === npcId) {
        setSelectedNPC(null);
      }
      
      await loadNPCs();
    } catch (error) {
      alert(`删除NPC失败: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleShowMemories = async () => {
    if (!selectedNPC) return;
    
    try {
      const response = await getNPCMemories(selectedNPC.npc_id);
      setCurrentMemories(response.memories || []);
      setShowMemoriesModal(true);
    } catch (error) {
      console.error('获取记忆失败:', error);
      setCurrentMemories([]);
      setShowMemoriesModal(true);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentState = getCurrentState();
  const currentMessages = currentState?.messages || [];

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎮 AI NPC 对话系统</h1>
        <div className="header-actions">
          <button className="header-btn" onClick={() => setShowCreateModal(true)}>
            ➕ 新增NPC
          </button>
          <div className={`status-badge ${systemStatus === '已连接' ? 'connected' : ''}`}>
            {systemStatus}
          </div>
        </div>
      </header>

      <div className="main-container">
        <aside className="npc-sidebar">
          <div className="sidebar-header">
            <h3>选择NPC</h3>
            <button className="add-npc-btn" onClick={() => setShowCreateModal(true)} title="新增NPC">
              ➕
            </button>
          </div>
          
          <div className="npc-list">
            {npcs.map(npc => (
              <div
                key={npc.npc_id}
                className={`npc-card ${selectedNPC?.npc_id === npc.npc_id ? 'selected' : ''}`}
                onClick={() => handleNPCSelect(npc)}
              >
                <span className="npc-icon">{npc.avatar || '👤'}</span>
                <div className="npc-info">
                  <div className="npc-name">
                    {npc.name}
                    {npc.is_default && <span className="default-badge">默认</span>}
                  </div>
                  <div className="npc-desc">{npc.description}</div>
                  {npcStates[npc.npc_id]?.messages?.length > 0 && (
                    <div className="message-count">
                      {Math.floor(npcStates[npc.npc_id].messages.length / 2)} 条对话
                    </div>
                  )}
                </div>
                {!npc.is_default && (
                  <button 
                    className="delete-npc-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNPC(npc.npc_id);
                    }}
                    title="删除NPC"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>

          {selectedNPC && (
            <div className="npc-detail">
              <h4>当前: {selectedNPC.name}</h4>
              <div className="detail-buttons">
                <button
                  className="memory-btn"
                  onClick={handleShowMemories}
                >
                  🧠 查看记忆
                </button>
                <button
                  className="clear-btn"
                  onClick={handleClearConversation}
                  disabled={currentMessages.length === 0}
                >
                  清除对话
                </button>
              </div>
            </div>
          )}
        </aside>

        <main className="chat-area">
          <div className="messages-container">
            {!selectedNPC ? (
              <div className="empty-chat">
                <div className="welcome-icon">👈</div>
                <h3>请选择一个NPC</h3>
                <p>从左侧列表选择NPC开始对话</p>
              </div>
            ) : currentMessages.length === 0 ? (
              <div className="empty-chat">
                <div className="welcome-icon">{selectedNPC.avatar || '💬'}</div>
                <h3>开始与{selectedNPC.name}对话</h3>
                <p>{selectedNPC.description || '在下方输入框开始对话'}</p>
              </div>
            ) : (
              <>
                {currentMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`message ${msg.type}`}
                  >
                    {msg.type === 'user' && (
                      <div className="message-bubble user-bubble">
                        <div className="message-content">{msg.content}</div>
                        <div className="message-time">
                          {msg.timestamp?.toLocaleTimeString()}
                        </div>
                      </div>
                    )}
                    
                    {msg.type === 'npc' && (
                      <div className="message-row">
                        <span className="npc-avatar">
                          {selectedNPC.avatar || '👤'}
                        </span>
                        <div className="message-bubble npc-bubble">
                          <div className="npc-sender">{msg.npcName}</div>
                          <div className="message-content">{msg.content}</div>
                          {msg.contextInfo?.new_memory_extracted && (
                            <div className="memory-indicator" title="新记忆已保存">
                              🧠 记住了: {msg.contextInfo.new_memory_extracted}
                            </div>
                          )}
                          <div className="message-time">
                            {msg.timestamp?.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {msg.type === 'system' && (
                      <div className="system-message">
                        {msg.content}
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="message npc">
                    <div className="message-row">
                      <span className="npc-avatar">
                        {selectedNPC?.avatar || '👤'}
                      </span>
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            <textarea
              className="message-input"
              placeholder={selectedNPC ? `输入消息，与${selectedNPC.name}对话...` : '请先选择NPC'}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isLoading || !selectedNPC}
              rows={2}
            />
            <button
              className="send-btn"
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim() || !selectedNPC}
            >
              {isLoading ? '发送中...' : '发送'}
            </button>
          </div>
        </main>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>创建新NPC</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>NPC ID (英文标识)</label>
                <input
                  type="text"
                  value={newNPCData.npc_id}
                  onChange={e => setNewNPCData({...newNPCData, npc_id: e.target.value})}
                  placeholder="例如: magician, merchant"
                />
              </div>
              
              <div className="form-group">
                <label>NPC名称</label>
                <input
                  type="text"
                  value={newNPCData.name}
                  onChange={e => setNewNPCData({...newNPCData, name: e.target.value})}
                  placeholder="例如: 神秘商人"
                />
              </div>
              
              <div className="form-group">
                <label>描述</label>
                <input
                  type="text"
                  value={newNPCData.description}
                  onChange={e => setNewNPCData({...newNPCData, description: e.target.value})}
                  placeholder="简短描述这个NPC"
                />
              </div>
              
              <div className="form-group">
                <label>头像</label>
                <div className="avatar-picker">
                  {AVAILABLE_AVATARS.map(avatar => (
                    <button
                      key={avatar}
                      className={`avatar-option ${newNPCData.avatar === avatar ? 'selected' : ''}`}
                      onClick={() => setNewNPCData({...newNPCData, avatar})}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="form-group">
                <label>系统提示词 (角色设定)</label>
                <textarea
                  value={newNPCData.system_prompt}
                  onChange={e => setNewNPCData({...newNPCData, system_prompt: e.target.value})}
                  placeholder="描述这个NPC的性格、背景、说话风格等...

例如：
你是一位神秘的旅行商人，总是带着神秘的微笑。
你说话神秘莫测，喜欢用比喻和暗示。
你知道很多远方的传闻，但不会直接告诉别人。"
                  rows={8}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button className="confirm-btn" onClick={handleCreateNPC}>
                创建NPC
              </button>
            </div>
          </div>
        </div>
      )}

      {showMemoriesModal && (
        <div className="modal-overlay" onClick={() => setShowMemoriesModal(false)}>
          <div className="modal modal-memories" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🧠 {selectedNPC?.name} 的记忆</h3>
              <button className="close-btn" onClick={() => setShowMemoriesModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {currentMemories.length === 0 ? (
                <div className="empty-memories">
                  <p>暂无记忆记录</p>
                  <small>当对话中包含"我叫..."、"记住..."等关键词时，会自动保存记忆</small>
                </div>
              ) : (
                <div className="memories-list">
                  {currentMemories.map(memory => (
                    <div key={memory.id} className="memory-item">
                      <div className="memory-header">
                        <span className={`memory-type ${memory.memory_type}`}>
                          {memory.memory_type === 'long_term' ? '长期记忆' : '短期记忆'}
                        </span>
                        <span className="memory-importance">
                          重要性: {'⭐'.repeat(Math.min(memory.importance_score, 5))}
                        </span>
                      </div>
                      <div className="memory-content">{memory.content}</div>
                      <div className="memory-time">
                        {new Date(memory.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <p>AI NPC 对话系统 Demo - 基于 FastAPI + React + LLM</p>
      </footer>
    </div>
  );
}

export default App;
