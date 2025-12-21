# Overview

AI-powered live chat support agent for a fictional e-commerce store. The frontend delivers a responsive chat experience; the backend persists conversations and brokers requests to the LLM. Scope is intentionally focused: a single-channel web chat with persisted history, no auth, and no multi-tenant concerns.

The goal is to show production-minded patterns on a small surface area: clear layering, isolated LLM logic, tested core flows, and graceful failure modes. It does not attempt to solve orchestration across channels, human handoff, or complex policy/tooling integrations.

# Tech Stack

Backend: Fastify, TypeScript, Vitest, Pino
Frontend: SvelteKit, TypeScript, fetch/Vite proxy, plain CSS
Database: SQLite (better-sqlite3, WAL), in-memory for tests
LLM: Google Gemini (gemini-2.5-flash) via isolated service

# How to Run Locally

Prerequisites: Node 18+, npm 9+

1) Clone and install dependencies
```bash
npm install
```

2) Backend environment
```bash
cd backend
cp .env.example .env   # add GEMINI_API_KEY
```

3) Start backend
```bash
npm run dev             # http://localhost:3000
```

4) Start frontend (new terminal)
```bash
cd frontend
npm run dev             # http://localhost:5173
```

Expected URLs: backend at http://localhost:3000, frontend at http://localhost:5173 (API calls proxy to /api → backend).

# Live Demo (Vercel)

Deployed on Vercel as a single URL (frontend + serverless API). Add your live URL here once deployed.

# Deployment on Vercel (Serverless)

- Backend runs as Vercel Serverless Functions at /api/chat/message and /api/chat/history (same origin as the UI).
- Frontend is built statically (SvelteKit) and served by Vercel CDN.
- Environment variables: `GEMINI_API_KEY` (or `OPENAI_API_KEY` fallback), optional `NODE_ENV=production`.
- Database: SQLite stored in `/tmp` on Vercel (ephemeral per instance). Suitable for demos; use Postgres (`DATABASE_URL`) for durable production data.
- No separate PUBLIC_API_URL needed; the UI calls same-origin `/api/*`.

# 🚀 Deployment

This project is ready for production deployment on various platforms.

**Quick Start**: See [QUICKSTART.md](./QUICKSTART.md) for fastest deployment options

**Full Guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions

**Supported Platforms**:
- Railway (Recommended - easiest)
- Render (Blueprint included)
- Vercel
- Docker/VPS
- Heroku

**Required Environment Variables**:
```bash
GEMINI_API_KEY=your-key-here  # Required
NODE_ENV=production
PORT=3000
CORS_ORIGIN=*
```

# Database Setup

SQLite with WAL, managed via better-sqlite3. Schema is created on backend startup; no external migration tool is required. Locally the file lives at backend/data/chat.db (directory auto-created). Tests run against an in-memory database. On Vercel serverless the DB is stored in `/tmp` (ephemeral), so data may reset on cold starts; use Postgres for durability if needed. No seed data is needed; conversations/messages are created on first use.

# Architecture Overview

Flow: SvelteKit UI issues fetch calls to /api/chat/message and /api/chat/history → Fastify routes → controllers handle validation and mapping → services encapsulate business rules and orchestrate persistence + LLM → LLM service formats prompts and calls Gemini → DB layer performs synchronous SQLite operations.

Layering keeps HTTP concerns out of services and isolates LLM details behind a single interface, making it safe to add channels (e.g., WhatsApp) or swap providers without touching UI or routing.

# LLM Integration Notes

Provider: Google Gemini (gemini-2.5-flash) via @google/generative-ai. Prompts: system prompt framing an e-commerce agent + recent conversation history (last 10 messages) + current user message. History is truncated to control tokens; max output tokens capped at 1000. Errors are wrapped into LLMError with user-safe messages; timeouts use AbortController. Cost control relies on short history, conservative max tokens, and a fast model.

# Error Handling & Robustness

Validation at the HTTP boundary via Fastify schemas; empty or malformed inputs are rejected with clear 4xx responses. Services map domain errors to safe HTTP codes; unknown failures return sanitized 500s. The UI shows inline banners and an assistant bubble when delivery fails; inputs disable during in-flight requests and recover gracefully. Conversation load failures surface friendly guidance instead of stack traces.

# Trade-offs & If I Had More Time

Kept simple: SQLite single-node storage, synchronous DB access, no auth, no rate limits, no streaming UI. For production: move to Postgres with migrations, add auth/session management, rate limiting, structured observability, and horizontal LLM/provider failover. Future additions: tool calling for order lookup, server-sent events or streaming responses, channel adapters (email/SMS), and richer moderation.

# Development Approach (Short)

Built in stages: foundation, persistence, LLM integration, then UI polish. Tests (Vitest) cover DB/LLM/service layers before extending features. AI tools accelerated coding but architectural choices and boundaries were defined first and kept explicit in services and adapters.
