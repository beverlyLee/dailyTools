import { useState } from 'react';

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

interface SplitViewProps {
  todos: TodoItem[];
  notes: NoteItem[];
  onToggleTodo: (id: number) => void;
}

const SplitView = ({ todos, notes, onToggleTodo }: SplitViewProps) => {
  const EmptyState = ({ icon, text }: { icon: string; text: string }) => (
    <div className="empty-state">
      <span style={{ fontSize: '48px' }}>{icon}</span>
      <p>{text}</p>
    </div>
  );

  return (
    <div className="split-view">
      <div className="view-panel">
        <h2>✅ 待办事项 ({todos.filter(t => !t.completed).length})</h2>
        {todos.length === 0 ? (
          <EmptyState icon="📋" text="暂无待办事项" />
        ) : (
          <ul className="todo-list">
            {todos.map((todo) => (
              <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => onToggleTodo(todo.id)}
                />
                <span className="todo-text">{todo.text}</span>
                {todo.time && <span className="todo-time">{todo.time}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="view-panel">
        <h2>📝 笔记 ({notes.length})</h2>
        {notes.length === 0 ? (
          <EmptyState icon="📒" text="暂无笔记" />
        ) : (
          <ul className="note-list">
            {notes.map((note) => (
              <li key={note.id} className="note-item">
                <p className="note-text">{note.text}</p>
                <span className="note-time">{note.createdAt}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SplitView;
