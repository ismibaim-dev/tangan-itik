package io.github.ismibaimdev.gripwise.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.ismibaimdev.gripwise.exercises.Tint
import io.github.ismibaimdev.gripwise.ui.theme.GripwiseColors
import io.github.ismibaimdev.gripwise.ui.theme.Gw

/** A scrolling screen with the status-bar inset handled, and an optional pinned footer. */
@Composable
fun GwScreen(
    modifier: Modifier = Modifier,
    background: Color = Gw.c.bg,
    scroll: Boolean = true,
    footer: (@Composable ColumnScope.() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(modifier.fillMaxSize().background(background).imePadding()) {
        Column(
            Modifier.weight(1f).fillMaxWidth()
                .then(if (scroll) Modifier.verticalScroll(rememberScrollState()) else Modifier)
                .statusBarsPadding()
                .padding(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 20.dp),
            content = content,
        )
        if (footer != null) {
            Column(Modifier.fillMaxWidth().background(background).navigationBarsPadding().padding(horizontal = 20.dp, vertical = 10.dp), content = footer)
        }
    }
}

@Composable
fun H1(text: String, modifier: Modifier = Modifier, size: Int = 26) =
    Text(text, modifier.semantics { heading() }, style = MaterialTheme.typography.headlineMedium.copy(fontSize = size.sp, lineHeight = (size * 1.2).sp), color = Gw.c.text)

@Composable
fun Body(text: String, modifier: Modifier = Modifier, color: Color = Gw.c.text2, size: Int = 15) =
    Text(text, modifier, style = MaterialTheme.typography.bodyLarge.copy(fontSize = size.sp, lineHeight = (size * 1.5).sp), color = color)

@Composable
fun Label(text: String, modifier: Modifier = Modifier, color: Color = Gw.c.text2) =
    Text(text, modifier.semantics { heading() }, style = MaterialTheme.typography.labelMedium.copy(fontSize = 13.sp, fontWeight = FontWeight.Bold), color = color)

@Composable
fun Small(text: String, modifier: Modifier = Modifier, color: Color = Gw.c.text3, weight: FontWeight = FontWeight.Normal, size: Int = 12) =
    Text(text, modifier, style = TextStyle(fontFamily = MaterialTheme.typography.bodySmall.fontFamily, fontSize = size.sp, fontWeight = weight, lineHeight = (size * 1.4).sp), color = color)

@Composable
fun GwCard(modifier: Modifier = Modifier, color: Color = Gw.c.surface, radius: Dp = 22.dp, padding: Dp = 16.dp, content: @Composable ColumnScope.() -> Unit) {
    Column(modifier.fillMaxWidth().clip(RoundedCornerShape(radius)).background(color).padding(padding), content = content)
}

@Composable
fun PrimaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, icon: ImageVector? = null, height: Dp = 56.dp) {
    val c = Gw.c
    Row(
        modifier.fillMaxWidth().height(height).clip(RoundedCornerShape(height / 2))
            .background(if (enabled) c.primary else c.surface2)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick),
        horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) { Icon(icon, null, Modifier.size(18.dp), tint = if (enabled) c.onPrimary else c.text3); Spacer(Modifier.width(8.dp)) }
        Text(text, style = MaterialTheme.typography.labelLarge.copy(fontSize = 16.sp), color = if (enabled) c.onPrimary else c.text3)
    }
}

@Composable
fun OutlineButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, icon: ImageVector? = null, color: Color = Gw.c.text, height: Dp = 56.dp) {
    val c = Gw.c
    Row(
        modifier.fillMaxWidth().height(height).clip(RoundedCornerShape(height / 2))
            .border(1.5.dp, c.border, RoundedCornerShape(height / 2)).background(c.surface)
            .alpha(if (enabled) 1f else 0.45f)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick),
        horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) { Icon(icon, null, Modifier.size(18.dp), tint = color); Spacer(Modifier.width(8.dp)) }
        Text(text, style = MaterialTheme.typography.labelLarge, color = color)
    }
}

@Composable
fun LinkButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, color: Color = Gw.c.link, icon: ImageVector? = null) {
    Row(
        modifier.heightIn(min = 48.dp).clip(RoundedCornerShape(12.dp)).clickable(role = Role.Button, onClick = onClick).padding(horizontal = 8.dp),
        horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) { Icon(icon, null, Modifier.size(16.dp), tint = color); Spacer(Modifier.width(6.dp)) }
        Text(text, style = MaterialTheme.typography.labelLarge, color = color)
    }
}

@Composable
fun CircleButton(icon: ImageVector, description: String, onClick: () -> Unit, modifier: Modifier = Modifier, tint: Color = Gw.c.text, enabled: Boolean = true) {
    Box(
        modifier.size(44.dp).clip(CircleShape).background(Gw.c.surface).alpha(if (enabled) 1f else 0.4f)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .semantics { contentDescription = description },
        contentAlignment = Alignment.Center,
    ) { Icon(icon, null, Modifier.size(20.dp), tint = tint) }
}

/** Back button + 3 onboarding bars + "Step n of 3 · label". */
@Composable
fun StepHeader(step: Int, label: String, onBack: () -> Unit) {
    val c = Gw.c
    Row(Modifier.fillMaxWidth().heightIn(min = 44.dp), verticalAlignment = Alignment.CenterVertically) {
        CircleButton(GwIcons.Back, "Back", onBack)
        Column(Modifier.weight(1f).padding(horizontal = 14.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                repeat(3) { i -> Box(Modifier.weight(1f).height(6.dp).clip(RoundedCornerShape(3.dp)).background(if (i < step) c.gold else c.border)) }
            }
            Spacer(Modifier.height(6.dp))
            Small("Step $step of 3 · $label", weight = FontWeight.SemiBold)
        }
        Spacer(Modifier.width(44.dp))
    }
}

@Composable
fun TitleBar(title: String, onBack: () -> Unit, backLabel: String = "Back") {
    Row(Modifier.fillMaxWidth().heightIn(min = 44.dp), verticalAlignment = Alignment.CenterVertically) {
        CircleButton(GwIcons.Back, backLabel, onBack)
        Spacer(Modifier.width(12.dp))
        Text(title, Modifier.semantics { heading() }, style = MaterialTheme.typography.titleLarge, color = Gw.c.text)
    }
}

@Composable
fun Segmented(options: List<String>, selected: Int, onSelect: (Int) -> Unit, modifier: Modifier = Modifier) {
    val c = Gw.c
    Row(modifier.fillMaxWidth().height(48.dp).clip(RoundedCornerShape(24.dp)).background(c.surface2).padding(4.dp)) {
        options.forEachIndexed { i, label ->
            val on = i == selected
            Box(
                Modifier.weight(1f).fillMaxHeight()
                    .then(if (on) Modifier.shadow(2.dp, RoundedCornerShape(20.dp)) else Modifier)
                    .clip(RoundedCornerShape(20.dp)).background(if (on) c.raised else Color.Transparent)
                    .selectable(selected = on, role = Role.Tab, onClick = { onSelect(i) }),
                contentAlignment = Alignment.Center,
            ) { Text(label, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = if (on) FontWeight.Bold else FontWeight.SemiBold), color = if (on) c.text else c.text2) }
        }
    }
}

/** Pill-shaped choice used for date ranges and reminder times. */
@Composable
fun Choice(label: String, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val c = Gw.c
    Box(
        modifier.heightIn(min = 44.dp).clip(RoundedCornerShape(22.dp))
            .then(if (selected) Modifier.background(c.primary) else Modifier.border(1.5.dp, c.border, RoundedCornerShape(22.dp)).background(c.surface))
            .selectable(selected = selected, role = Role.RadioButton, onClick = onClick).padding(horizontal = 12.dp),
        contentAlignment = Alignment.Center,
    ) { Text(label, style = MaterialTheme.typography.bodySmall.copy(fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold), color = if (selected) c.onPrimary else c.text, textAlign = TextAlign.Center) }
}

@Composable
fun Pill(text: String, fg: Color, bg: Color, modifier: Modifier = Modifier, icon: ImageVector? = null) {
    Row(modifier.clip(RoundedCornerShape(12.dp)).background(bg).padding(horizontal = 10.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
        if (icon != null) { Icon(icon, null, Modifier.size(14.dp), tint = fg); Spacer(Modifier.width(6.dp)) }
        Text(text, style = MaterialTheme.typography.labelMedium, color = fg)
    }
}

@Composable
fun Banner(text: String, fg: Color, bg: Color, icon: ImageVector, modifier: Modifier = Modifier, action: (@Composable RowScope.() -> Unit)? = null) {
    Row(modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(bg).padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, Modifier.size(20.dp), tint = fg)
        Spacer(Modifier.width(10.dp))
        Text(text, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), color = fg)
        action?.invoke(this)
    }
}

@Composable
fun StatTile(value: String, label: String, modifier: Modifier = Modifier, suffix: String? = null, valueColor: Color = Gw.c.text, color: Color = Gw.c.surface) {
    Column(modifier.clip(RoundedCornerShape(18.dp)).background(color).padding(12.dp)) {
        Row(verticalAlignment = Alignment.Bottom) {
            Text(value, style = MaterialTheme.typography.headlineSmall.copy(fontSize = 22.sp), color = valueColor)
            if (suffix != null) Text(suffix, Modifier.padding(bottom = 2.dp), style = MaterialTheme.typography.labelLarge.copy(fontSize = 14.sp, fontWeight = FontWeight.SemiBold), color = Gw.c.text3)
        }
        Small(label, color = Gw.c.text2)
    }
}

/** Target-zone bar from the live session: band = zone, fill = current value. */
@Composable
fun TargetBar(label: String, valueText: String, value: Float, lo: Float, hi: Float, ok: Boolean) {
    val c = Gw.c
    Column(Modifier.fillMaxWidth().semantics(mergeDescendants = true) {}) {
        Row(Modifier.fillMaxWidth()) {
            Text(label, Modifier.weight(1f), style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold), color = c.text)
            Text(valueText, style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold), color = if (ok) c.text else c.amberText)
        }
        Spacer(Modifier.height(4.dp))
        BoxWithConstraints(Modifier.fillMaxWidth().height(18.dp)) {
            val w = maxWidth
            Box(Modifier.offset(x = w * (lo / 100f)).width(w * ((hi - lo) / 100f)).fillMaxHeight().clip(RoundedCornerShape(6.dp)).background(c.band))
            Box(Modifier.align(Alignment.CenterStart).fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)).background(c.track))
            Box(Modifier.align(Alignment.CenterStart).width(w * (value.coerceIn(3f, 100f) / 100f)).height(8.dp).clip(RoundedCornerShape(4.dp)).background(if (ok) c.primary else c.amberFill))
        }
    }
}

/** Wrist tilt meter: −90° (down) … +90° (up) with the target band and a marker. */
@Composable
fun TiltMeter(valueText: String, tilt: Float, lo: Float, hi: Float, ok: Boolean) {
    val c = Gw.c
    fun pos(v: Float) = ((v + 90f) / 180f).coerceIn(0f, 1f)
    Column(Modifier.fillMaxWidth().semantics(mergeDescendants = true) {}) {
        Row(Modifier.fillMaxWidth()) {
            Text("Hand tilt", Modifier.weight(1f), style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold), color = c.text)
            Text(valueText, style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold), color = if (ok) c.text else c.amberText)
        }
        Spacer(Modifier.height(4.dp))
        BoxWithConstraints(Modifier.fillMaxWidth().height(18.dp)) {
            val w = maxWidth
            Box(Modifier.offset(x = w * pos(lo)).width(w * (pos(hi) - pos(lo))).fillMaxHeight().clip(RoundedCornerShape(6.dp)).background(c.band))
            Box(Modifier.align(Alignment.CenterStart).fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)).background(c.track))
            Box(Modifier.align(Alignment.Center).width(2.dp).height(14.dp).background(c.text3))
            Box(
                Modifier.offset(x = w * pos(tilt) - 8.dp, y = 1.dp).size(16.dp).shadow(2.dp, CircleShape).clip(CircleShape)
                    .background(c.surface).padding(2.dp).clip(CircleShape).background(if (ok) c.primary else c.amberFill),
            )
        }
        Row(Modifier.fillMaxWidth()) {
            Small("Down"); Spacer(Modifier.weight(1f)); Small("Level"); Spacer(Modifier.weight(1f)); Small("Up")
        }
    }
}

enum class Tab { Home, Exercises, Progress, Profile }

@Composable
fun BottomBar(current: Tab, onTab: (Tab) -> Unit) {
    val c = Gw.c
    val items = listOf(Tab.Home to GwIcons.Home, Tab.Exercises to GwIcons.Grid, Tab.Progress to GwIcons.Chart, Tab.Profile to GwIcons.User)
    Row(
        Modifier.fillMaxWidth().shadow(12.dp, RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp), ambientColor = c.shadow, spotColor = c.shadow)
            .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)).background(c.surface)
            .navigationBarsPadding().padding(horizontal = 12.dp, vertical = 8.dp),
    ) {
        items.forEach { (tab, icon) ->
            val on = tab == current
            Column(
                Modifier.weight(1f).heightIn(min = 52.dp).clip(RoundedCornerShape(14.dp))
                    .selectable(selected = on, role = Role.Tab, onClick = { onTab(tab) }),
                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center,
            ) {
                Icon(icon, null, Modifier.size(24.dp), tint = if (on) c.link else c.text3)
                Spacer(Modifier.height(4.dp))
                Text(tab.name, style = MaterialTheme.typography.labelSmall.copy(fontWeight = if (on) FontWeight.Bold else FontWeight.SemiBold), color = if (on) c.link else c.text3)
            }
        }
    }
}

fun tintColors(t: Tint, c: GripwiseColors): Pair<Color, Color> = when (t) {
    Tint.Blue -> c.tintBlue to c.accentText
    Tint.Green -> c.tintGreen to c.greenText
    Tint.Amber -> c.tintAmber to c.amberText
    Tint.Violet -> c.tintViolet to c.violetText
}

@Composable
fun SheetHandle() {
    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        Box(Modifier.padding(top = 4.dp, bottom = 8.dp).width(40.dp).height(5.dp).clip(RoundedCornerShape(3.dp)).background(Gw.c.border))
    }
}

@Composable
fun Divider() = Box(Modifier.fillMaxWidth().height(1.dp).background(Gw.c.line))

@Composable
fun Dot(color: Color, size: Dp = 8.dp) = Box(Modifier.size(size).clip(CircleShape).background(color))

@Composable
fun ClickRow(onClick: () -> Unit, modifier: Modifier = Modifier, content: @Composable RowScope.() -> Unit) {
    Row(modifier.fillMaxWidth().heightIn(min = 56.dp).clickable(role = Role.Button, onClick = onClick), verticalAlignment = Alignment.CenterVertically, content = content)
}

@Composable
fun EmptyNote(text: String) {
    GwCard { Body(text, size = 14) }
}

@Composable
fun Spacer(h: Int) = Spacer(Modifier.height(h.dp))

