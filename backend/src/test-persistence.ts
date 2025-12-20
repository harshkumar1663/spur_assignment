/**
 * Manual persistence test
 * 
 * This script demonstrates that the database persists data across application restarts.
 * Run this script multiple times to verify data persistence.
 */

import {
  initializeDatabase,
  createConversation,
  saveMessage,
  getConversationMessages,
  getAllConversations,
  closeDatabase,
} from './db';

console.log('🔵 Starting database persistence test...\n');

// Initialize database (will use file in data/chat.db)
initializeDatabase();

// Get all existing conversations
const existingConversations = getAllConversations();
console.log(`📊 Found ${existingConversations.length} existing conversation(s)`);

if (existingConversations.length > 0) {
  // Display existing conversations and their messages
  console.log('\n📝 Existing data:');
  for (const conv of existingConversations) {
    console.log(`\n  Conversation: ${conv.id}`);
    console.log(`  Created: ${conv.created_at}`);
    
    const messages = getConversationMessages(conv.id);
    console.log(`  Messages (${messages.length}):`);
    for (const msg of messages) {
      console.log(`    [${msg.sender}]: ${msg.text}`);
    }
  }
}

// Create a new conversation
console.log('\n🆕 Creating a new conversation...');
const conversation = createConversation();
console.log(`  ID: ${conversation.id}`);
console.log(`  Created: ${conversation.created_at}`);

// Add some messages
console.log('\n💬 Adding messages...');
const msg1 = saveMessage(conversation.id, 'user', 'Hello! This is a persistence test.');
console.log(`  ✓ User message saved (ID: ${msg1.id})`);

const msg2 = saveMessage(
  conversation.id,
  'assistant',
  'Great! This data will persist across application restarts.'
);
console.log(`  ✓ Assistant message saved (ID: ${msg2.id})`);

const msg3 = saveMessage(
  conversation.id,
  'user',
  'Excellent! The database uses SQLite with WAL mode.'
);
console.log(`  ✓ User message saved (ID: ${msg3.id})`);

// Verify retrieval
console.log('\n🔍 Retrieving messages...');
const messages = getConversationMessages(conversation.id);
console.log(`  Retrieved ${messages.length} message(s):`);
for (const msg of messages) {
  console.log(`    [${msg.sender}]: ${msg.text}`);
}

// Summary
const totalConversations = getAllConversations();
console.log(`\n✅ Test complete!`);
console.log(`   Total conversations in database: ${totalConversations.length}`);
console.log(`   Database location: data/chat.db`);
console.log('\n💡 Run this script again to see persisted data!');

// Close database
closeDatabase();
