
package com.jarvis.pk;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

// THE BRAIN: Connects Speech -> AI -> Action
public class JarvisPipeline {

    private Context context;

    public JarvisPipeline(Context context) {
        this.context = context;
    }

    public void processVoiceCommand(String aiJsonCommand) {
        // aiJsonCommand string is expected to contain "package_name" or specific keywords if not full JSON
        
        // 1. GLOBAL ACTIONS
        if (aiJsonCommand.contains("home") || aiJsonCommand.contains("close")) {
             JarvisAccessibilityService service = JarvisAccessibilityService.getInstance();
             if (service != null) service.goHome();
             return;
        }

        if (aiJsonCommand.contains("back")) {
             JarvisAccessibilityService service = JarvisAccessibilityService.getInstance();
             if (service != null) service.goBack();
             return;
        }

        // 2. MEDIA CONTROL
        if (aiJsonCommand.contains("pause")) JarvisMediaControl.executeCommand(context, "pause");
        if (aiJsonCommand.contains("play")) JarvisMediaControl.executeCommand(context, "play");
        if (aiJsonCommand.contains("next")) JarvisMediaControl.executeCommand(context, "next");

        // 3. DYNAMIC APP LAUNCHING (Primitive JSON parsing)
        // Checks if command contains a package name structure (com.xxxx.xxxx)
        if (aiJsonCommand.contains("com.")) {
            String[] parts = aiJsonCommand.split("\""); // primitive split for simple JSON
            for (String part : parts) {
                if (part.startsWith("com.") && part.contains(".")) {
                    launchAppByPackage(part);
                    break;
                }
            }
        } 
        // Fallback for keyword-based opening if package not found in string
        else if (aiJsonCommand.contains("youtube")) {
            launchAppByPackage("com.google.android.youtube");
        } else if (aiJsonCommand.contains("whatsapp")) {
            launchAppByPackage("com.whatsapp");
        }
    }

    private void launchAppByPackage(String packageName) {
        PackageManager pm = context.getPackageManager();
        try {
            Intent intent = pm.getLaunchIntentForPackage(packageName);
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            }
        } catch (Exception e) {
            // App not found
        }
    }
}