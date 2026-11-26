package io.github.ismibaimdev.gripwise

import android.graphics.Bitmap
import androidx.compose.ui.semantics.SemanticsNode
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.test.ComposeTimeoutException
import androidx.compose.ui.test.isRoot
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.github.ismibaimdev.gripwise.data.ThemeMode
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import org.robolectric.shadows.ShadowLooper
import java.io.File
import java.util.concurrent.TimeUnit

/**
 * Walks the whole app with the demo glove, like the design simulator: onboarding, calibration,
 * a hands-free session, the symptom log, progress, export and profile. With -Pscreenshots it also
 * saves a PNG of every screen to app/build/screenshots.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w393dp-h852dp-xhdpi")
class AppFlowTest {
    @get:Rule val rule = createAndroidComposeRule<MainActivity>()

    private val shotDir: File? = System.getProperty("gripwise.shots")?.takeIf { it.isNotBlank() }?.let { File(it).apply { mkdirs() } }
    private val app get() = rule.activity.application as GripwiseApp

    /** Lets real time pass for the demo glove (it runs on a background thread) and the main looper. */
    private fun pump(ms: Long) {
        var left = ms
        while (left > 0) {
            val step = minOf(100L, left)
            Thread.sleep(step)
            ShadowLooper.idleMainLooper(step, TimeUnit.MILLISECONDS)
            rule.mainClock.advanceTimeBy(step)
            left -= step
        }
        rule.waitForIdle()
    }

    /** Every piece of text on screen, to show where the walk-through got stuck. */
    private fun screenText(): String {
        val out = mutableListOf<String>()
        fun walk(n: SemanticsNode) {
            n.config.getOrNull(SemanticsProperties.Text)?.forEach { out += it.text }
            n.config.getOrNull(SemanticsProperties.ContentDescription)?.forEach { out += "[$it]" }
            n.children.forEach(::walk)
        }
        runCatching { rule.onAllNodes(isRoot(), useUnmergedTree = true).fetchSemanticsNodes().forEach(::walk) }
        return out.joinToString(" | ")
    }

    private fun waitFor(text: String, timeoutMs: Long = 30_000, substring: Boolean = false): SemanticsNodeInteraction {
        val end = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < end) {
            val m = hasText(text, substring = substring) or hasContentDescription(text, substring = substring)
            if (rule.onAllNodes(m).fetchSemanticsNodes().isNotEmpty()) return rule.onAllNodes(m)[0]
            pump(100)
        }
        throw ComposeTimeoutException("\"$text\" never appeared. On screen: ${screenText()}")
    }

    private fun tap(text: String, substring: Boolean = false, last: Boolean = false) {
        var node = waitFor(text, substring = substring)
        if (last) node = rule.onAllNodes(hasText(text, substring = substring) or hasContentDescription(text, substring = substring)).let { it[it.fetchSemanticsNodes().size - 1] }
        runCatching { node.performScrollTo() }
        node.performClick()
        pump(300)
    }

    private fun shot(name: String) {
        val dir = shotDir ?: return
        pump(200)
        val view = rule.activity.window.decorView
        val bmp = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
        rule.runOnUiThread { view.draw(android.graphics.Canvas(bmp)) }
        File(dir, "$name.png").outputStream().use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    @Test fun wholeAppWithDemoGlove() {
        // Onboarding
        waitFor("Gentle moves for tired wrists"); shot("01_welcome")
        tap("Try with the demo glove")
        waitFor("Set up your profile")
        tap("Continue")
        waitFor("Enter your first name."); shot("02_profile_errors")
        rule.onNode(hasSetTextAction()).performTextInput("Baim")
        tap("I agree that Gripwise", substring = true)
        shot("03_profile_filled")
        tap("Continue")

        waitFor("Glove connected", timeoutMs = 15_000)
        waitFor("All 5 sensors responding", substring = true); shot("04_connect_demo")
        tap("Continue")

        waitFor("Calibrate your hand")
        tap("Start calibration")
        pump(2_000); shot("05_calibrate_running")
        waitFor("Calibration saved", timeoutMs = 45_000, substring = true); shot("06_calibrate_done")
        tap("Finish setup")

        // Home
        waitFor("Today's plan"); shot("07_home")
        tap("Okay")
        waitFor("Noted for today", substring = true); shot("08_home_checkin")

        // Exercises
        tap("Exercises")
        waitFor("Tendon glides"); shot("09_exercises_routines")
        tap("Single moves")
        waitFor("Wrist flexor stretch"); shot("10_exercises_single")
        tap("Routines")

        // Hands-free session
        tap("Tendon glides")
        waitFor("Live tracking")
        pump(1_500); shot("11_session_live")
        tap("Felt tingling or pain")
        waitFor("Stop and rest"); tap("Tingling"); shot("12_symptom_sheet")
        tap("Cancel, keep going")
        waitFor("Round 1 complete", timeoutMs = 150_000); shot("13_round_complete")
        tap("Finish for now")
        waitFor("Nice work", timeoutMs = 10_000); shot("14_done")
        tap("Back to home")

        // Review from Home
        waitFor("Review", timeoutMs = 10_000)
        tap("Review")
        waitFor("Session review"); shot("15_review")
        tap("Back")

        // Progress
        tap("Progress")
        waitFor("Daily reps"); shot("16_progress_week")
        tap("Month")
        waitFor("Weekly reps"); shot("17_progress_month")
        tap("Export for my physiotherapist")

        // Export
        waitFor("Export my data"); waitFor("1 session,", timeoutMs = 10_000, substring = true); shot("18_export_csv")
        tap("PDF report")
        waitFor("A PDF report", substring = true); shot("19_export_pdf")
        // PdfDocument has no native backend under Robolectric, so only the CSV file is checked here.
        val csv = runBlocking { app.container.exporter.buildCsv(io.github.ismibaimdev.gripwise.export.ExportRange.Week, setOf(io.github.ismibaimdev.gripwise.export.CsvSet.Sessions)) }
        assertTrue(csv.readText().contains("Tendon glides"))
        rule.activity.onBackPressedDispatcher.onBackPressed(); pump(300)

        // Profile and dark theme
        tap("Profile")
        waitFor("Glove & calibration"); shot("20_profile")
        tap("Dark")
        pump(500); shot("21_profile_dark")
        tap("Home")
        waitFor("Today's plan"); shot("22_home_dark")
        tap("Exercises"); tap("Wrist tilts")
        waitFor("Live tracking"); pump(2_500); shot("23_session_dark_wrist")
        tap("End session")
        waitFor("End this session?"); shot("24_exit_sheet")
        tap("End session", last = true)
        waitFor("Tendon glides")
        runBlocking { app.container.settings.setTheme(ThemeMode.Light) }

        // Glove screen from Profile
        tap("Profile"); tap("Glove & calibration")
        waitFor("Hand calibration", substring = true); shot("25_glove_settings")
    }
}
