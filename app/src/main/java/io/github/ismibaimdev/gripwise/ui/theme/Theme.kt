package io.github.ismibaimdev.gripwise.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import io.github.ismibaimdev.gripwise.R
import io.github.ismibaimdev.gripwise.data.ThemeMode

/** Plus Jakarta Sans is a variable font, so each weight sets the wght axis instead of faking bold. */
@OptIn(ExperimentalTextApi::class)
private fun jakarta(w: FontWeight) = Font(R.font.plus_jakarta_sans, w, variationSettings = FontVariation.Settings(FontVariation.weight(w.weight)))

val Jakarta = FontFamily(
    jakarta(FontWeight.Normal),
    jakarta(FontWeight.Medium),
    jakarta(FontWeight.SemiBold),
    jakarta(FontWeight.Bold),
    jakarta(FontWeight.ExtraBold),
)

private val base = TextStyle(fontFamily = Jakarta)
private val GwTypography = Typography(
    headlineLarge = base.copy(fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 34.sp),
    headlineMedium = base.copy(fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 31.sp),
    headlineSmall = base.copy(fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 27.sp),
    titleLarge = base.copy(fontSize = 20.sp, fontWeight = FontWeight.ExtraBold),
    titleMedium = base.copy(fontSize = 16.sp, fontWeight = FontWeight.Bold),
    titleSmall = base.copy(fontSize = 15.sp, fontWeight = FontWeight.Bold),
    bodyLarge = base.copy(fontSize = 15.sp, lineHeight = 23.sp),
    bodyMedium = base.copy(fontSize = 14.sp, lineHeight = 20.sp),
    bodySmall = base.copy(fontSize = 13.sp, lineHeight = 18.sp),
    labelLarge = base.copy(fontSize = 15.sp, fontWeight = FontWeight.Bold),
    labelMedium = base.copy(fontSize = 12.sp, fontWeight = FontWeight.SemiBold),
    labelSmall = base.copy(fontSize = 11.sp, fontWeight = FontWeight.SemiBold),
)

val LocalDark = staticCompositionLocalOf { false }

@Composable
fun GripwiseTheme(mode: ThemeMode, content: @Composable () -> Unit) {
    val dark = when (mode) {
        ThemeMode.Light -> false
        ThemeMode.Dark -> true
        ThemeMode.System -> isSystemInDarkTheme()
    }
    val c = if (dark) DarkGripwiseColors else LightGripwiseColors
    val scheme = (if (dark) darkColorScheme() else lightColorScheme()).copy(
        primary = c.primary, onPrimary = c.onPrimary, background = c.bg, onBackground = c.text,
        surface = c.surface, onSurface = c.text, surfaceVariant = c.surface2, onSurfaceVariant = c.text2,
        outline = c.border, outlineVariant = c.line, error = c.danger, errorContainer = c.dangerTint, scrim = c.scrim,
        surfaceContainerLow = c.surface, surfaceContainer = c.surface, surfaceContainerHigh = c.surface,
    )
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window ?: return@SideEffect
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = !dark
                isAppearanceLightNavigationBars = !dark
            }
        }
    }
    CompositionLocalProvider(LocalGripwiseColors provides c, LocalDark provides dark) {
        MaterialTheme(colorScheme = scheme, typography = GwTypography, content = content)
    }
}

/** `Gw.c.tintAmber` – the full Gripwise token set for the current theme. */
object Gw {
    val c: GripwiseColors
        @Composable @ReadOnlyComposable
        get() = LocalGripwiseColors.current
}
