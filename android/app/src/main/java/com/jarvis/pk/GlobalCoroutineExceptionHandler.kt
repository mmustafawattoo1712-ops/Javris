package com.jarvis.pk

import android.util.Log
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlin.coroutines.AbstractCoroutineContextElement
import kotlin.coroutines.CoroutineContext

/**
 * Global handler for uncaught coroutine exceptions.
 * This is automatically loaded by Kotlin Coroutines via META-INF/services.
 */
class GlobalCoroutineExceptionHandler : AbstractCoroutineContextElement(CoroutineExceptionHandler), CoroutineExceptionHandler {
    override fun handleException(context: CoroutineContext, exception: Throwable) {
        Log.e("JARVIS_CORE", "Global Background Error: ${exception.message}", exception)
        // Here you could also send a broadcast to the UI to show a system alert
    }
}