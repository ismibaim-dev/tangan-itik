package io.github.ismibaimdev.gripwise.exercises

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

enum class Tint { Blue, Green, Amber, Violet }
enum class PicColor { Navy, Blue, Pale, Gold }

/** One stroke of a pictogram, in a 100×100 box (same paths as the design canvas). */
data class PicStroke(val d: String, val color: PicColor, val width: Float, val dashed: Boolean = false)

/** A bar on the live tracking card: the average bend of [fingers] (0 thumb … 3 ring) must sit in lo..hi %. */
data class FingerTarget(val label: String, val fingers: List<Int>, val lo: Float, val hi: Float)

data class Step(
    val name: String,
    val cue: String,
    val pic: List<PicStroke>,
    val targets: List<FingerTarget> = emptyList(),
    /** Wrist tilt target in degrees (positive = back of hand up), or null if the wrist isn't checked. */
    val wristLo: Float? = null,
    val wristHi: Float? = null,
    /** Show the "Wrist neutral" chip (informational, does not block the countdown). */
    val levelChip: Boolean = false,
    /** Extra note shown as a chip, e.g. for steps the sensors can't check. */
    val note: String? = null,
) {
    val checksWrist: Boolean get() = wristLo != null && wristHi != null
}

data class Exercise(
    val id: String,
    val name: String,
    val routine: Boolean,
    val tag: String,
    val meta: String,
    val tint: Tint,
    val rounds: Int,
    val holdSec: Int,
    val steps: List<Step>,
    val thumbnail: List<PicStroke>,
)

private fun s(d: String, c: PicColor, w: Float, dashed: Boolean = false) = PicStroke(d, c, w, dashed)
private fun side(finger: String) = listOf(s("M33 57V86", PicColor.Navy, 18f), s(finger, PicColor.Blue, 10f))

private val TIPS = mapOf('i' to (38 to 20), 'm' to (47 to 14), 'r' to (56 to 18), 'p' to (64 to 28))
private val SPREAD = mapOf('i' to "M39 52L30 20", 'm' to "M47 50V14", 'r' to "M56 52L62 19", 'p' to "M63 56L74 30")
private val THUMBS = mapOf(
    "relaxed" to "M36 76L22 58", "close" to "M36 74L31 52", "wide" to "M36 76L11 64", "across" to "M38 78L58 70",
)

private fun front(bent: String = "", on: String = "", thumb: String = "relaxed", thumbOn: Boolean = false, spread: Boolean = false, helper: String? = null): List<PicStroke> {
    val out = mutableListOf(s("M50 62V80", PicColor.Navy, 34f))
    for (k in listOf('i', 'm', 'r', 'p')) {
        val (x, tip) = TIPS.getValue(k)
        val d = if (spread) SPREAD.getValue(k) else "M$x 50V${if (k in bent) 40 else tip}"
        out += s(d, if (k in on) PicColor.Blue else PicColor.Navy, if (k == 'p') 8f else 9f)
    }
    out += s(THUMBS.getValue(thumb), if (thumbOn) PicColor.Blue else PicColor.Navy, 10f)
    if (helper != null) out += s(helper, PicColor.Pale, 14f)
    return out
}

private fun wrist(deg: Double, vararg extra: PicStroke): List<PicStroke> {
    val r = deg * PI / 180.0
    val x = "%.1f".format(java.util.Locale.US, 48 + 32 * cos(r))
    val y = "%.1f".format(java.util.Locale.US, 62 - 32 * sin(r))
    val out = mutableListOf(s("M8 62H44", PicColor.Navy, 16f))
    if (deg != 0.0) out += s("M50 62H84", PicColor.Pale, 2f, dashed = true)
    out += s("M48 62L$x $y", PicColor.Blue, 12f)
    out += extra
    return out
}

private fun four(lo: Float, hi: Float) = listOf(
    FingerTarget("Thumb", listOf(0), lo, hi), FingerTarget("Index", listOf(1), lo, hi),
    FingerTarget("Middle", listOf(2), lo, hi), FingerTarget("Ring", listOf(3), lo, hi),
)
private fun all(lo: Float, hi: Float) = listOf(FingerTarget("All fingers", listOf(0, 1, 2, 3), lo, hi))
private fun thumbOnly(lo: Float, hi: Float) = listOf(FingerTarget("Thumb", listOf(0), lo, hi))

/**
 * The eight exercises from the design. Target zones, angles and hold times are starting values
 * and should be confirmed by a physiotherapist.
 */
object ExerciseCatalog {
    val all: List<Exercise> = listOf(
        Exercise(
            "tendon-glides", "Tendon glides", true, "Tracks fingers", "5 steps · 6 min", Tint.Blue, rounds = 10, holdSec = 3,
            steps = listOf(
                Step("Straight hand", "Fingers straight up, thumb relaxed. Keep your wrist level.", side("M38 52V8"), four(0f, 15f), levelChip = true),
                Step("Hook fist", "Bend the top two joints. Keep your knuckles straight.", side("M38 52V30L51 32L49 42"), four(55f, 80f), levelChip = true),
                Step("Full fist", "Curl all the way in with your thumb over your fingers. No squeezing.", side("M38 52H58V65H48"), four(80f, 100f), levelChip = true),
                Step("Tabletop", "Bend only at the knuckles. Fingers stay long and flat.", side("M38 52H81"), four(40f, 60f), levelChip = true),
                Step("Straight fist", "Bend the knuckles and middle joints. Fingertips stay straight.", side("M38 52H58V85"), four(65f, 85f), levelChip = true),
            ),
            thumbnail = side("M38 52V30L51 32L49 42"),
        ),
        Exercise(
            "wrist-tilts", "Wrist tilts", true, "Tracks wrist", "3 steps · 3 min", Tint.Green, rounds = 10, holdSec = 5,
            steps = listOf(
                Step("Start level", "Rest your forearm on a table with your hand past the edge, palm down. Let the wrist sit level.", wrist(0.0), wristLo = -10f, wristHi = 10f),
                Step("Tilt up", "Slowly lift the back of your hand toward the ceiling. Keep your fingers relaxed.", wrist(40.0), wristLo = 30f, wristHi = 65f),
                Step("Tilt down", "Let your hand drop toward the floor, only as far as feels comfortable.", wrist(-40.0), wristLo = -65f, wristHi = -30f),
            ),
            thumbnail = wrist(40.0),
        ),
        Exercise(
            "median-nerve-glide", "Median nerve glide", true, "Fingers + wrist", "6 steps · 4 min", Tint.Amber, rounds = 5, holdSec = 5,
            steps = listOf(
                Step("Soft fist", "Keep your wrist level. Curl your fingers into a fist with your thumb outside.", front(bent = "imrp", on = "imrp", thumb = "across", thumbOn = true), all(75f, 100f), -15f, 15f),
                Step("Open hand", "Straighten your fingers and thumb. Keep the thumb close to your index finger.", front(on = "imrp", thumb = "close", thumbOn = true), all(0f, 15f), -15f, 15f),
                Step("Wrist back", "Keep your fingers straight and bend your wrist back, palm facing away from you.", wrist(50.0), all(0f, 20f), 30f, 75f),
                Step("Thumb out", "Hold that position and move your thumb out to the side, away from your palm.", front(thumb = "wide", thumbOn = true), thumbOnly(0f, 20f), 30f, 75f),
                Step(
                    "Palm up", "Turn your forearm so your palm faces up. Keep the wrist bent back.",
                    wrist(45.0, s("M18 48A7 14 0 1 0 30 48", PicColor.Gold, 3f), s("M30 48l-5-2M30 48l-1 5", PicColor.Gold, 3f)),
                    all(0f, 20f), note = "Palm up · timed",
                ),
                Step("Gentle stretch", "Use your other hand to ease the thumb back a little. Stop if tingling increases.", front(thumb = "wide", thumbOn = true, helper = "M5 56L12 49"), thumbOnly(0f, 20f), note = "Gentle · timed"),
            ),
            thumbnail = front(thumb = "wide", thumbOn = true),
        ),
        Exercise(
            "grip-release", "Grip and release", true, "Tracks fingers", "2 steps · 10 reps", Tint.Violet, rounds = 10, holdSec = 2,
            steps = listOf(
                Step("Soft fist", "Close your hand gently into a fist. There is no need to squeeze.", side("M38 52H58V65H48"), four(75f, 100f), levelChip = true),
                Step("Spread wide", "Open your hand and stretch your fingers out, straight and wide.", front(on = "imrp", thumb = "wide", thumbOn = true, spread = true), four(0f, 15f), levelChip = true),
            ),
            thumbnail = side("M38 52H58V65H48"),
        ),
        Exercise(
            "wrist-flexor-stretch", "Wrist flexor stretch", false, "Tracks wrist", "Palm up · hold 15 s", Tint.Green, rounds = 3, holdSec = 15,
            steps = listOf(
                Step("Arm out, palm up", "Hold your arm straight out in front of you, elbow straight, palm facing up.", wrist(0.0), wristLo = -12f, wristHi = 12f),
                Step("Ease fingers down", "With your other hand, gently bend your fingers toward the floor until you feel a light stretch.", wrist(-55.0, s("M71 84L77 93", PicColor.Pale, 12f)), wristLo = -85f, wristHi = -40f),
            ),
            thumbnail = wrist(-55.0, s("M71 84L77 93", PicColor.Pale, 12f)),
        ),
        Exercise(
            "wrist-extensor-stretch", "Wrist extensor stretch", false, "Tracks wrist", "Palm down · hold 15 s", Tint.Violet, rounds = 3, holdSec = 15,
            steps = listOf(
                Step("Arm out, palm down", "Hold your arm straight out in front of you, elbow straight, palm facing down.", wrist(0.0), wristLo = -12f, wristHi = 12f),
                Step("Ease hand down", "With your other hand, gently press the back of your hand so your fingers point down.", wrist(-55.0, s("M63 70L69 64", PicColor.Pale, 12f)), wristLo = -85f, wristHi = -40f),
            ),
            thumbnail = wrist(-55.0, s("M63 70L69 64", PicColor.Pale, 12f)),
        ),
        Exercise(
            "thumb-bend-stretch", "Thumb bend and stretch", false, "Tracks thumb", "2 steps · 5 rounds", Tint.Amber, rounds = 5, holdSec = 5,
            steps = listOf(
                Step("Thumb across palm", "Bend your thumb across your palm toward the base of your little finger.", front(thumb = "across", thumbOn = true), thumbOnly(60f, 100f), levelChip = true),
                Step("Thumb out wide", "Now move your thumb out and away from your fingers, as far as is comfortable.", front(thumb = "wide", thumbOn = true), thumbOnly(0f, 15f), levelChip = true),
            ),
            thumbnail = front(thumb = "across", thumbOn = true),
        ),
        Exercise(
            "single-finger-bends", "Single finger bends", false, "Tracks fingers", "3 steps · 5 rounds", Tint.Blue, rounds = 5, holdSec = 3,
            steps = listOf(
                Step("Bend index", "Bend only your index finger toward your palm. Keep the others straight.", front(bent = "i", on = "i"),
                    listOf(FingerTarget("Index", listOf(1), 60f, 100f), FingerTarget("Middle", listOf(2), 0f, 25f), FingerTarget("Ring", listOf(3), 0f, 25f)), levelChip = true),
                Step("Bend middle", "Bend only your middle finger. Let the index and ring fingers stay straight.", front(bent = "m", on = "m"),
                    listOf(FingerTarget("Index", listOf(1), 0f, 25f), FingerTarget("Middle", listOf(2), 60f, 100f), FingerTarget("Ring", listOf(3), 0f, 30f)), levelChip = true),
                Step("Bend ring", "Bend only your ring finger. Go slowly, it is the hardest one to move alone.", front(bent = "r", on = "r"),
                    listOf(FingerTarget("Index", listOf(1), 0f, 25f), FingerTarget("Middle", listOf(2), 0f, 30f), FingerTarget("Ring", listOf(3), 60f, 100f)), levelChip = true),
            ),
            thumbnail = front(bent = "i", on = "i"),
        ),
    )

    fun byId(id: String?): Exercise = all.firstOrNull { it.id == id } ?: all.first()

    /** The daily plan shown on Home. */
    val dailyPlan: List<Pair<String, String>> = listOf(
        "morning" to "wrist-tilts",
        "afternoon" to "tendon-glides",
        "evening" to "median-nerve-glide",
    )
}
