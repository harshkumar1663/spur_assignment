/**
 * Chat Service Type Definitions
 * 
 * Domain types for the chat service layer.
 * No HTTP or UI concepts - pure business logic types.
 */

/**
 * Request to send a message in a chat conversation
 */
export interface SendMessageRequest {
  /** User's message text */
  message: string;
  /** Optional conversation ID (creates new if not provided) */
  sessionId?: string;
}

/**
 * Response after sending a message
 */
export interface SendMessageResponse {
  /** AI-generated reply */
  reply: string;
  /** Conversation ID (for subsequent messages) */
  sessionId: string;
  /** ISO timestamp of when reply was generated */
  timestamp: string;
}

/**
 * Request to get conversation history
 */
export interface GetHistoryRequest {
  /** Conversation ID */
  sessionId: string;
  /** Optional limit on number of messages to return */
  limit?: number;
}

/**
 * Message in conversation history
 */
export interface HistoryMessage {
  /** Message ID */
  id: string;
  /** Who sent the message */
  sender: 'user' | 'assistant';
  /** Message text */
  text: string;
  /** ISO timestamp */
  timestamp: string;
}

/**
 * Response containing conversation history
 */
export interface GetHistoryResponse {
  /** Conversation ID */
  sessionId: string;
  /** List of messages in chronological order */
  messages: HistoryMessage[];
}

/**
 * Chat service error types
 * Domain-safe error categories
 */
export enum ChatErrorType {
  /** Conversation not found */
  CONVERSATION_NOT_FOUND = 'CONVERSATION_NOT_FOUND',
  /** Invalid input data */
  INVALID_INPUT = 'INVALID_INPUT',
  /** AI service unavailable or failed */
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  /** Database operation failed */
  DATABASE_ERROR = 'DATABASE_ERROR',
  /** Unknown/unexpected error */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom error class for chat service
 * Provides domain-safe error messages
 */
export class ChatError extends Error {
  public readonly type: ChatErrorType;
  public readonly userMessage: string;
  public readonly statusCode: number;
  public readonly originalError?: Error;

  constructor(
    type: ChatErrorType,
    message: string,
    userMessage: string,
    statusCode: number,
    originalError?: Error
  ) {
    super(message);
    this.name = 'ChatError';
    this.type = type;
    this.userMessage = userMessage;
    this.statusCode = statusCode;
    this.originalError = originalError;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ChatError);
    }
  }
}
