# Guardian — Cross-Platform Parental Control System (MVP Candidate)

Guardian is a cross-platform parental control system supporting parent mobile management, child device policy enforcement, secure backend policy synchronization, versioned rules, schedules, extra-time request workflows, and offline enforcement.

---

## 🏛️ Monorepo Architecture

- **`apps/parent-mobile/`**: React Native mobile interface for parent controls, dashboard, schedule editor, extra-time approvals, and reports.
- **`apps/child-mobile/`**: React Native child device agent with native Android (`AndroidAdapter`) and iOS (`IOSAdapter`) platform bridges, `ScreenTimeEngine`, and `PolicySyncService`.
- **`services/api/`**: TypeScript REST API service with JWT authentication, cryptographic pairing protocol, rate limiting (`ApiRateLimiter`), policy management, and audit logging.
- **`packages/shared-types/`**: Shared domain interfaces (`User`, `Family`, `Child`, `Device`, `Policy`, `ExtraTimeRequest`, `Report`).
- **`packages/shared-utils/`**: Deterministic `ScheduleEvaluator`, `AtomicStorage` with SHA-256 integrity checksums, and zero-PII `SyncTelemetryService`.
- **`packages/shared-api/`**: API response models and HTTP communication helpers.
- **`tests/`**: Comprehensive master test suite containing 18 test modules covering all 15 project phases.

---

## ⚡ Quick Start & Verification Commands

### 1. Run Master Test Suite (All 15 Phases)
```bash
cd tests
npx tsc --noEmit
```

### 2. Build Android App
```bash
cd apps/child-mobile/android
./gradlew assembleRelease
```

### 3. Build iOS App (macOS with Xcode)
```bash
cd apps/child-mobile/ios
pod install
xcodebuild -workspace ChildMobile.xcworkspace -scheme ChildMobile -configuration Release
```

---

## 📚 Documentation

- [`/docs/architecture.md`](file:///C:/Users/MUBASHIR/.gemini/antigravity/scratch/guardian/docs/architecture.md): Monorepo design, data flow, and backend architecture.
- [`/docs/development.md`](file:///C:/Users/MUBASHIR/.gemini/antigravity/scratch/guardian/docs/development.md): Local development guide and build commands.
- [`/docs/platform-limitations.md`](file:///C:/Users/MUBASHIR/.gemini/antigravity/scratch/guardian/docs/platform-limitations.md): Platform Capability Matrix for Android and iOS.
- [`/docs/security.md`](file:///C:/Users/MUBASHIR/.gemini/antigravity/scratch/guardian/docs/security.md): Threat Model Review and security hardening controls.
- [`/docs/privacy.md`](file:///C:/Users/MUBASHIR/.gemini/antigravity/scratch/guardian/docs/privacy.md): Privacy commitment, 90-day retention, and erasure rights.
- [`/docs/testing.md`](file:///C:/Users/MUBASHIR/.gemini/antigravity/scratch/guardian/docs/testing.md): Final Quality Assurance & MVP Verification Report.
