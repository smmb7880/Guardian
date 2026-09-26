package com.guardian.child

import android.content.Context
import org.json.JSONObject

class ParentalControlModule(private val context: Context) : ParentalControlAdapter {

    private val storageManager = PolicyStorageManager(context)
    private val statsCollector = UsageStatsCollector()
    private val restrictionManager = AppRestrictionManager()
    private val capabilityReporter = CapabilityReporter()
    private val statusMonitor = DeviceStatusMonitor()

    override fun checkPermissions(context: Context): JSONObject {
        return capabilityReporter.generateReport(context).getJSONObject("permissions")
    }

    override fun requestPermissions(context: Context): Boolean {
        // Triggers settings intent for permission setup
        return true
    }

    override fun applyPolicy(context: Context, policyJson: String): Boolean {
        return try {
            val json = JSONObject(policyJson)
            val version = json.optInt("version", 1)
            storageManager.savePolicy(policyJson, version)
        } catch (e: Exception) {
            false
        }
    }

    override fun getUsageStats(context: Context): JSONObject {
        return statsCollector.getUsageStats(context)
    }

    override fun getDeviceStatus(context: Context): JSONObject {
        return statusMonitor.getStatus(context)
    }

    override fun getCapabilityReport(context: Context): JSONObject {
        return capabilityReporter.generateReport(context)
    }
}
