FROM node:20-alpine AS builder

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY packages/order-service ./packages/order-service

RUN npm install -g pnpm && pnpm install --frozen-lockfile

WORKDIR /app/packages/shared
RUN npm run build

WORKDIR /app/packages/order-service
RUN npm run build

FROM node:20-alpine

WORKDIR /app


COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/order-service/dist ./packages/order-service/dist
COPY --from=builder /app/packages/order-service/package.json ./packages/order-service/

RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

EXPOSE 3006

CMD ["node", "packages/order-service/dist/index.js"]
