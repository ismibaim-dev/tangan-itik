package io.github.ismibaimdev.gripwise.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import io.github.ismibaimdev.gripwise.data.ProgressCalc
import io.github.ismibaimdev.gripwise.data.ProgressData
import io.github.ismibaimdev.gripwise.data.key
import io.github.ismibaimdev.gripwise.data.startMillis
import io.github.ismibaimdev.gripwise.ui.LocalContainer
import io.github.ismibaimdev.gripwise.ui.components.Body
import io.github.ismibaimdev.gripwise.ui.components.BottomBar
import io.github.ismibaimdev.gripwise.ui.components.GwCard
import io.github.ismibaimdev.gripwise.ui.components.GwIcons
import io.github.ismibaimdev.gripwise.ui.components.GwScreen
import io.github.ismibaimdev.gripwise.ui.components.H1
import io.github.ismibaimdev.gripwise.ui.components.Label
import io.github.ismibaimdev.gripwise.ui.components.OutlineButton
import io.github.ismibaimdev.gripwise.ui.components.Segmented
import io.github.ismibaimdev.gripwise.ui.components.Small
import io.github.ismibaimdev.gripwise.ui.components.StatTile
import io.github.ismibaimdev.gripwise.ui.components.Tab
import io.github.ismibaimdev.gripwise.ui.theme.Gw
import java.time.LocalDate
import kotlin.math.abs
import kotlin.math.max

@Composable
fun ProgressScreen(onTab: (Tab) -> Unit, onExport: () -> Unit) {
    val container = LocalContainer.current
    val c = Gw.c
    var tab by rememberSaveable { mutableStateOf(0) }
    val today = remember { LocalDate.now() }
    // Two full periods back, so the "vs last week/month" comparison has data.
    val from = remember { today.minusDays(70) }
    val sessions by remember { container.dao.sessionsSince(from.startMillis()) }.collectAsStateWithLifecycle(emptyList())
    val symptoms by remember { container.dao.symptomsSince(from.startMillis()) }.collectAsStateWithLifecycle(emptyList())
    val checkins by remember { container.dao.checkinsSince(from.key()) }.collectAsStateWithLifecycle(emptyList())
    val p = remember(tab, sessions, symptoms, checkins) {
        if (tab == 0) ProgressCalc.week(sessions, symptoms, checkins, today) else ProgressCalc.month(sessions, symptoms, checkins, today)
    }

    Column(Modifier.fillMaxSize()) {
        GwScreen(Modifier.weight(1f)) {
            H1("Progress", size = 28)
            Spacer(Modifier.height(14.dp))
            Segmented(listOf("Week", "Month"), tab, { tab = it })
            Spacer(Modifier.height(16.dp))
            if (!p.hasData) {
                GwCard {
                    Text("No sessions this ${p.unit} yet", style = MaterialTheme.typography.titleSmall, color = c.text)
                    Spacer(Modifier.height(4.dp))
                    Body("Finish an exercise and your reps, active days and best bend will show up here.", size = 14)
                }
                Spacer(Modifier.height(16.dp))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatTile("${p.reps}", p.repsLabel, Modifier.weight(1f))
                StatTile("${p.activeDays}", "Active days", Modifier.weight(1f), suffix = "/${p.totalDays}")
            }
            Spacer(Modifier.height(10.dp))
            ChangeLine(p)
            Spacer(Modifier.height(16.dp))
            GwCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(p.chartTitle, Modifier.weight(1f).semantics { heading() }, style = MaterialTheme.typography.titleSmall, color = c.text)
                    Small(p.goalLabel, color = c.text2, weight = FontWeight.SemiBold)
                }
                Small(p.rangeText, color = c.text3)
                Spacer(Modifier.height(12.dp))
                RepsChart(p)
            }
            Spacer(Modifier.height(16.dp))
            Label("Best bend this ${p.unit}")
            Spacer(Modifier.height(8.dp))
            GwCard {
                p.fingers.forEachIndexed { i, f ->
                    if (i > 0) Spacer(Modifier.height(10.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(f.name, Modifier.width(64.dp), style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), color = c.text)
                        Box(Modifier.weight(1f).height(10.dp).clip(RoundedCornerShape(5.dp)).background(c.track)) {
                            Box(Modifier.fillMaxWidth((f.value / 100f).coerceIn(0.02f, 1f)).height(10.dp).clip(RoundedCornerShape(5.dp)).background(c.bar))
                        }
                        Spacer(Modifier.width(10.dp))
                        Text("${f.value}%", Modifier.width(44.dp), style = MaterialTheme.typography.labelLarge, color = c.text)
                        val d = f.delta
                        Small(
                            when { d == null -> ""; d > 0 -> "+$d"; d < 0 -> "$d"; else -> "±0" },
                            Modifier.width(36.dp), color = if ((d ?: 0) >= 0) c.greenText else c.amberText, weight = FontWeight.Bold,
                        )
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
            GwCard(color = if (p.tingleNow > 0) c.tintAmber else c.surface) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(GwIcons.Pulse, null, Modifier.size(22.dp), tint = if (p.tingleNow > 0) c.amberText else c.text2)
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Tingling reported", style = MaterialTheme.typography.titleSmall, color = c.text)
                        Small(
                            when {
                                p.tingleNow == 0 && p.tinglePrev == 0 -> "None this ${p.unit}. Keep it up."
                                p.tingleNow < p.tinglePrev -> "${p.tingleNow} this ${p.unit}, down from ${p.tinglePrev}."
                                p.tingleNow > p.tinglePrev -> "${p.tingleNow} this ${p.unit}, up from ${p.tinglePrev}. Mention it to your physiotherapist."
                                else -> "${p.tingleNow} this ${p.unit}, same as before."
                            },
                            color = c.text2, size = 13,
                        )
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
            OutlineButton("Export for my physiotherapist", onExport, icon = GwIcons.Download, height = 52.dp)
        }
        BottomBar(Tab.Progress, onTab)
    }
}

@Composable
private fun ChangeLine(p: ProgressData) {
    val c = Gw.c
    val ch = p.changePct
    val (text, fg, bg) = when {
        ch == null -> Triple("No earlier data to compare yet", c.text2, c.surface)
        ch >= 0 -> Triple("Up ${ch}% ${p.changeLabel}", c.greenText, c.tintGreen)
        else -> Triple("Down ${abs(ch)}% ${p.changeLabel}", c.amberText, c.tintAmber)
    }
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(bg).padding(horizontal = 14.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(GwIcons.Chart, null, Modifier.size(18.dp), tint = fg)
        Spacer(Modifier.width(8.dp))
        Text(text, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), color = fg)
    }
}

@Composable
private fun RepsChart(p: ProgressData) {
    val c = Gw.c
    val top = max(p.goal * 1.25f, (p.bars.maxOfOrNull { it.value } ?: 0) * 1.1f).coerceAtLeast(1f)
    val desc = p.bars.joinToString(", ") { "${it.label} ${it.value}" }
    Column(Modifier.semantics { contentDescription = "${p.chartTitle}: $desc. ${p.goalLabel}." }) {
        Box(Modifier.fillMaxWidth().height(160.dp)) {
            Canvas(Modifier.fillMaxSize()) {
                val n = p.bars.size
                val slot = size.width / n
                val bw = slot * 0.5f
                val goalY = size.height * (1 - p.goal / top)
                drawLine(c.border, Offset(0f, size.height), Offset(size.width, size.height), 2f)
                p.bars.forEachIndexed { i, b ->
                    val h = size.height * (b.value / top)
                    val x = slot * i + (slot - bw) / 2
                    if (b.value > 0) drawRoundRect(if (b.current) c.primary else c.bar.copy(alpha = 0.55f), Offset(x, size.height - h), Size(bw, h), CornerRadius(10f, 10f))
                }
                drawLine(c.amberText, Offset(0f, goalY), Offset(size.width, goalY), 3f, pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 10f)))
            }
        }
        Spacer(Modifier.height(6.dp))
        Row(Modifier.fillMaxWidth()) {
            p.bars.forEach { b ->
                Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                    Small("${b.value}", color = if (b.current) c.text else c.text2, weight = FontWeight.Bold, size = 11)
                    Small(b.label, color = if (b.current) c.link else c.text3, weight = if (b.current) FontWeight.Bold else FontWeight.Medium, size = 11)
                }
            }
        }
    }
}
