package io.github.ismibaimdev.gripwise.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import io.github.ismibaimdev.gripwise.AppContainer
import io.github.ismibaimdev.gripwise.exercises.PicColor
import io.github.ismibaimdev.gripwise.exercises.PicStroke
import io.github.ismibaimdev.gripwise.glove.DemoGlove
import io.github.ismibaimdev.gripwise.glove.GloveStatus
import io.github.ismibaimdev.gripwise.processing.Calibration
import io.github.ismibaimdev.gripwise.ui.LocalContainer
import io.github.ismibaimdev.gripwise.ui.components.Banner
import io.github.ismibaimdev.gripwise.ui.components.Body
import io.github.ismibaimdev.gripwise.ui.components.Divider
import io.github.ismibaimdev.gripwise.ui.components.GwCard
import io.github.ismibaimdev.gripwise.ui.components.GwIcons
import io.github.ismibaimdev.gripwise.ui.components.GwScreen
import io.github.ismibaimdev.gripwise.ui.components.H1
import io.github.ismibaimdev.gripwise.ui.components.HoldRing
import io.github.ismibaimdev.gripwise.ui.components.Label
import io.github.ismibaimdev.gripwise.ui.components.LinkButton
import io.github.ismibaimdev.gripwise.ui.components.OutlineButton
import io.github.ismibaimdev.gripwise.ui.components.Pictogram
import io.github.ismibaimdev.gripwise.ui.components.PrimaryButton
import io.github.ismibaimdev.gripwise.ui.components.Small
import io.github.ismibaimdev.gripwise.ui.components.StepHeader
import io.github.ismibaimdev.gripwise.ui.components.TitleBar
import io.github.ismibaimdev.gripwise.ui.theme.Gw
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private data class CalStepDef(val name: String, val hint: String, val saved: String, val pic: List<PicStroke>, val pose: DemoGlove.Pose)

private val CAL_STEPS = listOf(
    CalStepDef("Open hand, fingers straight", "Fingers straight, hand relaxed", "Saved as 0% bend",
        listOf(PicStroke("M23 57V86", PicColor.Navy, 18f), PicStroke("M28 52V8", PicColor.Navy, 10f)), DemoGlove.Pose(listOf(0f, 0f, 0f, 0f), 0f)),
    CalStepDef("Make a gentle fist", "Curl in fully, no need to squeeze", "Saved as 100% bend",
        listOf(PicStroke("M23 57V86", PicColor.Navy, 18f), PicStroke("M28 52H48V65H38", PicColor.Navy, 10f)), DemoGlove.Pose(listOf(100f, 100f, 100f, 100f), 0f)),
    CalStepDef("Rest your wrist flat", "Forearm and hand level on a table", "Saved as your neutral angle",
        listOf(PicStroke("M8 62H44", PicColor.Navy, 18f), PicStroke("M44 62H72", PicColor.Navy, 10f)), DemoGlove.Pose(listOf(15f, 15f, 15f, 15f), 0f)),
)

data class CalUi(
    val phase: Phase = Phase.Idle,
    val step: Int = 0,
    val leftMs: Long = 3000,
    val done: List<Boolean> = listOf(false, false, false),
    val warning: String? = null,
    val savedAt: Long = 0L,
) { enum class Phase { Idle, Running, Done } }

class CalibrateViewModel(private val c: AppContainer) : ViewModel() {
    private val _ui = MutableStateFlow(CalUi())
    val ui = _ui.asStateFlow()
    private var open: List<Int>? = null
    private var fist: List<Int>? = null
    private var ax: Float? = null
    private var job: Job? = null

    init {
        viewModelScope.launch {
            val cal = c.settings.flow.first().calibration
            if (cal.isSet) {
                open = cal.open; fist = cal.fist; ax = cal.axNeutral
                _ui.value = CalUi(phase = CalUi.Phase.Done, step = 3, done = listOf(true, true, true), savedAt = cal.savedAt)
            }
        }
    }

    fun startAll() = run(listOf(0, 1, 2))
    fun redo(step: Int) = run(listOf(step))
    fun cancel() {
        job?.cancel()
        val d = _ui.value.done
        _ui.value = _ui.value.copy(phase = if (d.all { it }) CalUi.Phase.Done else CalUi.Phase.Idle, leftMs = 3000)
        c.glove.setDemoPose(DemoGlove.Pose())
    }

    private fun run(steps: List<Int>) {
        job?.cancel()
        job = viewModelScope.launch {
            var done = _ui.value.done.toMutableList()
            if (steps.size == 3) done = mutableListOf(false, false, false)
            for (k in steps) {
                c.glove.setDemoPose(CAL_STEPS[k].pose, lag = false)
                _ui.value = _ui.value.copy(phase = CalUi.Phase.Running, step = k, leftMs = 3000, done = done.toList(), warning = null)
                delay(1_000) // time to get into position
                val samples = mutableListOf<IntArray>()
                val axs = mutableListOf<Float>()
                var left = 3000L
                while (left > 0) {
                    delay(100); left -= 100
                    c.reading.value?.frame?.let { f ->
                        if (System.currentTimeMillis() - f.timeMs < 1500) { samples += IntArray(4) { f.raw(it) }; axs += f.ax }
                    }
                    _ui.value = _ui.value.copy(leftMs = left)
                }
                if (samples.isEmpty()) {
                    _ui.value = _ui.value.copy(phase = CalUi.Phase.Idle, warning = "No readings came from the glove. Check it's connected, then try again.")
                    c.glove.setDemoPose(DemoGlove.Pose())
                    return@launch
                }
                // Median, so a twitch or a slow start doesn't skew the reading.
                val mid = List(4) { i -> samples.map { it[i] }.sorted()[samples.size / 2] }
                when (k) { 0 -> open = mid; 1 -> fist = mid; else -> ax = axs.sorted()[axs.size / 2] }
                done[k] = true
            }
            c.glove.setDemoPose(DemoGlove.Pose())
            val o = open; val f = fist
            if (done.all { it } && o != null && f != null) {
                val cal = Calibration(o, f, ax ?: 0f, System.currentTimeMillis())
                c.settings.setCalibration(cal)
                val weak = cal.weakFingers().map { listOf("thumb", "index", "middle", "ring")[it] }
                _ui.value = CalUi(
                    phase = CalUi.Phase.Done, step = 3, done = done.toList(), savedAt = cal.savedAt,
                    warning = if (weak.isEmpty()) null else "The ${weak.joinToString(" and ")} barely changed between open hand and fist. Check that sensor sits flat over the finger, then redo.",
                )
            } else {
                _ui.value = _ui.value.copy(phase = CalUi.Phase.Idle, done = done.toList())
            }
        }
    }

    companion object {
        fun factory(c: AppContainer) = viewModelFactory { initializer { CalibrateViewModel(c) } }
    }
}

/** Step 3 of onboarding, and the "Glove & calibration" screen from Profile. */
@Composable
fun CalibrateScreen(settingsContext: Boolean, onBack: () -> Unit, onDone: () -> Unit, onConnect: () -> Unit) {
    val container = LocalContainer.current
    val vm: CalibrateViewModel = viewModel(factory = CalibrateViewModel.factory(container))
    val ui by vm.ui.collectAsStateWithLifecycle()
    val status by container.glove.status.collectAsStateWithLifecycle()
    val demo by container.glove.demoMode.collectAsStateWithLifecycle()
    val reading by container.reading.collectAsStateWithLifecycle()
    val connected = status is GloveStatus.Connected
    val c = Gw.c
    val timeFmt = DateTimeFormatter.ofPattern("d MMM, h:mm a", Locale.UK)

    GwScreen(footer = {
        when (ui.phase) {
            CalUi.Phase.Idle -> if (connected) PrimaryButton("Start calibration", vm::startAll) else PrimaryButton("Connect the glove", onConnect, icon = GwIcons.Bluetooth)
            CalUi.Phase.Running -> OutlineButton("Stop calibration", vm::cancel)
            CalUi.Phase.Done -> {
                PrimaryButton(if (settingsContext) "Done" else "Finish setup", onDone)
                LinkButton("Recalibrate all", { if (connected) vm.startAll() else onConnect() }, Modifier.fillMaxWidth(), icon = GwIcons.Refresh)
            }
        }
    }) {
        if (settingsContext) {
            TitleBar("Glove & calibration", onBack, "Back to profile")
            Spacer(Modifier.height(16.dp))
            if (connected) DeviceCard((status as GloveStatus.Connected).name, demo, reading?.fingers, reading?.tiltDeg)
            else GwCard {
                Text("Glove not connected", style = MaterialTheme.typography.titleSmall, color = c.text)
                Small(statusText(status), color = c.text2, size = 13)
                Spacer(Modifier.height(10.dp))
                PrimaryButton("Connect", onConnect, height = 48.dp)
            }
            Spacer(Modifier.height(18.dp))
            Label(if (ui.savedAt > 0) "Hand calibration · saved ${Instant.ofEpochMilli(ui.savedAt).atZone(ZoneId.systemDefault()).format(timeFmt)}" else "Hand calibration · not saved yet")
            Spacer(Modifier.height(8.dp))
        } else {
            StepHeader(3, "Calibrate", onBack)
            Spacer(Modifier.height(20.dp))
            H1("Calibrate your hand")
            Spacer(Modifier.height(6.dp))
            Body("Hold each position for 3 seconds so Gripwise learns what 0% and 100% bend look like for you.")
            Spacer(Modifier.height(18.dp))
        }

        GwCard(padding = 8.dp) {
            CAL_STEPS.forEachIndexed { k, def ->
                val active = ui.phase == CalUi.Phase.Running && ui.step == k
                val done = ui.done[k] && !active
                if (k > 0 && !active) Divider()
                Column(
                    Modifier.fillMaxWidth().then(if (active) Modifier.clip(RoundedCornerShape(16.dp)).background(c.tintBlue) else Modifier)
                        .padding(horizontal = 8.dp, vertical = 10.dp),
                ) {
                    Row(Modifier.fillMaxWidth().heightIn(min = 52.dp), verticalAlignment = Alignment.CenterVertically) {
                        val (tile, ink) = when { active -> c.surface to c.link; done -> c.tintGreen to c.greenText; else -> c.surface2 to c.text3 }
                        Box(Modifier.size(width = 44.dp, height = 52.dp).clip(RoundedCornerShape(14.dp)).background(tile), contentAlignment = Alignment.Center) {
                            Pictogram(def.pic, size = 36.dp, base = ink)
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(def.name, style = MaterialTheme.typography.titleSmall, color = c.text)
                            Small(if (active) "Hold still · ${def.hint}" else if (done) def.saved else def.hint, color = if (active) c.accentText else c.text3, weight = if (active) FontWeight.SemiBold else FontWeight.Normal)
                        }
                        when {
                            active -> HoldRing(progress = 1f - ui.leftMs / 3000f, label = "${(ui.leftMs + 999) / 1000}s", size = 44.dp, showArc = ui.leftMs < 3000)
                            done -> Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(GwIcons.CheckCircle, "Saved", Modifier.size(22.dp), tint = c.greenText)
                                Spacer(Modifier.width(4.dp))
                                OutlineButton("Redo", { if (connected) vm.redo(k) else onConnect() }, Modifier.width(72.dp), enabled = ui.phase != CalUi.Phase.Running, height = 44.dp)
                            }
                            else -> Small("Next", weight = FontWeight.SemiBold)
                        }
                    }
                    if (active) {
                        Spacer(Modifier.height(8.dp))
                        val p = 1f - ui.leftMs / 3000f
                        Box(
                            Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)).background(c.ringTrack)
                                .semantics { contentDescription = "Hold progress"; progressBarRangeInfo = ProgressBarRangeInfo(p, 0f..1f) },
                        ) { Box(Modifier.fillMaxWidth(p.coerceIn(0.01f, 1f)).fillMaxHeight().clip(RoundedCornerShape(3.dp)).background(c.primary)) }
                    }
                }
            }
        }

        ui.warning?.let {
            Spacer(Modifier.height(14.dp))
            Banner(it, c.amberText, c.tintAmber, GwIcons.Warn)
        }
        if (ui.phase == CalUi.Phase.Done && ui.warning == null) {
            Spacer(Modifier.height(14.dp))
            Banner("Calibration saved. Gripwise now knows your hand's full range.", c.greenText, c.tintGreen, GwIcons.CheckCircle)
        }
        if (!connected && ui.phase != CalUi.Phase.Done && !settingsContext) {
            Spacer(Modifier.height(14.dp))
            Banner("Connect the glove to calibrate. ${statusText(status)}", c.text2, c.surface, GwIcons.Bluetooth)
        }
        Spacer(Modifier.padding(bottom = 4.dp))
    }
}

internal fun statusText(s: GloveStatus): String = when (s) {
    is GloveStatus.Connected -> "Connected to ${s.name}."
    is GloveStatus.Connecting -> "Connecting to ${s.name}…"
    GloveStatus.Scanning -> "Searching for the glove…"
    GloveStatus.NotFound -> "No glove found nearby."
    GloveStatus.BluetoothOff -> "Bluetooth is off."
    GloveStatus.NoPermission -> "Bluetooth permission is needed."
    GloveStatus.NoBluetooth -> "This phone has no Bluetooth."
    is GloveStatus.Lost -> s.reason
    GloveStatus.Idle -> "Not connected."
}
