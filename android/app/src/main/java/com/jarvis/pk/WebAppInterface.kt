package com.jarvis.pk

import android.Manifest
import android.annotation.SuppressLint
import android.app.KeyguardManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.database.Cursor
import android.hardware.camera2.CameraManager
import android.media.AudioManager
import android.net.Uri
import android.os.PowerManager
import android.provider.ContactsContract
import android.provider.Settings
import android.view.KeyEvent
import android.webkit.JavascriptInterface
import android.widget.Toast
import androidx.core.app.ActivityCompat

class WebAppInterface(private val mContext: Context) {

    private var wakeLock: PowerManager.WakeLock? = null

    @SuppressLint("Range")
    private fun getPhoneNumber(name: String): String? {
        if (ActivityCompat.checkSelfPermission(mContext, Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            Toast.makeText(mContext, "Permission Required: Contacts", Toast.LENGTH_SHORT).show()
            return null
        }
        var phoneNumber: String? = null
        val resolver = mContext.contentResolver
        val cursor: Cursor? = resolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            null,
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " LIKE ?",
            arrayOf("%$name%"),
            null
        )
        if (cursor != null && cursor.moveToFirst()) {
            phoneNumber = cursor.getString(cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER))
            cursor.close()
        }
        return phoneNumber?.replace(" ", "")?.replace("-", "")
    }

    @JavascriptInterface
    fun sendWhatsAppMessage(name: String, message: String) {
        val number = getPhoneNumber(name)
        if (number != null) {
            try {
                val cleanNumber = if (number.startsWith("03")) "+92" + number.substring(1) else number
                val url = "https://api.whatsapp.com/send?phone=$cleanNumber&text=${Uri.encode(message)}"
                val intent = Intent(Intent.ACTION_VIEW)
                intent.data = Uri.parse(url)
                intent.setPackage("com.whatsapp")
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                mContext.startActivity(intent)
            } catch (e: Exception) {
                Toast.makeText(mContext, "WhatsApp not installed", Toast.LENGTH_SHORT).show()
            }
        } else {
            Toast.makeText(mContext, "Contact '$name' not found.", Toast.LENGTH_SHORT).show()
        }
    }

    @JavascriptInterface
    fun makePhoneCall(name: String) {
        val number = getPhoneNumber(name)
        if (number != null) {
            val intent = Intent(Intent.ACTION_CALL)
            intent.data = Uri.parse("tel:$number")
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            if (ActivityCompat.checkSelfPermission(mContext, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED) {
                mContext.startActivity(intent)
            } else {
                Toast.makeText(mContext, "Grant Phone Permission", Toast.LENGTH_SHORT).show()
            }
        } else {
            Toast.makeText(mContext, "Contact not found", Toast.LENGTH_SHORT).show()
        }
    }
    
    @JavascriptInterface
    fun getLatestNotification(): String {
        return JarvisNotificationService.lastNotificationText
    }

    @JavascriptInterface
    fun toggleSystemSetting(setting: String, state: Boolean) {
        if (setting == "flashlight") {
            try {
                val camManager = mContext.getSystemService(Context.CAMERA_SERVICE) as CameraManager
                val cameraId = camManager.cameraIdList[0] 
                camManager.setTorchMode(cameraId, state)
            } catch (e: Exception) { }
        } else if (setting == "wifi") {
            val panelIntent = Intent(Settings.Panel.ACTION_INTERNET_CONNECTIVITY)
            panelIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            mContext.startActivity(panelIntent)
        } else if (setting == "bluetooth") {
            val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            mContext.startActivity(intent)
        }
    }

    @JavascriptInterface
    fun launchApp(packageName: String, action: String, payload: String) {
        val pm = mContext.packageManager
        try {
            var intent = pm.getLaunchIntentForPackage(packageName)
            if (intent == null) {
                if (packageName.contains("whatsapp")) {
                    intent = Intent(Intent.ACTION_VIEW)
                    intent.data = Uri.parse("https://api.whatsapp.com/send?phone=")
                } else if (packageName.contains("youtube")) {
                    intent = Intent(Intent.ACTION_VIEW, Uri.parse("vnd.youtube:"))
                }
            }
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                mContext.startActivity(intent)
            } else {
                val marketIntent = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$packageName"))
                marketIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                mContext.startActivity(marketIntent)
            }
        } catch (e: Exception) {
            Toast.makeText(mContext, "Cannot launch app", Toast.LENGTH_SHORT).show()
        }
    }
    
    @JavascriptInterface
    fun performAction(action: String) {
        val service = JarvisAccessibilityService.getInstance()
        if (service != null) {
            if (action == "HOME") service.goHome()
            if (action == "BACK") service.goBack()
        }
    }

    @JavascriptInterface
    fun controlMedia(command: String) {
        val audioManager = mContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val keyEvent = when (command) {
            "play", "pause" -> KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE
            "next" -> KeyEvent.KEYCODE_MEDIA_NEXT
            "previous" -> KeyEvent.KEYCODE_MEDIA_PREVIOUS
            else -> 0
        }
        if (keyEvent != 0) {
            audioManager.dispatchMediaKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, keyEvent))
            audioManager.dispatchMediaKeyEvent(KeyEvent(KeyEvent.ACTION_UP, keyEvent))
        }
        if (command == "volume_up") audioManager.adjustVolume(AudioManager.ADJUST_RAISE, AudioManager.FLAG_SHOW_UI)
        if (command == "volume_down") audioManager.adjustVolume(AudioManager.ADJUST_LOWER, AudioManager.FLAG_SHOW_UI)
    }

    @JavascriptInterface
    fun lockNow() {
        val dpm = mContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val compName = ComponentName(mContext, JarvisAdminReceiver::class.java)
        if (dpm.isAdminActive(compName)) dpm.lockNow()
        else {
            val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
            intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, compName)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            mContext.startActivity(intent)
        }
    }

    @JavascriptInterface
    fun unlockDevice() {
        val km = mContext.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        if (km.isKeyguardLocked) {
             acquireWakeLock()
             if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                 val activity = mContext as? MainActivity
                 activity?.let {
                     km.requestDismissKeyguard(it, object : KeyguardManager.KeyguardDismissCallback() {})
                 }
             }
        }
    }
    
    @JavascriptInterface
    fun acquireWakeLock() {
        if (wakeLock == null) {
            val pm = mContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP, "Jarvis:WakeLock")
        }
        if (!wakeLock!!.isHeld) wakeLock?.acquire(30 * 60 * 1000L)
    }

    @JavascriptInterface
    fun releaseWakeLock() {
        if (wakeLock != null && wakeLock!!.isHeld) wakeLock?.release()
    }
}