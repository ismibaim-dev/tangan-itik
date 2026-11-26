package io.github.ismibaimdev.gripwise

import io.github.ismibaimdev.gripwise.exercises.ExerciseCatalog
import io.github.ismibaimdev.gripwise.glove.GloveFrame
import io.github.ismibaimdev.gripwise.glove.WristState
import io.github.ismibaimdev.gripwise.processing.LiveReading
import io.github.ismibaimdev.gripwise.processing.SessionEngine
import io.github.ismibaimdev.gripwise.processing.evaluate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SessionEngineTest {
    private val frame = GloveFrame(0, 0, 0, 0, 0f, 0f, WristState.REST, 0L)
    private fun reading(bend: Float, tilt: Float = 0f) = LiveReading(List(4) { bend }, tilt, WristState.REST, frame)
    private val glides = ExerciseCatalog.byId("tendon-glides")

    /** A reading in the middle of a step's target zone. */
    private fun ideal(engine: SessionEngine): LiveReading {
        val s = engine.currentStep
        val fingers = MutableList(4) { 12f }
        s.targets.forEach { t -> t.fingers.forEach { fingers[it] = (t.lo + t.hi) / 2 } }
        val tilt = if (s.checksWrist) (s.wristLo!! + s.wristHi!!) / 2 else 0f
        return LiveReading(fingers, tilt, WristState.REST, frame)
    }

    @Test fun holdCountsDownAndAdvancesByItself() {
        val e = SessionEngine(glides)
        repeat(14) { assertNull(e.tick(200, ideal(e), blocked = false)) }
        assertEquals(0, e.step)
        assertEquals(SessionEngine.Event.StepDone, e.tick(200, ideal(e), blocked = false))
        assertEquals(1, e.step)
        assertEquals(1, e.holdsDone)
        assertEquals(glides.holdSec * 1000L, e.holdLeftMs)
    }

    @Test fun shortSlipIsForgivenLongSlipRestarts() {
        val e = SessionEngine(glides, graceMs = 800)
        repeat(5) { e.tick(200, ideal(e), false) }
        val left = e.holdLeftMs
        repeat(4) { e.tick(200, reading(95f), false) } // 800 ms out: still inside grace
        assertEquals(left, e.holdLeftMs)
        e.tick(200, reading(95f), false)
        assertEquals(e.holdMs, e.holdLeftMs)
    }

    @Test fun blockedOrPausedDoesNothing() {
        val e = SessionEngine(glides)
        e.tick(1000, ideal(e), blocked = true)
        assertEquals(e.holdMs, e.holdLeftMs)
        e.paused = true
        e.tick(1000, ideal(e), blocked = false)
        assertEquals(e.holdMs, e.holdLeftMs)
        assertEquals(0, e.inZonePercent())
    }

    @Test fun fullRoundThenNextRound() {
        val e = SessionEngine(glides)
        var last: SessionEngine.Event? = null
        var guard = 0
        while (!e.roundDone && guard++ < 1000) last = e.tick(200, ideal(e), false) ?: last
        assertEquals(SessionEngine.Event.RoundDone, last)
        assertEquals(glides.steps.size, e.holdsDone)
        assertEquals(100, e.inZonePercent())
        assertTrue(e.moreRounds)
        e.nextRound()
        assertEquals(2, e.round)
        assertEquals(0, e.step)
        assertFalse(e.roundDone)
    }

    @Test fun skipAndBack() {
        val e = SessionEngine(glides)
        e.skip(); e.skip()
        assertEquals(2, e.step)
        assertEquals(0, e.holdsDone)
        e.back()
        assertEquals(1, e.step)
    }

    @Test fun hintsPointTheRightWay() {
        val straight = glides.steps[0]
        assertEquals("Thumb: straighten a little more.", evaluate(straight, reading(40f)).message)
        val fist = glides.steps[2]
        assertEquals("Thumb: bend a little more.", evaluate(fist, reading(20f)).message)
        assertTrue(evaluate(fist, reading(90f)).allOk)
        assertEquals("Waiting for glove data…", evaluate(fist, null).message)
    }

    @Test fun everyExerciseCanBeCompletedHandsFree() {
        ExerciseCatalog.all.forEach { ex ->
            val e = SessionEngine(ex)
            var guard = 0
            while (!e.roundDone && guard++ < 5000) e.tick(200, ideal(e), false)
            assertTrue("${ex.id} did not finish", e.roundDone)
        }
    }
}
