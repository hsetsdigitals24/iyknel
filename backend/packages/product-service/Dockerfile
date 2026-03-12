FROM node:20-alpine AS builder

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY packages/product-service ./packages/product-service

RUN npm install -g pnpm && pnpm install --frozen-lockfile

WORKDIR /app/packages/shared
RUN npm run build

WORKDIR /app/packages/product-service
RUN npm run build

FROM node:20-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/product-service/package.json ./packages/product-service/
COPY packages/shared/prisma ./packages/shared/prisma

RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

# Generate Prisma client with schema access
WORKDIR /app/packages/shared
RUN pnpm run prisma:generate

# Copy built files from builder
WORKDIR /app
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/product-service/dist ./packages/product-service/dist

EXPOSE 3002

CMD ["node", "packages/product-service/dist/index.js"]
