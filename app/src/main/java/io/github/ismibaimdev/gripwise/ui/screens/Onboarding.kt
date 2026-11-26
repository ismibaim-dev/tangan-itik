package io.github.ismibaimdev.gripwise.ui.screens

import android.bluetooth.BluetoothAdapter
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.error
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.selection.toggleable
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import io.github.ismibaimdev.gripwise.glove.GlovePermissions
import io.github.ismibaimdev.gripwise.glove.GloveStatus
import io.github.ismibaimdev.gripwise.ui.LocalContainer
import io.github.ismibaimdev.gripwise.ui.components.Banner
import io.github.ismibaimdev.gripwise.ui.components.Body
import io.github.ismibaimdev.gripwise.ui.components.CircleButton
import io.github.ismibaimdev.gripwise.ui.components.Divider
import io.github.ismibaimdev.gripwise.ui.components.Dot
import io.github.ismibaimdev.gripwise.ui.components.GloveArt
import io.github.ismibaimdev.gripwise.ui.components.GwCard
import io.github.ismibaimdev.gripwise.ui.components.GwIcons
import io.github.ismibaimdev.gripwise.ui.components.GwScreen
import io.github.ismibaimdev.gripwise.ui.components.H1
import io.github.ismibaimdev.gripwise.ui.components.LinkButton
import io.github.ismibaimdev.gripwise.ui.components.Pill
import io.github.ismibaimdev.gripwise.ui.components.PrimaryButton
import io.github.ismibaimdev.gripwise.ui.components.Small
import io.github.ismibaimdev.gripwise.ui.components.StepHeader
import io.github.ismibaimdev.gripwise.ui.components.TitleBar
import io.github.ismibaimdev.gripwise.ui.theme.Gw
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

@Composable
fun WelcomeScreen(onStart: () -> Unit, onDemo: () -> Unit) {
    val c = Gw.c
    GwScreen(footer = {
        PrimaryButton("Get started", onStart)
        LinkButton("Try with the demo glove", onDemo, Modifier.fillMaxWidth())
        Small("Gripwise supports, not replaces, advice from your doctor or physiotherapist.", Modifier.fillMaxWidth().padding(bottom = 4.dp), color = c.text3)
    }) {
        Box(Modifier.fillMaxWidth().height(340.dp).clip(RoundedCornerShape(32.dp)).background(c.panel)) {
            Row(Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(GwIcons.Glove, null, Modifier.size(26.dp), tint = c.link)
                Spacer(Modifier.width(8.dp))
                Text("Gripwise", style = MaterialTheme.typography.titleMedium.copy(fontSize = 18.sp, fontWeight = FontWeight.ExtraBold), color = c.text)
            }
            GloveArt(Modifier.fillMaxWidth().fillMaxHeight().padding(top = 40.dp).semantics { contentDescription = "A blue sensor glove on a raised hand, surrounded by leaves" })
            Pill("Index bend 64%", c.text, c.surface, Modifier.align(Alignment.TopStart).padding(start = 16.dp, top = 108.dp))
            Pill("Wrist level", c.text, c.surface, Modifier.align(Alignment.BottomEnd).padding(end = 14.dp, bottom = 96.dp))
        }
        Spacer(Modifier.height(24.dp))
        H1("Gentle moves for tired wrists", size = 30)
        Spacer(Modifier.height(12.dp))
        Body("Gripwise reads how your fingers bend and how your wrist sits, guides each exercise, and keeps a record of your recovery on your phone.")
    }
}

@Composable
fun ProfileSetupScreen(onBack: () -> Unit, onDone: () -> Unit) {
    val container = LocalContainer.current
    val scope = rememberCoroutineScope { Dispatchers.Main.immediate }
    val settings by container.settingsState.collectAsStateWithLifecycle()
    var name by rememberSaveable { mutableStateOf(settings?.name.orEmpty()) }
    var consent by rememberSaveable { mutableStateOf(settings?.consent ?: false) }
    var tried by rememberSaveable { mutableStateOf(false) }
    val nameErr = if (name.trim().length < 2) "Enter your first name." else null
    val consentErr = if (!consent) "Please agree so Gripwise can save your progress." else null
    val c = Gw.c
    GwScreen(footer = {
        if (tried && (nameErr != null || consentErr != null)) {
            Banner(if (nameErr != null && consentErr != null) "Fix the 2 highlighted items to continue." else "Fix the highlighted item to continue.", c.danger, c.dangerTint, GwIcons.Alert)
            Spacer(Modifier.height(10.dp))
        }
        PrimaryButton("Continue", {
            tried = true
            if (nameErr == null && consentErr == null) scope.launch { container.settings.setProfile(name, consent); onDone() }
        })
    }) {
        StepHeader(1, "Your profile", onBack)
        Spacer(Modifier.height(20.dp))
        H1("Set up your profile")
        Spacer(Modifier.height(6.dp))
        Body("Everything stays on this phone. There is no account and nothing is sent anywhere.")
        Spacer(Modifier.height(20.dp))
        FieldLabel("First name")
        OutlinedTextField(
            value = name, onValueChange = { name = it }, singleLine = true, isError = tried && nameErr != null,
            placeholder = { Text("Your name") },
            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words, imeAction = ImeAction.Done),
            shape = RoundedCornerShape(16.dp), colors = fieldColors(),
            modifier = Modifier.fillMaxWidth().semantics { if (tried && nameErr != null) error(nameErr) },
        )
        if (tried && nameErr != null) ErrorLine(nameErr)
        Spacer(Modifier.height(16.dp))
        Row(
            Modifier.fillMaxWidth().heightIn(min = 48.dp).clip(RoundedCornerShape(12.dp))
                .toggleable(value = consent, role = Role.Checkbox, onValueChange = { consent = it }),
            verticalAlignment = Alignment.Top,
        ) {
            Checkbox(checked = consent, onCheckedChange = null, colors = CheckboxDefaults.colors(checkedColor = c.primary, uncheckedColor = if (tried && consentErr != null) c.danger else c.border))
            Spacer(Modifier.width(12.dp))
            Body("I agree that Gripwise can store my exercise and symptom data on this phone to show my progress. I can delete it any time in Profile.", size = 13)
        }
        if (tried && consentErr != null) ErrorLine(consentErr)
    }
}

@Composable
internal fun FieldLabel(text: String) {
    Text(text, Modifier.padding(bottom = 6.dp), style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold), color = Gw.c.text)
}

@Composable
internal fun ErrorLine(text: String) {
    Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(GwIcons.Alert, null, Modifier.size(14.dp), tint = Gw.c.danger)
        Spacer(Modifier.width(6.dp))
        Small(text, color = Gw.c.danger, weight = FontWeight.SemiBold)
    }
}

@Composable
internal fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedContainerColor = Gw.c.surface, unfocusedContainerColor = Gw.c.surface,
    focusedBorderColor = Gw.c.primary, unfocusedBorderColor = Gw.c.border, errorBorderColor = Gw.c.danger,
    focusedTextColor = Gw.c.text, unfocusedTextColor = Gw.c.text, cursorColor = Gw.c.primary,
)

/** Step 2: find and connect the glove (or the demo glove). Shows live sensor bars once connected. */
@Composable
fun ConnectScreen(onBack: () -> Unit, onContinue: () -> Unit, onLater: () -> Unit, settingsContext: Boolean = false) {
    val container = LocalContainer.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope { Dispatchers.Main.immediate }
    val status by container.glove.status.collectAsStateWithLifecycle()
    val demo by container.glove.demoMode.collectAsStateWithLifecycle()
    val reading by container.reading.collectAsStateWithLifecycle()
    val c = Gw.c

    var denied by rememberSaveable { mutableStateOf(false) }
    val permLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
        if (result.values.all { it }) { denied = false; container.glove.reconnect() } else denied = true
    }
    fun openAppSettings() {
        runCatching {
            context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
    }
    val enableLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { container.glove.reconnect() }

    LaunchedEffect(demo) {
        if (demo || GlovePermissions.granted(context)) container.glove.connect()
    }

    fun askPermission() = permLauncher.launch(GlovePermissions.required())
    fun enableBluetooth() {
        try { enableLauncher.launch(Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)) } catch (_: ActivityNotFoundException) {} catch (_: SecurityException) { askPermission() }
    }

    val needsPermission = !demo && !GlovePermissions.granted(context)
    val (heading, sub) = when {
        needsPermission -> "Allow Bluetooth" to "Gripwise needs Bluetooth permission to find your glove. It's only used to talk to the glove."
        status is GloveStatus.Connected -> "Glove connected" to if (settingsContext) "All sensors are sending data." else "All sensors are sending data. Next, calibrate it to your hand."
        status is GloveStatus.NotFound -> "No glove found" to "We couldn't find Gripwise_Glove nearby."
        status is GloveStatus.BluetoothOff -> "Bluetooth is off" to "Turn on Bluetooth so Gripwise can reach the glove."
        status is GloveStatus.NoBluetooth -> "No Bluetooth" to "This phone has no Bluetooth. You can still try Gripwise with the demo glove."
        status is GloveStatus.Lost -> "Reconnecting" to (status as GloveStatus.Lost).reason
        status is GloveStatus.Idle -> "Connect your glove" to "Switch the glove on and keep it within arm's reach of your phone."
        else -> "Looking for your glove" to "Switch the glove on and keep it within arm's reach of your phone."
    }

    GwScreen(footer = {
        when {
            needsPermission && denied -> {
                Banner("Bluetooth permission is off. In Settings, open Permissions and allow Nearby devices.", c.amberText, c.tintAmber, GwIcons.Warn)
                Spacer(Modifier.height(10.dp))
                PrimaryButton("Open settings", { openAppSettings() })
                LinkButton("Ask again", { askPermission() }, Modifier.fillMaxWidth())
            }
            needsPermission -> PrimaryButton("Allow Bluetooth", { askPermission() }, icon = GwIcons.Bluetooth)
            status is GloveStatus.Connected -> PrimaryButton(if (settingsContext) "Done" else "Continue", onContinue)
            status is GloveStatus.BluetoothOff -> PrimaryButton("Turn on Bluetooth", { enableBluetooth() }, icon = GwIcons.Bluetooth)
            status is GloveStatus.NotFound || status is GloveStatus.Idle -> PrimaryButton(if (status is GloveStatus.Idle) "Connect" else "Search again", { container.glove.reconnect() }, icon = GwIcons.Refresh)
            status is GloveStatus.NoBluetooth -> PrimaryButton("Use the demo glove", { scope.launch { container.settings.setDemo(true) } })
            else -> PrimaryButton("Searching…", {}, enabled = false)
        }
        if (demo) LinkButton("Use my real glove instead", { scope.launch { container.settings.setDemo(false) } }, Modifier.fillMaxWidth())
        else if (status !is GloveStatus.Connected) LinkButton("Use the demo glove instead", { scope.launch { container.settings.setDemo(true) } }, Modifier.fillMaxWidth())
        if (!settingsContext) LinkButton("Set up later", onLater, Modifier.fillMaxWidth())
    }) {
        if (settingsContext) TitleBar("Connect glove", onBack) else StepHeader(2, "Connect glove", onBack)
        Spacer(Modifier.height(20.dp))
        H1(heading)
        Spacer(Modifier.height(6.dp))
        Body(sub)
        Spacer(Modifier.height(18.dp))
        when {
            needsPermission -> Unit
            status is GloveStatus.Connected -> DeviceCard((status as GloveStatus.Connected).name, demo, reading?.fingers, reading?.tiltDeg)
            status is GloveStatus.NotFound -> NotFoundTips()
            status is GloveStatus.Scanning || status is GloveStatus.Connecting || status is GloveStatus.Lost -> ScanningCard()
            else -> Unit
        }
    }
}

@Composable
private fun ScanningCard() {
    val c = Gw.c
    GwCard(padding = 24.dp) {
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Box(Modifier.size(168.dp).border(2.dp, c.band, CircleShape), contentAlignment = Alignment.Center) {
                Box(Modifier.size(120.dp).border(2.dp, c.band, CircleShape), contentAlignment = Alignment.Center) {
                    Box(Modifier.size(80.dp).clip(CircleShape).background(c.tintBlue), contentAlignment = Alignment.Center) {
                        Icon(GwIcons.Glove, null, Modifier.size(36.dp), tint = c.link)
                    }
                }
            }
        }
        Spacer(Modifier.height(14.dp))
        Text("Searching for Gripwise_Glove…", Modifier.fillMaxWidth(), style = MaterialTheme.typography.titleSmall, color = c.text, textAlign = TextAlign.Center)
        Spacer(Modifier.height(6.dp))
        Small("If Android asks to pair, tap Pair.", Modifier.fillMaxWidth(), color = c.text2)
    }
}

@Composable
internal fun DeviceCard(name: String, demo: Boolean, fingers: List<Float>?, tilt: Float?) {
    val c = Gw.c
    GwCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(52.dp).clip(RoundedCornerShape(16.dp)).background(c.tintBlue), contentAlignment = Alignment.Center) {
                Icon(GwIcons.Glove, null, Modifier.size(28.dp), tint = c.link)
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(name, style = MaterialTheme.typography.titleMedium, color = c.text)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Dot(c.primary); Spacer(Modifier.width(6.dp))
                    Small(if (demo) "Simulated readings" else "Connected over Bluetooth", color = c.text2, size = 13)
                }
            }
            if (demo) Pill("Demo", c.accentText, c.tintBlue)
        }
        Spacer(Modifier.height(14.dp)); Divider(); Spacer(Modifier.height(14.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            listOf("Thumb", "Index", "Middle", "Ring").forEachIndexed { i, n ->
                val v = fingers?.getOrNull(i) ?: 0f
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(Modifier.width(12.dp).height(40.dp).clip(RoundedCornerShape(6.dp)).background(c.tintBlue), contentAlignment = Alignment.BottomCenter) {
                        Box(Modifier.fillMaxWidth().fillMaxHeight((v / 100f).coerceIn(0.05f, 1f)).clip(RoundedCornerShape(6.dp)).background(c.primary))
                    }
                    Spacer(Modifier.height(6.dp))
                    Small(n, color = c.text2, weight = FontWeight.SemiBold, size = 11)
                }
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(c.tintBlue), contentAlignment = Alignment.Center) {
                    Text(tilt?.let { "${it.roundToInt()}°" } ?: "–", style = MaterialTheme.typography.labelMedium, color = c.link)
                }
                Spacer(Modifier.height(6.dp))
                Small("Wrist", color = c.text2, weight = FontWeight.SemiBold, size = 11)
            }
        }
        Spacer(Modifier.height(14.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(GwIcons.CheckCircle, null, Modifier.size(18.dp), tint = c.greenText)
            Spacer(Modifier.width(8.dp))
            Small(if (fingers != null) "All 5 sensors responding · live every 0.4 s" else "Waiting for the first reading…", color = c.text2, size = 13)
        }
    }
}

@Composable
private fun NotFoundTips() {
    val c = Gw.c
    GwCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(GwIcons.Warn, null, Modifier.size(22.dp), tint = c.amberText)
            Spacer(Modifier.width(10.dp))
            Text("Try these, then search again", style = MaterialTheme.typography.titleSmall, color = c.amberText)
        }
        Spacer(Modifier.height(12.dp))
        listOf(
            "Switch the glove on and plug in its power.",
            "Turn on Bluetooth on your phone.",
            "Hold your phone within 1 metre of the glove.",
            "Pair \"Gripwise_Glove\" in your phone's Bluetooth settings, then come back.",
        ).forEachIndexed { i, t ->
            Row(Modifier.padding(vertical = 5.dp), verticalAlignment = Alignment.Top) {
                Box(Modifier.size(24.dp).clip(CircleShape).background(c.tintAmber), contentAlignment = Alignment.Center) {
                    Text("${i + 1}", style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.ExtraBold), color = c.amberText)
                }
                Spacer(Modifier.width(12.dp))
                Body(t, color = c.text, size = 14)
            }
        }
    }
}

