package io.github.ismibaimdev.gripwise.processing

import io.github.ismibaimdev.gripwise.exercises.Exercise
import io.github.ismibaimdev.gripwise.exercises.Step
import kotlin.math.abs
import kotlin.math.roundToInt

data class BarEval(val label: String, val value: Float, val lo: Float, val hi: Float, val ok: Boolean, val hint: String?)
data class WristEval(val tilt: Float, val lo: Float, val hi: Float, val ok: Boolean, val label: String)
data class StepEval(
    val bars: List<BarEval>,
    val wrist: WristEval?,
    /** For finger exercises: whether the wrist is roughly level (only shown, never blocks). */
    val wristLevel: Boolean?,
    val message: String?,
    val allOk: Boolean,
    val hasData: Boolean,
)

/** Checks the live reading against one step's targets and builds the corrective hint. */
fun evaluate(step: Step, r: LiveReading?): StepEval {
    var message: String? = null
    var wrist: WristEval? = null
    if (step.checksWrist) {
        val lo = step.wristLo!!; val hi = step.wristHi!!
        val t = r?.tiltDeg ?: 0f
        val ok = r != null && t in lo..hi
        if (r != null && !ok) message = if (t < lo) "Hand: tilt it a little higher." else "Hand: tilt it a little lower."
        val base = when {
            abs(t) <= 3f -> "Level"
            t > 0 -> "${t.roundToInt()}° up"
            else -> "${(-t).roundToInt()}° down"
        }
        wrist = WristEval(t, lo, hi, ok, if (ok || r == null) base else base + if (t < lo) " · go higher" else " · go lower")
    }
    val bars = step.targets.map { target ->
        val v = if (r == null) 0f else target.fingers.map { r.fingers[it] }.average().toFloat()
        val ok = r != null && v >= target.lo && v <= target.hi
        val low = target.hi <= 30f
        val hint = when {
            r == null || ok -> null
            v < target.lo -> "bend more"
            low -> "straighten"
            else -> "ease off"
        }
        if (r != null && !ok && message == null) {
            val who = when (target.label) { "All fingers" -> "Fingers"; "Thumb" -> "Thumb"; else -> target.label + " finger" }
            message = "$who: " + when {
                v < target.lo -> "bend a little more."
                low -> "straighten a little more."
                else -> "ease off a little."
            }
        }
        BarEval(target.label, v, target.lo, target.hi, ok, hint)
    }
    val level = if (step.levelChip && r != null) abs(r.tiltDeg) <= 25f else null
    if (r == null) message = "Waiting for glove data…"
    val allOk = r != null && bars.all { it.ok } && (wrist?.ok ?: true)
    return StepEval(bars, wrist, level, message, allOk, r != null)
}

/**
 * The hands-free session state machine. Call [tick] regularly with the latest reading.
 * When every target is in zone the hold counts down; leaving the zone for more than a short
 * grace period restarts it. A finished hold moves to the next step on its own.
 */
class SessionEngine(val exercise: Exercise, startRound: Int = 1, private val graceMs: Long = 800) {
    sealed interface Event {
        data object StepDone : Event
        data object RoundDone : Event
    }

    val holdMs: Long = exercise.holdSec * 1000L
    val stepCount: Int = exercise.steps.size

    var step = 0; private set
    var round = startRound; private set
    var holdLeftMs = holdMs; private set
    var paused = false
    var roundDone = false; private set
    var holdsDone = 0; private set
    val startedAt: Long = System.currentTimeMillis()

    private var outMs = 0L
    private val inZoneMs = LongArray(stepCount)
    private val totalMs = LongArray(stepCount)
    val best = FloatArray(4)

    val currentStep: Step get() = exercise.steps[step]
    val moreRounds: Boolean get() = round < exercise.rounds
    val holdsTarget: Int get() = exercise.rounds * stepCount

    fun tick(dtMs: Long, reading: LiveReading?, blocked: Boolean): Event? {
        if (paused || blocked || roundDone) return null
        reading?.fingers?.forEachIndexed { i, v -> if (v > best[i]) best[i] = v }
        val ev = evaluate(currentStep, reading)
        totalMs[step] += dtMs
        if (!ev.allOk) {
            outMs += dtMs
            if (outMs > graceMs) holdLeftMs = holdMs
            return null
        }
        outMs = 0
        inZoneMs[step] += dtMs
        holdLeftMs -= dtMs
        if (holdLeftMs > 0) return null
        holdsDone++
        return advance()
    }

    /** Moves on without counting a hold (the Skip button). */
    fun skip(): Event = advance()

    fun back() {
        if (step > 0) { step--; resetHold() }
    }

    fun nextRound() {
        if (!moreRounds) return
        round++
        step = 0
        roundDone = false
        resetHold()
    }

    private fun advance(): Event {
        resetHold()
        return if (step < stepCount - 1) {
            step++
            Event.StepDone
        } else {
            roundDone = true
            Event.RoundDone
        }
    }

    private fun resetHold() { holdLeftMs = holdMs; outMs = 0 }

    fun stepPercent(i: Int): Int = if (totalMs[i] == 0L) 0 else (inZoneMs[i] * 100 / totalMs[i]).toInt()

    fun inZonePercent(): Int {
        val total = totalMs.sum()
        return if (total == 0L) 0 else (inZoneMs.sum() * 100 / total).toInt()
    }

    fun elapsedSec(now: Long = System.currentTimeMillis()): Int = ((now - startedAt) / 1000).toInt()
}
