package io.github.ismibaimdev.gripwise.glove

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.sin
import kotlin.random.Random

/**
 * A simulated glove for demos and for trying the app without hardware.
 * It produces the same raw frames as the firmware (every 400 ms) and moves toward whatever pose
 * the current screen asks for, with a little lag and noise. Sometimes one finger lags behind for
 * a couple of seconds so the corrective hints can be seen.
 */
class DemoGlove(private val scope: CoroutineScope) : GloveSource {

    /** Target bend per finger (0–100 %) and wrist tilt in degrees (positive = up). */
    data class Pose(val fingers: List<Float> = listOf(15f, 15f, 15f, 15f), val tiltDeg: Float = 0f)

    companion object {
        /** Raw ADC at 0 % and 100 % bend for the demo hand (bending lowers the reading). */
        val OPEN = intArrayOf(2900, 3100, 3000, 2950)
        val FIST = intArrayOf(1500, 1300, 1250, 1400)
    }

    private val _status = MutableStateFlow<GloveStatus>(GloveStatus.Idle)
    override val status = _status.asStateFlow()
    private val _frames = MutableSharedFlow<GloveFrame>(extraBufferCapacity = 16, onBufferOverflow = BufferOverflow.DROP_OLDEST)
    override val frames = _frames.asSharedFlow()

    @Volatile private var pose = Pose()
    @Volatile private var poseSetAt = 0L
    @Volatile private var laggard = -1
    private val current = floatArrayOf(15f, 15f, 15f, 15f)
    private var tilt = 0f
    private var job: Job? = null
    private val rnd = Random(7)

    /** Moves toward [p]. With [lag], one finger sometimes trails behind for a moment (off for calibration). */
    fun setPose(p: Pose, lag: Boolean = true) {
        if (p == pose) return
        pose = p
        poseSetAt = System.currentTimeMillis()
        laggard = if (lag && rnd.nextFloat() < 0.45f) rnd.nextInt(4) else -1
    }

    override fun start() {
        if (job?.isActive == true) return
        job = scope.launch {
            _status.value = GloveStatus.Connecting("Demo glove")
            delay(700)
            _status.value = GloveStatus.Connected("Demo glove", demo = true)
            while (isActive) {
                emitFrame()
                delay(400)
            }
        }
    }

    override fun stop() {
        job?.cancel()
        job = null
        _status.value = GloveStatus.Idle
    }

    private fun emitFrame() {
        val p = pose
        val lagging = System.currentTimeMillis() - poseSetAt < 2_600
        for (i in 0..3) {
            var target = p.fingers.getOrElse(i) { 15f }
            if (lagging && i == laggard) target = (target * 0.62f).coerceAtLeast(target - 30f)
            current[i] += (target - current[i]) * 0.55f + (rnd.nextFloat() - 0.5f) * 3f
            current[i] = current[i].coerceIn(0f, 100f)
        }
        tilt += (p.tiltDeg - tilt) * 0.5f + (rnd.nextFloat() - 0.5f) * 2f
        val raw = IntArray(4) { i -> (OPEN[i] + (FIST[i] - OPEN[i]) * current[i] / 100f + (rnd.nextFloat() - 0.5f) * 16f).toInt().coerceIn(0, 4095) }
        val ax = (9.81 * sin(tilt * PI / 180.0)).toFloat()
        val ay = (rnd.nextFloat() - 0.5f) * 0.4f
        val wrist = when {
            ax > 4.5f -> WristState.EXTENSION_UP
            ax < -4.5f -> WristState.FLEXION_DOWN
            else -> WristState.REST
        }
        _frames.tryEmit(GloveFrame(raw[0], raw[1], raw[2], raw[3], (ax * 10).toInt() / 10f, (ay * 10).toInt() / 10f, wrist, System.currentTimeMillis()))
    }
}
