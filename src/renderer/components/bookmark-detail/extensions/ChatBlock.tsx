import { createReactBlockSpec } from '@blocknote/react';
import { defaultProps } from '@blocknote/core';
import React, { useState, useRef, useEffect } from 'react';
import { useIntl } from 'react-intl';
import type { ChatMessage } from '../types';

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
      const intl = useIntl();
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
          const response = await (window as any).api?.sendChatMessage?.(sessionId, userMsg.content);
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
            border: '1px solid var(--background-modifier-border)',
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
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '8px 0' }}>
                {intl.formatMessage({ id: 'chatPlaceholder' })}
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  marginBottom: '8px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: msg.role === 'user' ? 'var(--section-agent-bg)' : 'var(--section-user-bg)',
                  fontSize: '13px',
                  lineHeight: '1.5',
                }}
              >
                <span style={{ fontWeight: 600, color: msg.role === 'user' ? 'var(--accent-color)' : 'var(--priority-low)' }}>
                  {msg.role === 'user' ? intl.formatMessage({ id: 'chatYou' }) : intl.formatMessage({ id: 'chatAssistant' })}:
                </span>{' '}
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '4px 0' }}>
                {intl.formatMessage({ id: 'chatThinking' })}
              </div>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              borderTop: '1px solid var(--background-modifier-border)',
              padding: '6px 8px',
              gap: '6px',
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={intl.formatMessage({ id: 'chatInputPlaceholder' })}
              aria-label="Chat message input"
              disabled={isLoading}
              style={{
                flex: 1,
                background: 'var(--background-primary)',
                border: '1px solid var(--background-modifier-border)',
                borderRadius: '4px',
                padding: '6px 8px',
                color: 'var(--text-normal)',
                fontSize: '13px',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
              style={{
                background: 'var(--accent-color)',
                color: 'var(--text-on-accent)',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '13px',
                opacity: isLoading || !input.trim() ? 0.5 : 1,
              }}
            >
              {intl.formatMessage({ id: 'chatSend' })}
            </button>
          </div>
        </div>
      );
    },
  },
);
