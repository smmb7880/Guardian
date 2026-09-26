import Foundation
import UIKit

public class CapabilityReporter {
    public static func generateReport() -> [String: Any] {
        let supported: [String] = [
            "DEVICE_REGISTRATION",
            "SECURE_AUTH",
            "POLICY_SYNC",
            "LOCAL_POLICY_PERSISTENCE",
            "FAMILY_CONTROLS_AUTHORIZATION",
            "MANAGED_SETTINGS_SHIELDING",
            "DEVICE_ACTIVITY_MONITORING",
            "DEVICE_STATUS_TELEMETRY"
        ]

        let unsupported: [String] = [
            "KEYLOGGING",
            "COVERT_RECORDING",
            "CREDENTIAL_INTERCEPTION",
            "SILENT_CAMERA_ACCESS",
            "RAW_PACKAGE_LISTING"
        ]

        let requiresPermission: [String] = [
            "FamilyControlsAuthorization"
        ]

        let requiresUserAction: [String] = [
            "APPROVE_FAMILY_CONTROLS_PROMPT",
            "INSTALL_PROVISIONING_PROFILE",
            "SELECT_APPS_VIA_FAMILY_ACTIVITY_PICKER"
        ]

        return [
            "platform": "IOS",
            "systemVersion": UIDevice.current.systemVersion,
            "supported": supported,
            "unsupported": unsupported,
            "requires_permission": requiresPermission,
            "requires_user_action": requiresUserAction,
            "permissions": [
                "FamilyControlsAuthorization": true
            ]
        ]
    }
}
