FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY packages/auth-service ./packages/auth-service

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Generate Prisma client
WORKDIR /app/packages/shared
RUN pnpm run prisma:generate

# Build shared package
RUN npm run build

# Build auth service
WORKDIR /app/packages/auth-service
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files first
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/auth-service/package.json ./packages/auth-service/
COPY packages/shared/prisma ./packages/shared/prisma

# Install only production dependencies
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile

# Generate Prisma client with schema access
WORKDIR /app/packages/shared
RUN pnpm run prisma:generate

# Copy built files from builder
WORKDIR /app
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/auth-service/dist ./packages/auth-service/dist

EXPOSE 3001

CMD ["node", "packages/auth-service/dist/index.js"]
