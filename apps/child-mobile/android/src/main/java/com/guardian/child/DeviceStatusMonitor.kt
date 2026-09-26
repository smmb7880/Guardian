package com.guardian.child

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.os.BatteryManager
import android.os.Build
import org.json.JSONObject

class DeviceStatusMonitor {

    fun getStatus(context: Context): JSONObject {
        val status = JSONObject()

        // Battery
        val batteryFilter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        val batteryIntent = context.registerReceiver(null, batteryFilter)
        val level = batteryIntent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = batteryIntent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        val batteryPct = if (level >= 0 && scale > 0) (level * 100 / scale.toFloat()).toInt() else 0
        val isCharging = batteryIntent?.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1) != 0

        // Network
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        val activeNetwork = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val net = cm?.activeNetwork
            val caps = cm?.getNetworkCapabilities(net)
            caps != null
        } else {
            @Suppress("DEPRECATION")
            cm?.activeNetworkInfo?.isConnected == true
        }

        status.put("platform", "ANDROID")
        status.put("batteryPercent", batteryPct)
        status.put("isCharging", isCharging)
        status.put("isConnectedToNetwork", activeNetwork)
        status.put("osVersion", "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
        status.put("deviceModel", "${Build.MANUFACTURER} ${Build.MODEL}")
        status.put("timestamp", System.currentTimeMillis())

        return status
    }
}
