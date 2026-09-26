import DeviceActivity
import ManagedSettings

@available(iOS 15.0, *)
public class DeviceActivityMonitorExtension: DeviceActivityMonitor {
    override public func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        print("[DeviceActivityMonitorExtension] Interval started for activity: \(activity.rawValue)")
        if activity.rawValue == "guardian.bedtime.schedule" {
            ManagedSettingsManager.shared.setBedtimeRestriction(enabled: true)
        }
    }

    override public func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        print("[DeviceActivityMonitorExtension] Interval ended for activity: \(activity.rawValue)")
        if activity.rawValue == "guardian.bedtime.schedule" {
            ManagedSettingsManager.shared.setBedtimeRestriction(enabled: false)
        }
    }

    override public func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        super.eventDidReachThreshold(event, activity: activity)
        print("[DeviceActivityMonitorExtension] Daily screen time threshold reached: \(event.rawValue)")
    }
}
