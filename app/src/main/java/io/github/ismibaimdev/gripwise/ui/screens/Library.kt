package io.github.ismibaimdev.gripwise.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.ismibaimdev.gripwise.data.SessionEntity
import io.github.ismibaimdev.gripwise.data.StepResultEntity
import io.github.ismibaimdev.gripwise.data.SymptomEntity
import io.github.ismibaimdev.gripwise.exercises.ExerciseCatalog
import io.github.ismibaimdev.gripwise.ui.LocalContainer
import io.github.ismibaimdev.gripwise.ui.components.Body
import io.github.ismibaimdev.gripwise.ui.components.BottomBar
import io.github.ismibaimdev.gripwise.ui.components.Divider
import io.github.ismibaimdev.gripwise.ui.components.GwCard
import io.github.ismibaimdev.gripwise.ui.components.GwIcons
import io.github.ismibaimdev.gripwise.ui.components.GwScreen
import io.github.ismibaimdev.gripwise.ui.components.H1
import io.github.ismibaimdev.gripwise.ui.components.Label
import io.github.ismibaimdev.gripwise.ui.components.LinkButton
import io.github.ismibaimdev.gripwise.ui.components.OutlineButton
import io.github.ismibaimdev.gripwise.ui.components.Pictogram
import io.github.ismibaimdev.gripwise.ui.components.Pill
import io.github.ismibaimdev.gripwise.ui.components.PrimaryButton
import io.github.ismibaimdev.gripwise.ui.components.Segmented
import io.github.ismibaimdev.gripwise.ui.components.Small
import io.github.ismibaimdev.gripwise.ui.components.StatTile
import io.github.ismibaimdev.gripwise.ui.components.Tab
import io.github.ismibaimdev.gripwise.ui.components.TitleBar
import io.github.ismibaimdev.gripwise.ui.components.tintColors
import io.github.ismibaimdev.gripwise.ui.theme.Gw
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.roundToInt

@Composable
fun ExercisesScreen(onTab: (Tab) -> Unit, onSession: (String) -> Unit) {
    val c = Gw.c
    var tab by rememberSaveable { mutableStateOf(0) }
    val list = ExerciseCatalog.all.filter { it.routine == (tab == 0) }
    Column(Modifier.fillMaxSize()) {
        GwScreen(Modifier.weight(1f)) {
            H1("Exercises", size = 28)
            Spacer(Modifier.height(4.dp))
            Body("Wear the glove and Gripwise checks each position for you, then moves on by itself.", size = 14)
            Spacer(Modifier.height(16.dp))
            Segmented(listOf("Routines", "Single moves"), tab, { tab = it })
            Spacer(Modifier.height(16.dp))
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                list.forEach { ex ->
                    val (tile, ink) = tintColors(ex.tint, c)
                    GwCard(Modifier.clip(RoundedCornerShape(22.dp)).clickable(role = Role.Button) { onSession(ex.id) }, padding = 14.dp) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(64.dp).clip(RoundedCornerShape(18.dp)).background(tile), contentAlignment = Alignment.Center) {
                                Pictogram(ex.thumbnail, size = 52.dp, base = ink)
                            }
                            Spacer(Modifier.width(14.dp))
                            Column(Modifier.weight(1f)) {
                                Text(ex.name, style = MaterialTheme.typography.titleSmall, color = c.text)
                                Spacer(Modifier.height(2.dp))
                                Small(ex.meta + " · " + "${ex.rounds} rounds", color = c.text2, size = 13)
                                Spacer(Modifier.height(6.dp))
                                Pill(ex.tag, ink, tile)
                            }
                            Icon(GwIcons.Chevron, null, Modifier.size(20.dp), tint = c.text3)
                        }
                    }
                }
            }
        }
        BottomBar(Tab.Exercises, onTab)
    }
}

private data class DoneData(val session: SessionEntity?, val steps: List<StepResultEntity>, val symptoms: List<SymptomEntity>, val loaded: Boolean)

/** "Session complete" right after a session, and "Session review" when opened from Home. */
@Composable
fun DoneScreen(sessionId: Long, review: Boolean, onHome: () -> Unit, onProgress: () -> Unit, onAgain: (String) -> Unit) {
    val container = LocalContainer.current
    val c = Gw.c
    val data by produceState(DoneData(null, emptyList(), emptyList(), false), sessionId) {
        value = DoneData(container.dao.session(sessionId), container.dao.steps(sessionId), container.dao.symptomsFor(sessionId), true)
    }
    val s = data.session
    val fmt = DateTimeFormatter.ofPattern("EEE d MMM, h:mm a", Locale.UK)

    GwScreen(footer = {
        if (s != null) {
            if (review) {
                PrimaryButton("Do it again", { onAgain(s.exerciseId) })
                LinkButton("Back", onHome, Modifier.fillMaxWidth())
            } else {
                PrimaryButton("Back to home", onHome)
                LinkButton("See my progress", onProgress, Modifier.fillMaxWidth())
            }
        } else if (data.loaded) PrimaryButton("Back to home", onHome)
    }) {
        if (review) TitleBar("Session review", onHome)
        if (!data.loaded) return@GwScreen
        if (s == null) { Spacer(Modifier.height(24.dp)); Body("This session could not be found. It may have been deleted."); return@GwScreen }

        Spacer(Modifier.height(if (review) 16.dp else 24.dp))
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            if (!review) {
                Box(Modifier.size(84.dp).clip(CircleShape).background(c.tintGreen), contentAlignment = Alignment.Center) {
                    Icon(GwIcons.Check, null, Modifier.size(44.dp), tint = c.greenText)
                }
                Spacer(Modifier.height(14.dp))
                H1(if (s.completed) "Nice work" else "Saved", size = 28, modifier = Modifier.semantics { heading() })
                Spacer(Modifier.height(4.dp))
            } else {
                Text(s.exerciseName, Modifier.semantics { heading() }, style = MaterialTheme.typography.headlineSmall.copy(fontSize = 24.sp), color = c.text)
            }
            Body(
                (if (review) "" else s.exerciseName + " · ") + Instant.ofEpochMilli(s.startedAt).atZone(ZoneId.systemDefault()).format(fmt) + if (s.demo) " · demo glove" else "",
                size = 14,
            )
        }
        Spacer(Modifier.height(20.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            StatTile("${s.holdsDone}", "Holds done", Modifier.weight(1f), suffix = "/${s.holdsTarget}")
            StatTile("${s.inZonePct}", "In target zone", Modifier.weight(1f), suffix = "%")
            StatTile(if (s.durationSec >= 60) "${s.durationSec / 60}" else "${s.durationSec}", "Time", Modifier.weight(1f), suffix = if (s.durationSec >= 60) " min" else " s")
        }
        Spacer(Modifier.height(18.dp))
        if (data.steps.isNotEmpty()) {
            Label("Time in the target zone, by step")
            Spacer(Modifier.height(8.dp))
            GwCard {
                data.steps.forEachIndexed { i, st ->
                    if (i > 0) { Spacer(Modifier.height(10.dp)) }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(st.stepName, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), color = c.text)
                        Small("${st.inZonePct}%", color = if (st.inZonePct >= 60) c.greenText else c.amberText, weight = FontWeight.Bold, size = 13)
                    }
                    Spacer(Modifier.height(6.dp))
                    Box(Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)).background(c.track)) {
                        Box(Modifier.fillMaxWidth((st.inZonePct / 100f).coerceIn(0.02f, 1f)).height(8.dp).clip(RoundedCornerShape(4.dp)).background(if (st.inZonePct >= 60) c.primary else c.amberFill))
                    }
                }
            }
            Spacer(Modifier.height(18.dp))
        }
        Label("Best bend this session")
        Spacer(Modifier.height(8.dp))
        GwCard {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                listOf("Thumb" to s.bestThumb, "Index" to s.bestIndex, "Middle" to s.bestMiddle, "Ring" to s.bestRing).forEach { (n, v) ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("${v.roundToInt()}%", style = MaterialTheme.typography.titleMedium, color = c.text)
                        Small(n, color = c.text2, weight = FontWeight.SemiBold)
                    }
                }
            }
        }
        if (data.symptoms.isNotEmpty()) {
            Spacer(Modifier.height(18.dp))
            Label("Symptoms you logged")
            Spacer(Modifier.height(8.dp))
            GwCard(color = c.tintAmber) {
                data.symptoms.forEachIndexed { i, sym ->
                    if (i > 0) { Spacer(Modifier.height(8.dp)); Divider(); Spacer(Modifier.height(8.dp)) }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(GwIcons.Warn, null, Modifier.size(18.dp), tint = c.amberText)
                        Spacer(Modifier.width(8.dp))
                        Text("${sym.symptom} during ${sym.stepName.lowercase()}", style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), color = c.amberText)
                    }
                }
            }
        }
        if (!s.completed) {
            Spacer(Modifier.height(14.dp))
            Small("This set was ended early, so it counts as partly done.", color = c.text3, size = 13)
        }
        if (!review) {
            Spacer(Modifier.height(16.dp))
            OutlineButton("Do it again", { onAgain(s.exerciseId) }, height = 48.dp)
        }
        Spacer(Modifier.padding(bottom = 4.dp))
    }
}

