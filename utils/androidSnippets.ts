
export const MANIFEST_CODE = `<!-- AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.jarvis.pk">

    <application>
        <!-- Device Admin -->
        <receiver
            android:name=".JarvisAdminReceiver"
            android:label="@string/app_name"
            android:description="@string/admin_description"
            android:permission="android.permission.BIND_DEVICE_ADMIN">
            <meta-data
                android:name="android.app.device_admin"
                android:resource="@xml/device_admin_policies" />
            <intent-filter>
                <action android:name="android.app.action.DEVICE_ADMIN_ENABLED" />
            </intent-filter>
        </receiver>

        <!-- Accessibility Service -->
        <service
            android:name=".JarvisAccessibilityService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:label="Jarvis Auto-Pilot">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>
    </application>

    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
</manifest>`;

export const POLICY_XML_CODE = `<!-- res/xml/device_admin_policies.xml -->
<device-admin xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-policies>
        <limit-password />
        <watch-login />
        <reset-password />
        <force-lock />
        <wipe-data />
        <expire-password />
        <encrypted-storage />
        <disable-camera />
    </uses-policies>
</device-admin>`;

export const JAVA_CLASS_CODE = `// JarvisAdminReceiver.java
package com.jarvis.pk;

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;
import android.widget.Toast;

public class JarvisAdminReceiver extends DeviceAdminReceiver {
    
    @Override
    public void onEnabled(Context context, Intent intent) {
        super.onEnabled(context, intent);
        Toast.makeText(context, "J.A.R.V.I.S. SECURITY PROTOCOL: ENGAGED", Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onDisabled(Context context, Intent intent) {
        super.onDisabled(context, intent);
        Toast.makeText(context, "J.A.R.V.I.S. SECURITY PROTOCOL: COMPROMISED", Toast.LENGTH_SHORT).show();
    }
}`;

export const LOCK_FUNCTION_CODE = `// Function to Lock Device
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import com.jarvis.pk.JarvisAdminReceiver;

public void lockDevice() {
    DevicePolicyManager dpm = (DevicePolicyManager) getSystemService(Context.DEVICE_POLICY_SERVICE);
    ComponentName adminComponent = new ComponentName(this, JarvisAdminReceiver.class);
    
    if (dpm.isAdminActive(adminComponent)) {
        dpm.lockNow(); 
    } else {
        Intent intent = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
        intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent);
        intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Jarvis needs control to secure the device.");
        startActivityForResult(intent, 1);
    }
}`;

export const BIOMETRIC_JAVA_CODE = `// Smart Unlock / Biometric Auth Logic
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import android.app.KeyguardManager;
import android.os.PowerManager;

public void wakeAndUnlock() {
    // 1. Wake Screen
    PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
    PowerManager.WakeLock wl = pm.newWakeLock(
        PowerManager.FULL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP, "Jarvis:WakeTag");
    wl.acquire(3000); // Wake for 3s

    // 2. Dismiss Keyguard (If no secure lock)
    KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
    km.requestDismissKeyguard(this, null);
    
    // 3. Start Face/Fingerprint Scan
    authenticateUser(); 
}

private void authenticateUser() {
    Executor executor = ContextCompat.getMainExecutor(this);
    BiometricPrompt biometricPrompt = new BiometricPrompt(this, executor, new BiometricPrompt.AuthenticationCallback() {
        @Override
        public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
            super.onAuthenticationSucceeded(result);
            // UNLOCK SUCCESSFUL - START JARVIS UI
        }
    });

    BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
            .setTitle("J.A.R.V.I.S. Identity Check")
            .setSubtitle("Face Recognition Active")
            .setNegativeButtonText("Use PIN")
            .build();

    biometricPrompt.authenticate(promptInfo);
}`;

export const WAKELOCK_JAVA_CODE = `// Keep Screen On Logic (WakeLock)
import android.os.PowerManager;
import android.content.Context;

private PowerManager.WakeLock wakeLock;

public void acquireWakeLock() {
    PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
    
    // SCREEN_BRIGHT_WAKE_LOCK ensures CPU is on and Screen is bright.
    // ACQUIRE_CAUSES_WAKEUP turns the screen on immediately if it was off.
    wakeLock = powerManager.newWakeLock(
        PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP, 
        "Jarvis:KeepAwake"
    );
    
    if (!wakeLock.isHeld()) {
        wakeLock.acquire(); // Screen stays ON until release()
        // Note: For limited time, use wakeLock.acquire(10*60*1000L);
    }
}

public void releaseWakeLock() {
    if (wakeLock != null && wakeLock.isHeld()) {
        wakeLock.release();
    }
}`;

export const ACCESSIBILITY_SERVICE_CODE = `// JarvisAccessibilityService.java
package com.jarvis.pk;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.List;

public class JarvisAccessibilityService extends AccessibilityService {
    private static JarvisAccessibilityService instance;

    @Override
    public void onServiceConnected() {
        instance = this;
    }

    public static JarvisAccessibilityService getInstance() {
        return instance;
    }

    // AUTOMATION: TAP FIRST RESULT
    public boolean clickFirstItemWithText(String text) {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return false;

        List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByText(text);
        if (!nodes.isEmpty()) {
            AccessibilityNodeInfo node = nodes.get(0);
            while (node != null) {
                if (node.isClickable()) {
                    node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                    return true;
                }
                node = node.getParent();
            }
        }
        return false;
    }
    
    // AUTOMATION: NAVIGATION
    public void goHome() { performGlobalAction(GLOBAL_ACTION_HOME); }
    public void goBack() { performGlobalAction(GLOBAL_ACTION_BACK); }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {}
    @Override
    public void onInterrupt() {}
}`;

export const MEDIA_CONTROL_CODE = `// JarvisMediaControl.java
package com.jarvis.pk;

import android.content.Context;
import android.media.AudioManager;
import android.view.KeyEvent;

public class JarvisMediaControl {

    // EXECUTE MEDIA COMMANDS DIRECTLY
    public static void executeCommand(Context context, String command) {
        AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        int keyEvent = 0;

        switch (command) {
            case "play":
            case "pause":
                keyEvent = KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE;
                break;
            case "next":
                keyEvent = KeyEvent.KEYCODE_MEDIA_NEXT;
                break;
            case "previous":
                keyEvent = KeyEvent.KEYCODE_MEDIA_PREVIOUS;
                break;
            case "volume_up":
                audioManager.adjustVolume(AudioManager.ADJUST_RAISE, AudioManager.FLAG_SHOW_UI);
                return;
            case "volume_down":
                audioManager.adjustVolume(AudioManager.ADJUST_LOWER, AudioManager.FLAG_SHOW_UI);
                return;
            case "mute":
                audioManager.adjustVolume(AudioManager.ADJUST_MUTE, AudioManager.FLAG_SHOW_UI);
                return;
            default:
                return;
        }

        if (keyEvent != 0) {
            // Simulate button press down and up
            audioManager.dispatchMediaKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, keyEvent));
            audioManager.dispatchMediaKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, keyEvent));
        }
    }
}`;

export const PIPELINE_CODE = `// JarvisPipeline.java
// THE LOGIC FLOW: Speech -> AI -> Intent -> Accessbility -> Media

public void processVoiceCommand(String aiJsonCommand) {
    // 1. INTENT: OPEN APP (YouTube)
    if (aiJsonCommand.contains("youtube")) {
        Intent intent = new Intent(Intent.ACTION_SEARCH);
        intent.setPackage("com.google.android.youtube");
        intent.putExtra("query", "Iron Man Trailer");
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);

        // 2. ACCESSIBILITY: TAP FIRST RESULT (Delayed)
        new Handler().postDelayed(() -> {
            JarvisAccessibilityService.getInstance().clickFirstItemWithText("Iron Man");
        }, 3000);
    }
    
    // 3. MEDIA: CONTROL
    if (aiJsonCommand.contains("media")) {
        // Parse command from JSON, e.g., "next"
        JarvisMediaControl.executeCommand(context, "next");
    }

    // 4. ACCESSIBILITY: GLOBAL BACK
    if (aiJsonCommand.contains("back")) {
        JarvisAccessibilityService.getInstance().goBack();
    }
}`;