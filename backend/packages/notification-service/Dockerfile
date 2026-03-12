FROM node:20-alpine AS builder

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY packages/notification-service ./packages/notification-service

RUN npm install -g pnpm && pnpm install --frozen-lockfile

WORKDIR /app/packages/shared
RUN npm run build

WORKDIR /app/packages/notification-service
RUN npm run build

FROM node:20-alpine

WORKDIR /app


COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/notification-service/dist ./packages/notification-service/dist
COPY --from=builder /app/packages/notification-service/package.json ./packages/notification-service/

RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

EXPOSE 3009

CMD ["node", "packages/notification-service/dist/index.js"]
