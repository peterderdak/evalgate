FROM node:20-alpine AS base
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json vitest.config.ts ./
COPY packages/eval-core/package.json packages/eval-core/package.json
RUN pnpm install --no-frozen-lockfile

COPY . .
RUN pnpm build

ENTRYPOINT ["pnpm", "evalgate"]
CMD []
