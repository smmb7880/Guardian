import Foundation

public protocol ParentalControlAdapterProtocol {
    func checkAuthorization(completion: @escaping ([String: Any]) -> Void)
    func requestAuthorization(completion: @escaping (Bool, Error?) -> Void)
    func applyPolicy(policyJson: String) -> Bool
    func getDeviceStatus() -> [String: Any]
    func getCapabilityReport() -> [String: Any]
}
