# Home Widget Platform: Developer Guideline

## Overview
This guide is for product teams who want to display their features (widgets) on the Home Screen. The platform uses an asynchronous push model. You update your local data, and the platform ensures it reaches the user's home screen reliably.

## 1. How to Publish Widgets

### Default Widgets (Global)
Default widgets are shown to all users who haven't personalized that specific widget.
- **Endpoint**: `POST /v1/admin/publish-default` (Admin only)
- **Use Case**: Initial onboarding experience, generic announcements, or fallback content.

### Personalized Widgets (User-specific)
User-specific widgets are triggered by user actions within your product.
- **Mechanism**: Use the **Transactional Outbox** pattern in your local service.
- **Example Flow**:
  1. User clicks "Save Deal".
  2. Your API updates `saved_deals` table.
  3. Your API inserts a "Widget Update" event into the `outbox` table in the *same transaction*.
  4. Our `outbox-worker` automatically detects the new row and pushes it to the Home Screen.

## 2. Event Format & Schema

All events published to the Home Screen must follow the standard SDUI event schema.

```json
{
  "event_id": "uuid-v4",
  "product_id": "deals_app",
  "platform": "web",
  "audience_type": "user",
  "audience_id": "user-123",
  "widget_key": "top_deals",
  "schema_version": 1,
  "data_version": 45,
  "content": {
    "root": {
      "type": "text_row",
      "text": "Your Top Deal: 50% Off Pizza"
    }
  },
  "min_ios_version": "16.0"
}
```

### Key Fields:
- `widget_key`: Unique identifier for the widget slot (e.g., `top_deals`, `user_profile_summary`).
- `data_version`: Monotonically increasing integer. The Core Ingester **rejects** events with a version lower than or equal to what's already in the database.
- `content`: The SDUI payload that the frontend renderer will display.
- `min_ios_version`: (Optional) Gating field for the iOS app.

## 3. Limits & Validation
- **Payload Size**: Keep `content` under 100KB to ensure fast delivery.
- **Rate Limits**: Avoid pushing updates more than once every 5 seconds per user per widget key.
- **Schema Validation**: All events are validated against the global JSON schema before processing. Invalid events will be dropped.

## 4. Rollout & Gating Strategies

### Schema Evolution
When making breaking changes to your SDUI types:
1. Increment `schema_version`.
2. The Core API can handle multiple schema versions (if configured), or you can use `min_ios_version` to gate the new format to compatible clients.

### Gradual Rollout
You can control visibility using `audience_type`:
- `default`: Broad reach.
- `user`: Targeted/Personalized.
- **Advanced**: You can implement your own bucket logic in your product service before pushing to the outbox.

## 5. Summary of Best Practices
- **Never Dual-Write Manually**: Always use the provided `outbox` table. Manual Redis writes bypass our consistency guarantees.
- **Idempotency**: Assume your event might be delivered twice. Ensure your `content` is a snapshot of current state, not a delta.
- **Versioning**: Always fetch the current `data_version` from your local state and increment it by 1 before publishing.
