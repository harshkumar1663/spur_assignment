/**
 * Database Operations Tests
 * 
 * Comprehensive tests for the AI live chat database layer.
 * Tests verify:
 * - Conversation creation
 * - Message persistence
 * - Message retrieval in correct order
 * - Data integrity across operations
 * - Foreign key constraints
 * - UUID generation
 * 
 * No mocking - tests interact with real SQLite database (in-memory for tests)
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  initializeDatabase,
  closeDatabase,
  clearDatabase,
  createConversation,
  saveMessage,
  getConversationMessages,
  getConversation,
  getAllConversations,
  deleteConversation,
} from '../index';

// Initialize database before all tests
beforeEach(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.VITEST = 'true';
  
  // Initialize and clear database
  initializeDatabase();
  clearDatabase();
});

// Clean up after all tests
afterAll(() => {
  closeDatabase();
});

describe('Database Operations', () => {
  describe('createConversation', () => {
    it('should create a new conversation with UUID and timestamp', () => {
      const conversation = createConversation();
      
      // Verify UUID format (36 characters with hyphens)
      expect(conversation.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      
      // Verify ISO 8601 timestamp format
      expect(conversation.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // Verify timestamp is recent (within last second)
      const createdTime = new Date(conversation.created_at).getTime();
      const now = Date.now();
      expect(now - createdTime).toBeLessThan(1000);
    });
    
    it('should create multiple conversations with unique IDs', () => {
      const conv1 = createConversation();
      const conv2 = createConversation();
      const conv3 = createConversation();
      
      // All IDs should be unique
      expect(conv1.id).not.toBe(conv2.id);
      expect(conv2.id).not.toBe(conv3.id);
      expect(conv1.id).not.toBe(conv3.id);
    });
    
    it('should persist conversation data', () => {
      const created = createConversation();
      const retrieved = getConversation(created.id);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.created_at).toBe(created.created_at);
    });
  });
  
  describe('saveMessage', () => {
    it('should save a user message to a conversation', () => {
      const conversation = createConversation();
      const message = saveMessage(conversation.id, 'user', 'Hello, AI!');
      
      // Verify message structure
      expect(message.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(message.conversation_id).toBe(conversation.id);
      expect(message.sender).toBe('user');
      expect(message.text).toBe('Hello, AI!');
      expect(message.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
    
    it('should save an assistant message to a conversation', () => {
      const conversation = createConversation();
      const message = saveMessage(conversation.id, 'assistant', 'Hello! How can I help?');
      
      expect(message.sender).toBe('assistant');
      expect(message.text).toBe('Hello! How can I help?');
    });
    
    it('should throw error when saving to non-existent conversation', () => {
      const fakeId = '00000000-0000-4000-8000-000000000000';
      
      expect(() => {
        saveMessage(fakeId, 'user', 'Test');
      }).toThrow(`Conversation not found: ${fakeId}`);
    });
    
    it('should save multiple messages with unique IDs', () => {
      const conversation = createConversation();
      
      const msg1 = saveMessage(conversation.id, 'user', 'Message 1');
      const msg2 = saveMessage(conversation.id, 'assistant', 'Message 2');
      const msg3 = saveMessage(conversation.id, 'user', 'Message 3');
      
      expect(msg1.id).not.toBe(msg2.id);
      expect(msg2.id).not.toBe(msg3.id);
      expect(msg1.id).not.toBe(msg3.id);
    });
  });
  
  describe('getConversationMessages', () => {
    it('should retrieve messages in chronological order', () => {
      const conversation = createConversation();
      
      // Save messages with slight delays to ensure ordering
      const msg1 = saveMessage(conversation.id, 'user', 'First message');
      const msg2 = saveMessage(conversation.id, 'assistant', 'Second message');
      const msg3 = saveMessage(conversation.id, 'user', 'Third message');
      
      const messages = getConversationMessages(conversation.id);
      
      expect(messages).toHaveLength(3);
      expect(messages[0].id).toBe(msg1.id);
      expect(messages[1].id).toBe(msg2.id);
      expect(messages[2].id).toBe(msg3.id);
      
      // Verify content
      expect(messages[0].text).toBe('First message');
      expect(messages[1].text).toBe('Second message');
      expect(messages[2].text).toBe('Third message');
      
      // Verify senders
      expect(messages[0].sender).toBe('user');
      expect(messages[1].sender).toBe('assistant');
      expect(messages[2].sender).toBe('user');
    });
    
    it('should return empty array for conversation with no messages', () => {
      const conversation = createConversation();
      const messages = getConversationMessages(conversation.id);
      
      expect(messages).toEqual([]);
    });
    
    it('should throw error for non-existent conversation', () => {
      const fakeId = '00000000-0000-4000-8000-000000000000';
      
      expect(() => {
        getConversationMessages(fakeId);
      }).toThrow(`Conversation not found: ${fakeId}`);
    });
    
    it('should only return messages for the specified conversation', () => {
      const conv1 = createConversation();
      const conv2 = createConversation();
      
      saveMessage(conv1.id, 'user', 'Conv1 Message 1');
      saveMessage(conv1.id, 'assistant', 'Conv1 Message 2');
      saveMessage(conv2.id, 'user', 'Conv2 Message 1');
      
      const conv1Messages = getConversationMessages(conv1.id);
      const conv2Messages = getConversationMessages(conv2.id);
      
      expect(conv1Messages).toHaveLength(2);
      expect(conv2Messages).toHaveLength(1);
      
      expect(conv1Messages[0].text).toBe('Conv1 Message 1');
      expect(conv2Messages[0].text).toBe('Conv2 Message 1');
    });
  });
  
  describe('Data Persistence', () => {
    it('should persist messages correctly', () => {
      const conversation = createConversation();
      
      // Save messages
      saveMessage(conversation.id, 'user', 'Hello');
      saveMessage(conversation.id, 'assistant', 'Hi there!');
      saveMessage(conversation.id, 'user', 'How are you?');
      
      // Retrieve and verify
      const messages = getConversationMessages(conversation.id);
      
      expect(messages).toHaveLength(3);
      expect(messages[0].text).toBe('Hello');
      expect(messages[1].text).toBe('Hi there!');
      expect(messages[2].text).toBe('How are you?');
    });
    
    it('should maintain data integrity across operations', () => {
      // Create multiple conversations
      const conv1 = createConversation();
      const conv2 = createConversation();
      
      // Add messages to both
      saveMessage(conv1.id, 'user', 'Conv1 Msg1');
      saveMessage(conv2.id, 'user', 'Conv2 Msg1');
      saveMessage(conv1.id, 'assistant', 'Conv1 Msg2');
      
      // Verify separation
      const conv1Messages = getConversationMessages(conv1.id);
      const conv2Messages = getConversationMessages(conv2.id);
      
      expect(conv1Messages).toHaveLength(2);
      expect(conv2Messages).toHaveLength(1);
      
      // Verify all conversations exist
      const allConversations = getAllConversations();
      expect(allConversations).toHaveLength(2);
    });
  });
  
  describe('getAllConversations', () => {
    it('should return all conversations ordered by creation time (newest first)', () => {
      const conv1 = createConversation();
      const conv2 = createConversation();
      const conv3 = createConversation();
      
      const conversations = getAllConversations();
      
      expect(conversations).toHaveLength(3);
      // Newest first
      expect(conversations[0].id).toBe(conv3.id);
      expect(conversations[1].id).toBe(conv2.id);
      expect(conversations[2].id).toBe(conv1.id);
    });
    
    it('should return empty array when no conversations exist', () => {
      const conversations = getAllConversations();
      expect(conversations).toEqual([]);
    });
  });
  
  describe('deleteConversation', () => {
    it('should delete conversation and cascade delete messages', () => {
      const conversation = createConversation();
      
      // Add messages
      saveMessage(conversation.id, 'user', 'Test message 1');
      saveMessage(conversation.id, 'assistant', 'Test message 2');
      
      // Verify messages exist
      const messagesBefore = getConversationMessages(conversation.id);
      expect(messagesBefore).toHaveLength(2);
      
      // Delete conversation
      const deleted = deleteConversation(conversation.id);
      expect(deleted).toBe(true);
      
      // Verify conversation is gone
      const retrieved = getConversation(conversation.id);
      expect(retrieved).toBeNull();
      
      // Verify messages are gone (should throw since conversation doesn't exist)
      expect(() => {
        getConversationMessages(conversation.id);
      }).toThrow();
    });
    
    it('should return false when deleting non-existent conversation', () => {
      const fakeId = '00000000-0000-4000-8000-000000000000';
      const deleted = deleteConversation(fakeId);
      expect(deleted).toBe(false);
    });
  });
  
  describe('Integration Test: Complete Chat Flow', () => {
    it('should handle a complete conversation flow', () => {
      // 1. Create conversation
      const conversation = createConversation();
      expect(conversation.id).toBeTruthy();
      
      // 2. User sends first message
      const userMsg1 = saveMessage(conversation.id, 'user', 'What is TypeScript?');
      expect(userMsg1.text).toBe('What is TypeScript?');
      
      // 3. Assistant responds
      const assistantMsg1 = saveMessage(
        conversation.id,
        'assistant',
        'TypeScript is a typed superset of JavaScript.'
      );
      expect(assistantMsg1.sender).toBe('assistant');
      
      // 4. User asks follow-up
      const userMsg2 = saveMessage(conversation.id, 'user', 'Why should I use it?');
      
      // 5. Assistant responds again
      const assistantMsg2 = saveMessage(
        conversation.id,
        'assistant',
        'It provides better tooling and catches errors at compile time.'
      );
      
      // 6. Retrieve full conversation
      const messages = getConversationMessages(conversation.id);
      
      // Verify complete conversation
      expect(messages).toHaveLength(4);
      
      // Verify alternating pattern
      expect(messages[0].sender).toBe('user');
      expect(messages[1].sender).toBe('assistant');
      expect(messages[2].sender).toBe('user');
      expect(messages[3].sender).toBe('assistant');
      
      // Verify correct order
      expect(messages[0].id).toBe(userMsg1.id);
      expect(messages[1].id).toBe(assistantMsg1.id);
      expect(messages[2].id).toBe(userMsg2.id);
      expect(messages[3].id).toBe(assistantMsg2.id);
      
      // Verify content integrity
      expect(messages[0].text).toBe('What is TypeScript?');
      expect(messages[3].text).toBe('It provides better tooling and catches errors at compile time.');
    });
  });
});
