package io.github.ismibaimdev.gripwise.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.ismibaimdev.gripwise.exercises.PicColor
import io.github.ismibaimdev.gripwise.exercises.PicStroke
import io.github.ismibaimdev.gripwise.ui.theme.Gw

private val pathCache = HashMap<String, Path>()
private fun path(d: String): Path = pathCache.getOrPut(d) { PathParser().parsePathString(d).toPath() }

/** Draws an exercise pictogram (100×100 design box) scaled to [size]. */
@Composable
fun Pictogram(strokes: List<PicStroke>, modifier: Modifier = Modifier, size: Dp = 92.dp, base: Color = Gw.c.navy, description: String? = null) {
    val pale = Gw.c.pale
    Canvas(modifier.size(size).then(if (description != null) Modifier.semantics { contentDescription = description } else Modifier)) {
        val s = this.size.minDimension / 100f
        scale(s, s, pivot = Offset.Zero) {
            strokes.forEach { st ->
                val color = when (st.color) {
                    PicColor.Navy -> base
                    PicColor.Blue -> Color(0xFF2563EB)
                    PicColor.Pale -> pale
                    PicColor.Gold -> Color(0xFFE0A21B)
                }
                drawPath(
                    path(st.d), color,
                    style = Stroke(
                        width = st.width, cap = StrokeCap.Round, join = StrokeJoin.Round,
                        pathEffect = if (st.dashed) PathEffect.dashPathEffect(floatArrayOf(3f, 5f)) else null,
                    ),
                )
            }
        }
    }
}

/** Countdown ring used for holds. [progress] 0..1 is how much of the hold is done. */
@Composable
fun HoldRing(progress: Float, label: String, modifier: Modifier = Modifier, size: Dp = 40.dp, showArc: Boolean = true) {
    val track = Gw.c.ringTrack
    val text = Gw.c.text
    Box(modifier.size(size), contentAlignment = Alignment.Center) {
        Canvas(Modifier.size(size)) {
            val w = this.size.minDimension * 0.1f
            val inset = w / 2 + this.size.minDimension * 0.05f
            val arcSize = Size(this.size.width - inset * 2, this.size.height - inset * 2)
            drawArc(track, 0f, 360f, false, Offset(inset, inset), arcSize, style = Stroke(w))
            if (showArc && progress > 0f) {
                drawArc(Color(0xFF2563EB), -90f, 360f * progress.coerceIn(0f, 1f), false, Offset(inset, inset), arcSize, style = Stroke(w, cap = StrokeCap.Round))
            }
        }
        Text(label, style = MaterialTheme.typography.labelSmall.copy(fontSize = (size.value * 0.28f).sp, fontWeight = FontWeight.Bold), color = text)
    }
}

/** Mood faces for the daily check-in: great, okay, stiff, sore, tingly. */
@Composable
fun MoodFace(mood: String, color: Color, modifier: Modifier = Modifier) {
    val mouth = when (mood) {
        "great" -> "M8 13.8c1.1 1.9 2.4 2.8 4 2.8s2.9-.9 4-2.8"
        "okay" -> "M8.5 14.8c1 .8 2.2 1.2 3.5 1.2s2.5-.4 3.5-1.2"
        "stiff" -> "M8.5 15.3h7"
        "sore" -> "M8.5 16.4c1-.9 2.2-1.3 3.5-1.3s2.5.4 3.5 1.3"
        else -> "M7.8 15.4l1.4-1.1 1.4 1.1 1.4-1.1 1.4 1.1 1.4-1.1 1.4 1.1"
    }
    Canvas(modifier.size(28.dp)) {
        val s = size.minDimension / 24f
        scale(s, s, pivot = Offset.Zero) {
            drawCircle(color, 9.5f, Offset(12f, 12f), style = Stroke(1.7f))
            drawCircle(color, 1.1f, Offset(9f, 10f))
            drawCircle(color, 1.1f, Offset(15f, 10f))
            drawPath(path(mouth), color, style = Stroke(1.7f, cap = StrokeCap.Round, join = StrokeJoin.Round))
        }
    }
}

/** The welcome / session-complete illustration: a sensor glove with leaves and flowers (350×380 box). */
@Composable
fun GloveArt(modifier: Modifier = Modifier, celebrate: Boolean = false) {
    val navy = Gw.c.navy
    Canvas(modifier) {
        val s = minOf(size.width / 350f, size.height / 380f)
        val dx = (size.width - 350f * s) / 2f
        val dy = size.height - 380f * s
        withTransform({ translate(dx, dy); scale(s, s, pivot = Offset.Zero) }) { drawGlove(navy, celebrate) }
    }
}

private val LEAF = "M0 0C18-26 52-26 70 0C52 26 18 26 0 0Z"
private val SMALL_LEAF = "M0 0C14-20 40-20 54 0C40 20 14 20 0 0Z"

private fun DrawScope.leaf(x: Float, y: Float, deg: Float, color: Color, small: Boolean = false) {
    withTransform({ translate(x, y); rotate(deg, pivot = Offset.Zero) }) { drawPath(path(if (small) SMALL_LEAF else LEAF), color) }
}

private fun DrawScope.flower(x: Float, y: Float, r: Float, d: Float) {
    val pink = Color(0xFFF28FB0)
    listOf(0f to -1f, 0.95f to -0.31f, 0.59f to 0.81f, -0.59f to 0.81f, -0.95f to -0.31f).forEach { (ox, oy) ->
        drawCircle(pink, r, Offset(x + ox * d, y + oy * d))
    }
    drawCircle(Color(0xFFF6C34A), r * 0.67f, Offset(x, y))
}

private fun DrawScope.rr(x: Float, y: Float, w: Float, h: Float, r: Float, color: Color) =
    drawRoundRect(color, Offset(x, y), Size(w, h), CornerRadius(r, r))

private fun DrawScope.drawGlove(navy: Color, celebrate: Boolean) {
    val glove = Color(0xFF3B7BF0); val gold = Color(0xFFF6C34A); val dark = Color(0xFF1E3A5F); val band = Color(0xFF2C4F7C)
    leaf(18f, 300f, -58f, navy)
    leaf(40f, 352f, -20f, Color(0xFF3E9B7A), small = true)
    leaf(332f, 330f, -128f, Color(0xFF3E9B7A))
    leaf(300f, 372f, -160f, navy, small = true)
    flower(62f, 176f, 9f, 11f)
    flower(296f, 214f, 6.5f, 8f)
    if (celebrate) {
        drawCircle(gold, 4f, Offset(240f, 44f))
        drawCircle(Color(0xFF2563EB), 3.5f, Offset(44f, 128f))
        rotate(30f, Offset(75f, 82f)) { rr(70f, 80f, 10f, 5f, 2.5f, gold) }
    } else {
        drawPath(path("M268 70a20 20 0 0 1 20 20M268 52a38 38 0 0 1 38 38"), Color(0xFF2563EB), style = Stroke(4f, cap = StrokeCap.Round))
    }
    rr(128f, 300f, 104f, 90f, 14f, dark)
    drawRect(band, Offset(128f, 300f), Size(104f, 14f))
    rotate(-32f, Offset(115f, 300f)) {
        rr(100f, 200f, 30f, 104f, 15f, glove)
        rr(112f, 214f, 6f, 78f, 3f, gold)
    }
    rr(118f, 196f, 124f, 120f, 44f, glove)
    rr(122f, 104f, 28f, 122f, 14f, glove)
    rr(156f, 82f, 28f, 140f, 14f, glove)
    rr(190f, 96f, 28f, 128f, 14f, glove)
    rr(222f, 130f, 24f, 100f, 12f, glove)
    rr(133f, 118f, 6f, 112f, 3f, gold)
    rr(167f, 96f, 6f, 128f, 3f, gold)
    rr(201f, 110f, 6f, 116f, 3f, gold)
    rr(148f, 236f, 64f, 42f, 9f, dark)
    rr(158f, 248f, 24f, 18f, 3f, band)
    drawCircle(Color(0xFF7DD3FC), 4f, Offset(198f, 250f))
    if (celebrate) {
        drawCircle(Color.White, 26f, Offset(270f, 96f))
        drawCircle(Color(0xFF2563EB), 21f, Offset(270f, 96f))
        drawPath(path("M260 96.5l7 7 13-14"), Color.White, style = Stroke(4.5f, cap = StrokeCap.Round, join = StrokeJoin.Round))
    }
}

