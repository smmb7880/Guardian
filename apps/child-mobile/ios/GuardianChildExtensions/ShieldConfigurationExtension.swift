import ManagedSettings
import ManagedSettingsUI
import UIKit

@available(iOS 15.0, *)
public class ShieldConfigurationExtension: ShieldConfigurationDataSource {
    override public func configuration(shielding application: Application) -> ShieldConfiguration {
        return ShieldConfiguration(
            backgroundColor: UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1.0),
            icon: UIImage(systemName: "shield.fill"),
            title: ShieldConfiguration.Label(text: "App Restricted by Guardian", color: .white),
            subtitle: ShieldConfiguration.Label(text: "This app is unavailable based on your active parental control policy.", color: .lightGray),
            primaryButtonLabel: ShieldConfiguration.Label(text: "OK", color: .white),
            primaryButtonBackgroundColor: UIColor(red: 0.39, green: 0.40, blue: 0.95, alpha: 1.0)
        )
    }

    override public func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        return ShieldConfiguration(
            backgroundColor: UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1.0),
            icon: UIImage(systemName: "globe"),
            title: ShieldConfiguration.Label(text: "Website Restricted by Guardian", color: .white),
            subtitle: ShieldConfiguration.Label(text: "Access to this domain is restricted by your parent.", color: .lightGray),
            primaryButtonLabel: ShieldConfiguration.Label(text: "OK", color: .white),
            primaryButtonBackgroundColor: UIColor(red: 0.39, green: 0.40, blue: 0.95, alpha: 1.0)
        )
    }
}
