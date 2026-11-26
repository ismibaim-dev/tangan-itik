package io.github.ismibaimdev.gripwise.glove

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow

/** Wrist states exactly as the ESP32 firmware names them. */
enum class WristState(val wire: String, val label: String) {
    REST("REST", "Level"),
    EXTENSION_UP("WRIST_EXTENSION_UP", "Tilted up"),
    FLEXION_DOWN("WRIST_FLEXION_DOWN", "Tilted down"),
    TILT_LEFT("WRIST_TILT_LEFT", "Tilted left"),
    TILT_RIGHT("WRIST_TILT_RIGHT", "Tilted right"),
    ROTATION("WRIST_ROTATION", "Turning"),
    UNKNOWN("", "Unknown");

    companion object {
        fun fromWire(s: String): WristState = entries.firstOrNull { it.wire.equals(s.trim(), ignoreCase = true) } ?: UNKNOWN
    }
}

/** One reading from the glove: raw ADC per finger (0–4095), accel X/Y in m/s², wrist state. */
data class GloveFrame(
    val thumb: Int,
    val index: Int,
    val middle: Int,
    val ring: Int,
    val ax: Float,
    val ay: Float,
    val wrist: WristState,
    val timeMs: Long,
) {
    fun raw(i: Int): Int = when (i) { 0 -> thumb; 1 -> index; 2 -> middle; else -> ring }
}

/**
 * Parses both firmware output formats:
 *  - readable (csvAppMode = false): "Thumb: 1234 | Index: 2345 | Middle: 1111 | Ring: 2222 || Wrist(X,Y): 1.2, -0.3 || ACTION: REST"
 *  - CSV (csvAppMode = true):        "1234,2345,1111,2222,1.2,-0.3,REST"
 * Anything else (banners, blank lines, partial lines) returns null.
 */
object PacketParser {
    private const val NUM = """(-?\d+(?:\.\d+)?|-?nan|-?inf|-?ovf)"""
    private val readable = Regex(
        """Thumb:\s*(-?\d+)\s*\|\s*Index:\s*(-?\d+)\s*\|\s*Middle:\s*(-?\d+)\s*\|\s*Ring:\s*(-?\d+)\s*\|\|\s*Wrist\(X,Y\):\s*$NUM\s*,\s*$NUM\s*\|\|\s*ACTION:\s*([A-Za-z_]+)""",
        RegexOption.IGNORE_CASE,
    )
    private val csv = Regex("""^\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*$NUM\s*,\s*$NUM\s*,\s*([A-Za-z_]+)\s*$""", RegexOption.IGNORE_CASE)

    fun parse(line: String, now: Long = System.currentTimeMillis()): GloveFrame? {
        val m = readable.find(line) ?: csv.find(line) ?: return null
        val g = m.groupValues
        val fingers = (1..4).map { g[it].toIntOrNull() ?: return null }
        if (fingers.any { it < 0 || it > 4095 }) return null
        return GloveFrame(
            thumb = fingers[0], index = fingers[1], middle = fingers[2], ring = fingers[3],
            ax = number(g[5]), ay = number(g[6]),
            wrist = WristState.fromWire(g[7]),
            timeMs = now,
        )
    }

    private fun number(s: String): Float {
        val v = s.toFloatOrNull() ?: return 0f
        return if (v.isFinite()) v else 0f
    }
}

sealed interface GloveStatus {
    data object Idle : GloveStatus
    data object NoBluetooth : GloveStatus
    data object NoPermission : GloveStatus
    data object BluetoothOff : GloveStatus
    data object Scanning : GloveStatus
    data class Connecting(val name: String) : GloveStatus
    data class Connected(val name: String, val demo: Boolean) : GloveStatus
    data object NotFound : GloveStatus
    /** Was connected and dropped; the source keeps trying to reconnect. */
    data class Lost(val reason: String) : GloveStatus
}

val GloveStatus.isConnected: Boolean get() = this is GloveStatus.Connected

interface GloveSource {
    val status: StateFlow<GloveStatus>
    val frames: SharedFlow<GloveFrame>
    fun start()
    fun stop()
}

object GlovePermissions {
    fun required(): Array<String> =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) arrayOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT)
        else arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)

    fun granted(context: Context): Boolean =
        required().all { ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED }
}
