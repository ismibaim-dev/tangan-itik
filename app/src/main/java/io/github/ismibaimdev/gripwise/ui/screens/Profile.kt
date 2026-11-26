package io.github.ismibaimdev.gripwise.ui.screens

import android.Manifest
import android.app.TimePickerDialog
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import io.github.ismibaimdev.gripwise.BuildConfig
import io.github.ismibaimdev.gripwise.data.ThemeMode
import io.github.ismibaimdev.gripwise.glove.GloveStatus
import io.github.ismibaimdev.gripwise.ui.LocalContainer
import io.github.ismibaimdev.gripwise.ui.components.Body
import io.github.ismibaimdev.gripwise.ui.components.BottomBar
import io.github.ismibaimdev.gripwise.ui.components.ClickRow
import io.github.ismibaimdev.gripwise.ui.components.Divider
import io.github.ismibaimdev.gripwise.ui.components.GwCard
import io.github.ismibaimdev.gripwise.ui.components.GwIcons
import io.github.ismibaimdev.gripwise.ui.components.GwScreen
import io.github.ismibaimdev.gripwise.ui.components.H1
import io.github.ismibaimdev.gripwise.ui.components.Label
import io.github.ismibaimdev.gripwise.ui.components.LinkButton
import io.github.ismibaimdev.gripwise.ui.components.OutlineButton
import io.github.ismibaimdev.gripwise.ui.components.PrimaryButton
import io.github.ismibaimdev.gripwise.ui.components.Segmented
import io.github.ismibaimdev.gripwise.ui.components.SheetHandle
import io.github.ismibaimdev.gripwise.ui.components.Small
import io.github.ismibaimdev.gripwise.ui.components.Tab
import io.github.ismibaimdev.gripwise.ui.theme.Gw
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private enum class ProfileSheet { Name, Delete }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(onTab: (Tab) -> Unit, onGlove: () -> Unit, onExport: () -> Unit, onErased: () -> Unit) {
    val container = LocalContainer.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope { Dispatchers.Main.immediate }
    val c = Gw.c
    val settings by container.settingsState.collectAsStateWithLifecycle()
    val status by container.glove.status.collectAsStateWithLifecycle()
    val s = settings ?: return
    var sheet by remember { mutableStateOf<ProfileSheet?>(null) }

    val notifLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        scope.launch { container.settings.setRemindersOn(granted) }
    }
    fun setReminders(on: Boolean) {
        if (on && Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) notifLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        else scope.launch { container.settings.setRemindersOn(on) }
    }
    fun pickTime(slot: String) {
        val cur = s.reminders.forSlot(slot).takeIf { it >= 0 } ?: (9 * 60)
        TimePickerDialog(context, { _, h, m -> scope.launch { container.settings.setReminder(slot, h * 60 + m) } }, cur / 60, cur % 60, false).show()
    }

    Column(Modifier.fillMaxSize()) {
        GwScreen(Modifier.weight(1f)) {
            H1("Profile", size = 28)
            Spacer(Modifier.height(14.dp))
            GwCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(56.dp).clip(CircleShape).background(c.tintBlue), contentAlignment = Alignment.Center) {
                        Text(s.name.take(1).uppercase().ifBlank { "?" }, style = MaterialTheme.typography.titleLarge.copy(fontSize = 22.sp), color = c.link)
                    }
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f)) {
                        Text(s.name.ifBlank { "No name yet" }, style = MaterialTheme.typography.titleMedium, color = c.text)
                        Small("Saved on this phone only", color = c.text2, size = 13)
                    }
                    LinkButton("Edit", { sheet = ProfileSheet.Name })
                }
            }

            Section("Appearance")
            Segmented(listOf("Light", "Dark", "System"), s.themeMode.ordinal, { i -> scope.launch { container.settings.setTheme(ThemeMode.entries[i]) } })

            Section("Glove")
            GwCard(padding = 4.dp) {
                NavRow(GwIcons.Glove, "Glove & calibration", if (status is GloveStatus.Connected) statusText(status) else "Not connected · ${if (s.calibration.isSet) "calibrated" else "not calibrated"}", onGlove)
                Divider()
                SwitchRow(GwIcons.Play, "Demo glove", "Simulated readings, for trying the app without hardware", s.demoMode) { on -> scope.launch { container.settings.setDemo(on) } }
            }

            Section("Reminders")
            GwCard(padding = 4.dp) {
                SwitchRow(GwIcons.Clock, "Exercise reminders", "A notification for each part of today's plan", s.remindersOn, ::setReminders)
                if (s.remindersOn) {
                    listOf("morning", "afternoon", "evening").forEach { slot ->
                        Divider()
                        val m = s.reminders.forSlot(slot)
                        ClickRow({ pickTime(slot) }, Modifier.padding(horizontal = 12.dp)) {
                            Spacer(Modifier.width(36.dp))
                            Text(slot.replaceFirstChar { it.uppercase() }, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), color = c.text)
                            Text(if (m >= 0) minutesLabel(m) else "Off", style = MaterialTheme.typography.labelLarge, color = c.link)
                        }
                    }
                }
                Divider()
                SwitchRow(GwIcons.Sound, "Sound and vibration cue", "A short beep when a hold is done", s.soundCue) { on -> scope.launch { container.settings.setSound(on) } }
            }

            Section("Your data")
            GwCard(padding = 4.dp) {
                NavRow(GwIcons.Download, "Export my data", "CSV or PDF for your physiotherapist", onExport)
                Divider()
                NavRow(GwIcons.Trash, "Delete my data", "Erase sessions, check-ins and your profile", { sheet = ProfileSheet.Delete }, danger = true)
            }
            Spacer(Modifier.height(18.dp))
            Small("Gripwise ${BuildConfig.VERSION_NAME} · works offline, no account. Gripwise supports, not replaces, advice from your doctor or physiotherapist.", color = c.text3, size = 12)
        }
        BottomBar(Tab.Profile, onTab)
    }

    if (sheet != null) {
        val state = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(onDismissRequest = { sheet = null }, sheetState = state, containerColor = c.surface, dragHandle = null) {
            Column(Modifier.padding(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 24.dp).navigationBarsPadding(), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                SheetHandle()
                when (sheet) {
                    ProfileSheet.Name -> {
                        var name by remember { mutableStateOf(s.name) }
                        Text("Your name", Modifier.semantics { heading() }, style = MaterialTheme.typography.titleLarge, color = c.text)
                        OutlinedTextField(
                            name, { name = it }, singleLine = true, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), colors = fieldColors(),
                            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                        )
                        PrimaryButton("Save", { scope.launch { container.settings.setName(name); sheet = null } }, enabled = name.trim().length >= 2)
                    }
                    ProfileSheet.Delete -> {
                        Text("Delete all your data?", Modifier.semantics { heading() }, style = MaterialTheme.typography.titleLarge, color = c.text)
                        Body("This erases every session, check-in, symptom note, your calibration and your name from this phone. It can't be undone. Export first if you want a copy.")
                        OutlineButton("Delete everything", {
                            scope.launch {
                                withContext(Dispatchers.IO) { container.db.clearAllTables() }
                                container.settings.clearAll()
                                container.glove.disconnect()
                                sheet = null
                                onErased()
                            }
                        }, color = c.danger)
                        PrimaryButton("Keep my data", { sheet = null })
                    }
                    null -> Unit
                }
            }
        }
    }
}

@Composable
private fun Section(title: String) {
    Spacer(Modifier.height(20.dp))
    Label(title)
    Spacer(Modifier.height(8.dp))
}

@Composable
private fun NavRow(icon: ImageVector, title: String, sub: String, onClick: () -> Unit, danger: Boolean = false) {
    val c = Gw.c
    ClickRow(onClick, Modifier.clip(RoundedCornerShape(18.dp)).padding(horizontal = 12.dp, vertical = 6.dp)) {
        Icon(icon, null, Modifier.size(22.dp), tint = if (danger) c.danger else c.link)
        Spacer(Modifier.width(14.dp))
        RowText(title, sub, if (danger) c.danger else c.text)
        Icon(GwIcons.Chevron, null, Modifier.size(18.dp), tint = c.text3)
    }
}

@Composable
private fun RowScope.RowText(title: String, sub: String, color: androidx.compose.ui.graphics.Color) {
    Column(Modifier.weight(1f)) {
        Text(title, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), color = color)
        Small(sub, color = Gw.c.text2, size = 13)
    }
}

@Composable
private fun SwitchRow(icon: ImageVector, title: String, sub: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    val c = Gw.c
    Row(
        Modifier.fillMaxWidth().heightIn(min = 56.dp).clip(RoundedCornerShape(18.dp)).toggleable(checked, role = Role.Switch, onValueChange = onChange).padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, Modifier.size(22.dp), tint = c.link)
        Spacer(Modifier.width(14.dp))
        RowText(title, sub, c.text)
        Switch(
            checked, null,
            colors = SwitchDefaults.colors(checkedTrackColor = c.primary, checkedThumbColor = c.onPrimary, uncheckedTrackColor = c.track, uncheckedThumbColor = c.surface, uncheckedBorderColor = c.border),
        )
    }
}
