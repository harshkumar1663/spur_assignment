import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ChatService } from '../../backend/src/services';
import { LLMService } from '../../backend/src/llm';
import { initializeDatabase } from '../../backend/src/db';
import { ChatError } from '../../backend/src/services';

// Initialize shared instances once per lambda container reuse
let chatService: ChatService | null = null;

function getChatService(): ChatService {
  if (chatService) return chatService;

  // Ensure DB is ready (stored in /tmp on Vercel, see connection.ts)
  initializeDatabase();

  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '';
  const llm = new LLMService({ apiKey });
  chatService = new ChatService(llm);
  return chatService;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message, sessionId } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const service = getChatService();
    const result = await service.sendMessage({ message, sessionId });

    return res.status(200).json({ reply: result.reply, sessionId: result.sessionId, timestamp: result.timestamp });
  } catch (err: unknown) {
    if (err instanceof ChatError) {
      return res.status(err.statusCode || 500).json({ error: err.userMessage, details: err.message });
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: 'Internal Server Error', details: message });
  }
}
