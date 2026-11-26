package io.github.ismibaimdev.gripwise

import io.github.ismibaimdev.gripwise.glove.GloveFrame
import io.github.ismibaimdev.gripwise.glove.WristState
import io.github.ismibaimdev.gripwise.processing.Calibration
import io.github.ismibaimdev.gripwise.processing.GripwiseProcessor
import io.github.ismibaimdev.gripwise.processing.tiltDegrees
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ProcessingTest {
    private val cal = Calibration(open = listOf(2900, 1000, 3000, 2950), fist = listOf(1500, 2400, 1250, 2950), axNeutral = 0f, savedAt = 1L)

    @Test fun percentWorksInBothDirections() {
        assertEquals(0f, cal.percent(0, 2900f), 0.01f)
        assertEquals(100f, cal.percent(0, 1500f), 0.01f)
        assertEquals(50f, cal.percent(0, 2200f), 0.01f)
        // Index sensor reads higher when bent.
        assertEquals(50f, cal.percent(1, 1700f), 0.01f)
    }

    @Test fun percentIsClamped() {
        assertEquals(0f, cal.percent(0, 3500f), 0f)
        assertEquals(100f, cal.percent(0, 900f), 0f)
    }

    @Test fun flatSensorIsFlagged() {
        assertEquals(listOf(3), cal.weakFingers())
        assertEquals(0f, cal.percent(3, 1000f), 0f)
    }

    @Test fun tiltFromAcceleration() {
        assertEquals(0f, tiltDegrees(0f), 0.01f)
        assertEquals(30f, tiltDegrees(9.81f / 2), 0.1f)
        assertEquals(90f, tiltDegrees(12f), 0.01f)
        assertEquals(-30f, tiltDegrees(-9.81f / 2), 0.1f)
    }

    @Test fun processorSmoothsAndSubtractsNeutral() {
        val p = GripwiseProcessor(alpha = 0.5f)
        val c = cal.copy(axNeutral = 9.81f / 2)
        fun frame(t: Int, ax: Float) = GloveFrame(t, 1000, 3000, 2950, ax, 0f, WristState.REST, 0L)
        val first = p.process(frame(2900, 9.81f / 2), c)
        assertEquals(0f, first.fingers[0], 0.01f)
        assertEquals(0f, first.tiltDeg, 0.1f)
        val second = p.process(frame(1500, 9.81f / 2), c)
        assertEquals(50f, second.fingers[0], 0.01f) // halfway thanks to smoothing
        p.reset()
        val third = p.process(frame(1500, 0f), c)
        assertEquals(100f, third.fingers[0], 0.01f)
        assertTrue(third.tiltDeg < -29f)
    }
}
