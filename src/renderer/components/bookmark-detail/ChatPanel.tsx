import React, { useState, useRef, useEffect } from 'react';
import styles from './ChatPanel.module.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  messages: Message[];
  onSend: (message: string) => void;
  loading?: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSend, loading }) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current?.scrollIntoView) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = () => {
    if (input.trim() && !loading) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.container}>
      {messages.length === 0 && (
        <p className={styles.empty}>Ask about this bookmark...</p>
      )}
      <div className={styles.messages}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.message} ${styles[msg.role]}`}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className={`${styles.message} ${styles.assistant}`}>
            Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className={styles.inputRow}>
        <textarea
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
          rows={1}
          aria-label="Chat message"
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!input.trim() || loading}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
