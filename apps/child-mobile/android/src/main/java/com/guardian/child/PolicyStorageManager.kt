package com.guardian.child

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject

class PolicyStorageManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("guardian_policy_prefs", Context.MODE_PRIVATE)

    fun savePolicy(policyJson: String, version: Int): Boolean {
        return try {
            prefs.edit()
                .putString("cached_policy_json", policyJson)
                .putInt("cached_policy_version", version)
                .putLong("cached_policy_timestamp", System.currentTimeMillis())
                .commit()
        } catch (e: Exception) {
            false
        }
    }

    fun getPolicy(): JSONObject? {
        val jsonStr = prefs.getString("cached_policy_json", null) ?: return null
        return try {
            JSONObject(jsonStr)
        } catch (e: Exception) {
            null
        }
    }

    fun getPolicyVersion(): Int {
        return prefs.getInt("cached_policy_version", 0)
    }

    fun clearPolicy(): Boolean {
        return prefs.edit().clear().commit()
    }
}
