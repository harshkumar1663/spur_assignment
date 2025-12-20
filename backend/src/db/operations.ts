/**
 * Database Operations
 * 
 * Fully-typed database functions for the AI live chat system.
 * All operations are synchronous using better-sqlite3.
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './connection';
import type {
  Conversation,
  Message,
  MessageSender,
  ConversationRow,
  MessageRow,
} from './types';

/**
 * Create a new conversation
 * 
 * @returns The newly created conversation with UUID and timestamp
 * 
 * @example
 * ```ts
 * const conversation = createConversation();
 * console.log(conversation.id); // UUID v4
 * ```
 */
export function createConversation(): Conversation {
  const db = getDatabase();
  
  const id = uuidv4();
  const created_at = Date.now();
  
  const stmt = db.prepare(`
    INSERT INTO conversations (id, created_at)
    VALUES (?, ?)
  `);
  
  stmt.run(id, created_at);
  
  return {
    id,
    created_at: new Date(created_at).toISOString(),
  };
}

/**
 * Save a message to a conversation
 * 
 * @param conversationId - UUID of the conversation
 * @param sender - Who sent the message ('user' or 'assistant')
 * @param text - Message content
 * @returns The saved message with UUID and timestamp
 * @throws Error if conversation doesn't exist
 * 
 * @example
 * ```ts
 * const message = saveMessage(conversationId, 'user', 'Hello!');
 * console.log(message.id); // UUID v4
 * ```
 */
export function saveMessage(
  conversationId: string,
  sender: MessageSender,
  text: string
): Message {
  const db = getDatabase();
  
  // Verify conversation exists
  const conversationCheck = db.prepare(`
    SELECT id FROM conversations WHERE id = ?
  `).get(conversationId);
  
  if (!conversationCheck) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }
  
  const id = uuidv4();
  const created_at = Date.now();
  
  const stmt = db.prepare(`
    INSERT INTO messages (id, conversation_id, sender, text, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, conversationId, sender, text, created_at);
  
  return {
    id,
    conversation_id: conversationId,
    sender,
    text,
    created_at: new Date(created_at).toISOString(),
  };
}

/**
 * Get all messages for a conversation in chronological order
 * 
 * @param conversationId - UUID of the conversation
 * @returns Array of messages ordered by creation time (oldest first)
 * @throws Error if conversation doesn't exist
 * 
 * @example
 * ```ts
 * const messages = getConversationMessages(conversationId);
 * console.log(messages.length); // Number of messages
 * ```
 */
export function getConversationMessages(conversationId: string): Message[] {
  const db = getDatabase();
  
  // Verify conversation exists
  const conversationCheck = db.prepare(`
    SELECT id FROM conversations WHERE id = ?
  `).get(conversationId);
  
  if (!conversationCheck) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }
  
  const stmt = db.prepare(`
    SELECT id, conversation_id, sender, text, created_at
    FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
  `);
  
  const rows = stmt.all(conversationId) as MessageRow[];
  
  // Transform database rows to Message objects
  return rows.map((row) => ({
    id: row.id,
    conversation_id: row.conversation_id,
    sender: row.sender as MessageSender,
    text: row.text,
    created_at: new Date(row.created_at).toISOString(),
  }));
}

/**
 * Get a conversation by ID
 * 
 * @param conversationId - UUID of the conversation
 * @returns The conversation or null if not found
 * 
 * @example
 * ```ts
 * const conversation = getConversation(conversationId);
 * if (conversation) {
 *   console.log(conversation.created_at);
 * }
 * ```
 */
export function getConversation(conversationId: string): Conversation | null {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT id, created_at
    FROM conversations
    WHERE id = ?
  `);
  
  const row = stmt.get(conversationId) as ConversationRow | undefined;
  
  if (!row) {
    return null;
  }
  
  return {
    id: row.id,
    created_at: new Date(row.created_at).toISOString(),
  };
}

/**
 * Get all conversations ordered by creation time (newest first)
 * 
 * @returns Array of all conversations
 * 
 * @example
 * ```ts
 * const conversations = getAllConversations();
 * console.log(conversations.length);
 * ```
 */
export function getAllConversations(): Conversation[] {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT id, created_at
    FROM conversations
    ORDER BY created_at DESC
  `);
  
  const rows = stmt.all() as ConversationRow[];
  
  return rows.map((row) => ({
    id: row.id,
    created_at: new Date(row.created_at).toISOString(),
  }));
}

/**
 * Delete a conversation and all its messages
 * 
 * @param conversationId - UUID of the conversation to delete
 * @returns true if conversation was deleted, false if not found
 * 
 * @example
 * ```ts
 * const deleted = deleteConversation(conversationId);
 * console.log(deleted); // true if successful
 * ```
 */
export function deleteConversation(conversationId: string): boolean {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    DELETE FROM conversations WHERE id = ?
  `);
  
  const result = stmt.run(conversationId);
  
  return result.changes > 0;
}
