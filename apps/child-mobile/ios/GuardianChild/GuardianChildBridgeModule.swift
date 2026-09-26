import Foundation

@objc(GuardianChildBridgeModule)
public class GuardianChildBridgeModule: NSObject {
    
    @objc public static func requiresMainQueueSetup() -> Bool {
        return false
    }

    @objc public func checkAuthorization(_ resolve: @escaping (Any) -> Void, reject: @escaping (String, String, Error?) -> Void) {
        if #available(iOS 15.0, *) {
            let status = FamilyControlsManager.shared.checkAuthorizationStatus()
            resolve(["status": status, "granted": status == "approved"])
        } else {
            resolve(["status": "unsupported", "granted": false])
        }
    }

    @objc public func requestAuthorization(_ resolve: @escaping (Any) -> Void, reject: @escaping (String, String, Error?) -> Void) {
        if #available(iOS 15.0, *) {
            FamilyControlsManager.shared.requestAuthorization { success, errorMsg in
                if success {
                    resolve(true)
                } else {
                    reject("AUTHORIZATION_FAILED", errorMsg ?? "User denied authorization", nil)
                }
            }
        } else {
            reject("UNSUPPORTED_OS", "iOS 15.0 or later is required for FamilyControls", nil)
        }
    }

    @objc public func applyPolicy(_ policyJson: String, resolve: @escaping (Any) -> Void, reject: @escaping (String, String, Error?) -> Void) {
        let success = PolicyStorageManager.shared.savePolicy(jsonString: policyJson, version: 1)
        resolve(success)
    }

    @objc public func getCapabilityReport(_ resolve: @escaping (Any) -> Void, reject: @escaping (String, String, Error?) -> Void) {
        let report = CapabilityReporter.generateReport()
        resolve(report)
    }

    @objc public func getDeviceStatus(_ resolve: @escaping (Any) -> Void, reject: @escaping (String, String, Error?) -> Void) {
        let status = DeviceStatusMonitor.getStatus()
        resolve(status)
    }
}
