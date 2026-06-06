import { createReactBlockSpec } from '@blocknote/react';
import { defaultProps } from '@blocknote/core';
import React, { useState, useRef, useEffect } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const createChatBlock = createReactBlockSpec(
  {
    type: 'chat',
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      sessionId: { default: '' },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const sessionId = props.block.props.sessionId as string;
      const [messages, setMessages] = useState<ChatMessage[]>([]);
      const [input, setInput] = useState('');
      const [isLoading, setIsLoading] = useState(false);
      const scrollRef = useRef<HTMLDivElement>(null);

      useEffect(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, [messages]);

      const sendMessage = async () => {
        if (!input.trim() || isLoading) return;
        const userMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: input.trim(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
          const response = await (window as any).api?.sendMessage?.(sessionId, userMsg.content);
          const assistantMsg: ChatMessage = {
            id: `msg-${Date.now()}-assistant`,
            role: 'assistant',
            content: response ?? 'No response received.',
          };
          setMessages((prev) => [...prev, assistantMsg]);
        } catch {
          setMessages((prev) => [
            ...prev,
            { id: `msg-${Date.now()}-error`, role: 'assistant', content: 'Failed to get response.' },
          ]);
        } finally {
          setIsLoading(false);
        }
      };

      const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      };

      return (
        <div
          contentEditable={false}
          style={{
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #333',
            borderRadius: '6px',
            overflow: 'hidden',
            maxHeight: '400px',
          }}
        >
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px 12px',
              minHeight: '100px',
              maxHeight: '300px',
            }}
          >
            {messages.length === 0 && (
              <div style={{ color: '#666', fontSize: '13px', padding: '8px 0' }}>
                Ask a question about this bookmark...
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  marginBottom: '8px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: msg.role === 'user' ? '#1a3a5c' : '#1a2a1a',
                  fontSize: '13px',
                  lineHeight: '1.5',
                }}
              >
                <span style={{ fontWeight: 600, color: msg.role === 'user' ? '#5b9bd5' : '#6aa84f' }}>
                  {msg.role === 'user' ? 'You' : 'Assistant'}:
                </span>{' '}
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div style={{ color: '#666', fontSize: '12px', padding: '4px 0' }}>
                Thinking...
              </div>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              borderTop: '1px solid #333',
              padding: '6px 8px',
              gap: '6px',
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={isLoading}
              style={{
                flex: 1,
                background: '#0d0d0d',
                border: '1px solid #333',
                borderRadius: '4px',
                padding: '6px 8px',
                color: '#ddd',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '13px',
                opacity: isLoading || !input.trim() ? 0.5 : 1,
              }}
            >
              Send
            </button>
          </div>
        </div>
      );
    },
  },
);
