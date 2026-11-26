package io.github.ismibaimdev.gripwise.data

import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters
import java.util.Locale
import kotlin.math.roundToInt

data class Bar(val label: String, val value: Int, val current: Boolean)
data class FingerBest(val name: String, val value: Int, val delta: Int?)

data class ProgressData(
    val reps: Int,
    val repsLabel: String,
    val activeDays: Int,
    val totalDays: Int,
    val changePct: Int?,
    val changeLabel: String,
    val chartTitle: String,
    val rangeText: String,
    val goal: Int,
    val goalLabel: String,
    val bars: List<Bar>,
    val unit: String,
    val fingers: List<FingerBest>,
    val tingleNow: Int,
    val tinglePrev: Int,
    val hasData: Boolean,
)

fun Long.toLocalDate(zone: ZoneId = ZoneId.systemDefault()): LocalDate = Instant.ofEpochMilli(this).atZone(zone).toLocalDate()
fun LocalDate.startMillis(zone: ZoneId = ZoneId.systemDefault()): Long = atStartOfDay(zone).toInstant().toEpochMilli()
fun LocalDate.key(): String = toString()

/** Builds the Week and Month views of the Progress screen from stored sessions. Pure, so it is unit-tested. */
object ProgressCalc {
    private val dayFmt = DateTimeFormatter.ofPattern("d MMM", Locale.UK)
    private val dowFmt = DateTimeFormatter.ofPattern("EEE", Locale.UK)

    fun week(sessions: List<SessionEntity>, symptoms: List<SymptomEntity>, checkins: List<CheckinEntity>, today: LocalDate, zone: ZoneId = ZoneId.systemDefault()): ProgressData {
        val days = (6 downTo 0).map { today.minusDays(it.toLong()) }
        val byDay = sessions.groupBy { it.startedAt.toLocalDate(zone) }
        val bars = days.map { d -> Bar(if (d == today) "Today" else d.format(dowFmt), byDay[d].orEmpty().sumOf { it.holdsDone }, d == today) }
        val from = days.first(); val prevFrom = from.minusDays(7)
        return build(
            sessions, symptoms, checkins, zone,
            from = from, to = today, prevFrom = prevFrom,
            bars = bars, goal = 50, goalLabel = "Goal 50 a day", unit = "week",
            chartTitle = "Daily reps", rangeText = "${from.format(dayFmt)} – ${today.format(dayFmt)}",
            repsLabel = "Reps this week", changeLabel = "vs last week",
        )
    }

    fun month(sessions: List<SessionEntity>, symptoms: List<SymptomEntity>, checkins: List<CheckinEntity>, today: LocalDate, zone: ZoneId = ZoneId.systemDefault()): ProgressData {
        val thisMonday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        val weeks = (4 downTo 0).map { thisMonday.minusWeeks(it.toLong()) }
        val bars = weeks.map { w ->
            val total = sessions.filter { val d = it.startedAt.toLocalDate(zone); !d.isBefore(w) && d.isBefore(w.plusWeeks(1)) }.sumOf { it.holdsDone }
            Bar(if (w == thisMonday) "This wk" else w.format(dayFmt), total, w == thisMonday)
        }
        val from = today.minusDays(29); val prevFrom = from.minusDays(30)
        return build(
            sessions, symptoms, checkins, zone,
            from = from, to = today, prevFrom = prevFrom,
            bars = bars, goal = 250, goalLabel = "Goal 250 a week", unit = "month",
            chartTitle = "Weekly reps", rangeText = "${weeks.first().format(dayFmt)} – ${today.format(dayFmt)}, week starting",
            repsLabel = "Reps this month", changeLabel = "vs last month",
        )
    }

    private fun build(
        sessions: List<SessionEntity>, symptoms: List<SymptomEntity>, checkins: List<CheckinEntity>, zone: ZoneId,
        from: LocalDate, to: LocalDate, prevFrom: LocalDate,
        bars: List<Bar>, goal: Int, goalLabel: String, unit: String, chartTitle: String, rangeText: String, repsLabel: String, changeLabel: String,
    ): ProgressData {
        fun inRange(d: LocalDate, a: LocalDate, b: LocalDate) = !d.isBefore(a) && !d.isAfter(b)
        val now = sessions.filter { inRange(it.startedAt.toLocalDate(zone), from, to) }
        val prev = sessions.filter { inRange(it.startedAt.toLocalDate(zone), prevFrom, from.minusDays(1)) }
        val reps = now.sumOf { it.holdsDone }
        val prevReps = prev.sumOf { it.holdsDone }
        val change = if (prevReps > 0) ((reps - prevReps) * 100f / prevReps).roundToInt() else null
        val totalDays = (to.toEpochDay() - from.toEpochDay() + 1).toInt()
        val active = now.map { it.startedAt.toLocalDate(zone) }.toSet().size
        fun best(list: List<SessionEntity>, sel: (SessionEntity) -> Float) = list.maxOfOrNull(sel)?.roundToInt()
        val names = listOf("Thumb", "Index", "Middle", "Ring")
        val sel = listOf<(SessionEntity) -> Float>({ it.bestThumb }, { it.bestIndex }, { it.bestMiddle }, { it.bestRing })
        val fingers = names.indices.map { i ->
            val b = best(now, sel[i]) ?: 0
            val p = best(prev, sel[i])
            FingerBest(names[i], b, if (p != null && now.isNotEmpty()) b - p else null)
        }
        fun tingles(a: LocalDate, b: LocalDate): Int =
            symptoms.count { it.symptom.equals("Tingling", true) && inRange(it.createdAt.toLocalDate(zone), a, b) } +
                checkins.count { it.feeling == "tingly" && runCatching { inRange(LocalDate.parse(it.date), a, b) }.getOrDefault(false) }
        return ProgressData(
            reps = reps, repsLabel = repsLabel, activeDays = active, totalDays = totalDays,
            changePct = change, changeLabel = changeLabel,
            chartTitle = chartTitle, rangeText = rangeText, goal = goal, goalLabel = goalLabel, bars = bars, unit = unit,
            fingers = fingers,
            tingleNow = tingles(from, to), tinglePrev = tingles(prevFrom, from.minusDays(1)),
            hasData = now.isNotEmpty(),
        )
    }
}
