
package com.jarvis.pk;

import android.content.Context;
import android.media.AudioManager;
import android.view.KeyEvent;

public class JarvisMediaControl {

    // ACTION: MEDIA SESSION PAUSE/PLAY
    public static void toggleMediaPlayback(Context context) {
        AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        
        // Simulate Headset Hook button press (Works universally for most music/video apps)
        KeyEvent downEvent = new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE);
        KeyEvent upEvent = new KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE);

        audioManager.dispatchMediaKeyEvent(downEvent);
        audioManager.dispatchMediaKeyEvent(upEvent);
    }
}
