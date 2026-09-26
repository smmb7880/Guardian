# Development Guide & Build Instructions — Guardian

## System Requirements

- **Node.js**: `>= 18.x`
- **npm**: `>= 9.x`
- **TypeScript**: `^5.3.3`
- **Android SDK**: API Level 34 (`Android 14`) with Build Tools `34.0.0`
- **JDK**: OpenJDK 17
- **Xcode**: `>= 15.0` (for iOS builds on macOS)
- **CocoaPods**: `>= 1.14.x` (for iOS native dependencies)

---

## Workspace Structure

- **`apps/parent-mobile/`**: React Native parent controller application.
- **`apps/child-mobile/`**: React Native child device agent application.
- **`services/api/`**: Express / Node.js REST API service.
- **`packages/shared-types/`**: Shared TypeScript models and interfaces.
- **`packages/shared-utils/`**: Shared algorithms (`ScheduleEvaluator`, `AtomicStorage`, `SyncTelemetryService`).
- **`packages/shared-api/`**: API response models and client adapters.
- **`tests/`**: Integration test suites (18 test modules).

---

## Execution & Build Commands

### 1. Execute Master Test Runner
```bash
cd tests
npx tsc --noEmit
```

### 2. Build Android App (Release APK / AAB)
```bash
cd apps/child-mobile/android
./gradlew assembleRelease
```

### 3. Build iOS App (macOS with Xcode)
```bash
cd apps/child-mobile/ios
pod install
xcodebuild -workspace ChildMobile.xcworkspace -scheme ChildMobile -configuration Release -sdk iphoneos
```

### 4. Run API Service Locally
```bash
cd services/api
npm run dev
```

### 5. Run Parent Mobile App
```bash
cd apps/parent-mobile
npm run start
```
