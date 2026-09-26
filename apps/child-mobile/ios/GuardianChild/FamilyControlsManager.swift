import Foundation
import FamilyControls

@available(iOS 15.0, *)
public class FamilyControlsManager {
    public static let shared = FamilyControlsManager()

    private let center = AuthorizationCenter.shared

    public func checkAuthorizationStatus() -> String {
        switch center.authorizationStatus {
        case .notDetermined:
            return "notDetermined"
        case .denied:
            return "denied"
        case .approved:
            return "approved"
        @unknown default:
            return "unknown"
        }
    }

    public func requestAuthorization(completion: @escaping (Bool, String?) -> Void) {
        Task {
            do {
                try await center.requestAuthorization(for: .individual)
                DispatchQueue.main.async {
                    completion(true, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    let errMsg = error.localizedDescription
                    if errMsg.contains("entitlement") {
                        completion(false, "MISSING_FAMILY_CONTROLS_ENTITLEMENT")
                    } else {
                        completion(false, errMsg)
                    }
                }
            }
        }
    }
}
