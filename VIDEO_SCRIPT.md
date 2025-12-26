# Video Script: Home Widget Platform Demonstration

**Duration**: 5 Minutes
**Objective**: Demonstrate a robust, decoupled SDUI platform that handles failures gracefully.

---

## 0:00 - 0:45 | Intro: The Problem & Solution
- **Hook**: "How do you protect your highest-traffic screen from the failure of a dozen product services?"
- **The Problem**: Request-time aggregation ("Pull Model") is slow and brittle. One slow service lags the whole Home screen.
- **The Solution**: The Home Widget Platform. An **asynchronously decoupled** "Push Model" where product teams own their widgets, but the Core API owns the delivery.
- **Keywords**: Asynchronous decoupling, performance protection.

## 0:45 - 1:45 | Architecture Deep Dive
- **Visuals**: Show the Mermaid diagram from `CONCEPT.md`.
- **Narration**: Walk through the "Product Domain" using the **Transactional Outbox** pattern to avoid dual-write inconsistencies.
- **Stream**: Highlight **Redis Streams** as the backbone for at-least-once delivery.
- **Ingester**: Mention the **idempotent UPSERT** with `data_version` guards to maintain **eventual consistency** without stale data regression.
- **Keywords**: Transactional outbox, idempotent updates, eventual consistency.

## 1:45 - 2:45 | Live Demo: Happy Path
- **Action**: Open the `web-home` UI.
- **Action**: Log in as a user.
- **Action**: Click "Save Deal" in the Product API dashboard.
- **Observation**: Show the widget updating on the Home UI within milliseconds.
- **Developer Experience**: Show the `outbox` table row and then the `XADD` event in Redis.

## 2:45 - 4:15 | Resilience & Graceful Degradation (The Failure Demos)
- **Scenario 1: Product API Down**. 
  - Stop the Product API container.
  - Refresh the Home screen.
  - **Result**: Core API continues serving the widget from cache/DB. **Read-time protection** in action.
- **Scenario 2: Redis Down**.
  - Stop Redis.
  - Perform a "Save Deal" action.
  - Show the event queuing in the Postgres `outbox`.
  - Restart Redis and show the **Self-Healing** as the worker drains the backlog.
- **Scenario 3: Ingester Restart**.
  - Simulate a crash. Show **XAUTOCLAIM** reclaiming pending messages on boot. No events lost.
- **Keywords**: Graceful degradation, self-healing, read-time protection.

## 4:15 - 5:00 | Conclusion: Platform Agnostic SDUI
- **Action**: Quickly show the **iOS Simulator** rendering the exact same widget content using the same JSON schema.
- **Final Message**: "This is a **platform-agnostic SDUI** system. Whether it's web, iOS, or Android, the home screen stays fast, resilient, and personalized—no matter what happens in the background."
- **Keywords**: Platform-agnostic, robust delivery.
