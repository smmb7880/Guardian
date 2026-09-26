# Security Standards & Threat Model Review — Guardian

## Cryptographic Device Pairing Protocol

Parent-to-child device pairing is protected by a single-use, short-lived pairing protocol:

```
┌───────────────────────────┐          ┌───────────────────────────┐          ┌───────────────────────────┐
│     Parent App (UI)       │          │    Backend API Service    │          │    Child App / Device     │
└─────────────┬─────────────┘          └─────────────┬─────────────┘          └─────────────┬─────────────┘
              │                                      │                                      │
              │ 1. Generate Pairing Code (childId)   │                                      │
              ├─────────────────────────────────────►│                                      │
              │                                      │ (Generates 6-char random code, 10m TTL)│
              │ 2. Code: "K9X2M7" + QR JSON Payload  │                                      │
              ◄──────────────────────────────────────┤                                      │
              │                                      │                                      │
              │       3. Transmit Code / Scan QR via Child Device App                       │
              │ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ►│
              │                                      │                                      │
              │                                      │ 4. POST /devices/pair (code, platform)
              │                                      │◄─────────────────────────────────────┤
              │                                      │ (Validates single-use, marks USED)   │
              │                                      │ (Issues 30-day device JWT token)     │
              │                                      │                                      │
              │                                      │ 5. Returns deviceToken & childId     │
              │                                      ├─────────────────────────────────────►│
```

---

## Comprehensive Threat Model Review

The Guardian platform has been evaluated against 11 primary threat vectors:

### 1. Stolen Parent Session
- **Threat**: Attacker intercepts or extracts a parent JWT authentication token.
- **Mitigation & Control**: Short token lifetimes, strict bearer validation, instant token revocation on password change or manual logout, and mandatory family ID ownership verification (`verifyFamilyOwnership`) on every API request.

### 2. Stolen Child Device
- **Threat**: Unauthorized party acquires a child device to bypass screen-time restrictions.
- **Mitigation & Control**: Local policy enforcement remains active in offline mode using `AtomicStorage`. Parents can trigger instant device revocation (`DELETE /devices/:deviceId`), which wipes local policy caches and locks down device accessibility.

### 3. Malicious Child Client
- **Threat**: Child user tampers with system clock or modifies local application code/storage to bypass restrictions.
- **Mitigation & Control**: `ScheduleEvaluator` checks local clock against trusted server time. Clock skew > 60s automatically triggers tamper block mode. Storage uses SHA-256 integrity checksums (`AtomicStorage`); corrupted storage resets to safe full-block fallback.

### 4. Malicious Parent (Cross-Family Access)
- **Threat**: A registered parent attempts to access or modify children profiles/policies belonging to another family.
- **Mitigation & Control**: All routes enforce `verifyFamilyOwnership`. Any request targeting a `childId` or `familyId` outside the authenticated token's scope is immediately rejected with `403 FORBIDDEN`.

### 5. Replayed Pairing Code
- **Threat**: Attacker observes a 6-character pairing code and attempts to pair an unauthorized device.
- **Mitigation & Control**: Pairing codes have a strict 10-minute TTL and are single-use (`isUsed = true`). Replay attempts trigger `PAIRING_REPLAY_ATTEMPT` audit alerts and fail with `400 PAIRING_CODE_ALREADY_USED`.

### 6. Forged Device ID
- **Threat**: Attacker crafts synthetic HTTP requests claiming to be a registered child device ID.
- **Mitigation & Control**: Device IDs must match the cryptographic `deviceId` embedded in the signed device token issued during pairing. Unsigned or mismatched IDs yield `401 UNAUTHORIZED`.

### 7. Manipulated Policy Version
- **Threat**: Client sends an outdated or arbitrary policy version to roll back restriction rules.
- **Mitigation & Control**: The server maintains authoritative policy versions (`PolicyService`). Version sync protocol (`SyncEngine`) rejects any incoming policy with `version <= cachedVersion`.

### 8. API Abuse
- **Threat**: Automated scripts spam API endpoints to degrade availability or brute-force pairing codes.
- **Mitigation & Control**: Sliding window rate limiting (`ApiRateLimiter`) caps requests to 100 req/min per IP/token. Exceeding limit returns `429 TOO_MANY_REQUESTS`.

### 9. Notification Abuse
- **Threat**: Child device or script spams parents with extra-time request notifications.
- **Mitigation & Control**: Duplicate request protection permits only one active `PENDING` request per child. `NotificationService` uses `deduplicationKey` tracking to suppress duplicate push dispatches.

### 10. Local Database Extraction
- **Threat**: Attacker extracts application sqlite / shared preferences data from physical storage.
- **Mitigation & Control**: Sensitive secrets (JWT signing keys, parent credentials) are never stored on child devices. Child cache stores only standard restriction rules and active temporary allowance expiration timestamps.

### 11. Unauthorized API Access
- **Threat**: Unauthenticated requests target internal policy/reporting routes.
- **Mitigation & Control**: Centralized `authMiddleware` validates JWT signature and role permissions (`UserRole.PARENT` vs `UserRole.CHILD`) before executing route logic.

---

## Security Hardening Controls

- **HTTP Security Headers**: Enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Strict-Transport-Security`, and `Content-Security-Policy`.
- **API Rate Limiting**: 100 requests per minute limit via `ApiRateLimiter`.
- **Sensitive Log Filtering**: `AccountPrivacyService.sanitizeLogData` automatically masks passwords, tokens, secrets, and authorization headers.
- **Zero-PII Operational Telemetry**: `SyncTelemetryService` records strictly non-sensitive operational metrics (sync attempt counts, backoff delay, corruption events).
