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

## Resilience & Self-Healing Verification
Verify self-healing capabilities of the asynchronous pipeline:
```bash
# Verify behavior when Product API is down
pnpm -w run:resilience:product

# Verify recovery after Redis outage
pnpm -w run:resilience:redis

# Verify backlog reclamation after Ingester crash
pnpm -w run:resilience:ingester
```

### E2E Latency & Throughput Proofs
Quantifiable verification of performance and isolation:

**1. Real-time Freshness Verification**
Measure latency from Product Save to Core Widget update:
```bash
pnpm -w run:latency
```
- **What it proves:** Millisecond-level eventual consistency across the full pipeline.

**2. High-Traffic Isolation Proof**
Verify Core serves widgets at 100% success even when Product is dead:
```bash
pnpm -w run:throughput
```
- **What it proves:** Zero runtime dependency on product domain services for delivery.

**3. Multi-Platform Convergence**
Verify Web and iOS converge to identical states:
```bash
pnpm -w run:convergence
```

## Documentation
- [**Technical Architecture (CONCEPT.md)**](./CONCEPT.md): Rationale, data flows, and failure modes.
- [**Product Integration (DEVELOPER_GUIDELINE.md)**](./DEVELOPER_GUIDELINE.md): How to publish widgets and schema requirements.
- [**Configuration (infra/ENV.md)**](./infra/ENV.md): Environment variable dictionary.
- [**Security Policy (SECURITY.md)**](./SECURITY.md): Secrets management and environment configuration.

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

# 3. All Tests (Unit + Integration + Resilience)
pnpm test:all

# 4. Individual Verification Suites
pnpm test:unit
pnpm test:integration
pnpm test:resilience

# 5. Specific Resilience Scenarios
pnpm run:resilience:product
pnpm run:resilience:redis
pnpm run:resilience:ingester
pnpm run:latency
pnpm run:throughput
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
