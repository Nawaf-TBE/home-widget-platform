# Environment Variables Dictionary

This document describes the environment variables used across the Home Widget Platform services.

## Shared Variables

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `JWT_SECRET` | Secret key used for signing and verifying JWT tokens. | `dev-secret` |
| `REDIS_URL` | Connection URL for the Redis server. | `redis://redis:6379` |
| `REDIS_WIDGET_TTL_SECONDS` | Time-to-Live for cached widgets in Redis. | `3600` (1h) / `604800` (7d) |

## Database Variables

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DB_HOST` | Hostname of the PostgreSQL database. | `postgres-core`, `postgres-product` |
| `DB_PORT` | Port number of the PostgreSQL database. | `5432` |
| `DB_NAME` | Name of the database to connect to. | `core`, `product` |
| `DB_USER` | Username for database authentication. | `user` |
| `DB_PASSWORD` | Password for database authentication. | `password` |
| `DATABASE_URL` | Full connection string (used primarily by migrations). | `postgres://user:password@host:5432/db` |

## Service-Specific Variables

### Core Ingester
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `STREAM_NAME` | Name of the Redis Stream to consume from. | `events` |
| `CONSUMER_GROUP` | Name of the Redis Consumer Group. | `core` |
| `CONSUMER_NAME` | Unique name for the consumer instance. | `core-ingester` |

### Product Deals API
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Local port the API server listens on inside the container. | `3000` |

## Infrastructure Mapping (Local)
For local development outside of Docker, use these mapped ports:
- **Redis**: `127.0.0.1:6380`
- **Core DB**: `127.0.0.1:5434`
- **Product DB**: `127.0.0.1:5435`
- **Core API**: `127.0.0.1:3003`
- **Product API**: `127.0.0.1:3001`
- **Web Home**: `127.0.0.1:3002`
