import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ChatService, ChatError } from '../../src/services';
import { LLMService } from '../../src/llm';
import { initializeDatabase } from '../../src/db';

let chatService: ChatService | null = null;

function getChatService(): ChatService {
  if (chatService) return chatService;
  initializeDatabase();
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '';
  const llm = new LLMService({ apiKey });
  chatService = new ChatService(llm);
  return chatService;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Basic CORS for cross-origin frontend deployments
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
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
