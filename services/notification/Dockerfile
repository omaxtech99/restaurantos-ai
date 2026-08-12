FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY services/notification ./services/notification
RUN pnpm install --frozen-lockfile || pnpm install

FROM base AS build
COPY --from=deps /app /app
WORKDIR /app
RUN pnpm --filter @restaurantos/config build \
  && pnpm --filter @restaurantos/notification build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/services/notification
EXPOSE 4001
CMD ["node", "dist/main.js"]
