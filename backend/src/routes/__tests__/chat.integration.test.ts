/**
 * Chat Routes Integration Tests
 * 
 * Tests the full HTTP API surface without mocking HTTP or database.
 * 
 * Strategy:
 * - Start real Fastify server
 * - Send real HTTP requests
 * - Verify responses
 * - Assert database persistence
 * - Assert error handling
 * 
 * Stop Conditions:
 * - API works independently via curl
 * - Backend never crashes on bad input
 * - Errors are always handled gracefully
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { registerChatRoutes, setChatService } from '../chat';
import { registerErrorHandler } from '../../middleware/errorHandler';
import { initializeDatabase, closeDatabase, clearDatabase, getConversationMessages } from '../../db';
import { ChatService } from '../../services';
import type { ILLMService } from '../../llm';

// Mock LLM Service implementation
class MockLLMService implements ILLMService {
  public generateReplyFn = vi.fn();

  async generateReply(history: any[], userMessage: string): Promise<string> {
    return this.generateReplyFn(history, userMessage);
  }
}

let fastify: FastifyInstance;
let mockLLM: MockLLMService;

beforeAll(async () => {
  // Initialize database (in-memory for tests)
  process.env.NODE_ENV = 'test';
  process.env.VITEST = 'true';
  initializeDatabase();

  // Create mock LLM service
  mockLLM = new MockLLMService();
  mockLLM.generateReplyFn.mockResolvedValue('This is a mock AI response.');

  // Create chat service with mocked LLM
  const chatService = new ChatService(mockLLM);
  setChatService(chatService);

  // Create Fastify instance for testing
  fastify = Fastify({
    logger: {
      level: 'silent', // Suppress logs during tests
    },
  });

  // Register CORS
  await fastify.register(cors);

  // Register error handler BEFORE routes (order matters)
  registerErrorHandler(fastify);

  // Register routes
  await registerChatRoutes(fastify);

  // Start server
  await fastify.listen({ port: 0 }); // Use random available port
});

afterAll(async () => {
  closeDatabase();
  await fastify.close();
});

beforeEach(() => {
  // Clear database before each test
  clearDatabase();
  // Reset mock
  mockLLM.generateReplyFn.mockClear();
  mockLLM.generateReplyFn.mockResolvedValue('This is a mock AI response.');
});

describe('POST /chat/message', () => {
  it('should send message and get reply (new conversation)', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: {
        message: 'Hello, I need help with my order!',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);

    expect(body).toHaveProperty('reply');
    expect(body).toHaveProperty('sessionId');
    expect(body).toHaveProperty('timestamp');

    expect(typeof body.reply).toBe('string');
    expect(body.reply.length).toBeGreaterThan(0);

    // Session ID should be UUID format
    expect(body.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    // Timestamp should be ISO 8601
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should continue existing conversation with sessionId', async () => {
    // First message
    const response1 = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: {
        message: 'What are your hours?',
      },
    });

    const session1 = JSON.parse(response1.payload);
    expect(response1.statusCode).toBe(200);

    // Second message with same session
    const response2 = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: {
        message: 'And what about weekends?',
        sessionId: session1.sessionId,
      },
    });

    const session2 = JSON.parse(response2.payload);
    expect(response2.statusCode).toBe(200);
    expect(session2.sessionId).toBe(session1.sessionId);
  });

  it('should persist messages to database', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: {
        message: 'This message should be saved.',
      },
    });

    const body = JSON.parse(response.payload);
    const sessionId = body.sessionId;

    // Verify in database
    const messages = getConversationMessages(sessionId);
    expect(messages).toHaveLength(2); // User + AI

    expect(messages[0].sender).toBe('user');
    expect(messages[0].text).toBe('This message should be saved.');

    expect(messages[1].sender).toBe('assistant');
    expect(typeof messages[1].text).toBe('string');
  });

  it('should not crash on empty message', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: {
        message: '',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);

    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('message');
    expect(body.statusCode).toBe(400);
  });

  it('should not crash on missing message field', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: {
        // No message field
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);

    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('message');
  });

  it('should not crash on whitespace-only message', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: {
        message: '   ',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should not crash on very long message', async () => {
    const longMessage = 'a'.repeat(10001); // Over 10k character limit

    const response = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: {
        message: longMessage,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body).toHaveProperty('message');
  });

  it('should not crash on invalid sessionId format', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: {
        message: 'Test',
        sessionId: 'not-a-valid-uuid',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body).toHaveProperty('error');
  });

  it('should not crash on non-existent sessionId', async () => {
    const fakeSessionId = '00000000-0000-4000-8000-000000000000';

    const response = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: {
        message: 'Test',
        sessionId: fakeSessionId,
      },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('message');
  });

  it('should not crash on invalid JSON', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: '{invalid json}',
    });

    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(response.statusCode).toBeLessThan(500);
  });

  it('should return proper error object structure', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: {
        message: '',
      },
    });

    const body = JSON.parse(response.payload);

    // Error responses should have consistent structure
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('statusCode');

    expect(typeof body.error).toBe('string');
    expect(typeof body.message).toBe('string');
    expect(typeof body.statusCode).toBe('number');
  });

  it('should return user-friendly error messages', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: {
        message: '',
      },
    });

    const body = JSON.parse(response.payload);

    // Messages should be readable, not technical
    expect(body.message.toLowerCase()).not.toContain('undefined');
    expect(body.message.toLowerCase()).not.toContain('null');
    expect(body.message.length).toBeGreaterThan(5);
  });

  it('should handle multiple concurrent messages in same session', async () => {
    // Create session
    const response1 = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: { message: 'Message 1' },
    });

    const sessionId = JSON.parse(response1.payload).sessionId;

    // Send multiple messages
    const promises = [];
    for (let i = 2; i <= 4; i++) {
      promises.push(
        fastify.inject({
          method: 'POST',
          url: '/chat/message',
          payload: {
            message: `Message ${i}`,
            sessionId,
          },
        })
      );
    }

    const responses = await Promise.all(promises);

    // All should succeed
    expect(responses).toHaveLength(3);
    responses.forEach((res) => {
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.sessionId).toBe(sessionId);
    });

    // All messages should be saved
    const messages = getConversationMessages(sessionId);
    expect(messages.length).toBeGreaterThanOrEqual(8); // 4 user + 4 AI
  });
});

describe('POST /chat/history', () => {
  it('should retrieve conversation history', async () => {
    // Create conversation with messages
    const sendResponse = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: { message: 'First message' },
    });

    const sessionId = JSON.parse(sendResponse.payload).sessionId;

    // Get history
    const historyResponse = await fastify.inject({
      method: 'POST',
      url: '/chat/history',
      payload: { sessionId },
    });

    expect(historyResponse.statusCode).toBe(200);
    const body = JSON.parse(historyResponse.payload);

    expect(body).toHaveProperty('sessionId');
    expect(body).toHaveProperty('messages');
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body.messages.length).toBeGreaterThanOrEqual(2);
  });

  it('should return messages with correct structure', async () => {
    const sendResponse = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: { message: 'Test message' },
    });

    const sessionId = JSON.parse(sendResponse.payload).sessionId;

    const historyResponse = await fastify.inject({
      method: 'POST',
      url: '/chat/history',
      payload: { sessionId },
    });

    const body = JSON.parse(historyResponse.payload);
    const message = body.messages[0];

    expect(message).toHaveProperty('id');
    expect(message).toHaveProperty('sender');
    expect(message).toHaveProperty('text');
    expect(message).toHaveProperty('timestamp');

    expect(['user', 'assistant']).toContain(message.sender);
    expect(typeof message.text).toBe('string');
  });

  it('should not crash on missing sessionId', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/chat/history',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it('should not crash on invalid sessionId format', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/chat/history',
      payload: {
        sessionId: 'invalid',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 404 for non-existent session', async () => {
    const fakeSessionId = '00000000-0000-4000-8000-000000000000';

    const response = await fastify.inject({
      method: 'POST',
      url: '/chat/history',
      payload: { sessionId: fakeSessionId },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body).toHaveProperty('error');
  });

  it('should respect limit parameter', async () => {
    // Create conversation with multiple messages
    const sendResponse = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: { message: 'Message 1' },
    });

    const sessionId = JSON.parse(sendResponse.payload).sessionId;

    // Add more messages
    for (let i = 2; i <= 3; i++) {
      await fastify.inject({
        method: 'POST',
        url: '/chat/message',
        payload: {
          message: `Message ${i}`,
          sessionId,
        },
      });
    }

    // Get history with limit
    const historyResponse = await fastify.inject({
      method: 'POST',
      url: '/chat/history',
      payload: {
        sessionId,
        limit: 2,
      },
    });

    const body = JSON.parse(historyResponse.payload);
    expect(body.messages.length).toBeLessThanOrEqual(2);
  });
});

describe('Error Handling - Never Crash', () => {
  it('should handle null payload gracefully', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: undefined,
    });

    // Should not crash, should return error
    expect([400, 415]).toContain(response.statusCode);
  });

  it('should handle invalid content type', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: 'plain text',
      headers: {
        'content-type': 'text/plain',
      },
    });

    // Should not crash
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('should return JSON for all error responses', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: {
        message: '',
      },
    });

    expect(response.headers['content-type']).toContain('application/json');
    expect(() => JSON.parse(response.payload)).not.toThrow();
  });

  it('should return consistent HTTP status codes', async () => {
    const tests = [
      {
        payload: { message: '' },
        expectedStatus: 400, // Validation error
      },
      {
        payload: {
          message: 'test',
          sessionId: '00000000-0000-4000-8000-000000000000',
        },
        expectedStatus: 404, // Not found
      },
    ];

    for (const test of tests) {
      const response = await fastify.inject({
        method: 'POST',
        url: '/chat/message',
        payload: test.payload,
      });

      expect(response.statusCode).toBe(test.expectedStatus);
    }
  });
});

describe('API Readiness - curl Compatible', () => {
  it('should accept JSON requests', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: JSON.stringify({ message: 'Hello' }),
      headers: {
        'content-type': 'application/json',
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it('should respond with valid JSON', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: { message: 'Test' },
    });

    expect(() => JSON.parse(response.payload)).not.toThrow();

    const body = JSON.parse(response.payload);
    expect(body).toEqual(expect.objectContaining({}));
  });

  it('should have proper content-type headers', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/chat/message',
      payload: { message: 'Test' },
    });

    expect(response.headers['content-type']).toContain('application/json');
  });
});
