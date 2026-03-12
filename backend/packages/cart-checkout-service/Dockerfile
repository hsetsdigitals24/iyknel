FROM node:20-alpine AS builder

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY packages/cart-checkout-service ./packages/cart-checkout-service

RUN npm install -g pnpm && pnpm install --frozen-lockfile

WORKDIR /app/packages/shared
RUN npm run build

WORKDIR /app/packages/cart-checkout-service
RUN npm run build

FROM node:20-alpine

WORKDIR /app


COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/cart-checkout-service/dist ./packages/cart-checkout-service/dist
COPY --from=builder /app/packages/cart-checkout-service/package.json ./packages/cart-checkout-service/

RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

EXPOSE 3005

CMD ["node", "packages/cart-checkout-service/dist/index.js"]
