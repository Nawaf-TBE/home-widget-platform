# Operator Runbook: End-to-End Usage Guide

This runbook provides step-by-step commands to use the Home Widget Platform end-to-end.

---

## Prerequisites
- **Docker Desktop** must be installed and running
- **Node.js 20+** and **pnpm** installed
- **Xcode 15+** (for iOS)

---

## Discovered Configuration

### Exposed Ports

| Service | Host Port | Container Port |
|---------|-----------|----------------|
| **Core API** | `3003` | `3000` |
| **Product Deals API** | `3001` | `3000` |
| **Web Home** | `3002` | `3002` |
| **Redis** | `6380` | `6379` |
| **Postgres Core** | `5434` | `5432` |
| **Postgres Product** | `5435` | `5432` |

### Available Scripts (Root `package.json`)
```bash
pnpm lint              # Lint all packages
pnpm test              # Run all unit tests
pnpm test:integration  # Run E2E integration tests
pnpm up                # docker compose up -d
pnpm down              # docker compose down
pnpm demo:failure:product   # Product API down scenario
pnpm demo:failure:redis     # Redis down scenario
pnpm demo:failure:ingester  # Ingester restart scenario
```

### API Endpoints

**Core API (`http://localhost:3003`)**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| GET | `/v1/home/widgets?platform=web` | JWT | Get home widgets |
| POST | `/v1/widgets/delivery` | JWT | Batch widget delivery |

**Product Deals API (`http://localhost:3001`)**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/v1/auth/login` | No | Get JWT token |
| GET | `/v1/deals` | No | List all deals |
| POST | `/v1/deals/:id/save` | JWT | Save a deal |
| POST | `/v1/deals/:id/unsave` | JWT | Unsave a deal |
| GET | `/v1/me/saved` | JWT | List saved deals |
| POST | `/v1/admin/publish-default` | No | Publish default widgets |

---

## Step 1: Clean Start

```bash
cd /Users/nawaf/Desktop/check24/home-widget-platform

# Stop and remove all containers and volumes
docker compose down -v

# Build and start all services
docker compose up --build -d
```

**Wait for services to be healthy (30-60 seconds):**
```bash
# Check status - all should show "healthy" or "running"
docker compose ps
```

**Expected output:**
```
NAME                                          STATUS              PORTS
home-widget-platform-core-api-1               Up (healthy)        0.0.0.0:3003->3000/tcp
home-widget-platform-product-deals-api-1      Up (healthy)        0.0.0.0:3001->3000/tcp
home-widget-platform-web-home-1               Up                  0.0.0.0:3002->3002/tcp
home-widget-platform-redis-1                  Up (healthy)        0.0.0.0:6380->6379/tcp
...
```

**Verify APIs are responding:**
```bash
curl http://localhost:3003/health
# Expected: {"status":"ok"}

curl http://localhost:3001/health
# Expected: {"status":"ok"}
```

---

## Step 2: Publish Defaults

```bash
curl -X POST http://localhost:3001/v1/admin/publish-default
```

**Expected response:** Empty body, HTTP 200 OK

**Wait 2 seconds** for the outbox worker to process and the ingester to consume.

---

## Step 3: Get a JWT

```bash
# Login and get token
curl -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"123"}'
```

**Expected response:**
```json
{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
```

**Export the token:**
```bash
export JWT=$(curl -s -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"123"}' | jq -r '.token')

echo $JWT
```

---

## Step 4: Verify Core Reads Default Widget

```bash
curl -s http://localhost:3003/v1/home/widgets?platform=web \
  -H "Authorization: Bearer $JWT" | jq
```

**Expected response (default widget):**
```json
[
  {
    "product_id": "deals_app",
    "platform": "web",
    "audience_type": "default",
    "audience_id": "global",
    "widget_key": "top_deals",
    "content": {
      "root": {
        "type": "widget_container",
        "title": "Top Deals",
        "items": [...]
      }
    },
    "data_version": 1
  }
]
```

**Confirm it's default:** Look for `"audience_type": "default"` and `"audience_id": "global"`.

---

## Step 5: Create Real Product State

**List available deals:**
```bash
curl -s http://localhost:3001/v1/deals | jq
```

**Expected:** Array of deal objects with `id`, `title`, `price`.

**Save the first deal:**
```bash
# Get first deal ID
DEAL_ID=$(curl -s http://localhost:3001/v1/deals | jq -r '.[0].id')
echo "Saving deal: $DEAL_ID"

# Save it
curl -X POST "http://localhost:3001/v1/deals/$DEAL_ID/save" \
  -H "Authorization: Bearer $JWT"
```

**Expected:** HTTP 200 OK (empty body)

**Verify saved deals:**
```bash
curl -s http://localhost:3001/v1/me/saved \
  -H "Authorization: Bearer $JWT" | jq
```

**Expected:** Array containing the deal you just saved.

---

## Step 6: Verify Widget Updated (Personalized)

**Wait 2 seconds**, then poll Core:

```bash
curl -s http://localhost:3003/v1/home/widgets?platform=web \
  -H "Authorization: Bearer $JWT" | jq
```

**Expected (personalized widget):**
```json
[
  {
    "audience_type": "user",
    "audience_id": "123",
    "data_version": 1,
    "content": {
      "root": {
        "title": "Your Deals",
        "items": [
          {"type": "text_row", "text": "Top Deals For You"},
          {"type": "text_row", "text": "Deal Title - $XX.XX"},
          ...
        ]
      }
    }
  }
]
```

**Confirm personalization:** Look for `"audience_type": "user"` and `"audience_id": "123"`.

---

## Step 7: Use the Web UI

**URL:** [http://localhost:3002](http://localhost:3002)

**Steps:**
1. Open the URL in your browser
2. Enter user ID: `123`
3. Click **Login**
4. The home screen will display your personalized widget

---

## Step 8: Use the iOS App

### Configuration
The iOS app reads URLs from `Info.plist`:
- `CORE_BASE_URL`: `http://localhost:3003`
- `PRODUCT_BASE_URL`: `http://localhost:3001`

### HTTPS Requirement
**iOS Simulator** allows HTTP to `localhost` by default (no HTTPS needed).

**For real devices**, you need HTTPS. Options:
1. **Use ngrok:** `ngrok http 3003` → Get HTTPS URL
2. **Deploy to staging** and use real HTTPS endpoints

### Steps to Run
1. **Open the `ios-home` folder in Xcode** (choose "Open" and select the folder itself). Xcode will detect it as a **Swift Package**.
2. Select an **iPhone 16 Pro** simulator (iOS 17+)
3. Press **Cmd+R** to run
4. In the app, enter user ID: `123`
5. Tap **Login**
6. Widgets should render on the home screen

---

## Step 9: Troubleshooting

### If any step fails, collect this info:

**1. The exact curl command and output:**
```bash
curl -v <your-command>
```

**2. Service status:**
```bash
docker compose ps
```

**3. Relevant service logs:**
```bash
# Core API
docker compose logs --tail=50 core-api

# Product API
docker compose logs --tail=50 product-deals-api

# Ingester
docker compose logs --tail=50 core-ingester

# Outbox Worker
docker compose logs --tail=50 product-deals-outbox-worker
```

### Common Issues

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `connection refused` | Service not running | `docker compose up -d` |
| `401 Unauthorized` | Missing/invalid JWT | Re-run Step 3 |
| Empty widget array | Defaults not published | Re-run Step 2 |
| Widget not personalized | Ingester lag | Wait 5s, retry Step 6 |
| iOS can't connect | Wrong URL or HTTPS issue | Use localhost in simulator |

---

*Generated for the Home Widget Platform Operator Runbook*
