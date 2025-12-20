/**
 * Chat Service - Business Logic Layer
 * 
 * Orchestrates database and LLM services to provide chat functionality.
 * 
 * Design Principles:
 * - No HTTP knowledge (no req/res, no routes)
 * - No UI knowledge (no rendering, no DOM)
 * - Pure business logic
 * - Domain-safe errors
 * - Dependency injection for testability
 * 
 * Responsibilities:
 * 1. Accept user messages with optional session ID
 * 2. Create conversations when needed
 * 3. Persist user messages to database
 * 4. Fetch conversation history
 * 5. Call LLM service for AI replies
 * 6. Persist AI replies to database
 * 7. Return structured responses
 * 
 * Does NOT:
 * - Handle HTTP requests/responses
 * - Format UI responses
 * - Manage authentication/authorization (future)
 * - Deal with sessions/cookies
 */

import {
  createConversation,
  saveMessage,
  getConversationMessages,
  getConversation,
} from '../db';
import { LLMError, type ILLMService, type ConversationMessage } from '../llm';
import {
  ChatError,
  ChatErrorType,
  type SendMessageRequest,
  type SendMessageResponse,
  type GetHistoryRequest,
  type GetHistoryResponse,
  type HistoryMessage,
} from './types';

/**
 * Chat Service
 * 
 * Orchestrates chat conversations between users and AI assistant.
 */
export class ChatService {
  constructor(private readonly llmService: ILLMService) {}

  /**
   * Send a message and get AI reply
   * 
   * Flow:
   * 1. Validate input
   * 2. Get or create conversation
   * 3. Save user message
   * 4. Fetch conversation history
   * 5. Generate AI reply via LLM
   * 6. Save AI reply
   * 7. Return response
   * 
   * @param request - Message and optional session ID
   * @returns AI reply and session ID
   * @throws ChatError with domain-safe message
   */
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    // 1. Validate input
    this.validateSendMessageRequest(request);

    try {
      // 2. Get or create conversation
      const conversationId = await this.getOrCreateConversation(request.sessionId);

      // 3. Save user message
      await this.saveUserMessage(conversationId, request.message);

      // 4. Fetch conversation history for LLM context
      const history = await this.getConversationHistory(conversationId);

      // 5. Generate AI reply
      const aiReply = await this.generateAIReply(history, request.message);

      // 6. Save AI reply
      await this.saveAssistantMessage(conversationId, aiReply);

      // 7. Return response
      return {
        reply: aiReply,
        sessionId: conversationId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get conversation history
   * 
   * @param request - Session ID and optional limit
   * @returns Conversation messages
   * @throws ChatError if conversation not found
   */
  async getHistory(request: GetHistoryRequest): Promise<GetHistoryResponse> {
    try {
      // Validate sessionId format
      if (!this.isValidUUID(request.sessionId)) {
        throw new ChatError(
          ChatErrorType.INVALID_INPUT,
          'Invalid session ID format',
          'Invalid session ID. Please start a new conversation.',
          400
        );
      }

      // Verify conversation exists
      const conversation = getConversation(request.sessionId);
      if (!conversation) {
        throw new ChatError(
          ChatErrorType.CONVERSATION_NOT_FOUND,
          `Conversation not found: ${request.sessionId}`,
          'Conversation not found. Please start a new conversation.',
          404
        );
      }

      // Get messages
      const messages = getConversationMessages(request.sessionId);

      // Apply limit if specified
      const limitedMessages = request.limit
        ? messages.slice(-request.limit)
        : messages;

      // Transform to history format
      const historyMessages: HistoryMessage[] = limitedMessages.map((msg) => ({
        id: msg.id,
        sender: msg.sender,
        text: msg.text,
        timestamp: msg.created_at,
      }));

      return {
        sessionId: request.sessionId,
        messages: historyMessages,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Validate send message request
   * @private
   */
  private validateSendMessageRequest(request: SendMessageRequest): void {
    if (!request.message || request.message.trim() === '') {
      throw new ChatError(
        ChatErrorType.INVALID_INPUT,
        'Message is required',
        'Please provide a message.',
        400
      );
    }

    if (request.message.length > 10000) {
      throw new ChatError(
        ChatErrorType.INVALID_INPUT,
        'Message too long',
        'Message is too long. Please keep it under 10,000 characters.',
        400
      );
    }

    if (request.sessionId && !this.isValidUUID(request.sessionId)) {
      throw new ChatError(
        ChatErrorType.INVALID_INPUT,
        'Invalid session ID format',
        'Invalid session ID. Please start a new conversation.',
        400
      );
    }
  }

  /**
   * Get existing conversation or create new one
   * @private
   */
  private async getOrCreateConversation(sessionId?: string): Promise<string> {
    if (sessionId) {
      // Verify conversation exists
      const conversation = getConversation(sessionId);
      if (!conversation) {
        throw new ChatError(
          ChatErrorType.CONVERSATION_NOT_FOUND,
          `Conversation not found: ${sessionId}`,
          'Conversation not found. Starting a new conversation.',
          404
        );
      }
      return sessionId;
    }

    // Create new conversation
    const conversation = createConversation();
    return conversation.id;
  }

  /**
   * Save user message to database
   * @private
   */
  private async saveUserMessage(conversationId: string, message: string): Promise<void> {
    try {
      saveMessage(conversationId, 'user', message);
    } catch (error) {
      throw new ChatError(
        ChatErrorType.DATABASE_ERROR,
        `Failed to save user message: ${error}`,
        'Failed to save your message. Please try again.',
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Save assistant message to database
   * @private
   */
  private async saveAssistantMessage(conversationId: string, message: string): Promise<void> {
    try {
      saveMessage(conversationId, 'assistant', message);
    } catch (error) {
      throw new ChatError(
        ChatErrorType.DATABASE_ERROR,
        `Failed to save assistant message: ${error}`,
        'Failed to save AI response. Please try again.',
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get conversation history for LLM context
   * Excludes the current message (already in request)
   * @private
   */
  private async getConversationHistory(conversationId: string): Promise<ConversationMessage[]> {
    try {
      const messages = getConversationMessages(conversationId);

      // Convert to LLM format (excluding the just-added user message)
      // Take all messages except the last one (which is the current user message)
      const historyMessages = messages.slice(0, -1);

      return historyMessages.map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
      }));
    } catch (error) {
      throw new ChatError(
        ChatErrorType.DATABASE_ERROR,
        `Failed to fetch conversation history: ${error}`,
        'Failed to load conversation history.',
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Generate AI reply using LLM service
   * @private
   */
  private async generateAIReply(
    history: ConversationMessage[],
    userMessage: string
  ): Promise<string> {
    try {
      return await this.llmService.generateReply(history, userMessage);
    } catch (error) {
      // LLM service already provides user-safe messages
      if (error instanceof LLMError) {
        throw new ChatError(
          ChatErrorType.AI_SERVICE_ERROR,
          `LLM error: ${error.message}`,
          error.userMessage, // Use LLM's user-safe message
          error.statusCode || 500,
          error
        );
      }

      throw new ChatError(
        ChatErrorType.AI_SERVICE_ERROR,
        `Failed to generate AI reply: ${error}`,
        'Unable to generate a response. Please try again.',
        500,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate UUID format
   * @private
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Handle and transform errors into domain-safe ChatError
   * @private
   */
  private handleError(error: unknown): ChatError {
    // Already a ChatError
    if (error instanceof ChatError) {
      return error;
    }

    // LLM error
    if (error instanceof LLMError) {
      return new ChatError(
        ChatErrorType.AI_SERVICE_ERROR,
        `LLM error: ${error.message}`,
        error.userMessage,
        error.statusCode || 500,
        error
      );
    }

    // Database error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.toLowerCase().includes('conversation not found')) {
      return new ChatError(
        ChatErrorType.CONVERSATION_NOT_FOUND,
        errorMessage,
        'Conversation not found.',
        404,
        error instanceof Error ? error : undefined
      );
    }

    // Unknown error
    return new ChatError(
      ChatErrorType.UNKNOWN_ERROR,
      `Unexpected error: ${errorMessage}`,
      'An unexpected error occurred. Please try again.',
      500,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Factory function to create ChatService with dependencies
 * 
 * @param llmService - LLM service instance
 * @returns Configured chat service
 */
export function createChatService(llmService: ILLMService): ChatService {
  return new ChatService(llmService);
}
