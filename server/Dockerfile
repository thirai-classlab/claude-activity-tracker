# ============================================
# Stage 1: Build
# ============================================
FROM node:20-slim AS builder

WORKDIR /app

# Copy package manifests and install all dependencies (including devDependencies for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma/ ./prisma/
RUN npx prisma generate

# Copy source code, views, public assets, and configs
COPY src/ ./src/
COPY views/ ./views/
COPY public/ ./public/
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-slim AS production

WORKDIR /app

# Copy package manifests and install production-only dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy Prisma schema and generated client from builder
COPY prisma/ ./prisma/
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built JavaScript from builder
COPY --from=builder /app/dist ./dist

# Copy views and public assets (needed at runtime for EJS + static files)
COPY views/ ./views/
COPY public/ ./public/

# Default environment variables (can be overridden at runtime via .env)
ENV PORT=3001
ENV NODE_ENV=production

# Expose the API port
EXPOSE 3001

# Run Prisma db push (create/sync schema) then start the server
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
