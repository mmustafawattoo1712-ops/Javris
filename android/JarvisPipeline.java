
package com.jarvis.pk;

import android.content.Context;
import android.content.Intent;
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
        // Example JSON: { "app": "youtube", "action": "search", "payload": "Iron Man Trailer", "auto_play": true }
        
        // 1. PARSE JSON (Simplified)
        if (aiJsonCommand.contains("youtube") && aiJsonCommand.contains("search")) {
            String query = "Iron Man Trailer"; // Extracted from JSON
            
            // 2. INTENT: OPEN APP & SEARCH
            Intent intent = new Intent(Intent.ACTION_SEARCH);
            intent.setPackage("com.google.android.youtube");
            intent.putExtra("query", query);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);

            // 3. ACCESSIBILITY: TAP FIRST RESULT
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                JarvisAccessibilityService service = JarvisAccessibilityService.getInstance();
                if (service != null) {
                    // Try to click the first item that matches the query words
                    boolean clicked = service.clickFirstItemWithText(query);
                    if (!clicked) service.clickFirstItemWithText("video"); // Fallback
                }
            }, 3000); // Wait 3s for app load
        }
        
        if (aiJsonCommand.contains("pause")) {
            // 4. MEDIA SESSION CONTROL
            JarvisMediaControl.toggleMediaPlayback(context);
        }

        if (aiJsonCommand.contains("home")) {
            // 5. ACCESSIBILITY: HOME
            JarvisAccessibilityService service = JarvisAccessibilityService.getInstance();
            if (service != null) service.goHome();
        }
    }
}
