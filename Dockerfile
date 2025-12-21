# Multi-stage Dockerfile for production deployment
# Stage 1: Build frontend and backend
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci

# Copy source code
COPY backend ./backend
COPY frontend ./frontend

# Build both frontend and backend
RUN npm run build

# Stage 2: Production image
FROM node:18-alpine AS runner

WORKDIR /app

# Copy built backend
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package*.json ./backend/

# Copy built frontend
COPY --from=builder /app/frontend/build ./frontend/build
COPY --from=builder /app/frontend/package*.json ./frontend/

# Install production dependencies only
WORKDIR /app/backend
RUN npm ci --production

WORKDIR /app/frontend
RUN npm ci --production

WORKDIR /app

# Create data directory for SQLite
RUN mkdir -p /app/backend/data

# Expose port
EXPOSE 3000

# Start backend server
CMD ["node", "backend/dist/index.js"]
