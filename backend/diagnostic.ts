// diagnostic.ts - Run this to verify environment setup
import dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env
const envPath = path.join(process.cwd(), '.env');
console.log(`Loading .env from: ${envPath}`);

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Failed to load .env file:', result.error);
  process.exit(1);
}

console.log('✅ .env loaded successfully');
console.log('Environment variables:');
console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`  PORT: ${process.env.PORT}`);
console.log(`  HOST: ${process.env.HOST}`);

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.log(`  ❌ GEMINI_API_KEY: NOT SET`);
  process.exit(1);
} else if (apiKey.trim() === '') {
  console.log(`  ❌ GEMINI_API_KEY: EMPTY (only whitespace)`);
  process.exit(1);
} else {
  const masked = apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 5);
  console.log(`  ✅ GEMINI_API_KEY: ${masked} (${apiKey.length} chars)`);
}
