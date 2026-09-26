# Privacy & Child Safety Policy — Guardian

## Transparent Parental Control Commitment

Guardian is designed strictly as a legitimate parental-control product to promote healthy screen-time habits. It is **NOT** spyware.

### Strictly Prohibited Capabilities
- **No Hidden Keylogging**: Keystroke monitoring or secret text recording is strictly forbidden.
- **No Covert Audio/Video Recording**: No background microphone or camera access.
- **No Stealth Screen Recording**: Continuous hidden video or screenshot capture is excluded.
- **No Secret Interception**: Private messages, chat contents, and personal emails are never read or stored.

---

## Privacy Controls & User Data Rights

Guardian provides parents and families full control over their data lifecycle:

### 1. Right to Erasure / Cascading Account Deletion
Parents can permanently delete their family account at any time (`DELETE /account`).
- Execution immediately purges parent profiles, family records, children profiles, paired device associations, policy histories, and extra-time request logs.
- Cascading cleanup ensures zero residual data remains on server systems.

### 2. Child & Device Removal
- Individual child profiles (`DELETE /children/:childId`) can be removed independently.
- Device pairings (`DELETE /devices/:deviceId`) can be revoked instantly, clearing local policy caches and session credentials.

### 3. Data Retention Rules
- Activity logs, audit trail entries, and extra-time request histories older than **90 days** are automatically purged via `AccountPrivacyService.applyDataRetention`.

### 4. Sensitive Log Filtering & Zero-PII Telemetry
- **Log Sanitation**: System loggers mask all passwords, tokens, API keys, pairing codes, and authorization headers (`***MASKED***`).
- **Operational Telemetry**: System metrics (`SyncTelemetryService`) track non-sensitive performance indicators (sync counts, backoff delay, corruption events) with zero PII.
