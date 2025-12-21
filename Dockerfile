# Multi-stage Dockerfile for production deployment
# Single process: Backend serves both API and frontend static files

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install all dependencies
RUN npm ci

# Copy source code
COPY backend ./backend
COPY frontend ./frontend

# Build frontend first (generates static files in frontend/build)
RUN npm run build:frontend

# Build backend (compiles TypeScript to dist/)
RUN npm run build:backend

# Stage 2: Production runtime
FROM node:18-alpine AS runner

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install production dependencies
WORKDIR /app/backend
RUN npm ci --production

# Copy built backend
COPY --from=builder /app/backend/dist ./dist

# Copy built frontend (static files)
WORKDIR /app
COPY --from=builder /app/frontend/build ./frontend/build

# Create data directory for SQLite
RUN mkdir -p /app/backend/data

# Set working directory back to root
WORKDIR /app

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start backend (which also serves frontend)
CMD ["npm", "start"]
