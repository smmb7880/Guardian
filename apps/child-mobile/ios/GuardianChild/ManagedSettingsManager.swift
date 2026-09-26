import Foundation
import ManagedSettings
import FamilyControls

@available(iOS 15.0, *)
public class ManagedSettingsManager {
    public static let shared = ManagedSettingsManager()

    private let store = ManagedSettingsStore(named: ManagedSettingsStore.Name("guardian.child.store"))

    public func applyShields(applications: Set<ApplicationToken>, webDomains: Set<WebDomainToken>) {
        store.shield.applications = applications
        store.shield.webDomains = webDomains
    }

    public func setBedtimeRestriction(enabled: BooleanLiteralType) {
        if enabled {
            store.shield.applicationCategories = ShieldSettings.ActivityCategoryPolicy.all()
            store.dateAndTime.requireAutomaticDateAndTime = true
        } else {
            store.shield.applicationCategories = nil
            store.dateAndTime.requireAutomaticDateAndTime = nil
        }
    }

    public func clearRestrictions() {
        store.clearAllSettings()
    }
}
