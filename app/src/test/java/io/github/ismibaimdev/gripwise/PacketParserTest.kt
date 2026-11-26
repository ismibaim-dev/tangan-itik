package io.github.ismibaimdev.gripwise

import io.github.ismibaimdev.gripwise.glove.PacketParser
import io.github.ismibaimdev.gripwise.glove.WristState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

/** Lines are copied from the format the attached ESP32 sketch prints (firmware/gripwise_glove.ino). */
class PacketParserTest {
    @Test fun readableLine() {
        val f = PacketParser.parse("Thumb: 2875 | Index: 3010 | Middle: 2990 | Ring: 2930 || Wrist(X,Y): 0.4, -0.2 || ACTION: REST", now = 5L)
        assertNotNull(f); f!!
        assertEquals(listOf(2875, 3010, 2990, 2930), (0..3).map { f.raw(it) })
        assertEquals(0.4f, f.ax, 1e-4f)
        assertEquals(-0.2f, f.ay, 1e-4f)
        assertEquals(WristState.REST, f.wrist)
        assertEquals(5L, f.timeMs)
    }

    @Test fun readableLineWithCarriageReturn() {
        val f = PacketParser.parse("Thumb: 1500 | Index: 1300 | Middle: 1250 | Ring: 1400 || Wrist(X,Y): 6.3, 0.1 || ACTION: WRIST_EXTENSION_UP\r")
        assertEquals(WristState.EXTENSION_UP, f!!.wrist)
        assertEquals(6.3f, f.ax, 1e-4f)
    }

    @Test fun csvLine() {
        val f = PacketParser.parse("2875,3010,2990,2930,-5.1,0.0,WRIST_FLEXION_DOWN")!!
        assertEquals(2930, f.ring)
        assertEquals(-5.1f, f.ax, 1e-4f)
        assertEquals(WristState.FLEXION_DOWN, f.wrist)
    }

    @Test fun everyFirmwareState() {
        listOf("REST", "WRIST_EXTENSION_UP", "WRIST_FLEXION_DOWN", "WRIST_TILT_LEFT", "WRIST_TILT_RIGHT", "WRIST_ROTATION").forEach {
            val f = PacketParser.parse("1,2,3,4,0.0,0.0,$it")!!
            assertEquals(it, f.wrist.wire)
        }
    }

    @Test fun nanAccelerationBecomesZero() {
        val f = PacketParser.parse("Thumb: 10 | Index: 20 | Middle: 30 | Ring: 40 || Wrist(X,Y): nan, nan || ACTION: REST")!!
        assertEquals(0f, f.ax, 0f)
    }

    @Test fun rejectsNoiseAndBadValues() {
        assertNull(PacketParser.parse(""))
        assertNull(PacketParser.parse("=========================================="))
        assertNull(PacketParser.parse("   Bluetooth Name: Gripwise_Glove         "))
        assertNull(PacketParser.parse("Thumb: 2875 | Index: 3010 | Middle"))
        assertNull(PacketParser.parse("5000,3010,2990,2930,0.0,0.0,REST"))
        assertNull(PacketParser.parse("2875,3010,2990,0.0,0.0,REST"))
    }
}
