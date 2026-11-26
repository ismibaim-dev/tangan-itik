package io.github.ismibaimdev.gripwise.processing

import io.github.ismibaimdev.gripwise.glove.GloveFrame
import io.github.ismibaimdev.gripwise.glove.WristState
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.asin

/**
 * Per-finger raw ADC at 0 % (open hand) and 100 % (gentle fist), plus the accel X reading with the
 * wrist level. Works whichever way a sensor reads: if bending lowers the ADC value, open > fist.
 */
data class Calibration(
    val open: List<Int>,
    val fist: List<Int>,
    val axNeutral: Float,
    val savedAt: Long,
) {
    val isSet: Boolean get() = savedAt > 0

    fun percent(finger: Int, raw: Float): Float {
        val o = open[finger].toFloat()
        val span = fist[finger] - o
        if (abs(span) < MIN_SPAN) return 0f
        return ((raw - o) / span * 100f).coerceIn(0f, 100f)
    }

    /** Fingers whose open and fist readings were too close to tell apart. */
    fun weakFingers(): List<Int> = (0..3).filter { abs(fist[it] - open[it]) < MIN_SPAN }

    companion object {
        const val MIN_SPAN = 60
        /** Used until the user calibrates; matches the demo glove. */
        val DEFAULT = Calibration(listOf(2900, 3100, 3000, 2950), listOf(1500, 1300, 1250, 1400), 0f, 0L)
    }
}

/** A calibrated reading: bend per finger in %, wrist tilt in degrees (positive = up). */
data class LiveReading(
    val fingers: List<Float>,
    val tiltDeg: Float,
    val wrist: WristState,
    val frame: GloveFrame,
)

const val G = 9.81f

fun tiltDegrees(ax: Float): Float = (asin((ax / G).coerceIn(-1f, 1f).toDouble()) * 180.0 / PI).toFloat()

/** Smooths raw frames and converts them with the saved calibration. Not thread-safe; use from one collector. */
class GripwiseProcessor(private val alpha: Float = 0.5f) {
    private var smooth: FloatArray? = null
    private var smoothAx = 0f

    fun reset() { smooth = null }

    fun process(frame: GloveFrame, cal: Calibration): LiveReading {
        val raw = FloatArray(4) { frame.raw(it).toFloat() }
        val s = smooth
        if (s == null) {
            smooth = raw.copyOf()
            smoothAx = frame.ax
        } else {
            for (i in 0..3) s[i] += (raw[i] - s[i]) * alpha
            smoothAx += (frame.ax - smoothAx) * alpha
        }
        val v = smooth!!
        return LiveReading(
            fingers = List(4) { cal.percent(it, v[it]) },
            tiltDeg = tiltDegrees(smoothAx) - tiltDegrees(cal.axNeutral),
            wrist = frame.wrist,
            frame = frame,
        )
    }
}
