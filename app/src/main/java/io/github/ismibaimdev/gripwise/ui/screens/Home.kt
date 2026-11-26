package io.github.ismibaimdev.gripwise.ui.screens

import android.Manifest
import android.app.TimePickerDialog
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import io.github.ismibaimdev.gripwise.data.CheckinEntity
import io.github.ismibaimdev.gripwise.data.SessionEntity
import io.github.ismibaimdev.gripwise.data.key
import io.github.ismibaimdev.gripwise.data.startMillis
import io.github.ismibaimdev.gripwise.exercises.ExerciseCatalog
import io.github.ismibaimdev.gripwise.glove.GloveStatus
import io.github.ismibaimdev.gripwise.ui.LocalContainer
import io.github.ismibaimdev.gripwise.ui.components.Banner
import io.github.ismibaimdev.gripwise.ui.components.BottomBar
import io.github.ismibaimdev.gripwise.ui.components.LinkButton
import io.github.ismibaimdev.gripwise.ui.components.Dot
import io.github.ismibaimdev.gripwise.ui.components.GwCard
import io.github.ismibaimdev.gripwise.ui.components.GwIcons
import io.github.ismibaimdev.gripwise.ui.components.GwScreen
import io.github.ismibaimdev.gripwise.ui.components.H1
import io.github.ismibaimdev.gripwise.ui.components.Label
import io.github.ismibaimdev.gripwise.ui.components.MoodFace
import io.github.ismibaimdev.gripwise.ui.components.Pictogram
import io.github.ismibaimdev.gripwise.ui.components.Pill
import io.github.ismibaimdev.gripwise.ui.components.Small
import io.github.ismibaimdev.gripwise.ui.components.Tab
import io.github.ismibaimdev.gripwise.ui.components.tintColors
import io.github.ismibaimdev.gripwise.ui.theme.Gw
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.LocalTime

internal val MOODS = listOf("great" to "Great", "okay" to "Okay", "stiff" to "Stiff", "sore" to "Sore", "tingly" to "Tingly")

internal fun minutesLabel(m: Int): String {
    val h = m / 60; val min = m % 60
    val h12 = if (h % 12 == 0) 12 else h % 12
    return "%d:%02d %s".format(h12, min, if (h < 12) "AM" else "PM")
}

private var askedNotifications = false

@Composable
fun HomeScreen(onTab: (Tab) -> Unit, onSession: (String) -> Unit, onReview: (Long) -> Unit, onGlove: () -> Unit) {
    val container = LocalContainer.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope { Dispatchers.Main.immediate }
    val c = Gw.c
    val settings by container.settingsState.collectAsStateWithLifecycle()
    val status by container.glove.status.collectAsStateWithLifecycle()
    val today = remember { LocalDate.now() }
    val sessions by remember { container.dao.sessionsSince(today.startMillis()) }.collectAsStateWithLifecycle(emptyList())
    val checkin by remember { container.dao.checkin(today.key()) }.collectAsStateWithLifecycle(null)

    val notifLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { container.reminders.reschedule(settings ?: return@rememberLauncherForActivityResult) }
    LaunchedEffect(settings?.remindersOn) {
        if (settings?.remindersOn == true && Build.VERSION.SDK_INT >= 33 && !askedNotifications &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) { askedNotifications = true; notifLauncher.launch(Manifest.permission.POST_NOTIFICATIONS) }
    }
    // Try to reach the glove in the background so Home shows its real state.
    LaunchedEffect(Unit) { if (status is GloveStatus.Idle) container.glove.connect() }

    val hour = LocalTime.now().hour
    val greeting = when { hour < 12 -> "Good morning"; hour < 18 -> "Good afternoon"; else -> "Good evening" }
    val name = settings?.name?.ifBlank { null }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            GwScreen(Modifier.weight(1f)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Small(greeting, color = c.text2, weight = FontWeight.SemiBold, size = 14)
                        H1(if (name != null) "Hi, $name" else "Hi there", size = 28)
                    }
                    GlovePill(status, onGlove)
                }
                Spacer(Modifier.height(18.dp))
                if (settings?.calibration?.isSet == false && settings?.demoMode == false) {
                    Banner("Calibrate the glove to your hand so the bend readings are accurate.", c.accentText, c.tintBlue, GwIcons.Glove) {
                        LinkButton("Calibrate", onGlove)
                    }
                    Spacer(Modifier.height(14.dp))
                }
                CheckinCard(checkin) { mood -> scope.launch { container.dao.upsertCheckin(CheckinEntity(today.key(), mood, System.currentTimeMillis())) } }
                Spacer(Modifier.height(22.dp))
                val done = ExerciseCatalog.dailyPlan.count { (_, id) -> sessions.any { it.exerciseId == id && it.completed } }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Today's plan", Modifier.weight(1f).semantics { heading() }, style = MaterialTheme.typography.titleMedium, color = c.text)
                    Small("$done of 3 done", color = c.text2, weight = FontWeight.SemiBold, size = 13)
                }
                Spacer(Modifier.height(10.dp))
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    ExerciseCatalog.dailyPlan.forEach { (slot, id) ->
                        val ex = ExerciseCatalog.byId(id)
                        val mine = sessions.filter { it.exerciseId == id }
                        val finished = mine.firstOrNull { it.completed }
                        val minutes = settings?.reminders?.forSlot(slot) ?: -1
                        PlanCard(
                            slot = slot.replaceFirstChar { it.uppercase() }, name = ex.name, meta = ex.meta,
                            pic = ex, finished = finished, partial = mine.firstOrNull { !it.completed } != null,
                            reminder = if (settings?.remindersOn == true && minutes >= 0) minutesLabel(minutes) else null,
                            onStart = { onSession(id) }, onReview = { finished?.let { onReview(it.id) } },
                            onReminder = {
                                val cur = if (minutes >= 0) minutes else 9 * 60
                                TimePickerDialog(context, { _, h, m ->
                                    scope.launch { container.settings.setRemindersOn(true); container.settings.setReminder(slot, h * 60 + m) }
                                }, cur / 60, cur % 60, false).show()
                            },
                        )
                    }
                }
                Spacer(Modifier.height(16.dp))
                Small("Do each set gently. Stop if you feel tingling or pain and tell your physiotherapist.", color = c.text3, size = 12)
            }
            BottomBar(Tab.Home, onTab)
        }
    }
}

@Composable
internal fun GlovePill(status: GloveStatus, onClick: () -> Unit) {
    val c = Gw.c
    val (text, dot, bg) = when (status) {
        is GloveStatus.Connected -> Triple(if (status.demo) "Demo glove" else "Glove on", c.primary, c.tintBlue)
        GloveStatus.Scanning, is GloveStatus.Connecting, is GloveStatus.Lost -> Triple("Connecting", c.amberFill, c.tintAmber)
        else -> Triple("Glove off", c.text3, c.surface)
    }
    Row(
        Modifier.heightIn(min = 44.dp).clip(RoundedCornerShape(22.dp)).background(bg).clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 14.dp).semantics { contentDescription = "$text. Open glove and calibration" },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(GwIcons.Glove, null, Modifier.size(18.dp), tint = c.link)
        Spacer(Modifier.width(6.dp))
        Text(text, style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold), color = c.text)
        Spacer(Modifier.width(6.dp))
        Dot(dot)
    }
}

@Composable
private fun CheckinCard(checkin: CheckinEntity?, onPick: (String) -> Unit) {
    val c = Gw.c
    GwCard {
        Text("How do your hands feel today?", Modifier.semantics { heading() }, style = MaterialTheme.typography.titleSmall, color = c.text)
        Spacer(Modifier.height(12.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            MOODS.forEach { (id, label) ->
                val on = checkin?.feeling == id
                val warn = id == "tingly" || id == "sore"
                val fg = when { on && warn -> c.amberText; on -> c.accentText; else -> c.text2 }
                Column(
                    Modifier.weight(1f).heightIn(min = 64.dp).clip(RoundedCornerShape(16.dp))
                        .border(if (on) 2.dp else 1.dp, if (on) fg else c.line, RoundedCornerShape(16.dp))
                        .background(if (on) (if (warn) c.tintAmber else c.tintBlue) else c.surface)
                        .selectable(selected = on, role = Role.RadioButton) { onPick(id) }
                        .padding(vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center,
                ) {
                    MoodFace(id, fg)
                    Spacer(Modifier.height(4.dp))
                    Text(label, style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp, fontWeight = if (on) FontWeight.Bold else FontWeight.SemiBold), color = fg)
                }
            }
        }
        if (checkin != null) {
            Spacer(Modifier.height(10.dp))
            val warn = checkin.feeling == "tingly" || checkin.feeling == "sore"
            Small(
                if (warn) "Noted. Go gently today and stop any move that brings it on." else "Noted for today. You can change it any time.",
                color = if (warn) c.amberText else c.text2, weight = FontWeight.Medium, size = 13,
            )
        }
    }
}

@Composable
private fun PlanCard(
    slot: String, name: String, meta: String, pic: io.github.ismibaimdev.gripwise.exercises.Exercise,
    finished: SessionEntity?, partial: Boolean, reminder: String?,
    onStart: () -> Unit, onReview: () -> Unit, onReminder: () -> Unit,
) {
    val c = Gw.c
    val (tile, ink) = tintColors(pic.tint, c)
    GwCard(Modifier.clickable(role = Role.Button, onClick = if (finished != null) onReview else onStart), padding = 14.dp) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(56.dp).clip(RoundedCornerShape(16.dp)).background(tile), contentAlignment = Alignment.Center) {
                Pictogram(pic.thumbnail, size = 46.dp, base = ink)
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Label(slot.uppercase(), color = c.text3)
                Text(name, style = MaterialTheme.typography.titleSmall, color = c.text)
                Small(if (finished != null) "Done · ${finished.holdsDone} holds · ${finished.inZonePct}% in zone" else if (partial) "Started · not finished yet" else meta, color = c.text2, size = 13)
            }
            if (finished != null) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(GwIcons.CheckCircle, null, Modifier.size(20.dp), tint = c.greenText)
                    Spacer(Modifier.width(4.dp))
                    Text("Review", style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold), color = c.link)
                }
            } else {
                Box(
                    Modifier.heightIn(min = 44.dp).clip(RoundedCornerShape(22.dp)).background(c.primary).clickable(role = Role.Button, onClick = onStart).padding(horizontal = 16.dp),
                    contentAlignment = Alignment.Center,
                ) { Text(if (partial) "Again" else "Start", style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold), color = c.onPrimary) }
            }
        }
        if (finished == null) {
            Spacer(Modifier.height(10.dp))
            Row(
                Modifier.heightIn(min = 40.dp).clip(RoundedCornerShape(12.dp)).clickable(role = Role.Button, onClick = onReminder).padding(horizontal = 4.dp)
                    .semantics { contentDescription = if (reminder != null) "Reminder at $reminder. Change time" else "No reminder. Set a time" },
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(GwIcons.Clock, null, Modifier.size(16.dp), tint = c.text3)
                Spacer(Modifier.width(6.dp))
                Small(if (reminder != null) "Reminder $reminder" else "Set a reminder", color = c.text2, weight = FontWeight.SemiBold, size = 13)
                Spacer(Modifier.width(6.dp))
                Pill("Change", c.link, c.tintBlue)
            }
        }
    }
}

