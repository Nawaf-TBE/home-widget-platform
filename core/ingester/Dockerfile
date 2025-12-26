FROM node:20-alpine

WORKDIR /app
RUN npm install -g pnpm

# Copy root workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./

# Copy packages needed for build
COPY contracts ./contracts
COPY core/ingester ./core/ingester

# Install dependencies (filtered for speed, including dependencies)
RUN pnpm install --frozen-lockfile --filter @home-widget-platform/core-ingester...

# Build the ingester
WORKDIR /app/core/ingester
RUN pnpm build

CMD ["pnpm", "start"]
