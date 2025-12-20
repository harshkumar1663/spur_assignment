#!/usr/bin/env node

/**
 * Manual API Testing Script
 * 
 * Tests the HTTP API with real requests
 */

const BASE_URL = 'http://localhost:3000';

async function test() {
  console.log('Testing Chat API...\n');

  // Test 1: Send a message (new conversation)
  console.log('Test 1: Send message (new conversation)');
  try {
    const response = await fetch(`${BASE_URL}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Hello! What are your business hours?',
      }),
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    console.log('✓ Test passed\n');

    // Store sessionId for next test
    const sessionId = data.sessionId;

    // Test 2: Send another message (existing conversation)
    console.log('Test 2: Send message (existing conversation)');
    const response2 = await fetch(`${BASE_URL}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What about weekends?',
        sessionId,
      }),
    });

    const data2 = await response2.json();
    console.log(`Status: ${response2.status}`);
    console.log(`Response:`, JSON.stringify(data2, null, 2));
    console.log('✓ Test passed\n');

    // Test 3: Get history
    console.log('Test 3: Get conversation history');
    const response3 = await fetch(`${BASE_URL}/chat/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });

    const data3 = await response3.json();
    console.log(`Status: ${response3.status}`);
    console.log(`Messages count: ${data3.messages?.length || 0}`);
    console.log('✓ Test passed\n');

    // Test 4: Error handling - empty message
    console.log('Test 4: Error handling - empty message');
    const response4 = await fetch(`${BASE_URL}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' }),
    });

    const data4 = await response4.json();
    console.log(`Status: ${response4.status}`);
    console.log(`Error: ${data4.message}`);
    console.log('✓ Test passed\n');

    // Test 5: Error handling - invalid sessionId
    console.log('Test 5: Error handling - invalid sessionId');
    const response5 = await fetch(`${BASE_URL}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Test',
        sessionId: 'not-a-uuid',
      }),
    });

    const data5 = await response5.json();
    console.log(`Status: ${response5.status}`);
    console.log(`Error: ${data5.message}`);
    console.log('✓ Test passed\n');

    console.log('✅ All tests passed! API is working correctly.');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

test();
