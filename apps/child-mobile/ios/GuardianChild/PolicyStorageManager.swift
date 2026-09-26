import Foundation

public class PolicyStorageManager {
    public static let shared = PolicyStorageManager()

    private let userDefaults = UserDefaults(suiteName: "group.com.guardian.child") ?? UserDefaults.standard

    public func savePolicy(jsonString: String, version: Int) -> Bool {
        userDefaults.set(jsonString, forKey: "cached_policy_json")
        userDefaults.set(version, forKey: "cached_policy_version")
        userDefaults.set(Date().timeIntervalSince1970, forKey: "cached_policy_timestamp")
        return userDefaults.synchronize()
    }

    public func getPolicyJson() -> String? {
        return userDefaults.string(forKey: "cached_policy_json")
    }

    public func getPolicyVersion() -> Int {
        return userDefaults.integer(forKey: "cached_policy_version")
    }

    public func clearPolicy() {
        userDefaults.removeObject(forKey: "cached_policy_json")
        userDefaults.removeObject(forKey: "cached_policy_version")
    }
}
