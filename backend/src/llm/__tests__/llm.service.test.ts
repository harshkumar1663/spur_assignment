/**
 * LLM Service Tests
 * 
 * Comprehensive tests with mocked Gemini API.
 * NO network calls - all API interactions are mocked.
 * 
 * Tests cover:
 * - Prompt construction
 * - Error handling (all error types)
 * - User-safe error messages
 * - API key validation
 * - Conversation history formatting
 */

/**
 * LLM Service Tests
 * 
 * Comprehensive tests with mocked Gemini API.
 * NO network calls - all API interactions are mocked.
 * 
 * Tests cover:
 * - Prompt construction
 * - Error handling (all error types)
 * - User-safe error messages
 * - API key validation
 * - Conversation history formatting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMService, LLMError, LLMErrorType } from '../index';
import type { ConversationMessage } from '../types';

// Create mock functions
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn();

// Mock the @google/generative-ai module
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    })),
    HarmCategory: {
      HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
      HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    },
    HarmBlockThreshold: {
      BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE',
    },
  };
});

describe('LLM Service', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    mockGenerateContent.mockReset();
    mockGetGenerativeModel.mockReset();

    // Setup default mock behavior
    mockGetGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent,
    });

    // Default successful response
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'This is a mock AI response.',
      },
    });
  });

  describe('Initialization', () => {
    it('should initialize with valid API key', () => {
      expect(() => {
        new LLMService({ apiKey: 'valid-test-key' });
      }).not.toThrow();
    });

    it('should throw LLMError when API key is missing', () => {
      try {
        new LLMService({ apiKey: '' });
        expect.fail('Should have thrown LLMError');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).type).toBe(LLMErrorType.INVALID_API_KEY);
        expect((error as LLMError).userMessage).toContain('not configured');
        expect((error as LLMError).statusCode).toBe(500);
      }
    });

    it('should throw LLMError when API key is whitespace', () => {
      try {
        new LLMService({ apiKey: '   ' });
        expect.fail('Should have thrown LLMError');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).type).toBe(LLMErrorType.INVALID_API_KEY);
      }
    });

    it('should use default configuration values', () => {
      const service = new LLMService({ apiKey: 'test-key' });
      expect(service).toBeDefined();
      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-1.5-flash',
          generationConfig: expect.objectContaining({
            temperature: 0.7,
            maxOutputTokens: 1000,
          }),
        })
      );
    });

    it('should allow custom configuration', () => {
      new LLMService({
        apiKey: 'test-key',
        model: 'gemini-pro',
        temperature: 0.5,
        maxTokens: 500,
      });

      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-pro',
          generationConfig: expect.objectContaining({
            temperature: 0.5,
            maxOutputTokens: 500,
          }),
        })
      );
    });
  });

  describe('generateReply', () => {
    let service: LLMService;

    beforeEach(() => {
      service = new LLMService({ apiKey: 'test-key' });
    });

    it('should generate reply for simple message', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Hello! How can I help you today?',
        },
      });

      const reply = await service.generateReply([], 'Hi');

      expect(reply).toBe('Hello! How can I help you today?');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should include conversation history in prompt', async () => {
      const history: ConversationMessage[] = [
        { role: 'user', content: 'What are your hours?' },
        { role: 'assistant', content: 'We are open Monday-Friday 9-5.' },
      ];

      await service.generateReply(history, 'What about weekends?');

      // Verify the prompt includes history
      const calledPrompt = mockGenerateContent.mock.calls[0][0];
      expect(calledPrompt).toContain('What are your hours?');
      expect(calledPrompt).toContain('We are open Monday-Friday 9-5.');
      expect(calledPrompt).toContain('What about weekends?');
    });

    it('should include system prompt in request', async () => {
      await service.generateReply([], 'Test message');

      const calledPrompt = mockGenerateContent.mock.calls[0][0];
      expect(calledPrompt).toContain('e-commerce customer support agent');
      expect(calledPrompt).toContain('SHIPPING INFORMATION');
      expect(calledPrompt).toContain('RETURNS & REFUNDS');
      expect(calledPrompt).toContain('BUSINESS HOURS');
    });

    it('should limit conversation history', async () => {
      // Create more than 10 messages
      const history: ConversationMessage[] = [];
      for (let i = 0; i < 15; i++) {
        history.push({ role: 'user', content: `Message ${i}` });
      }

      await service.generateReply(history, 'Latest message');

      const calledPrompt = mockGenerateContent.mock.calls[0][0];
      
      // Should include recent messages
      expect(calledPrompt).toContain('Message 14');
      expect(calledPrompt).toContain('Message 10');
      
      // Should NOT include older messages
      expect(calledPrompt).not.toContain('Message 0');
      expect(calledPrompt).not.toContain('Message 4');
    });

    it('should throw error for empty user message', async () => {
      try {
        await service.generateReply([], '');
        expect.fail('Should have thrown LLMError');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).type).toBe(LLMErrorType.INVALID_REQUEST);
        expect((error as LLMError).userMessage).toContain('provide a message');
      }
    });

    it('should throw error for whitespace-only message', async () => {
      try {
        await service.generateReply([], '   ');
        expect.fail('Should have thrown LLMError');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).type).toBe(LLMErrorType.INVALID_REQUEST);
      }
    });

    it('should trim whitespace from response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '  Response with whitespace  ',
        },
      });

      const reply = await service.generateReply([], 'Test');
      expect(reply).toBe('Response with whitespace');
    });

    it('should throw error for empty LLM response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '',
        },
      });

      try {
        await service.generateReply([], 'Test');
        expect.fail('Should have thrown LLMError');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).type).toBe(LLMErrorType.UNKNOWN);
        expect((error as LLMError).userMessage).toContain('trouble generating');
      }
    });
  });

  describe('Error Handling', () => {
    let service: LLMService;

    beforeEach(() => {
      service = new LLMService({ apiKey: 'test-key' });
    });

    it('should handle invalid API key error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Invalid API key provided'));

      try {
        await service.generateReply([], 'Test');
        expect.fail('Should have thrown LLMError');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).type).toBe(LLMErrorType.INVALID_API_KEY);
        expect((error as LLMError).userMessage).toContain('unavailable');
        expect((error as LLMError).statusCode).toBe(401);
        expect((error as LLMError).originalError).toBeDefined();
      }
    });

    it('should handle authentication error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('401 Unauthorized'));

      try {
        await service.generateReply([], 'Test');
        expect.fail('Should have thrown LLMError');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).type).toBe(LLMErrorType.INVALID_API_KEY);
      }
    });

    it('should handle rate limit error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Rate limit exceeded'));

      try {
        await service.generateReply([], 'Test');
        expect.fail('Should have thrown LLMError');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).type).toBe(LLMErrorType.RATE_LIMIT);
        expect((error as LLMError).userMessage).toContain('busy');
        expect((error as LLMError).statusCode).toBe(429);
      }
    });

    it('should handle quota exceeded error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Quota exceeded'));

      try {
        await service.generateReply([], 'Test');
        expect.fail('Should have thrown LLMError');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).type).toBe(LLMErrorType.RATE_LIMIT);
      }
    });

    it('should handle timeout error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Request timed out'));

      try {
        await service.generateReply([], 'Test');
        expect.fail('Should have thrown LLMError');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).type).toBe(LLMErrorType.TIMEOUT);
        expect((error as LLMError).userMessage).toContain('too long');
        expect((error as LLMError).statusCode).toBe(408);
      }
    });

    it('should handle network error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Network connection failed'));

      try {
        await service.generateReply([], 'Test');
        expect.fail('Should have thrown LLMError');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).type).toBe(LLMErrorType.NETWORK_ERROR);
        expect((error as LLMError).userMessage).toContain('connect to AI service');
        expect((error as LLMError).statusCode).toBe(503);
      }
    });

    it('should handle content filter error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Content blocked by safety filters'));

      try {
        await service.generateReply([], 'Test');
        expect.fail('Should have thrown LLMError');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).type).toBe(LLMErrorType.CONTENT_FILTER);
        expect((error as LLMError).userMessage).toContain('rephrase');
        expect((error as LLMError).statusCode).toBe(400);
      }
    });

    it('should handle invalid request error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Invalid request format'));

      try {
        await service.generateReply([], 'Test');
        expect.fail('Should have thrown LLMError');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).type).toBe(LLMErrorType.INVALID_REQUEST);
        expect((error as LLMError).userMessage).toContain('rephrasing');
      }
    });

    it('should handle unknown error gracefully', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Something unexpected happened'));

      try {
        await service.generateReply([], 'Test');
        expect.fail('Should have thrown LLMError');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).type).toBe(LLMErrorType.UNKNOWN);
        expect((error as LLMError).userMessage).toContain('technical difficulties');
        expect((error as LLMError).statusCode).toBe(500);
      }
    });

    it('should preserve original error in LLMError', async () => {
      const originalError = new Error('Original error message');
      mockGenerateContent.mockRejectedValue(originalError);

      try {
        await service.generateReply([], 'Test');
        expect.fail('Should have thrown LLMError');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).originalError).toBe(originalError);
      }
    });

    it('should provide user-safe messages for all errors', async () => {
      const errors = [
        'Invalid API key',
        'Rate limit exceeded',
        'Request timed out',
        'Network error',
        'Content blocked',
        'Unknown error',
      ];

      for (const errorMsg of errors) {
        mockGenerateContent.mockRejectedValue(new Error(errorMsg));

        try {
          await service.generateReply([], 'Test');
          expect.fail(`Should have thrown LLMError for: ${errorMsg}`);
        } catch (error) {
          expect(error).toBeInstanceOf(LLMError);
          const llmError = error as LLMError;
          
          // User message should not contain technical details
          expect(llmError.userMessage).not.toContain('API');
          expect(llmError.userMessage).not.toContain('key');
          expect(llmError.userMessage).not.toContain('token');
          
          // User message should be helpful
          expect(llmError.userMessage.length).toBeGreaterThan(10);
        }
      }
    });
  });

  describe('Prompt Construction', () => {
    let service: LLMService;

    beforeEach(() => {
      service = new LLMService({ apiKey: 'test-key' });
    });

    it('should construct proper prompt structure', async () => {
      await service.generateReply([], 'What is your return policy?');

      const prompt = mockGenerateContent.mock.calls[0][0];
      
      // Check structure
      expect(prompt).toContain('You are a helpful');
      expect(prompt).toContain('Customer:');
      expect(prompt).toContain('Agent:');
    });

    it('should include FAQ knowledge in prompt', async () => {
      await service.generateReply([], 'Shipping question');

      const prompt = mockGenerateContent.mock.calls[0][0];
      
      expect(prompt).toContain('Standard Shipping');
      expect(prompt).toContain('5-7 business days');
      expect(prompt).toContain('30-day return window');
      expect(prompt).toContain('Monday-Friday: 9 AM - 8 PM');
    });

    it('should format conversation history correctly', async () => {
      const history: ConversationMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];

      await service.generateReply(history, 'Follow-up');

      const prompt = mockGenerateContent.mock.calls[0][0];
      
      expect(prompt).toContain('Customer: Hello');
      expect(prompt).toContain('Agent: Hi there!');
    });
  });
});
