import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../gemini', () => ({
  callGemini: vi.fn(),
}));

vi.mock('../../db/chat', () => ({
  addChatMessage: vi.fn(),
  getChatMessages: vi.fn(),
}));

import { sendMessage } from '../chat';
import { callGemini } from '../gemini';
import { addChatMessage, getChatMessages } from '../../db/chat';

const mockCallGemini = vi.mocked(callGemini);
const mockAddChatMessage = vi.mocked(addChatMessage);
const mockGetChatMessages = vi.mocked(getChatMessages);

function createMockDb() {
  return {} as any;
}

describe('sendMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetChatMessages.mockResolvedValue([]);
  });

  it('sends message and returns response', async () => {
    mockCallGemini.mockResolvedValue('AI response');

    const result = await sendMessage(createMockDb(), 'session-1', 'Hello', undefined, { apiKey: 'key' });

    expect(result.response).toBe('AI response');
    expect(mockAddChatMessage).toHaveBeenCalledTimes(2);
    expect(mockAddChatMessage).toHaveBeenCalledWith(expect.anything(), 'session-1', 'user', 'Hello', undefined);
    expect(mockAddChatMessage).toHaveBeenCalledWith(expect.anything(), 'session-1', 'assistant', 'AI response');
  });

  it('throws when API key is missing', async () => {
    await expect(
      sendMessage(createMockDb(), 'session-1', 'Hello', undefined, {}),
    ).rejects.toThrow('GEMINI_API_KEY is required');
  });

  it('includes article context in prompt', async () => {
    mockCallGemini.mockResolvedValue('Response');

    await sendMessage(createMockDb(), 'session-1', 'What is this?', 'Article text here', { apiKey: 'key' });

    expect(mockCallGemini).toHaveBeenCalledWith(
      expect.stringContaining('Article text here'),
      expect.anything(),
    );
  });

  it('includes conversation history in prompt', async () => {
    mockGetChatMessages.mockResolvedValue([
      { id: '1', session_id: 's', role: 'user', content: 'Previous question', created_at: '' },
      { id: '2', session_id: 's', role: 'assistant', content: 'Previous answer', created_at: '' },
    ]);
    mockCallGemini.mockResolvedValue('Next response');

    await sendMessage(createMockDb(), 'session-1', 'Follow up', undefined, { apiKey: 'key' });

    expect(mockCallGemini).toHaveBeenCalledWith(
      expect.stringContaining('Previous question'),
      expect.anything(),
    );
  });
});
