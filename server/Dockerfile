# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:20-slim AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
# Use npm ci if lock file exists, otherwise npm install
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# ============================================
# Stage 2: Build Next.js + Express
# ============================================
FROM node:20-slim AS builder

WORKDIR /app

# Copy deps
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./

# Copy Prisma schema and generate client
COPY prisma/ ./prisma/
RUN npx prisma generate

# Copy source code and configs
COPY src/ ./src/
COPY views/ ./views/
COPY public/ ./public/
COPY tsconfig.json tsconfig.server.json ./
COPY next.config.ts postcss.config.mjs ./
COPY components.json ./

# Pass NEXT_PUBLIC_API_KEY at build time (Next.js inlines NEXT_PUBLIC_* at build)
ARG NEXT_PUBLIC_API_KEY
ENV NEXT_PUBLIC_API_KEY=${NEXT_PUBLIC_API_KEY}

# Build Next.js (frontend)
RUN npx next build

# Build Express server (backend)
RUN npx tsc -p tsconfig.server.json

# ============================================
# Stage 3: Production
# ============================================
FROM node:20-slim AS production

WORKDIR /app

# Install Claude Code CLI globally (required by claude-agent-sdk)
RUN npm install -g @anthropic-ai/claude-code

# Copy package manifests and install production-only dependencies
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Copy Prisma schema and generated client from builder
COPY prisma/ ./prisma/
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built Express server
COPY --from=builder /app/dist ./dist

# Copy Next.js build output (needed by custom server at runtime)
COPY --from=builder /app/.next ./.next

# Copy Next.js config and source (needed at runtime for SSR/route resolution)
COPY next.config.ts ./
COPY --from=builder /app/src ./src

# Copy legacy views and public assets
COPY views/ ./views/
COPY public/ ./public/

# Default environment variables
ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

# Run Prisma db push then start the server
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
