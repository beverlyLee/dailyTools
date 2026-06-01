import { useState, useEffect } from 'react';
import axios from 'axios';
import QuickRecord from '../components/QuickRecord';
import SplitView from '../components/SplitView';

interface TodoItem {
  id: number;
  text: string;
  time?: string;
  completed: boolean;
  createdAt: string;
}

interface NoteItem {
  id: number;
  text: string;
  createdAt: string;
}

interface ParseResponse {
  todos: TodoItem[];
  notes: NoteItem[];
  originalText: string;
}

export default function Home() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastParseText, setLastParseText] = useState('');
  const [manualText, setManualText] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [todosRes, notesRes] = await Promise.all([
        axios.get('/api/todos'),
        axios.get('/api/notes'),
      ]);
      setTodos(todosRes.data);
      setNotes(notesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    console.log('录音完成，音频大小:', audioBlob.size);
  };

  const handleTranscriptReady = (text: string) => {
    console.log('转写完成:', text);
    setManualText(text);
  };

  const handleTextParse = async (text: string) => {
    setIsLoading(true);
    setLastParseText(text);
    try {
      const response = await axios.post<ParseResponse>('/api/parse-memo', { text });
      setTodos(prev => [...response.data.todos, ...prev]);
      setNotes(prev => [...response.data.notes, ...prev]);
    } catch (error) {
      console.error('Error parsing memo:', error);
      alert('解析失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTodo = async (id: number) => {
    try {
      await axios.patch(`/api/todos/${id}`);
      setTodos(prev =>
        prev.map(todo =>
          todo.id === id ? { ...todo, completed: !todo.completed } : todo
        )
      );
    } catch (error) {
      console.error('Error toggling todo:', error);
    }
  };

  const handleClearAll = async () => {
    if (confirm('确定要清空所有待办和笔记吗？')) {
      try {
        await axios.delete('/api/clear-all');
        setTodos([]);
        setNotes([]);
        setLastParseText('');
        setManualText('');
      } catch (error) {
        console.error('Error clearing all:', error);
      }
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>🎙️ 语音笔记待办</h1>
        <p>智能解析语音，自动整理待办与笔记</p>
        {todos.length > 0 && (
          <button
            onClick={handleClearAll}
            style={{
              marginTop: '10px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '0.9em'
            }}
          >
            🗑️ 清空所有数据
          </button>
        )}
      </div>

      <QuickRecord
        onRecordingComplete={handleRecordingComplete}
        onTextParse={handleTextParse}
        onTranscriptReady={handleTranscriptReady}
        isLoading={isLoading}
        manualText={manualText}
        onManualTextChange={setManualText}
      />

      {isLoading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p style={{ color: 'white', marginTop: '10px' }}>正在智能解析...</p>
        </div>
      ) : (
        <>
          {lastParseText && (
            <div style={{
              background: 'white',
              borderRadius: '10px',
              padding: '15px',
              marginBottom: '20px',
              textAlign: 'center',
              color: '#666'
            }}>
              <span style={{ color: '#4caf50' }}>✓</span> 已解析: <em>"{lastParseText}"</em>
            </div>
          )}
          <SplitView todos={todos} notes={notes} onToggleTodo={handleToggleTodo} />
        </>
      )}
    </div>
  );
}
