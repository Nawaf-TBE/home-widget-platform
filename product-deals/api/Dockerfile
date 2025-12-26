FROM node:20-alpine

WORKDIR /app
RUN npm install -g pnpm

# Copy root workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./

# Copy packages needed for build
COPY contracts ./contracts
COPY product-deals/api ./product-deals/api

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @home-widget-platform/product-deals-api...

# Build
WORKDIR /app/product-deals/api
RUN pnpm build

CMD ["pnpm", "start"]
