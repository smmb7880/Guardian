package com.guardian.child

import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Build
import org.json.JSONObject
import java.util.Calendar

class UsageStatsCollector {
    fun getUsageStats(context: Context): JSONObject {
        val result = JSONObject()
        val appUsageMap = JSONObject()
        var totalScreenTimeMinutes = 0L

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            if (usm != null) {
                val calendar = Calendar.getInstance()
                calendar.set(Calendar.HOUR_OF_DAY, 0)
                calendar.set(Calendar.MINUTE, 0)
                calendar.set(Calendar.SECOND, 0)
                val startTime = calendar.timeInMillis
                val endTime = System.currentTimeMillis()

                val statsList: List<UsageStats> = usm.queryUsageStats(
                    UsageStatsManager.INTERVAL_DAILY,
                    startTime,
                    endTime
                ) ?: emptyList()

                for (stats in statsList) {
                    val minutes = stats.totalTimeInForeground / (1000 * 60)
                    if (minutes > 0) {
                        appUsageMap.put(stats.packageName, minutes)
                        totalScreenTimeMinutes += minutes
                    }
                }
            }
        }

        result.put("timestamp", System.currentTimeMillis())
        result.put("totalScreenTimeMinutes", totalScreenTimeMinutes)
        result.put("appUsageMinutes", appUsageMap)
        return result
    }
}
