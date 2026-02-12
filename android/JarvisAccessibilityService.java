
package com.jarvis.pk;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.os.Bundle;
import android.util.Log;
import java.util.List;

public class JarvisAccessibilityService extends AccessibilityService {
    
    private static JarvisAccessibilityService instance;

    @Override
    public void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
        Log.d("JARVIS", "ACCESSIBILITY SERVICE CONNECTED");
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // Monitor window content changes if needed
    }

    @Override
    public void onInterrupt() {
        instance = null;
    }

    public static JarvisAccessibilityService getInstance() {
        return instance;
    }

    // ACTION: TAP FIRST RESULT
    // Useful for "Search YouTube and play first video"
    public boolean clickFirstItemWithText(String text) {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return false;

        // Find items containing text (e.g., video titles)
        List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByText(text);
        
        if (!nodes.isEmpty()) {
            AccessibilityNodeInfo node = nodes.get(0);
            // Traverse up to find clickable parent
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

    // ACTION: GLOBAL NAVIGATION
    public void goBack() {
        performGlobalAction(GLOBAL_ACTION_BACK);
    }

    public void goHome() {
        performGlobalAction(GLOBAL_ACTION_HOME);
    }
}
