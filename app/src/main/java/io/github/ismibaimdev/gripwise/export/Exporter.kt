package io.github.ismibaimdev.gripwise.export

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import android.net.Uri
import android.os.Build
import androidx.core.content.FileProvider
import io.github.ismibaimdev.gripwise.data.CheckinEntity
import io.github.ismibaimdev.gripwise.data.GripwiseDao
import io.github.ismibaimdev.gripwise.data.SessionEntity
import io.github.ismibaimdev.gripwise.data.SymptomEntity
import io.github.ismibaimdev.gripwise.data.key
import io.github.ismibaimdev.gripwise.data.startMillis
import io.github.ismibaimdev.gripwise.data.toLocalDate
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.withContext
import java.io.File
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

enum class ExportRange(val label: String, val days: Long?) { Week("Last 7 days", 7), Month("Last 30 days", 30), All("All time", null) }
enum class CsvSet(val title: String, val file: String) { Sessions("Sessions", "sessions"), Daily("Daily totals", "daily_totals"), Checkins("Check-ins and symptoms", "checkins"), Raw("Raw sensor data", "raw_sensor") }
enum class PdfSection(val title: String, val desc: String) {
    Overview("Progress overview", "Reps, active days and accuracy"),
    Log("Exercise log", "Every session with time and accuracy"),
    Bend("Finger bend range", "Best bend per finger"),
    Symptoms("Symptom check-ins", "Tingling, numbness and pain reports"),
}

data class ExportCounts(val sessions: Int, val days: Int, val checkins: Int, val frames: Int, val dates: String)

/** Builds CSV (single file or a zip of several) and the physio PDF report from the database. */
class Exporter(private val context: Context, private val dao: GripwiseDao) {
    private val dateFmt = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.UK)
    private val fileDate = DateTimeFormatter.ofPattern("yyyyMMdd", Locale.US)

    private fun from(range: ExportRange): Long = range.days?.let { LocalDate.now().minusDays(it - 1).startMillis() } ?: 0L

    suspend fun counts(range: ExportRange): ExportCounts = withContext(Dispatchers.IO) {
        val f = from(range)
        val sessions = dao.sessionsFrom(f)
        val checkins = dao.checkinsFrom(if (f == 0L) "0000" else f.toLocalDate().key()).size + dao.symptomsFrom(f).size
        val first = sessions.firstOrNull()?.startedAt?.toLocalDate() ?: LocalDate.now()
        val start = if (range.days != null) LocalDate.now().minusDays(range.days - 1) else first
        ExportCounts(sessions.size, sessions.map { it.startedAt.toLocalDate() }.toSet().size, checkins, dao.frameCountFrom(f), "${start.format(dateFmt)} – ${LocalDate.now().format(dateFmt)}")
    }

    private fun exportDir(): File = File(context.cacheDir, "exports").apply { mkdirs(); listFiles()?.forEach { it.delete() } }

    suspend fun buildCsv(range: ExportRange, sets: Set<CsvSet>): File = withContext(Dispatchers.IO) {
        val f = from(range)
        val sessions = dao.sessionsFrom(f)
        val tables = sets.sortedBy { it.ordinal }.associateWith { set ->
            when (set) {
                CsvSet.Sessions -> sessionsCsv(sessions)
                CsvSet.Daily -> dailyCsv(sessions)
                CsvSet.Checkins -> checkinsCsv(dao.checkinsFrom(if (f == 0L) "0000" else f.toLocalDate().key()), dao.symptomsFrom(f))
                CsvSet.Raw -> buildString {
                    append("session_id,time_ms,thumb,index,middle,ring,accel_x,accel_y,wrist_state\n")
                    dao.framesFrom(f).forEach { append("${it.sessionId},${it.timeMs},${it.thumb},${it.index},${it.middle},${it.ring},${it.ax},${it.ay},${it.wrist}\n") }
                }
            }
        }
        val stamp = LocalDate.now().format(fileDate)
        val dir = exportDir()
        if (tables.size == 1) {
            val (set, text) = tables.entries.first()
            File(dir, "gripwise-${set.file}-$stamp.csv").apply { writeText(text) }
        } else {
            File(dir, "gripwise-data-$stamp.zip").apply {
                ZipOutputStream(outputStream()).use { zip ->
                    tables.forEach { (set, text) ->
                        zip.putNextEntry(ZipEntry("gripwise-${set.file}.csv"))
                        zip.write(text.toByteArray())
                        zip.closeEntry()
                    }
                }
            }
        }
    }

    private fun esc(s: String) = if (s.contains(',') || s.contains('"')) "\"" + s.replace("\"", "\"\"") + "\"" else s

    private fun sessionsCsv(list: List<SessionEntity>) = buildString {
        append("session_id,date,time,exercise,duration_s,rounds,holds_done,holds_target,in_zone_pct,best_thumb,best_index,best_middle,best_ring,completed,demo\n")
        list.forEach {
            val dt = java.time.Instant.ofEpochMilli(it.startedAt).atZone(java.time.ZoneId.systemDefault())
            append("${it.id},${dt.toLocalDate()},${dt.toLocalTime().withNano(0)},${esc(it.exerciseName)},${it.durationSec},${it.roundsDone},${it.holdsDone},${it.holdsTarget},${it.inZonePct},")
            append("${it.bestThumb.toInt()},${it.bestIndex.toInt()},${it.bestMiddle.toInt()},${it.bestRing.toInt()},${it.completed},${it.demo}\n")
        }
    }

    private fun dailyCsv(list: List<SessionEntity>) = buildString {
        append("date,total_reps,sessions,active_min\n")
        list.groupBy { it.startedAt.toLocalDate() }.toSortedMap().forEach { (d, s) ->
            append("$d,${s.sumOf { it.holdsDone }},${s.size},${(s.sumOf { it.durationSec } + 59) / 60}\n")
        }
    }

    private fun checkinsCsv(checkins: List<CheckinEntity>, symptoms: List<SymptomEntity>) = buildString {
        append("date,time,type,value,exercise,step\n")
        checkins.forEach { append("${it.date},,checkin,${it.feeling},,\n") }
        symptoms.forEach {
            val dt = java.time.Instant.ofEpochMilli(it.createdAt).atZone(java.time.ZoneId.systemDefault())
            append("${dt.toLocalDate()},${dt.toLocalTime().withNano(0)},symptom,${esc(it.symptom)},${it.exerciseId},${esc(it.stepName)}\n")
        }
    }

    suspend fun buildPdf(range: ExportRange, sections: Set<PdfSection>, name: String): File = withContext(Dispatchers.IO) {
        val f = from(range)
        val sessions = dao.sessionsFrom(f)
        val symptoms = dao.symptomsFrom(f)
        val checkins = dao.checkinsFrom(if (f == 0L) "0000" else f.toLocalDate().key())
        val counts = counts(range)
        val doc = PdfDocument()
        val pdf = PdfWriter(doc)
        pdf.title("Gripwise progress report")
        pdf.text("${name.ifBlank { "Gripwise user" }} · ${counts.dates}", 11f, grey = true)
        pdf.text("Generated ${LocalDate.now().format(dateFmt)} from the Gripwise smart glove app. Exercise data only; not a diagnosis.", 9f, grey = true)
        pdf.gap(10f)
        if (PdfSection.Overview in sections) {
            pdf.heading("Progress overview")
            val reps = sessions.sumOf { it.holdsDone }
            val avg = if (sessions.isEmpty()) 0 else sessions.sumOf { it.inZonePct } / sessions.size
            pdf.row(listOf("Sessions", "${sessions.size}"), bold = false)
            pdf.row(listOf("Holds completed", "$reps"))
            pdf.row(listOf("Active days", "${counts.days}"))
            pdf.row(listOf("Average time in target zone", "$avg%"))
            pdf.row(listOf("Sessions ended early", "${sessions.count { !it.completed }}"))
            pdf.gap(8f)
        }
        if (PdfSection.Bend in sections) {
            pdf.heading("Best finger bend")
            listOf("Thumb" to sessions.maxOfOrNull { it.bestThumb }, "Index" to sessions.maxOfOrNull { it.bestIndex },
                "Middle" to sessions.maxOfOrNull { it.bestMiddle }, "Ring" to sessions.maxOfOrNull { it.bestRing })
                .forEach { (n, v) -> pdf.row(listOf(n, v?.let { "${it.toInt()}%" } ?: "–")) }
            pdf.gap(8f)
        }
        if (PdfSection.Symptoms in sections) {
            pdf.heading("Symptoms and check-ins")
            if (symptoms.isEmpty() && checkins.isEmpty()) pdf.text("None logged in this period.", 10f, grey = true)
            symptoms.forEach { pdf.row(listOf(it.createdAt.toLocalDate().format(dateFmt), "${it.symptom} during ${it.stepName.lowercase()}")) }
            val counted = checkins.groupingBy { it.feeling }.eachCount()
            if (counted.isNotEmpty()) pdf.row(listOf("Daily check-ins", counted.entries.joinToString(", ") { "${it.key} ${it.value}" }))
            pdf.gap(8f)
        }
        if (PdfSection.Log in sections) {
            pdf.heading("Exercise log")
            pdf.row(listOf("Date", "Exercise", "Holds", "In zone", "Time"), bold = true, widths = listOf(90f, 190f, 70f, 70f, 70f))
            sessions.forEach {
                pdf.row(
                    listOf(it.startedAt.toLocalDate().format(dateFmt), it.exerciseName + if (it.completed) "" else " (ended early)", "${it.holdsDone}/${it.holdsTarget}", "${it.inZonePct}%", "${it.durationSec / 60}:${"%02d".format(it.durationSec % 60)}"),
                    widths = listOf(90f, 190f, 70f, 70f, 70f),
                )
            }
            if (sessions.isEmpty()) pdf.text("No sessions in this period.", 10f, grey = true)
        }
        pdf.finish()
        val file = File(exportDir(), "gripwise-report-${LocalDate.now().format(fileDate)}.pdf")
        file.outputStream().use { doc.writeTo(it) }
        doc.close()
        file
    }

    fun uriFor(file: File): Uri = FileProvider.getUriForFile(context, context.packageName + ".files", file)

    fun mimeFor(file: File) = when (file.extension) { "pdf" -> "application/pdf"; "zip" -> "application/zip"; else -> "text/csv" }

    /** A chooser that reports which app the user picked, so the screen can confirm the share. */
    fun shareChooser(file: File): Intent {
        val send = Intent(Intent.ACTION_SEND).apply {
            type = mimeFor(file)
            putExtra(Intent.EXTRA_STREAM, uriFor(file))
            putExtra(Intent.EXTRA_SUBJECT, "Gripwise ${if (file.extension == "pdf") "progress report" else "data export"}")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        val callback = PendingIntent.getBroadcast(
            context, 7, Intent(context, ShareTargetReceiver::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0),
        )
        return Intent.createChooser(send, "Share export", callback.intentSender)
    }

    suspend fun copyTo(file: File, target: Uri) = withContext(Dispatchers.IO) {
        context.contentResolver.openOutputStream(target)?.use { out -> file.inputStream().use { it.copyTo(out) } }
    }
}

/** Simple top-to-bottom PDF layout on A4 pages. */
private class PdfWriter(private val doc: PdfDocument) {
    private val w = 595; private val h = 842; private val margin = 48f
    private var pageNo = 0
    private var page: PdfDocument.Page = newPage()
    private var y = margin
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)

    private fun newPage(): PdfDocument.Page { pageNo++; return doc.startPage(PdfDocument.PageInfo.Builder(w, h, pageNo).create()) }
    private fun ensure(space: Float) {
        if (y + space <= h - margin) return
        doc.finishPage(page); page = newPage(); y = margin
    }

    fun title(t: String) { paint(22f, true, 0xFF172033.toInt()); ensure(30f); y += 22f; page.canvas.drawText(t, margin, y, paint); y += 10f }
    fun heading(t: String) { paint(14f, true, 0xFF1D4ED8.toInt()); ensure(28f); y += 20f; page.canvas.drawText(t, margin, y, paint); y += 8f }
    fun text(t: String, size: Float, grey: Boolean = false) {
        paint(size, false, if (grey) 0xFF5F6B7E.toInt() else 0xFF172033.toInt())
        wrap(t, w - 2 * margin).forEach { line -> ensure(size + 6f); y += size + 4f; page.canvas.drawText(line, margin, y, paint) }
    }
    fun row(cells: List<String>, bold: Boolean = false, widths: List<Float>? = null) {
        paint(10f, bold, 0xFF172033.toInt())
        ensure(18f); y += 15f
        var x = margin
        val ws = widths ?: listOf(260f, w - 2 * margin - 260f)
        cells.forEachIndexed { i, c -> page.canvas.drawText(c.take(48), x, y, paint); x += ws.getOrElse(i) { 80f } }
        paint.color = 0xFFE2E8F0.toInt(); page.canvas.drawLine(margin, y + 5f, w - margin, y + 5f, paint)
    }
    fun gap(v: Float) { y += v }
    fun finish() { doc.finishPage(page) }

    private fun paint(size: Float, bold: Boolean, color: Int) {
        paint.textSize = size; paint.color = color
        paint.typeface = Typeface.create(Typeface.SANS_SERIF, if (bold) Typeface.BOLD else Typeface.NORMAL)
    }
    private fun wrap(t: String, max: Float): List<String> {
        val out = mutableListOf<String>(); var line = ""
        t.split(" ").forEach { word ->
            val next = if (line.isEmpty()) word else "$line $word"
            if (paint.measureText(next) > max && line.isNotEmpty()) { out += line; line = word } else line = next
        }
        if (line.isNotEmpty()) out += line
        return out
    }
}

object ShareEvents {
    private val _events = MutableSharedFlow<String>(extraBufferCapacity = 1)
    val events = _events.asSharedFlow()
    fun emit(label: String) { _events.tryEmit(label) }
}

class ShareTargetReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val component: ComponentName? = if (Build.VERSION.SDK_INT >= 33) {
            intent.getParcelableExtra(Intent.EXTRA_CHOSEN_COMPONENT, ComponentName::class.java)
        } else {
            @Suppress("DEPRECATION") intent.getParcelableExtra(Intent.EXTRA_CHOSEN_COMPONENT)
        }
        val label = component?.let {
            runCatching { context.packageManager.getApplicationLabel(context.packageManager.getApplicationInfo(it.packageName, 0)).toString() }.getOrNull()
        } ?: "the app you picked"
        ShareEvents.emit(label)
    }
}
