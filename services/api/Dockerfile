FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY services/api ./services/api
RUN pnpm install --frozen-lockfile || pnpm install

FROM base AS build
COPY --from=deps /app /app
WORKDIR /app
RUN pnpm --filter @restaurantos/types build \
  && pnpm --filter @restaurantos/config build \
  && pnpm --filter @restaurantos/shared build \
  && pnpm --filter @restaurantos/database build \
  && pnpm --filter @restaurantos/api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/services/api
EXPOSE 4000
CMD ["node", "dist/main.js"]
