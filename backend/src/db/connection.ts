/**
 * Database Connection Module
 * 
 * Manages SQLite database connection and schema initialization.
 * Uses better-sqlite3 for synchronous, performant SQLite operations.
 * 
 * Why better-sqlite3?
 * - Synchronous API (simpler code, no async overhead for local DB)
 * - Faster than async alternatives (no event loop delay)
 * - Better performance for embedded databases
 * - Excellent TypeScript support
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Database schema definition
 * 
 * Tables:
 * - conversations: Store conversation threads
 * - messages: Store individual messages within conversations
 * 
 * Design decisions:
 * - UUIDs for all primary keys (better for distributed systems)
 * - Timestamps stored as INTEGER (Unix time in milliseconds for efficiency)
 * - Foreign key constraints enabled for data integrity
 * - Indexes on conversation_id and created_at for query performance
 */
const SCHEMA = `
-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,                    -- UUID
  created_at INTEGER NOT NULL             -- Unix timestamp (ms)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,                    -- UUID
  conversation_id TEXT NOT NULL,          -- Foreign key to conversations
  sender TEXT NOT NULL CHECK(sender IN ('user', 'assistant')),  -- Enum constraint
  text TEXT NOT NULL,                     -- Message content
  created_at INTEGER NOT NULL,            -- Unix timestamp (ms)
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation 
  ON messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_created_at 
  ON messages(created_at);

CREATE INDEX IF NOT EXISTS idx_conversations_created_at 
  ON conversations(created_at);
`;

let db: Database.Database | null = null;

/**
 * Get database file path
 * Environment-aware: uses different paths for test vs production
 */
function getDatabasePath(): string {
  const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
  
  if (isTest) {
    // Use in-memory database for tests (faster, isolated)
    return ':memory:';
  }

  // Vercel serverless functions: writable storage only in /tmp (ephemeral)
  if (process.env.VERCEL === '1') {
    return join('/tmp', 'chat.db');
  }
  
  // Production: store in data directory
  const dataDir = join(process.cwd(), 'data');
  
  // Ensure data directory exists
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  
  return join(dataDir, 'chat.db');
}

/**
 * Initialize database connection and schema
 * 
 * @returns Database instance
 */
export function initializeDatabase(): Database.Database {
  if (db) {
    return db;
  }
  
  const dbPath = getDatabasePath();
  const isMemory = dbPath === ':memory:';
  
  // Create database connection
  db = new Database(dbPath, {
    verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
  });
  
  // Enable WAL mode for better concurrency (not for in-memory)
  if (!isMemory) {
    db.pragma('journal_mode = WAL');
  }
  
  // Execute schema
  db.exec(SCHEMA);
  
  console.log(`✓ Database initialized: ${isMemory ? 'in-memory (test mode)' : dbPath}`);
  
  return db;
}

/**
 * Get the current database instance
 * Initializes if not already initialized
 */
export function getDatabase(): Database.Database {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

/**
 * Close database connection
 * Should be called on application shutdown
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('✓ Database connection closed');
  }
}

/**
 * Clear all data from the database
 * USE WITH CAUTION - Only for testing
 */
export function clearDatabase(): void {
  const database = getDatabase();
  database.exec('DELETE FROM messages');
  database.exec('DELETE FROM conversations');
}
