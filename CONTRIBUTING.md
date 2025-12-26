# Contributing

## Setup
1. Install dependencies: `pnpm -w install`
2. Start infrastructure: `docker compose up -d`
3. Running local services: TBD (Check individual packages)

## Testing
- Run all tests: `pnpm -w test`
- Lint: `pnpm -w lint`

## Structure
- `/contracts`: Shared libraries
- `/core`: Core services
- `/product-deals`: Product Deals domain
- `/web-home`: Web App
