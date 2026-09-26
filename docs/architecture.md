# System Architecture — Guardian MVP

## Overview

Guardian is a cross-platform, modular parental-control platform centered around versioned policies, secure REST APIs, and native platform adapters.

```
                    ┌─────────────────────────┐
                    │    apps/parent-mobile   │
                    └────────────┬────────────┘
                                 │ HTTP / TLS (REST API)
                                 ▼
                    ┌─────────────────────────┐
                    │      services/api       │
                    │   (Express/Node + PG)   │
                    └────────────┬────────────┘
                                 │ Policy Sync (/sync/check)
                                 ▼
                    ┌─────────────────────────┐
                    │    apps/child-mobile    │
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
   ┌───────────────────────────┐   ┌───────────────────────────┐
   │   Android Native Adapter  │   │    iOS Native Adapter     │
   │  (UsageStats/AlertWindow) │   │ (FamilyControls/Managed)  │
   └───────────────────────────┘   └───────────────────────────┘
```

---

## Component Architecture

### 1. Backend Service Layer (`services/api`)
- **Authentication**: JWT token issuance, bcrypt hashing, role enforcement (`UserRole.PARENT` vs `UserRole.CHILD`).
- **Pairing Engine**: Cryptographic single-use 6-character code generation with 10-minute TTL and replay detection.
- **Policy Service**: Versioned policy storage, atomic updates, and diff calculations.
- **Extra-Time Service**: Server-authoritative approval/denial, request TTL, temporary allowance creation, duplicate request protection.
- **Push Notification Service**: FCM/APNs dispatch with deduplication key tracking and offline recipient queues.
- **Security & Privacy Services**: `AccountPrivacyService` for cascading account deletion, 90-day retention purging, and sensitive log masking.

### 2. Child Device Layer (`apps/child-mobile`)
- **`ScreenTimeEngine`**: Central evaluation coordinator combining `ScheduleEvaluator`, `PolicySyncService`, and native platform adapters.
- **`PolicySyncService`**: Manages `AtomicStorage` cache under `local_policy_cache` with SHA-256 integrity checksums, corrupted state detection, and 72-hour offline TTL enforcement.
- **`SyncEngine`**: Handles online/offline state machine, exponential backoff retries (`1s -> 2s -> 4s -> ... -> 60s`, capped at 5 attempts), and server version comparison.
- **Native Adapters**:
  - `AndroidAdapter`: Integrates `PACKAGE_USAGE_STATS` polling, `SYSTEM_ALERT_WINDOW` block overlay activity, and `BootCompletedReceiver` restart handling.
  - `IOSAdapter`: Integrates `FamilyControls` authorization, `ManagedSettingsStore` shielding, `DeviceActivityMonitorExtension`, and `ShieldActionExtension`.

---

## Deterministic Rule Evaluation Priority

Rule evaluation in `ScheduleEvaluator` follows strict deterministic precedence:

1. **Clock Tampering Check**: Skew > 60s against server timestamp yields `BLOCK`.
2. **Active Temporary Allowance**: Active non-expired allowance yields `ALLOW` (overrides all schedules).
3. **Bedtime Window**: Active bedtime window (including midnight crossing e.g. `22:00 – 07:00`) yields `BLOCK`.
4. **Overlapping Schedules**: Schedules matching current day & time are evaluated with priority `BLOCK > LIMIT > ALLOW`.
5. **Daily Screen-Time Limit Reached**: Accumulated minutes >= policy limit yields `BLOCK`.
6. **Free Time**: Within daily limit yields `ALLOW`.
