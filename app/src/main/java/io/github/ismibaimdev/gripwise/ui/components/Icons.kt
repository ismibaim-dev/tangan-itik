package io.github.ismibaimdev.gripwise.ui.components

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.unit.dp

/** Stroke icons drawn from the same 24×24 paths as the design canvas. Tint with Icon(tint = …). */
object GwIcons {
    private fun icon(name: String, vararg paths: String, width: Float = 2f, filled: Boolean = false): ImageVector =
        ImageVector.Builder(name, 24.dp, 24.dp, 24f, 24f).apply {
            paths.forEach {
                addPath(
                    pathData = addPathNodes(it),
                    fill = if (filled) SolidColor(Color.Black) else null,
                    stroke = if (filled) null else SolidColor(Color.Black),
                    strokeLineWidth = width,
                    strokeLineCap = StrokeCap.Round,
                    strokeLineJoin = StrokeJoin.Round,
                )
            }
        }.build()

    private const val CIRCLE9 = "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"

    val Back = icon("back", "M15 6l-6 6 6 6", width = 2.2f)
    val Chevron = icon("chev", "M9 6l6 6-6 6", width = 2.2f)
    val Check = icon("check", "M5 12.5l4.5 4.5L19 7.5", width = 2.6f)
    val CheckCircle = icon("checkc", CIRCLE9, "M8 12.5l2.5 2.5 5.5-5.5")
    val Alert = icon("alert", CIRCLE9, "M12 7.5v5.5M12 16.5h.01")
    val Warn = icon("warn", "M12 3.5 21.5 20h-19z", "M12 10v4M12 17h.01")
    val Close = icon("x", "M6 6l12 12M18 6L6 18", width = 2.2f)
    val Eye = icon("eye", "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z", "M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0")
    val Download = icon("download", "M12 4v11M7 10l5 5 5-5M5 20h14", width = 2.2f)
    val Share = icon("share", "M15.5 5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0", "M3.5 12a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0", "M15.5 19a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0", "M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4")
    val Clock = icon("clock", CIRCLE9, "M12 7v5l3 2")
    val Glove = icon("glove", "M8 20v-4.5L5.2 12a1.6 1.6 0 0 1 2.5-2L9 11.3V5a1.4 1.4 0 0 1 2.8 0v5V3.8a1.4 1.4 0 0 1 2.8 0V10V5a1.4 1.4 0 0 1 2.8 0v5.5V8a1.4 1.4 0 0 1 2.8 0v6.5A5.5 5.5 0 0 1 14.7 20z", "M8 20h7", width = 1.8f)
    val Refresh = icon("refresh", "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5", width = 2.2f)
    val Bluetooth = icon("bt", "M7 7l10 10-5 4V3l5 4L7 17")
    val File = icon("file", "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z", "M14 3v5h5M9 13h6M9 17h6")
    val Pause = icon("pause", "M9 5v14M15 5v14", width = 2.6f)
    val Play = icon("play", "M8 5.5v13l10.5-6.5z", filled = true)
    val Sound = icon("sound", "M4 9.5h3.5L12 5.5v13l-4.5-4H4z", "M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11")
    val Mute = icon("mute", "M4 9.5h3.5L12 5.5v13l-4.5-4H4z", "M16 9.5l5 5M21 9.5l-5 5")
    val Prev = icon("prev", "M19 5.5v13l-9-6.5z", "M6 5v14")
    val Skip = icon("skip", "M5 5.5v13l9-6.5z", "M18 5v14")
    val Home = icon("home", "M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z", width = 1.9f)
    val Grid = icon("grid", "M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z", width = 1.9f)
    val Chart = icon("chart", "M5 20V12M10 20V6M15 20v-9M20 20V9", width = 1.9f)
    val User = icon("user", "M8 8a4 4 0 1 0 8 0a4 4 0 1 0 -8 0", "M4.5 21a7.5 7.5 0 0 1 15 0", width = 1.9f)
    val Pulse = icon("pulse", "M3 12h3l2-4 3 8 3-10 2 6h5")
    val Trash = icon("trash", "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13")
}
