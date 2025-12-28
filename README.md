# Home Widget Platform

A high-performance, event-driven Server-Driven UI (SDUI) platform designed for scale and resilience.

## Overview
This platform decouples product domain updates from the high-traffic Home Screen delivery. It uses a **Push Model** to ensure the Home Screen is always fast, even if background services are failing.

## Core Features
- **Transactional Outbox**: Guaranteed event publishing without dual-write risk.
- **Asynchronous Decoupling**: Product teams push updates; Core delivery is protected.
- **Redis Streams & Consumer Groups**: Reliable at-least-once delivery with self-healing on restart.
- **Versioned Idempotency**: Stale data is automatically rejected during ingestion.
- **Platform Agnostic**: SDUI schemas for Web, iOS, and Android.

## Quick Start (Web & Services)
Bring up the entire system (DBs, Redis, APIs, Workers, Web UI) with one command:
```bash
docker compose up --build
```
- **Web Home**: [http://localhost:3002](http://localhost:3002)
- **Core API**: [http://localhost:3003](http://localhost:3003)
- **Product API**: [http://localhost:3001](http://localhost:3001)

## Running iOS App
1. Open `ios-home/ios-home.xcodeproj` in Xcode.
2. Ensure `docker-compose` is running (iOS app hits the local Core API).
3. Select a simulator (iOS 16+) and press **Run**.

## Integration Tests
Perform a full end-to-end audit:
```bash
pnpm -w test:integration
```

## Failure & Resilience Demos
Verify self-healing capabilities:
```bash
# Verify behavior when Product API is down
pnpm -w demo:failure:product

# Verify recovery after Redis outage
pnpm -w demo:failure:redis

# Verify backlog reclamation after Ingester crash
pnpm -w demo:failure:ingester
```

## Freshness Demo
Measure real-time update latency from Product Save to Home Widget:
```bash
pnpm -w demo:freshness
```

**What it proves:**
- Save action in Product triggers widget update via the full pipeline
- Measures `time_to_freshness_ms` (typically <1 second)
- Shows `data_version` bump and `served_from` (redis/db)
- Logs show end-to-end correlation via `event_id`

## High-Traffic Protection Demo
Prove Core serves widgets even when Product is completely down:
```bash
pnpm -w demo:load:product-down
```

**What it proves:**
- Stops Product container completely
- Runs 50 concurrent connections for 10 seconds
- Core continues serving widgets at 100% success rate
- No runtime dependency on Product services

## What to Show in Video
1. Run `pnpm -w demo:freshness` - show delta_ms and data_version bump
2. Show ingester logs with `event_id` + `upsert_result` correlation:
   ```bash
   docker compose logs core-ingester --tail 20
   ```
3. Run `pnpm -w demo:load:product-down` - show Core serving widgets with Product stopped
4. Show Core API logs with `served_from` and `latency_ms`:
   ```bash
   docker compose logs core-api --tail 20
   ```

## Documentation
- [**Technical Architecture (CONCEPT.md)**](./CONCEPT.md): Rationale, data flows, and failure modes.
- [**Product Integration (DEVELOPER_GUIDELINE.md)**](./DEVELOPER_GUIDELINE.md): How to publish widgets and schema requirements.
- [**Configuration (infra/ENV.md)**](./infra/ENV.md): Environment variable dictionary.
- [**Video Script (VIDEO_SCRIPT.md)**](./VIDEO_SCRIPT.md): Presentation outline for reviewers.

## Deployment (Placeholders)
- **Staging**: `https://staging.home-widget.check24.de`
- **Production**: `https://home-widget.check24.de`
- **API Docs**: `https://api-docs.home-widget.check24.de`

---

## Release Checklist

### Before Submission
Run these commands to ensure everything passes on a clean slate:

```bash
# 1. Clean Docker environment
docker compose down -v
docker compose up --build -d

# 2. Lint all packages
pnpm lint

# 3. Unit Tests
pnpm test

# 4. Integration Tests
pnpm test:integration

# 5. Failure Demos (Optional)
pnpm demo:failure:product
pnpm demo:failure:redis
pnpm demo:failure:ingester
```

### Live URLs to Fill
| Environment | URL |
|---|---|
| Staging | `https://staging.home-widget.check24.de` |
| Production | `https://home-widget.check24.de` |
| API Docs | `https://api-docs.home-widget.check24.de` |

### Reproducing Demo Steps Quickly
1. **Start System**: `docker compose up --build -d`
2. **Open Web Home**: Navigate to `http://localhost:3002`
3. **Login**: Enter any user ID
4. **Save a Deal**: Click "Save" on any deal card
5. **Verify Personalization**: Reload the home screen; your saved deal appears

### Building & Running iOS App
1. Open Xcode: `open ios-home.swiftpm`
2. Select an iOS 16+ simulator or "My Mac"
3. Press **Run**

---

## Flexibility Demo

Prove "Flexibility in Mind" by changing widget **layout** without touching Core:

### The Contrast
- **Default Widget** (logged out): Uses **GRID** layout
- **Personalized Widget** (logged in): Uses **CAROUSEL** layout

### Flip the Layout (Product-Only Change)

1. **Current State**: Personalized uses carousel, default uses grid
2. **Change Layout**:
   ```bash
   # Edit docker-compose.yml
   # Change: DEALS_WIDGET_LAYOUT_VARIANT=carousel
   # To:     DEALS_WIDGET_LAYOUT_VARIANT=grid
   ```
3. **Restart ONLY Product Services**:
   ```bash
   docker compose up -d --no-deps --build product-deals-api product-deals-outbox-worker
   ```
4. **Re-publish Default**:
   ```bash
   curl -X POST http://localhost:3001/v1/admin/publish-default
   ```
5. **Save/Unsave to Bump Version** (for personalized):
   ```bash
   curl -X POST http://localhost:3001/v1/deals/1/save -H "Authorization: Bearer $JWT"
   ```
6. **Verify**: Personalized now uses GRID, default now uses CAROUSEL

**Core was never touched, never restarted.**

---
*Built for the Advanced Agentic Coding Challenge.*
