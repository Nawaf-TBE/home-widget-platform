FROM node:20-alpine

WORKDIR /app
RUN npm install -g pnpm

# Copy root workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./

# Copy packages needed for build
COPY contracts ./contracts
COPY web-home ./web-home

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @home-widget-platform/web-home...

# Build
WORKDIR /app/web-home
RUN pnpm build

# Serve via a light server or just keep it for build
# For simplicity in this demo, we can just use the dev server command or install a static server
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "3002"]
