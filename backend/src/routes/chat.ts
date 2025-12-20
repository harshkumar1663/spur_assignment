/**
 * Chat Routes
 * 
 * HTTP endpoints for chat service functionality.
 * 
 * Constraints:
 * - Keep controller logic minimal
 * - All validation happens in service layer
 * - All errors become HTTP responses (never crash)
 * - Domain layer is completely independent of HTTP
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ChatService } from '../services';
import { LLMService } from '../llm';

// Service instances (created lazily)
let chatServiceInstance: ChatService | null = null;

function getChatService(): ChatService {
  if (!chatServiceInstance) {
    const llmService = new LLMService({
      apiKey: process.env.GEMINI_API_KEY || '',
    });
    chatServiceInstance = new ChatService(llmService);
  }
  return chatServiceInstance;
}

/**
 * Set chat service (for testing purposes)
 */
export function setChatService(service: ChatService) {
  chatServiceInstance = service;
}

/**
 * POST /chat/message
 * 
 * Send a message to the AI chat service.
 * 
 * Request body:
 * - message: string (required) - The user's message
 * - sessionId?: string (optional) - Conversation session ID (creates new if omitted)
 * 
 * Response (200):
 * - reply: string - AI assistant's response
 * - sessionId: string - Conversation session ID
 * - timestamp: string - ISO 8601 timestamp
 * 
 * Errors:
 * - 400: Invalid input (empty message, too long, invalid UUID)
 * - 404: Session not found
 * - 429: Rate limited
 * - 408: Request timeout
 * - 500: Server error
 */
async function handleSendMessage(
  request: FastifyRequest<{
    Body: {
      message?: string;
      sessionId?: string;
    };
  }>,
  reply: FastifyReply
) {
  const { message, sessionId } = request.body;

  // Basic request validation - message is required and cannot be empty/whitespace
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return reply.code(400).send({
      error: 'Missing required field',
      field: 'message',
      message: 'The message field is required and cannot be empty.',
      statusCode: 400,
    });
  }

  // Call service (will throw ChatError if anything is wrong)
  const response = await getChatService().sendMessage({
    message,
    sessionId,
  });

  reply.code(200).send(response);
}

/**
 * POST /chat/history
 * 
 * Retrieve chat history for a conversation.
 * 
 * Request body:
 * - sessionId: string (required) - Conversation session ID
 * - limit?: number (optional) - Max messages to return (default: unlimited)
 * 
 * Response (200):
 * - sessionId: string - Conversation session ID
 * - messages: array - Message objects with id, sender, text, timestamp
 * 
 * Errors:
 * - 400: Invalid input (missing sessionId, invalid UUID)
 * - 404: Session not found
 * - 500: Server error
 */
async function handleGetHistory(
  request: FastifyRequest<{
    Body: {
      sessionId?: string;
      limit?: number;
    };
  }>,
  reply: FastifyReply
) {
  const { sessionId, limit } = request.body;

  // Basic request validation
  if (!sessionId) {
    return reply.code(400).send({
      error: 'Missing required field',
      field: 'sessionId',
      message: 'The sessionId field is required.',
      statusCode: 400,
    });
  }

  // Call service
  const response = await getChatService().getHistory({
    sessionId,
    limit,
  });

  reply.code(200).send(response);
}

/**
 * Register chat routes
 * 
 * This function should be called during server initialization.
 */
export async function registerChatRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: { message?: string; sessionId?: string } }>(
    '/chat/message',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'The user message' },
            sessionId: { type: 'string', description: 'Optional conversation session ID' },
          },
          required: ['message'],
        },
      },
    },
    handleSendMessage
  );

  fastify.post<{ Body: { sessionId?: string; limit?: number } }>(
    '/chat/history',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'The conversation session ID' },
            limit: { type: 'number', description: 'Optional max messages to return' },
          },
          required: ['sessionId'],
        },
      },
    },
    handleGetHistory
  );
}
