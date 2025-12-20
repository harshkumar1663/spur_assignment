/**
 * LLM Service Demo
 * 
 * Demonstrates the LLM service with real Gemini API calls.
 * 
 * Prerequisites:
 * 1. Set GEMINI_API_KEY in your .env file
 * 2. Get a free API key from: https://makersuite.google.com/app/apikey
 * 
 * Usage:
 * npx tsx src/demo-llm.ts
 */

import 'dotenv/config';
import { createLLMService, LLMError, type ConversationMessage } from './llm';

async function demo() {
  console.log('🤖 LLM Service Demo\n');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Create LLM service
    console.log('📝 Initializing LLM service...');
    const llmService = createLLMService();
    console.log('✓ LLM service initialized\n');

    // Example 1: Simple question
    console.log('📬 Example 1: Simple Question');
    console.log('─────────────────────────────');
    const question1 = 'What are your shipping options?';
    console.log(`User: ${question1}`);
    
    const reply1 = await llmService.generateReply([], question1);
    console.log(`AI: ${reply1}\n`);

    // Example 2: With conversation history
    console.log('💬 Example 2: With Conversation History');
    console.log('─────────────────────────────────────────');
    
    const history: ConversationMessage[] = [
      { role: 'user', content: 'What are your business hours?' },
      { role: 'assistant', content: 'We\'re open Monday-Friday 9 AM - 8 PM EST, Saturday 10 AM - 6 PM EST, and Sunday 12 PM - 5 PM EST.' },
    ];
    
    console.log('User: What are your business hours?');
    console.log('AI: We\'re open Monday-Friday 9 AM - 8 PM EST...');
    
    const question2 = 'Are you open on holidays?';
    console.log(`User: ${question2}`);
    
    const reply2 = await llmService.generateReply(history, question2);
    console.log(`AI: ${reply2}\n`);

    // Example 3: Returns question
    console.log('📦 Example 3: Returns Policy');
    console.log('─────────────────────────────');
    const question3 = 'How do I return an item?';
    console.log(`User: ${question3}`);
    
    const reply3 = await llmService.generateReply([], question3);
    console.log(`AI: ${reply3}\n`);

    // Example 4: Complex conversation
    console.log('🔄 Example 4: Multi-Turn Conversation');
    console.log('──────────────────────────────────────');
    
    const conversation: ConversationMessage[] = [];
    const questions = [
      'Do you offer overnight shipping?',
      'How much does it cost?',
      'What time do I need to order by?',
    ];

    for (const q of questions) {
      console.log(`User: ${q}`);
      const reply = await llmService.generateReply(conversation, q);
      console.log(`AI: ${reply}\n`);
      
      // Add to history
      conversation.push({ role: 'user', content: q });
      conversation.push({ role: 'assistant', content: reply });
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Demo completed successfully!\n');
    
  } catch (error) {
    if (error instanceof LLMError) {
      console.error('\n❌ LLM Error:');
      console.error(`   Type: ${error.type}`);
      console.error(`   User Message: ${error.userMessage}`);
      console.error(`   Technical: ${error.message}`);
      
      if (error.type === 'INVALID_API_KEY') {
        console.error('\n💡 Tip: Make sure GEMINI_API_KEY is set in your .env file');
        console.error('   Get a free key at: https://makersuite.google.com/app/apikey');
      }
    } else {
      console.error('\n❌ Unexpected error:', error);
    }
    process.exit(1);
  }
}

// Run demo
demo();
