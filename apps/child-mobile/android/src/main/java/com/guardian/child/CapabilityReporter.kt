package com.guardian.child

import android.app.AppOpsManager
import android.content.Context
import android.os.Build
import android.provider.Settings
import org.json.JSONArray
import org.json.JSONObject

class CapabilityReporter {

    fun generateReport(context: Context): JSONObject {
        val report = JSONObject()

        val supported = JSONArray().apply {
            put("DEVICE_REGISTRATION")
            put("SECURE_AUTH")
            put("POLICY_SYNC")
            put("LOCAL_POLICY_PERSISTENCE")
            put("USAGE_STATS_TRACKING")
            put("SCHEDULE_ENFORCEMENT")
            put("OVERLAY_BLOCKING")
            put("DEVICE_STATUS_TELEMETRY")
        }

        val unsupported = JSONArray().apply {
            put("KEYLOGGING") // Explicitly unsupported per engineering rules
            put("COVERT_RECORDING")
            put("CREDENTIAL_INTERCEPTION")
            put("SILENT_CAMERA_ACCESS")
        }

        val requiresPermission = JSONArray().apply {
            put("PACKAGE_USAGE_STATS")
            put("SYSTEM_ALERT_WINDOW")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                put("POST_NOTIFICATIONS")
            }
        }

        val requiresUserAction = JSONArray().apply {
            put("ENABLE_USAGE_ACCESS_SETTINGS")
            put("ENABLE_DRAW_OVERLAYS_SETTINGS")
            put("BATTERY_OPTIMIZATION_EXEMPTION")
        }

        val hasUsagePermission = isUsageStatsPermissionGranted(context)
        val hasOverlayPermission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else true

        report.put("platform", "ANDROID")
        report.put("androidSdkVersion", Build.VERSION.SDK_INT)
        report.put("supported", supported)
        report.put("unsupported", unsupported)
        report.put("requires_permission", requiresPermission)
        report.put("requires_user_action", requiresUserAction)
        report.put("permissions", JSONObject().apply {
            put("PACKAGE_USAGE_STATS", hasUsagePermission)
            put("SYSTEM_ALERT_WINDOW", hasOverlayPermission)
        })

        return report
    }

    private fun isUsageStatsPermissionGranted(context: Context): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager ?: return false
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                context.packageName
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                context.packageName
            )
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }
}
