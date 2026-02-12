
package com.jarvis.pk;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.util.Log;
import java.util.List;

public class JarvisAccessibilityService extends AccessibilityService {
    
    private static JarvisAccessibilityService instance;

    @Override
    public void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // AUTO-CLICK WHATSAPP SEND BUTTON
        if (event.getPackageName() != null && event.getPackageName().toString().contains("whatsapp")) {
            AccessibilityNodeInfo root = getRootInActiveWindow();
            if (root != null) {
                // Look for the "Send" button description
                List<AccessibilityNodeInfo> sendNodes = root.findAccessibilityNodeInfosByContentDescription("Send");
                for (AccessibilityNodeInfo node : sendNodes) {
                    if (node.isClickable()) {
                        node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                    }
                }
            }
        }
    }

    @Override
    public void onInterrupt() {
        instance = null;
    }

    public static JarvisAccessibilityService getInstance() {
        return instance;
    }

    public void goBack() { performGlobalAction(GLOBAL_ACTION_BACK); }
    public void goHome() { performGlobalAction(GLOBAL_ACTION_HOME); }
}
