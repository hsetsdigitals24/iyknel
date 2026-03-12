FROM node:20-alpine AS builder

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY packages/pricing-service ./packages/pricing-service

RUN npm install -g pnpm && pnpm install --frozen-lockfile

WORKDIR /app/packages/shared
RUN npm run build

WORKDIR /app/packages/pricing-service
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/pricing-service/package.json ./packages/pricing-service/

RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/pricing-service/dist ./packages/pricing-service/dist

EXPOSE 3003

CMD ["node", "packages/pricing-service/dist/index.js"]
