import Foundation
import DeviceActivity

@available(iOS 15.0, *)
public class DeviceActivityManager {
    public static let shared = DeviceActivityManager()

    private let center = DeviceActivityCenter()

    public func startBedtimeSchedule(startHour: Int, startMin: Int, endHour: Int, endMin: Int) {
        let scheduleName = DeviceActivityName("guardian.bedtime.schedule")
        
        var startComponents = DateComponents()
        startComponents.hour = startHour
        startComponents.minute = startMin

        var endComponents = DateComponents()
        endComponents.hour = endHour
        endComponents.minute = endMin

        let schedule = DeviceActivitySchedule(
            intervalStart: startComponents,
            intervalEnd: endComponents,
            repeats: true
        )

        do {
            try center.startMonitoring(scheduleName, during: schedule)
            print("[DeviceActivityManager] Monitoring bedtime schedule started.")
        } catch {
            print("[DeviceActivityManager] Failed to start schedule monitoring: \(error)")
        }
    }

    public func stopMonitoring() {
        center.stopMonitoring()
    }
}
