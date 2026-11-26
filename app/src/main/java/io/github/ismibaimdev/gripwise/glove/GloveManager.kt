package io.github.ismibaimdev.gripwise.glove

import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn

/** Owns the real and demo glove and exposes whichever is active as one source. */
@OptIn(ExperimentalCoroutinesApi::class)
class GloveManager(context: Context, scope: CoroutineScope) {
    private val bluetooth = BluetoothGlove(context.applicationContext, scope)
    private val demo = DemoGlove(scope)
    private val _demoMode = MutableStateFlow(false)
    val demoMode: StateFlow<Boolean> = _demoMode.asStateFlow()

    private val active: GloveSource get() = if (_demoMode.value) demo else bluetooth

    val status: StateFlow<GloveStatus> = _demoMode
        .flatMapLatest { if (it) demo.status else bluetooth.status }
        .stateIn(scope, SharingStarted.Eagerly, GloveStatus.Idle)

    val frames: Flow<GloveFrame> = _demoMode.flatMapLatest { if (it) demo.frames else bluetooth.frames }

    fun setDemoMode(on: Boolean) {
        if (_demoMode.value == on) return
        val wasRunning = status.value !is GloveStatus.Idle
        active.stop()
        _demoMode.value = on
        if (wasRunning) active.start()
    }

    fun connect() = active.start()

    fun reconnect() {
        active.stop()
        active.start()
    }

    fun disconnect() = active.stop()

    /** Tells the demo glove which pose to move toward. Ignored for the real glove. */
    fun setDemoPose(pose: DemoGlove.Pose) = demo.setPose(pose)
}
