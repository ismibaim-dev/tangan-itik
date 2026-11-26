package io.github.ismibaimdev.gripwise.ui.screens

import android.content.ActivityNotFoundException
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import io.github.ismibaimdev.gripwise.export.CsvSet
import io.github.ismibaimdev.gripwise.export.ExportCounts
import io.github.ismibaimdev.gripwise.export.ExportRange
import io.github.ismibaimdev.gripwise.export.PdfSection
import io.github.ismibaimdev.gripwise.export.ShareEvents
import io.github.ismibaimdev.gripwise.ui.LocalContainer
import io.github.ismibaimdev.gripwise.ui.components.Banner
import io.github.ismibaimdev.gripwise.ui.components.Body
import io.github.ismibaimdev.gripwise.ui.components.Choice
import io.github.ismibaimdev.gripwise.ui.components.Divider
import io.github.ismibaimdev.gripwise.ui.components.GwCard
import io.github.ismibaimdev.gripwise.ui.components.GwIcons
import io.github.ismibaimdev.gripwise.ui.components.GwScreen
import io.github.ismibaimdev.gripwise.ui.components.Label
import io.github.ismibaimdev.gripwise.ui.components.OutlineButton
import io.github.ismibaimdev.gripwise.ui.components.PrimaryButton
import io.github.ismibaimdev.gripwise.ui.components.Segmented
import io.github.ismibaimdev.gripwise.ui.components.Small
import io.github.ismibaimdev.gripwise.ui.components.TitleBar
import io.github.ismibaimdev.gripwise.ui.theme.Gw
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File

@Composable
fun ExportScreen(onBack: () -> Unit) {
    val container = LocalContainer.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope { Dispatchers.Main.immediate }
    val settings by container.settingsState.collectAsStateWithLifecycle()
    val c = Gw.c

    var pdf by rememberSaveable { mutableStateOf(false) }
    var rangeIdx by rememberSaveable { mutableStateOf(0) }
    var csvSel by rememberSaveable { mutableStateOf(setOf(CsvSet.Sessions.name, CsvSet.Daily.name, CsvSet.Checkins.name)) }
    var pdfSel by rememberSaveable { mutableStateOf(PdfSection.entries.map { it.name }.toSet()) }
    var busy by remember { mutableStateOf(false) }
    var note by remember { mutableStateOf<Pair<String, Boolean>?>(null) }
    var pending by remember { mutableStateOf<File?>(null) }

    val range = ExportRange.entries[rangeIdx]
    val counts by produceState<ExportCounts?>(null, range) { value = container.exporter.counts(range) }

    LaunchedEffect(Unit) { ShareEvents.events.collect { note = "Shared to $it." to true } }

    val saveLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("*/*")) { uri ->
        val f = pending ?: return@rememberLauncherForActivityResult
        if (uri == null) { note = "Save cancelled." to false; return@rememberLauncherForActivityResult }
        scope.launch {
            runCatching { container.exporter.copyTo(f, uri) }
                .onSuccess { note = "Saved ${f.name} to your phone." to true }
                .onFailure { note = "Couldn't save the file. Try another folder." to false }
        }
    }

    val nothing = if (pdf) pdfSel.isEmpty() else csvSel.isEmpty()
    val empty = counts?.let { it.sessions == 0 && it.checkins == 0 } ?: false

    suspend fun build(): File? = runCatching {
        if (pdf) container.exporter.buildPdf(range, pdfSel.map { PdfSection.valueOf(it) }.toSet(), settings?.name.orEmpty())
        else container.exporter.buildCsv(range, csvSel.map { CsvSet.valueOf(it) }.toSet())
    }.onFailure { note = "Couldn't make the file: ${it.message ?: "unknown error"}" to false }.getOrNull()

    GwScreen(footer = {
        note?.let { (t, ok) ->
            Banner(t, if (ok) c.greenText else c.amberText, if (ok) c.tintGreen else c.tintAmber, if (ok) GwIcons.CheckCircle else GwIcons.Warn)
            Spacer(Modifier.height(10.dp))
        }
        PrimaryButton(if (busy) "Preparing…" else "Save to phone", {
            busy = true; note = null
            scope.launch {
                build()?.let { pending = it; saveLauncher.launch(it.name) }
                busy = false
            }
        }, enabled = !busy && !nothing && !empty, icon = GwIcons.Download)
        Spacer(Modifier.height(10.dp))
        OutlineButton("Share", {
            busy = true; note = null
            scope.launch {
                build()?.let { f ->
                    try { context.startActivity(container.exporter.shareChooser(f)) } catch (_: ActivityNotFoundException) { note = "No app on this phone can receive the file." to false }
                }
                busy = false
            }
        }, enabled = !busy && !nothing && !empty, icon = GwIcons.Share)
    }) {
        TitleBar("Export my data", onBack)
        Spacer(Modifier.height(10.dp))
        Body("Make a file for your physiotherapist or your own records. It's built on this phone and only goes where you send it.", size = 14)
        Spacer(Modifier.height(18.dp))
        Label("Format")
        Spacer(Modifier.height(8.dp))
        Segmented(listOf("CSV spreadsheet", "PDF report"), if (pdf) 1 else 0, { pdf = it == 1 })
        Spacer(Modifier.height(18.dp))
        Label("Date range")
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            ExportRange.entries.forEachIndexed { i, r -> Choice(r.label, rangeIdx == i, { rangeIdx = i }, Modifier.weight(1f)) }
        }
        Spacer(Modifier.height(18.dp))
        Label(if (pdf) "Include in the report" else "Include")
        Spacer(Modifier.height(8.dp))
        GwCard(padding = 6.dp) {
            if (pdf) {
                PdfSection.entries.forEachIndexed { i, s ->
                    if (i > 0) Divider()
                    CheckRow(s.title, s.desc, s.name in pdfSel) { pdfSel = if (it) pdfSel + s.name else pdfSel - s.name }
                }
            } else {
                CsvSet.entries.forEachIndexed { i, s ->
                    if (i > 0) Divider()
                    val sub = when (s) {
                        CsvSet.Sessions -> "One row per session: date, exercise, holds, time in zone, best bend"
                        CsvSet.Daily -> "Reps and minutes for each day"
                        CsvSet.Checkins -> "Daily feelings and symptoms logged during sets"
                        CsvSet.Raw -> counts?.let { "Every glove reading, ${plural(it.frames, "row")}. Can be a large file." } ?: "Every glove reading. Can be a large file."
                    }
                    CheckRow(s.title, sub, s.name in csvSel) { csvSel = if (it) csvSel + s.name else csvSel - s.name }
                }
            }
        }
        Spacer(Modifier.height(16.dp))
        GwCard(color = c.tintBlue) {
            Text("What you'll get", style = MaterialTheme.typography.titleSmall, color = c.accentText)
            Spacer(Modifier.height(4.dp))
            val k = counts
            Small(
                when {
                    k == null -> "Counting…"
                    empty -> "Nothing to export in this range yet. Finish a session or a check-in first."
                    pdf -> "A PDF report with ${plural(k.sessions, "session")} over ${plural(k.days, "day")} (${k.dates})."
                    else -> {
                        val files = csvSel.size
                        "${if (files > 1) "A zip with $files CSV files" else "One CSV file"}: ${plural(k.sessions, "session")}, ${plural(k.checkins, "check-in")} (${k.dates})."
                    }
                },
                color = c.accentText, weight = FontWeight.Medium, size = 13,
            )
            if (nothing && !empty) { Spacer(Modifier.height(4.dp)); Small("Pick at least one item.", color = c.danger, weight = FontWeight.SemiBold, size = 13) }
        }
        Spacer(Modifier.padding(bottom = 4.dp))
    }
}

@Composable
private fun CheckRow(title: String, sub: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    val c = Gw.c
    Row(
        Modifier.fillMaxWidth().heightIn(min = 56.dp).clip(RoundedCornerShape(14.dp)).toggleable(checked, role = Role.Checkbox, onValueChange = onChange).padding(horizontal = 6.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Checkbox(checked, null, colors = CheckboxDefaults.colors(checkedColor = c.primary, uncheckedColor = c.border, checkmarkColor = c.onPrimary))
        Spacer(Modifier.width(8.dp))
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), color = c.text)
            Small(sub, color = c.text2, size = 13)
        }
    }
}

internal fun plural(n: Int, word: String) = "$n ${if (n == 1) word else word + "s"}"
