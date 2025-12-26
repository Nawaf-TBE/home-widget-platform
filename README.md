# Home Widget Platform

A robust, event-driven Server-Driven UI (SDUI) platform.

## Architecture
- **Product Domain**: `product-deals-api` (CMS/Admin) -> `postgres-product` -> `outbox-worker` -> `redis` (Stream).
- **Core Domain**: `redis` (Stream) -> `core-ingester` -> `postgres-core` & `redis` (Cache).
- **Delivery**: `core-api` (High performance) -> `redis` (Cache) / `postgres-core` fallback.

## Quick Start
Bring up the entire system with a single command:
```bash
docker compose up --build
```

## Running Tests
Run the root-level integration tests:
```bash
pnpm -w test:integration
```

## Resilience Demos
Demonstrate self-healing during failures:
```bash
pnpm -w demo:failure:product
pnpm -w demo:failure:redis
pnpm -w demo:failure:ingester
```

## Documentation
- [Environment Variables](./infra/ENV.md)
- [Project Walkthrough](./.gemini/antigravity/brain/4ee41021-3885-4130-9854-690118945dee/walkthrough.md)

## Verification
### Verify Redis TTL
Pick a cached widget key (e.g., `widget:deals_app:web:user:user-e2e-123:top_deals`) and check its TTL:
```bash
docker exec -it home-widget-platform-redis-1 redis-cli TTL widget:deals_app:web:user:user-e2e-123:top_deals
```
Result should be > 0.

### Verify Migrations
Check that tables exist in both databases:
```bash
# Core DB
docker exec -it home-widget-platform-postgres-core-1 psql -U user -d core -c "\dt"

# Product DB
docker exec -it home-widget-platform-postgres-product-1 psql -U user -d product -c "\dt"
```
