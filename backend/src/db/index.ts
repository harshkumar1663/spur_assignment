/**
 * Database Module
 * 
 * Exports all database functionality for the AI live chat system.
 */

// Connection management
export {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  clearDatabase,
} from './connection';

// Database operations
export {
  createConversation,
  saveMessage,
  getConversationMessages,
  getConversation,
  getAllConversations,
  deleteConversation,
} from './operations';

// Types
export type {
  Conversation,
  Message,
  MessageSender,
  CreateMessageInput,
  ConversationRow,
  MessageRow,
} from './types';
