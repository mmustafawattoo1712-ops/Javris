
package com.jarvis.pk

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.os.Bundle

class JarvisNotificationService : NotificationListenerService() {

    companion object {
        var lastNotificationText: String = "No new messages."
        var lastSender: String = ""
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val packageName = sbn.packageName
        if (packageName == "com.whatsapp" || packageName == "com.google.android.apps.messaging") {
            val extras: Bundle? = sbn.notification.extras
            if (extras != null) {
                val title = extras.getString("android.title") ?: "Unknown"
                val text = extras.getCharSequence("android.text")?.toString() ?: ""

                if (text.isNotEmpty()) {
                    lastSender = title
                    lastNotificationText = "Message from $title: $text"
                }
            }
        }
    }
}
