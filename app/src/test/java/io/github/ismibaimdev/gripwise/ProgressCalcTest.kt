package io.github.ismibaimdev.gripwise

import io.github.ismibaimdev.gripwise.data.CheckinEntity
import io.github.ismibaimdev.gripwise.data.ProgressCalc
import io.github.ismibaimdev.gripwise.data.SessionEntity
import io.github.ismibaimdev.gripwise.data.SymptomEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.LocalDate
import java.time.ZoneOffset

class ProgressCalcTest {
    private val zone = ZoneOffset.UTC
    private val today = LocalDate.of(2026, 11, 26)
    private fun at(d: LocalDate, hour: Int = 9) = d.atTime(hour, 0).toInstant(zone).toEpochMilli()
    private fun session(d: LocalDate, holds: Int, index: Float = 50f) = SessionEntity(
        exerciseId = "tendon-glides", exerciseName = "Tendon glides", startedAt = at(d), endedAt = at(d) + 60_000, durationSec = 60,
        roundsDone = 1, holdsDone = holds, holdsTarget = 50, inZonePct = 80, bestThumb = 40f, bestIndex = index, bestMiddle = 60f, bestRing = 55f,
        completed = true, demo = false,
    )

    @Test fun emptyWeek() {
        val p = ProgressCalc.week(emptyList(), emptyList(), emptyList(), today, zone)
        assertFalse(p.hasData)
        assertEquals(0, p.reps)
        assertNull(p.changePct)
        assertEquals(7, p.bars.size)
        assertEquals("Today", p.bars.last().label)
    }

    @Test fun weekTotalsAndChange() {
        val list = listOf(
            session(today, 20, index = 70f), session(today, 10), session(today.minusDays(2), 30),
            session(today.minusDays(9), 40, index = 60f),
        )
        val p = ProgressCalc.week(list, emptyList(), emptyList(), today, zone)
        assertEquals(60, p.reps)
        assertEquals(2, p.activeDays)
        assertEquals(50, p.changePct) // 60 vs 40
        assertEquals(30, p.bars.last().value)
        assertEquals(70, p.fingers[1].value)
        assertEquals(10, p.fingers[1].delta)
    }

    @Test fun tinglingCountsSymptomsAndCheckins() {
        val symptoms = listOf(SymptomEntity(sessionId = null, exerciseId = "x", stepName = "y", symptom = "Tingling", createdAt = at(today)))
        val checkins = listOf(CheckinEntity(today.minusDays(1).toString(), "tingly", 0), CheckinEntity(today.minusDays(8).toString(), "tingly", 0))
        val p = ProgressCalc.week(emptyList(), symptoms, checkins, today, zone)
        assertEquals(2, p.tingleNow)
        assertEquals(1, p.tinglePrev)
    }

    @Test fun monthHasFiveWeeks() {
        val p = ProgressCalc.month(listOf(session(today, 25)), emptyList(), emptyList(), today, zone)
        assertEquals(5, p.bars.size)
        assertEquals(25, p.bars.last().value)
        assertEquals(30, p.totalDays)
    }
}
