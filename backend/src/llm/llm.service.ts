/**
 * LLM Service - Isolated AI Logic
 * 
 * Encapsulates all AI/LLM logic to keep it separate from business logic.
 * Uses Google's Gemini API with comprehensive error handling.
 * 
 * Design principles:
 * - Single Responsibility: Only handles LLM interactions
 * - Dependency Injection: API key passed via constructor
 * - Error Isolation: All errors wrapped in user-safe LLMError
 * - No Side Effects: Pure service, no database or HTTP dependencies
 * 
 * Why Gemini?
 * - Free tier available (1500 requests/day)
 * - Fast response times
 * - Good quality responses
 * - Simple API
 * - No credit card required for API key
 */

import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import {
  LLMError,
  LLMErrorType,
  type ConversationMessage,
  type ILLMService,
  type LLMConfig,
} from './types';
import { buildSystemPrompt, formatConversationHistory } from './prompts';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  model: 'gemini-2.5-flash', // Fast, efficient model
  maxTokens: 1000,
  temperature: 0.7, // Balanced creativity vs consistency
  timeoutMs: 30000, // 30 second timeout
  maxHistoryMessages: 10, // Limit context to last 10 messages
};

/**
 * LLM Service Implementation
 * 
 * Provides isolated AI functionality with comprehensive error handling.
 */
export class LLMService implements ILLMService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: GenerativeModel;
  private readonly config: Required<LLMConfig>;

  /**
   * Initialize LLM service
   * 
   * @param config - LLM configuration including API key
   * @throws LLMError if API key is missing or invalid
   */
  constructor(config: LLMConfig) {
    // Validate API key
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new LLMError(
        LLMErrorType.INVALID_API_KEY,
        'API key is required',
        'AI service is not configured. Please contact support.',
        undefined,
        500
      );
    }

    // Merge with defaults
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    } as Required<LLMConfig>;

    try {
      // Initialize Gemini client
      this.genAI = new GoogleGenerativeAI(this.config.apiKey);

      // Configure model with safety settings
      this.model = this.genAI.getGenerativeModel({
        model: this.config.model,
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxTokens,
        },
        // Relaxed safety settings for customer service (adjust as needed)
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate AI reply based on conversation history and user message
   * 
   * @param history - Previous conversation messages (limited to maxHistoryMessages)
   * @param userMessage - Current user message
   * @returns Promise resolving to AI-generated reply
   * @throws LLMError with user-safe message on any failure
   * 
   * @example
   * ```ts
   * const reply = await llmService.generateReply(
   *   [{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Hello!' }],
   *   'What are your shipping options?'
   * );
   * ```
   */
  async generateReply(history: ConversationMessage[], userMessage: string): Promise<string> {
    // Validate input
    if (!userMessage || userMessage.trim() === '') {
      throw new LLMError(
        LLMErrorType.INVALID_REQUEST,
        'User message is empty',
        'Please provide a message.',
        undefined,
        400
      );
    }

    try {
      // Build the complete prompt
      const systemPrompt = buildSystemPrompt();
      const conversationHistory = formatConversationHistory(history, this.config.maxHistoryMessages);

      // Construct the full prompt
      const fullPrompt = `${systemPrompt}

${conversationHistory}

Customer: ${userMessage}

Agent:`;

      // Create abort controller for timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, this.config.timeoutMs);

      let result;
      try {
        // Generate response
        result = await this.model.generateContent(fullPrompt);
        clearTimeout(timeoutId);
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }

      // Extract response text
      const response = result.response;
      const text = response.text();

      if (!text || text.trim() === '') {
        throw new LLMError(
          LLMErrorType.UNKNOWN,
          'Empty response from LLM',
          'I apologize, but I\'m having trouble generating a response. Please try again.',
          undefined,
          500
        );
      }

      return text.trim();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle and transform errors into user-safe LLMError instances
   * 
   * Converts raw API errors into structured errors with:
   * - Specific error types
   * - User-friendly messages
   * - Technical details for logging
   * 
   * @param error - Raw error from API or internal code
   * @returns LLMError with appropriate type and user message
   */
  private handleError(error: unknown): LLMError {
    // Already an LLMError, return as-is
    if (error instanceof LLMError) {
      return error;
    }

    // Convert to Error object if needed
    const err = error instanceof Error ? error : new Error(String(error));

    // Check error message for specific cases
    const errorMessage = err.message.toLowerCase();

    // Invalid API key
    if (
      errorMessage.includes('api key') ||
      errorMessage.includes('invalid_api_key') ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('401')
    ) {
      return new LLMError(
        LLMErrorType.INVALID_API_KEY,
        'Invalid or expired API key',
        'AI service is unavailable. Please contact support.',
        err,
        401
      );
    }

    // Rate limiting
    if (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('429') ||
      errorMessage.includes('too many requests')
    ) {
      return new LLMError(
        LLMErrorType.RATE_LIMIT,
        'Rate limit exceeded',
        'Our AI service is currently busy. Please try again in a moment.',
        err,
        429
      );
    }

    // Timeout
    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('timed out') ||
      errorMessage.includes('aborted') ||
      err.name === 'AbortError'
    ) {
      return new LLMError(
        LLMErrorType.TIMEOUT,
        'Request timed out',
        'The AI is taking too long to respond. Please try asking again.',
        err,
        408
      );
    }

    // Network errors
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('econnrefused') ||
      errorMessage.includes('enotfound') ||
      errorMessage.includes('fetch failed')
    ) {
      return new LLMError(
        LLMErrorType.NETWORK_ERROR,
        'Network error',
        'Unable to connect to AI service. Please check your connection and try again.',
        err,
        503
      );
    }

    // Content filtering (Gemini safety filters)
    if (
      errorMessage.includes('blocked') ||
      errorMessage.includes('safety') ||
      errorMessage.includes('content filter') ||
      errorMessage.includes('harm')
    ) {
      return new LLMError(
        LLMErrorType.CONTENT_FILTER,
        'Content filtered by safety settings',
        'I apologize, but I can\'t respond to that. Please rephrase your question.',
        err,
        400
      );
    }

    // Invalid request
    if (errorMessage.includes('invalid') || errorMessage.includes('400')) {
      return new LLMError(
        LLMErrorType.INVALID_REQUEST,
        'Invalid request',
        'I had trouble understanding your request. Could you try rephrasing?',
        err,
        400
      );
    }

    // Unknown error - catch-all
    return new LLMError(
      LLMErrorType.UNKNOWN,
      `Unknown error: ${err.message}`,
      'I\'m having technical difficulties. Please try again or contact support if the problem persists.',
      err,
      500
    );
  }
}

/**
 * Factory function to create LLM service instance
 * 
 * Uses environment variable for API key by default.
 * Throws LLMError if GEMINI_API_KEY is not set.
 * 
 * @param apiKey - Optional API key (defaults to env variable)
 * @returns Configured LLM service instance
 * 
 * @example
 * ```ts
 * const llm = createLLMService();
 * const reply = await llm.generateReply([], 'Hello!');
 * ```
 */
export function createLLMService(apiKey?: string): LLMService {
  const key = apiKey || process.env.GEMINI_API_KEY;

  if (!key) {
    throw new LLMError(
      LLMErrorType.INVALID_API_KEY,
      'GEMINI_API_KEY environment variable not set',
      'AI service is not configured. Please contact support.',
      undefined,
      500
    );
  }

  return new LLMService({ apiKey: key });
}
