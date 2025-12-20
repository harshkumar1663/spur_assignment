/**
 * LLM Service Type Definitions
 * 
 * Fully-typed interfaces for the isolated LLM service.
 * These types ensure AI logic never pollutes business logic.
 */

/**
 * Message role in conversation history
 */
export type MessageRole = 'user' | 'assistant';

/**
 * Conversation message for LLM context
 * Simplified format for LLM service - decoupled from database Message type
 */
export interface ConversationMessage {
  role: MessageRole;
  content: string;
}

/**
 * LLM error types for granular error handling
 */
export enum LLMErrorType {
  INVALID_API_KEY = 'INVALID_API_KEY',
  RATE_LIMIT = 'RATE_LIMIT',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONTENT_FILTER = 'CONTENT_FILTER',
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Custom error class for LLM-related errors
 * Provides user-safe messages and detailed error information
 */
export class LLMError extends Error {
  public readonly type: LLMErrorType;
  public readonly userMessage: string;
  public readonly originalError?: Error;
  public readonly statusCode?: number;

  constructor(
    type: LLMErrorType,
    message: string,
    userMessage: string,
    originalError?: Error,
    statusCode?: number
  ) {
    super(message);
    this.name = 'LLMError';
    this.type = type;
    this.userMessage = userMessage;
    this.originalError = originalError;
    this.statusCode = statusCode;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LLMError);
    }
  }
}

/**
 * Configuration for the LLM service
 */
export interface LLMConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  maxHistoryMessages?: number;
}

/**
 * LLM service interface
 * Defines the contract for any LLM implementation
 */
export interface ILLMService {
  /**
   * Generate a reply based on conversation history and user message
   * 
   * @param history - Previous conversation messages for context
   * @param userMessage - Current user message
   * @returns Promise resolving to AI-generated reply
   * @throws LLMError with user-safe message on failure
   */
  generateReply(history: ConversationMessage[], userMessage: string): Promise<string>;
}
