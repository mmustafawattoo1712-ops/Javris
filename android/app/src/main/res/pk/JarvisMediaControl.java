
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
}