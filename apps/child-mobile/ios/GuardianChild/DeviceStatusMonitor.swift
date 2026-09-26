import Foundation
import UIKit

public class DeviceStatusMonitor {
    public static func getStatus() -> [String: Any] {
        UIDevice.current.isBatteryMonitoringEnabled = true
        let batteryLevel = UIDevice.current.batteryLevel
        let batteryPct = batteryLevel >= 0 ? Int(batteryLevel * 100) : 100
        let isCharging = UIDevice.current.batteryState == .charging || UIDevice.current.batteryState == .full

        return [
            "platform": "IOS",
            "batteryPercent": batteryPct,
            "isCharging": isCharging,
            "isConnectedToNetwork": true,
            "osVersion": "iOS \(UIDevice.current.systemVersion)",
            "deviceModel": UIDevice.current.model,
            "timestamp": Date().timeIntervalSince1970
        ]
    }
}
