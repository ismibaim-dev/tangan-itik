package io.github.ismibaimdev.gripwise.ui.screens

import android.annotation.SuppressLint
import android.content.Context
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.activity.compose.BackHandler
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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import io.github.ismibaimdev.gripwise.AppContainer
import io.github.ismibaimdev.gripwise.data.RawFrameEntity
import io.github.ismibaimdev.gripwise.data.SessionEntity
import io.github.ismibaimdev.gripwise.data.StepResultEntity
import io.github.ismibaimdev.gripwise.data.SymptomEntity
import io.github.ismibaimdev.gripwise.exercises.Exercise
import io.github.ismibaimdev.gripwise.exercises.ExerciseCatalog
import io.github.ismibaimdev.gripwise.exercises.Step
import io.github.ismibaimdev.gripwise.glove.DemoGlove
import io.github.ismibaimdev.gripwise.glove.GloveStatus
import io.github.ismibaimdev.gripwise.processing.SessionEngine
import io.github.ismibaimdev.gripwise.processing.StepEval
import io.github.ismibaimdev.gripwise.processing.evaluate
import io.github.ismibaimdev.gripwise.ui.LocalContainer
import io.github.ismibaimdev.gripwise.ui.components.Body
import io.github.ismibaimdev.gripwise.ui.components.CircleButton
import io.github.ismibaimdev.gripwise.ui.components.Dot
import io.github.ismibaimdev.gripwise.ui.components.GwIcons
import io.github.ismibaimdev.gripwise.ui.components.HoldRing
import io.github.ismibaimdev.gripwise.ui.components.LinkButton
import io.github.ismibaimdev.gripwise.ui.components.OutlineButton
import io.github.ismibaimdev.gripwise.ui.components.Pictogram
import io.github.ismibaimdev.gripwise.ui.components.Pill
import io.github.ismibaimdev.gripwise.ui.components.PrimaryButton
import io.github.ismibaimdev.gripwise.ui.components.SheetHandle
import io.github.ismibaimdev.gripwise.ui.components.Small
import io.github.ismibaimdev.gripwise.ui.components.TargetBar
import io.github.ismibaimdev.gripwise.ui.components.TiltMeter
import io.github.ismibaimdev.gripwise.ui.theme.Gw
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

enum class SessionSheet { Exit, Symptom }

data class SessionUi(
    val exercise: Exercise,
    val step: Int,
    val round: Int,
    val holdLeftMs: Long,
    val eval: StepEval,
    val paused: Boolean,
    val roundDone: Boolean,
    val moreRounds: Boolean,
    val disconnected: Boolean,
    val reconnecting: Boolean,
    /** The glove can't reconnect by itself (no permission, Bluetooth off): send the user to Connect. */
    val needsSetup: Boolean,
    val sheet: SessionSheet?,
    val symptom: String?,
    val symptomSaved: Boolean,
    val sound: Boolean,
    val demo: Boolean,
)

/** [app] is the application context, so holding it here doesn't leak a screen. */
@SuppressLint("StaticFieldLeak")
class SessionViewModel(private val c: AppContainer, exerciseId: String, private val app: Context) : ViewModel() {
    val exercise = ExerciseCatalog.byId(exerciseId)
    private val engine = SessionEngine(exercise)
    private var sheet: SessionSheet? = null
    private var symptom: String? = null
    private var symptomSaved = false
    private var sound = true
    private var savedId: Long? = null
    private val frames = ArrayList<RawFrameEntity>()
    private var tone: ToneGenerator? = null

    private val _ui = MutableStateFlow(snapshot())
    val ui = _ui.asStateFlow()

    init {
        viewModelScope.launch { sound = c.settings.flow.first().soundCue; publish() }
        if (c.glove.status.value !is GloveStatus.Connected) c.glove.connect()
        pushDemoPose()
        viewModelScope.launch {
            c.glove.frames.collect { f ->
                if (!engine.paused && sheet == null && !engine.roundDone && frames.size < 20_000) {
                    frames += RawFrameEntity(0, 0, f.timeMs, f.thumb, f.index, f.middle, f.ring, f.ax, f.ay, f.wrist.wire)
                }
            }
        }
        viewModelScope.launch {
            var last = System.currentTimeMillis()
            while (true) {
                delay(200)
                val now = System.currentTimeMillis()
                val dt = (now - last).coerceAtMost(1000); last = now
                val r = c.reading.value?.takeIf { now - it.frame.timeMs < 3_500 }
                val stepBefore = engine.step
                val event = engine.tick(dt, r, blocked = isDisconnected() || sheet != null)
                if (event != null) cue(event == SessionEngine.Event.RoundDone)
                if (engine.step != stepBefore) pushDemoPose()
                publish()
            }
        }
    }

    private fun isDisconnected() = c.glove.status.value !is GloveStatus.Connected

    private fun snapshot(): SessionUi {
        val status = c.glove.status.value
        val r = c.reading.value?.takeIf { System.currentTimeMillis() - it.frame.timeMs < 3_500 }
        return SessionUi(
            exercise = exercise, step = engine.step, round = engine.round, holdLeftMs = engine.holdLeftMs,
            eval = evaluate(engine.currentStep, r), paused = engine.paused, roundDone = engine.roundDone, moreRounds = engine.moreRounds,
            disconnected = status !is GloveStatus.Connected,
            reconnecting = status is GloveStatus.Scanning || status is GloveStatus.Connecting || status is GloveStatus.Lost,
            needsSetup = status is GloveStatus.NoPermission || status is GloveStatus.BluetoothOff || status is GloveStatus.NoBluetooth,
            sheet = sheet, symptom = symptom, symptomSaved = symptomSaved, sound = sound, demo = c.glove.demoMode.value,
        )
    }

    private fun publish() { _ui.value = snapshot() }

    /** Moves the demo glove toward the middle of the current step's targets. */
    private fun pushDemoPose() {
        val step: Step = engine.currentStep
        val fingers = MutableList(4) { 12f }
        step.targets.forEach { t -> t.fingers.forEach { fingers[it] = (t.lo + t.hi) / 2f } }
        val tilt = if (step.checksWrist) (step.wristLo!! + step.wristHi!!) / 2f else 0f
        c.glove.setDemoPose(DemoGlove.Pose(fingers, tilt))
    }

    private fun cue(big: Boolean) {
        if (!sound) return
        runCatching {
            val t = tone ?: ToneGenerator(AudioManager.STREAM_NOTIFICATION, 70).also { tone = it }
            t.startTone(if (big) ToneGenerator.TONE_PROP_ACK else ToneGenerator.TONE_PROP_BEEP, if (big) 300 else 120)
        }
        runCatching {
            val v: Vibrator = if (Build.VERSION.SDK_INT >= 31) app.getSystemService(VibratorManager::class.java).defaultVibrator
            else @Suppress("DEPRECATION") app.getSystemService(Vibrator::class.java)
            v.vibrate(VibrationEffect.createOneShot(if (big) 180 else 60, VibrationEffect.DEFAULT_AMPLITUDE))
        }
    }

    fun togglePause() { engine.paused = !engine.paused; publish() }
    fun back() { engine.back(); pushDemoPose(); publish() }
    fun skip() { engine.skip(); pushDemoPose(); publish() }
    fun nextRound() { engine.nextRound(); pushDemoPose(); publish() }
    fun reconnect() { c.glove.reconnect(); publish() }
    fun toggleSound() {
        sound = !sound
        viewModelScope.launch { c.settings.setSound(sound) }
        publish()
    }
    fun openSheet(s: SessionSheet) { sheet = s; if (s == SessionSheet.Symptom) { symptom = null; symptomSaved = false }; publish() }
    fun closeSheet() { if (!symptomSaved) { sheet = null; publish() } }
    fun pickSymptom(s: String) { symptom = s; publish() }

    fun saveSymptom() {
        val s = symptom ?: return
        viewModelScope.launch {
            val id = save(completed = false)
            c.dao.insertSymptom(SymptomEntity(sessionId = id, exerciseId = exercise.id, stepName = engine.currentStep.name, symptom = s, createdAt = System.currentTimeMillis()))
            symptomSaved = true
            publish()
        }
    }

    /** Saves once; later calls return the same id. Returns null if nothing was done yet. */
    suspend fun save(completed: Boolean): Long? {
        savedId?.let { return it }
        if (engine.holdsDone == 0 && !completed && engine.elapsedSec() < 10) return null
        val now = System.currentTimeMillis()
        val roundsDone = engine.round - 1 + if (engine.roundDone) 1 else 0
        val entity = SessionEntity(
            exerciseId = exercise.id, exerciseName = exercise.name, startedAt = engine.startedAt, endedAt = now,
            durationSec = engine.elapsedSec(now), roundsDone = roundsDone, holdsDone = engine.holdsDone, holdsTarget = engine.holdsTarget,
            inZonePct = engine.inZonePercent(),
            bestThumb = engine.best[0], bestIndex = engine.best[1], bestMiddle = engine.best[2], bestRing = engine.best[3],
            completed = completed, demo = c.glove.demoMode.value,
        )
        val steps = exercise.steps.mapIndexed { i, st -> StepResultEntity(sessionId = 0, stepIndex = i, stepName = st.name, inZonePct = engine.stepPercent(i)) }
        return c.dao.saveSession(entity, steps, frames.toList()).also { savedId = it }
    }

    override fun onCleared() {
        tone?.release()
        c.glove.setDemoPose(DemoGlove.Pose())
    }

    companion object {
        fun factory(c: AppContainer, id: String, app: Context) = viewModelFactory { initializer { SessionViewModel(c, id, app) } }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SessionScreen(exerciseId: String, onExit: () -> Unit, onFinished: (Long) -> Unit, onHome: () -> Unit, onConnect: () -> Unit) {
    val container = LocalContainer.current
    val view = LocalView.current
    val vm: SessionViewModel = viewModel(key = "session-$exerciseId", factory = SessionViewModel.factory(container, exerciseId, view.context.applicationContext))
    val ui by vm.ui.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope { Dispatchers.Main.immediate }
    val c = Gw.c
    val ex = ui.exercise
    val step = ex.steps[ui.step]

    // Android may drop the Bluetooth link when the screen sleeps, so keep it on during a session.
    DisposableEffect(view) {
        view.keepScreenOn = true
        onDispose { view.keepScreenOn = false }
    }
    BackHandler { vm.openSheet(SessionSheet.Exit) }

    fun finish() = scope.launch { vm.save(completed = true)?.let(onFinished) ?: onExit() }
    fun endEarly() = scope.launch { vm.save(completed = false); onExit() }

    Column(Modifier.fillMaxSize().background(c.bg)) {
        Column(Modifier.statusBarsPadding().padding(start = 20.dp, end = 20.dp, top = 12.dp)) {
            Row(Modifier.fillMaxWidth().heightIn(min = 44.dp), verticalAlignment = Alignment.CenterVertically) {
                CircleButton(GwIcons.Close, "End session", { vm.openSheet(SessionSheet.Exit) })
                Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(ex.name, style = MaterialTheme.typography.titleMedium, color = c.text)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Dot(if (ui.disconnected) c.amberFill else c.primary, 7.dp)
                        Spacer(Modifier.width(6.dp))
                        Small("Round ${ui.round} of ${ex.rounds} · ${if (ui.disconnected) "glove disconnected" else if (ui.demo) "demo glove" else "glove live"}", weight = FontWeight.Medium)
                    }
                }
                CircleButton(
                    if (ui.sound) GwIcons.Sound else GwIcons.Mute,
                    if (ui.sound) "Sound and vibration cues on" else "Sound and vibration cues off",
                    vm::toggleSound, tint = if (ui.sound) c.link else c.text3,
                )
            }
            Spacer(Modifier.height(12.dp))
            Row(Modifier.fillMaxWidth().semantics { contentDescription = "Step ${ui.step + 1} of ${ex.steps.size}" }, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                ex.steps.indices.forEach { k ->
                    val col = when { ui.roundDone || k < ui.step -> c.greenText; k == ui.step -> c.primary; else -> c.border }
                    Box(Modifier.weight(1f).height(6.dp).clip(RoundedCornerShape(3.dp)).background(col))
                }
            }
        }

        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (ui.disconnected) {
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(c.tintAmber).padding(horizontal = 14.dp, vertical = 12.dp).semantics { liveRegion = LiveRegionMode.Assertive }, verticalAlignment = Alignment.CenterVertically) {
                    Icon(GwIcons.Bluetooth, null, Modifier.size(22.dp), tint = c.amberText)
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Glove disconnected", style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold), color = c.amberText)
                        Small("Timer paused. Check the glove is on and nearby.", color = c.amberText, weight = FontWeight.Medium)
                    }
                    if (ui.reconnecting) Small("Reconnecting…", color = c.amberText, weight = FontWeight.Bold)
                    else Box(Modifier.heightIn(min = 44.dp).clip(RoundedCornerShape(22.dp)).background(c.primary).clickable(role = Role.Button, onClick = if (ui.needsSetup) onConnect else vm::reconnect).padding(horizontal = 14.dp), contentAlignment = Alignment.Center) {
                        Text(if (ui.needsSetup) "Connect" else "Reconnect", style = MaterialTheme.typography.labelMedium.copy(fontSize = 13.sp, fontWeight = FontWeight.Bold), color = c.onPrimary)
                    }
                }
            } else if (ui.paused && !ui.roundDone) {
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(c.surface).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(GwIcons.Pause, null, Modifier.size(20.dp), tint = c.text2)
                    Spacer(Modifier.width(10.dp))
                    Text("Paused. Take your time, then tap Resume.", style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), color = c.text2)
                }
            }

            if (ui.roundDone) {
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(28.dp)).background(c.tintGreen).padding(horizontal = 20.dp, vertical = 28.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(Modifier.size(64.dp).clip(CircleShape).background(c.greenText), contentAlignment = Alignment.Center) { Icon(GwIcons.Check, null, Modifier.size(34.dp), tint = c.tintGreen) }
                    Spacer(Modifier.height(10.dp))
                    Text("Round ${ui.round} complete", Modifier.semantics { heading() }, style = MaterialTheme.typography.headlineSmall.copy(fontSize = 24.sp), color = c.text)
                    Spacer(Modifier.height(6.dp))
                    val left = ex.rounds - ui.round
                    Body(if (ui.moreRounds) "$left ${if (left == 1) "round" else "rounds"} to go. Shake your hands out and rest a few seconds first." else "That was the last round for today. Well done.", Modifier.fillMaxWidth())
                }
            } else {
                PosePanel(step, ui)
                StatusLine(ui)
                TrackingCard(step, ui.eval)
            }
        }

        Column(Modifier.fillMaxWidth().background(c.bg).navigationBarsPadding().padding(horizontal = 20.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            if (!ui.roundDone) {
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 48.dp).clip(RoundedCornerShape(24.dp)).border(1.5.dp, c.amberText, RoundedCornerShape(24.dp))
                        .background(c.tintAmber).clickable(role = Role.Button) { vm.openSheet(SessionSheet.Symptom) },
                    horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(GwIcons.Warn, null, Modifier.size(18.dp), tint = c.amberText)
                    Spacer(Modifier.width(8.dp))
                    Text("Felt tingling or pain", style = MaterialTheme.typography.labelLarge, color = c.amberText)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlineButton("", vm::back, Modifier.width(72.dp).semantics { contentDescription = "Previous step" }, enabled = ui.step > 0, icon = GwIcons.Prev)
                    PrimaryButton(if (ui.paused) "Resume" else "Pause", vm::togglePause, Modifier.weight(1f), icon = if (ui.paused) GwIcons.Play else GwIcons.Pause)
                    OutlineButton("", vm::skip, Modifier.width(72.dp).semantics { contentDescription = "Skip to next step" }, icon = GwIcons.Skip)
                }
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlineButton("Finish for now", { finish() }, Modifier.weight(1f))
                    if (ui.moreRounds) PrimaryButton("Start round ${ui.round + 1}", vm::nextRound, Modifier.weight(1f))
                }
            }
        }
    }

    if (ui.sheet != null) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(onDismissRequest = vm::closeSheet, sheetState = sheetState, containerColor = c.surface, dragHandle = null) {
            Column(Modifier.padding(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 24.dp).navigationBarsPadding(), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                SheetHandle()
                when {
                    ui.sheet == SessionSheet.Exit -> {
                        Text("End this session?", Modifier.semantics { heading() }, style = MaterialTheme.typography.titleLarge, color = c.text)
                        Body("You are on round ${ui.round}, step ${ui.step + 1}. What you have done so far is saved, so you can come back to this later.")
                        PrimaryButton("Resume", vm::closeSheet)
                        OutlineButton("End session", { endEarly() }, color = c.danger)
                    }
                    !ui.symptomSaved -> {
                        Text("Stop and rest", Modifier.semantics { heading() }, style = MaterialTheme.typography.titleLarge, color = c.text)
                        Body("This set has stopped and the timer is paused. What did you feel?")
                        listOf(listOf("Tingling", "Numbness"), listOf("Pain", "Something else")).forEach { row ->
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                row.forEach { o ->
                                    val on = ui.symptom == o
                                    Box(
                                        Modifier.weight(1f).heightIn(min = 48.dp).clip(RoundedCornerShape(16.dp))
                                            .border(if (on) 2.dp else 1.5.dp, if (on) c.amberText else c.border, RoundedCornerShape(16.dp))
                                            .background(if (on) c.tintAmber else c.surface)
                                            .selectable(selected = on, role = Role.RadioButton) { vm.pickSymptom(o) },
                                        contentAlignment = Alignment.Center,
                                    ) { Text(o, style = MaterialTheme.typography.labelLarge, color = if (on) c.amberText else c.text) }
                                }
                            }
                        }
                        PrimaryButton("Save and end set", vm::saveSymptom, enabled = ui.symptom != null)
                        LinkButton("Cancel, keep going", vm::closeSheet, Modifier.fillMaxWidth())
                    }
                    else -> {
                        Box(Modifier.size(56.dp).clip(CircleShape).background(c.tintGreen), contentAlignment = Alignment.Center) { Icon(GwIcons.Check, null, Modifier.size(30.dp), tint = c.greenText) }
                        Text("Saved to your symptom log", Modifier.semantics { heading() }, style = MaterialTheme.typography.titleLarge, color = c.text)
                        Body("We noted ${ui.symptom?.lowercase()} during ${step.name.lowercase()}. Rest your hand for a few minutes. If it keeps happening, let your physiotherapist know.")
                        PrimaryButton("Back to home", onHome)
                    }
                }
            }
        }
    }
}

@Composable
private fun PosePanel(step: Step, ui: SessionUi) {
    val c = Gw.c
    val hold = ui.exercise.holdSec * 1000L
    val counting = ui.eval.allOk && !ui.disconnected && !ui.paused && ui.holdLeftMs < hold
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(28.dp)).background(c.tintBlue).padding(16.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Pill("Step ${ui.step + 1} of ${ui.exercise.steps.size}", c.accentText, c.surface)
            Spacer(Modifier.weight(1f))
            Text("Auto", style = MaterialTheme.typography.labelMedium, color = c.accentText)
            Spacer(Modifier.width(6.dp))
            val secs = ((if (ui.eval.allOk) ui.holdLeftMs else hold) + 999) / 1000
            HoldRing(
                progress = 1f - ui.holdLeftMs.toFloat() / hold, label = "${secs}s", showArc = counting,
                modifier = Modifier.semantics { contentDescription = "Hold timer, $secs seconds. Moves on automatically." },
            )
        }
        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.Top) {
            Box(Modifier.size(width = 108.dp, height = 112.dp).clip(RoundedCornerShape(22.dp)).background(c.surface), contentAlignment = Alignment.Center) {
                Pictogram(step.pic, size = 92.dp, description = "How to do: ${step.name}")
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(step.name, Modifier.semantics { heading() }, style = MaterialTheme.typography.headlineSmall.copy(fontSize = 21.sp), color = c.text)
                Spacer(Modifier.height(6.dp))
                Body(step.cue, size = 14)
            }
        }
    }
}

@Composable
private fun StatusLine(ui: SessionUi) {
    val c = Gw.c
    val (text, fg, bg, icon) = when {
        ui.disconnected -> Quad("Timer paused while the glove reconnects.", c.text2, c.surface, GwIcons.Pause)
        ui.paused -> Quad("Paused.", c.text2, c.surface, GwIcons.Pause)
        !ui.eval.hasData -> Quad("Waiting for glove data…", c.text2, c.surface, GwIcons.Bluetooth)
        !ui.eval.allOk -> Quad(ui.eval.message ?: "Adjust your hand.", c.amberText, c.tintAmber, GwIcons.Warn)
        else -> Quad("Good form. Hold still, next step in ${(ui.holdLeftMs + 999) / 1000} s.", c.accentText, c.tintBlue, GwIcons.CheckCircle)
    }
    Row(
        Modifier.fillMaxWidth().heightIn(min = 44.dp).clip(RoundedCornerShape(16.dp)).background(bg).padding(horizontal = 14.dp, vertical = 10.dp)
            .semantics { liveRegion = LiveRegionMode.Polite },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, Modifier.size(20.dp), tint = fg)
        Spacer(Modifier.width(10.dp))
        Text(text, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), color = fg)
    }
}

private data class Quad(val text: String, val fg: androidx.compose.ui.graphics.Color, val bg: androidx.compose.ui.graphics.Color, val icon: androidx.compose.ui.graphics.vector.ImageVector)

@Composable
private fun TrackingCard(step: Step, eval: StepEval) {
    val c = Gw.c
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(c.surface).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(Modifier.fillMaxWidth().heightIn(min = 26.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("Live tracking", Modifier.weight(1f).semantics { heading() }, style = MaterialTheme.typography.titleSmall, color = c.text)
            when {
                step.note != null -> Pill(step.note, c.accentText, c.tintBlue)
                eval.wristLevel == true -> Pill("Wrist neutral", c.greenText, c.tintGreen, icon = GwIcons.Check)
                eval.wristLevel == false -> Pill("Level your wrist", c.amberText, c.tintAmber)
            }
        }
        eval.wrist?.let { TiltMeter(it.label, it.tilt, it.lo, it.hi, it.ok) }
        eval.bars.forEach { b ->
            val text = if (!eval.hasData) "–" else if (b.ok) "${b.value.roundToInt()}%" else "${b.value.roundToInt()}% · ${b.hint}"
            TargetBar(b.label, text, b.value, b.lo, b.hi, b.ok)
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(width = 18.dp, height = 10.dp).clip(RoundedCornerShape(3.dp)).background(c.band))
            Spacer(Modifier.width(8.dp))
            Small("Target zone for this step")
        }
    }
}

