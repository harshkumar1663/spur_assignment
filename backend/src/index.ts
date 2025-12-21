/**
 * Backend API - Entry Point
 * 
 * Built with Fastify for high performance and excellent TypeScript support.
 * 
 * Why Fastify?
 * ------------
 * 1. Performance: Up to 3x faster than Express in benchmarks
 * 2. TypeScript Native: Built with TypeScript in mind, excellent type inference
 * 3. Schema Validation: JSON Schema validation built-in (via Ajv)
 * 4. Modern Async: Designed for async/await from the ground up
 * 5. Plugin Architecture: Clean, encapsulated plugin system
 * 6. Logging: Pino logger integrated (fastest JSON logger for Node.js)
 * 7. Growing Ecosystem: Active community and extensive plugin ecosystem
 * 
 * vs Express:
 * - Express is older, more middleware available but slower
 * - Express TypeScript support requires more configuration
 * - Express lacks built-in validation
 * - Fastify is the modern choice for new projects
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import dotenv from 'dotenv';
import path from 'path';
import { registerChatRoutes } from './routes/chat';
import { registerErrorHandler } from './middleware/errorHandler';
import { initializeDatabase, closeDatabase } from './db';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Initialize Fastify with production-ready configuration
 * 
 * Logger: Pino provides structured JSON logging with minimal overhead
 * TypeScript: Full type safety with generic typing
 */
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    } : undefined,
  },
});

/**
 * Register CORS plugin
 * Configured to work with SvelteKit frontend on default Vite port
 */
void fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
});

/**
 * Initialize database
 * Sets up SQLite and creates schema
 */
try {
  initializeDatabase();
  fastify.log.info('Database initialized');
} catch (err) {
  fastify.log.error(err, 'Failed to initialize database');
  process.exit(1);
}

/**
 * Register error handler
 * Converts domain errors to HTTP responses
 */
registerErrorHandler(fastify);

/**
 * Health check endpoint
 * Essential for container orchestration (Kubernetes, Docker health checks)
 * MUST be registered before static file serving
 */
fastify.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
  };
});

/**
 * Register chat routes
 * All chat functionality exposed via HTTP
 * MUST be registered before static file serving
 */
void registerChatRoutes(fastify);

/**
 * Serve static frontend files (production only)
 * In development, frontend runs separately with Vite
 * This MUST be registered AFTER all API routes
 */
if (NODE_ENV === 'production') {
  // In CommonJS, __dirname is available
  const frontendBuildPath = path.resolve(__dirname, '../../frontend/build');
  
  fastify.log.info(`Serving frontend from: ${frontendBuildPath}`);
  
  // Serve static files
  void fastify.register(fastifyStatic, {
    root: frontendBuildPath,
    prefix: '/',
    decorateReply: false,
  });

  // SPA fallback - serve index.html for all non-API routes
  fastify.setNotFoundHandler((request, reply) => {
    // Don't serve index.html for API routes - return 404
    if (request.url.startsWith('/chat') || request.url.startsWith('/health')) {
      reply.code(404).send({ error: 'Not Found', message: 'Route not found' });
      return;
    }
    
    // Serve index.html for all other routes (SPA routing)
    reply.sendFile('index.html');
  });
}

/**
 * Start the server
 * Fastify's .listen() returns a promise, making error handling clean
 */
const start = async (): Promise<void> => {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`Server running on http://${HOST}:${PORT}`);
    fastify.log.info(`Environment: ${NODE_ENV}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown handlers
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, closing server gracefully...`);
    closeDatabase();
    await fastify.close();
    process.exit(0);
  });
});

// Start the server
void start();
