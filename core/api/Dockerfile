FROM node:20-alpine

WORKDIR /app
RUN npm install -g pnpm

# Copy root workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./

# Copy packages needed for build
COPY contracts ./contracts
COPY core/api ./core/api

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @home-widget-platform/core-api...

# Build
WORKDIR /app/core/api
RUN pnpm build

CMD ["pnpm", "start"]
