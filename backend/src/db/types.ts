/**
 * Database Type Definitions
 * 
 * Fully-typed interfaces for the AI live chat system database.
 * All entities use UUIDs for identification.
 */

/**
 * Conversation entity
 * Represents a chat conversation thread
 */
export interface Conversation {
  id: string;           // UUID
  created_at: string;   // ISO 8601 timestamp
}

/**
 * Message sender type
 * - 'user': Message from the human user
 * - 'assistant': Message from the AI assistant
 */
export type MessageSender = 'user' | 'assistant';

/**
 * Message entity
 * Represents a single message within a conversation
 */
export interface Message {
  id: string;              // UUID
  conversation_id: string; // Foreign key to conversations.id (UUID)
  sender: MessageSender;   // Who sent the message
  text: string;            // Message content
  created_at: string;      // ISO 8601 timestamp
}

/**
 * Input for creating a new message
 * Omits auto-generated fields (id, created_at)
 */
export interface CreateMessageInput {
  conversation_id: string;
  sender: MessageSender;
  text: string;
}

/**
 * Database row types (as returned from SQLite)
 * SQLite returns created_at as integer (Unix timestamp in milliseconds)
 */
export interface ConversationRow {
  id: string;
  created_at: number;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender: string;
  text: string;
  created_at: number;
}
