FROM node:20-alpine AS base
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml tsconfig.json vitest.config.ts ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

ENTRYPOINT ["pnpm", "evalgate"]
CMD []
