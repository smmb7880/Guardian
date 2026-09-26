package com.guardian.child

import android.content.Context
import org.json.JSONObject

interface ParentalControlAdapter {
    fun checkPermissions(context: Context): JSONObject
    fun requestPermissions(context: Context): Boolean
    fun applyPolicy(context: Context, policyJson: String): Boolean
    fun getUsageStats(context: Context): JSONObject
    fun getDeviceStatus(context: Context): JSONObject
    fun getCapabilityReport(context: Context): JSONObject
}
