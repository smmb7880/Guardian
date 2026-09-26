# Platform Capability & Limitations Reference — Guardian

This document provides the official Platform Capability Matrix and Cross-Platform Support Matrix for Guardian on Android and iOS child devices, detailing supported capabilities, system prerequisites, OS limitations, and privacy boundaries.

---

## 🌐 Cross-Platform Support Matrix

| Parent OS | Child Device OS | Architecture Support | Physical Validation Status |
| :--- | :--- | :--- | :--- |
| **Android** | **Android** | `Supported` | `AUTOMATED TESTED` / `REQUIRES PHYSICAL DEVICE TEST` |
| **Android** | **iOS** | `Supported` | `AUTOMATED TESTED` / `REQUIRES PHYSICAL DEVICE TEST` |
| **iOS** | **Android** | `Supported` | `AUTOMATED TESTED` / `REQUIRES PHYSICAL DEVICE TEST` |
| **iOS** | **iOS** | `Supported` | `AUTOMATED TESTED` / `REQUIRES PHYSICAL DEVICE TEST` |

*Note: The parent operating system NEVER determines or restricts the child's operating system. The backend REST API and deterministic policy engine are completely platform-neutral.*

---

## 📊 Platform Capability Matrix

| Feature | Android | iOS | Status Classification | Technical Requirements | Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Device Registration & Pairing** | `SUPPORTED` | `SUPPORTED` | `AUTOMATED TESTED` | Single-use 6-character code over TLS | Pairing codes expire in 10 mins. |
| **Device Authentication** | `SUPPORTED` | `SUPPORTED` | `AUTOMATED TESTED` | JWT bearer token + Secure KeyStore/Keychain | Session revoked on parent unpair (`403`). |
| **Policy Synchronization** | `SUPPORTED` | `SUPPORTED` | `AUTOMATED TESTED` | REST `/sync/check` + version diffing | Polling frequency bounded by background limits. |
| **Local Policy Persistence** | `SUPPORTED` | `SUPPORTED` | `AUTOMATED TESTED` | `AtomicStorage` with SHA-256 integrity checksum | Offline TTL default 72 hours before safe `BLOCK`. |
| **Daily Screen Time Limits** | `SUPPORTED` | `SUPPORTED` | `AUTOMATED TESTED` | `PACKAGE_USAGE_STATS` (Android) / `ManagedSettingsStore` (iOS) | Requires user permission / Apple entitlement. |
| **Bedtime & Schedules** | `SUPPORTED` | `SUPPORTED` | `AUTOMATED TESTED` | Local clock evaluation & timezone conversion | Clock skew >60s triggers tamper block. |
| **App Restriction & Shielding** | `SUPPORTED` | `SUPPORTED` | `AUTOMATED TESTED` | `SYSTEM_ALERT_WINDOW` (Android) / `ManagedSettings` (iOS) | Android displays overlay; iOS displays system shield. |
| **Extra-Time Requests & Push** | `SUPPORTED` | `SUPPORTED` | `AUTOMATED TESTED` | Server authorization + FCM / APNs payload dispatch | 15-minute TTL; duplicate protection enforced. |
| **Raw App Package Name Access** | `SUPPORTED` | `UNSUPPORTED` | `PLATFORM LIMITED` | Android Package Name strings | **iOS Privacy Layer**: Apple tokenizes apps behind opaque `ApplicationToken` structs. |
| **Hidden Keylogging** | `UNSUPPORTED` | `UNSUPPORTED` | `NOT IMPLEMENTED` | N/A | **Forbidden by Policy**: Keylogging is strictly prohibited. |
| **Covert Audio / Video Recording** | `UNSUPPORTED` | `UNSUPPORTED` | `NOT IMPLEMENTED` | N/A | **Forbidden by Policy**: Secret background camera/mic recording is forbidden. |
| **Stealth Screen Capture** | `UNSUPPORTED` | `UNSUPPORTED` | `NOT IMPLEMENTED` | N/A | **Forbidden by Policy**: Continuous hidden video/screenshot capture is excluded. |

---

## 🤖 Detailed Android Capabilities & Technical Requirements

### 1. Permission Architecture
- **`PACKAGE_USAGE_STATS`**: Tracks foreground app usage and accumulated screen-time minutes (`UsageStatsManager`). Requires user enablement in System Settings.
- **`SYSTEM_ALERT_WINDOW`**: Displays non-invasive block screens (`BlockOverlayActivity`) over restricted applications.
- **`POST_NOTIFICATIONS`**: Displays policy updates and bedtime alerts (Android 13+ API 33).
- **`RECEIVE_BOOT_COMPLETED`**: Restores background policy enforcement after device reboot via `BootCompletedReceiver`.

### 2. OS Version Differences
- **Android 10 (API 29)**: Scoped storage restrictions. Policy cache stored in app-private directory.
- **Android 11-12 (API 30-31)**: Background activity launch restrictions tightened. Block overlays require `FLAG_ACTIVITY_NEW_TASK`.
- **Android 13 (API 33)**: Explicit runtime permission for notifications (`POST_NOTIFICATIONS`).
- **Android 14-15 (API 34-35)**: Foreground service types strictly categorized (`dataSync` / `specialUse`).

---

## 🍎 Detailed iOS Capabilities & Technical Requirements

### 1. Apple Screen Time Frameworks (iOS 15.0+)
- **FamilyControls** (`AuthorizationCenter.shared`): Prompts parent for Screen Time authorization. Requires Apple Entitlement approval (`com.apple.developer.family-controls`).
- **ManagedSettings** (`ManagedSettingsStore`): Applies native system shields to restricted app tokens (`ApplicationToken`) and web domains (`WebDomainToken`).
- **DeviceActivity** (`DeviceActivityMonitor` Extension): Monitors schedule intervals (`intervalDidStart` / `intervalDidEnd`) and enforces bedtime boundaries.

### 2. Technical Limitations & Privacy Boundaries
- **App Tokenization**: iOS hides raw app bundle IDs (`com.example.app`) behind opaque `ApplicationToken` structures. Guardian cannot inspect or transmit raw app names on iOS.
- **Hardware Requirement**: `AuthorizationCenter` and `ManagedSettingsStore` operate only on physical iOS hardware (iOS 15.0+). iOS Simulators return `unauthorized` by default.

---

## 🚫 Unsupported Capabilities Rationale

1. **Raw App Identifier Inspection on iOS**: Apple's Screen Time framework deliberately conceals bundle identifiers behind tokenized opaque handles to prevent child device app usage tracking by third-party servers.
2. **Hidden Surveillance (Keylogging, Covert Recording, Stealth Monitoring)**: Guardian is engineered exclusively as a transparent, legitimate parental-control solution. Stealth surveillance capabilities are strictly forbidden by engineering standards and Apple/Google App Store guidelines.
