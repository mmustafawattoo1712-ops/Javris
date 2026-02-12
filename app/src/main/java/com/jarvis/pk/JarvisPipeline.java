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
        // aiJsonCommand string is expected to contain "package_name" or specific keywords
        
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

        // 3. DYNAMIC APP LAUNCHING
        if (aiJsonCommand.contains("com.")) {
            String[] parts = aiJsonCommand.split("\"");
            for (String part : parts) {
                if (part.startsWith("com.") && part.contains(".")) {
                    launchAppByPackage(part);
                    break;
                }
            }
        } 
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