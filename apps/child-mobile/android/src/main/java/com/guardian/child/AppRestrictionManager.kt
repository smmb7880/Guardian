package com.guardian.child

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import org.json.JSONArray
import org.json.JSONObject

class AppRestrictionManager {

    fun isAppBlocked(context: Context, packageName: String, policyJson: JSONObject): Boolean {
        val appRules = policyJson.optJSONArray("appRules") ?: JSONArray()
        for (i in 0 until appRules.length()) {
            val rule = appRules.getJSONObject(i)
            val identifier = rule.optString("appIdentifier", "")
            val action = rule.optString("action", "ALLOW")
            if (identifier.equals(packageName, ignoreCase = true) && action == "BLOCK") {
                return true
            }
        }
        return false
    }

    fun isBedtimeActive(policyJson: JSONObject): Boolean {
        val bedtime = policyJson.optJSONObject("bedtime") ?: return false
        if (!bedtime.optBoolean("enabled", false)) return false

        val startTime = bedtime.optString("startTime", "") // "20:00"
        val endTime = bedtime.optString("endTime", "")     // "07:00"

        if (startTime.isEmpty() || endTime.isEmpty()) return false

        val now = java.util.Calendar.getInstance()
        val currentHour = now.get(java.util.Calendar.HOUR_OF_DAY)
        val currentMin = now.get(java.util.Calendar.MINUTE)
        val currentTotalMins = currentHour * 60 + currentMin

        val (startH, startM) = startTime.split(":").map { it.toInt() }
        val (endH, endM) = endTime.split(":").map { it.toInt() }

        val startMins = startH * 60 + startM
        val endMins = endH * 60 + endM

        return if (startMins > endMins) {
            currentTotalMins >= startMins || currentTotalMins < endMins
        } else {
            currentTotalMins in startMins until endMins
        }
    }

    fun triggerBlockOverlay(context: Context, packageName: String, reason: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(context)) {
            // Trigger blocking overlay activity / window intent
            val intent = Intent(context, BlockOverlayActivity::class.java).apply {
                putExtra("blocked_package", packageName)
                putExtra("block_reason", reason)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            context.startActivity(intent)
        }
    }
}

class BlockOverlayActivity : android.app.Activity() {
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        super.onCreate(savedInstanceState)
        val view = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            setBackgroundColor(android.graphics.Color.parseColor("#0F172A"))
            
            val icon = android.widget.TextView(this@BlockOverlayActivity).apply {
                text = "🛡️"
                textSize = 64f
                gravity = android.view.Gravity.CENTER
            }
            val title = android.widget.TextView(this@BlockOverlayActivity).apply {
                text = "App Blocked by Guardian"
                textSize = 24f
                setTextColor(android.graphics.Color.WHITE)
                gravity = android.view.Gravity.CENTER
            }
            val sub = android.widget.TextView(this@BlockOverlayActivity).apply {
                text = intent.getStringExtra("block_reason") ?: "Time limit or schedule rule active."
                textSize = 14f
                setTextColor(android.graphics.Color.LIGHTGRAY)
                gravity = android.view.Gravity.CENTER
            }
            addView(icon)
            addView(title)
            addView(sub)
        }
        setContentView(view)
    }
}
