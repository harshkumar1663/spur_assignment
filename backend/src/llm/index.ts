/**
 * LLM Module Exports
 * 
 * Central export point for all LLM-related functionality.
 */

// Service
export { LLMService, createLLMService } from './llm.service';

// Types
export {
  LLMError,
  LLMErrorType,
  type ConversationMessage,
  type MessageRole,
  type LLMConfig,
  type ILLMService,
} from './types';

// Prompts (exported for testing purposes)
export { buildSystemPrompt, formatConversationHistory, SYSTEM_PROMPT, FAQ_KNOWLEDGE } from './prompts';
