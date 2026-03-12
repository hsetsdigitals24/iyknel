FROM node:20-alpine AS builder

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY packages/inventory-service ./packages/inventory-service

RUN npm install -g pnpm && pnpm install --frozen-lockfile

WORKDIR /app/packages/shared
RUN npm run build

WORKDIR /app/packages/inventory-service
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/inventory-service/dist ./packages/inventory-service/dist
COPY --from=builder /app/packages/inventory-service/package.json ./packages/inventory-service/

RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

EXPOSE 3008

CMD ["node", "packages/inventory-service/dist/index.js"]
