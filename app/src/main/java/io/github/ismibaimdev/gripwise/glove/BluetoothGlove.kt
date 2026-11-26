package io.github.ismibaimdev.gripwise.glove

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import java.io.IOException
import java.util.UUID
import java.util.concurrent.atomic.AtomicLong

/**
 * Classic Bluetooth (SPP) link to the ESP32 "Gripwise_Glove".
 *
 * Finds the glove among paired devices, or discovers it, opens an RFCOMM socket and reads one
 * line every ~400 ms. If no line arrives for 3.5 s it treats the link as lost and keeps
 * reconnecting with a growing delay until [stop] is called.
 */
@SuppressLint("MissingPermission") // every entry point checks GlovePermissions first
class BluetoothGlove(private val context: Context, private val scope: CoroutineScope) : GloveSource {

    companion object {
        val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
        const val NAME_PREFIX = "Gripwise"
        private const val STALE_MS = 3_500L
        private const val DISCOVERY_MS = 12_000L
    }

    private val _status = MutableStateFlow<GloveStatus>(GloveStatus.Idle)
    override val status = _status.asStateFlow()
    private val _frames = MutableSharedFlow<GloveFrame>(extraBufferCapacity = 64, onBufferOverflow = BufferOverflow.DROP_OLDEST)
    override val frames = _frames.asSharedFlow()

    private var job: Job? = null
    @Volatile private var socket: BluetoothSocket? = null

    private val adapter: BluetoothAdapter?
        get() = context.getSystemService(BluetoothManager::class.java)?.adapter

    override fun start() {
        if (job?.isActive == true) return
        job = scope.launch(Dispatchers.IO) { run() }
    }

    override fun stop() {
        job?.cancel()
        job = null
        closeSocket()
        _status.value = GloveStatus.Idle
    }

    private suspend fun run() {
        var attempt = 0
        var everConnected = false
        while (currentCoroutineContext().isActive) {
            val a = adapter
            if (a == null) { _status.value = GloveStatus.NoBluetooth; return }
            if (!GlovePermissions.granted(context)) { _status.value = GloveStatus.NoPermission; return }
            if (!a.isEnabled) { _status.value = GloveStatus.BluetoothOff; delay(2_000); continue }

            val device = findDevice(a, quiet = everConnected)
            if (device == null) {
                if (!everConnected) { _status.value = GloveStatus.NotFound; return }
                _status.value = GloveStatus.Lost("Glove not in range")
                delay(backoff(attempt++))
                continue
            }

            val name = device.name ?: "Gripwise_Glove"
            _status.value = if (everConnected) GloveStatus.Lost("Reconnecting…") else GloveStatus.Connecting(name)
            val ctx = currentCoroutineContext()
            val s = openSocket(a, device) { ctx.isActive }
            if (!currentCoroutineContext().isActive) { runCatching { s?.close() }; return }
            if (s == null) {
                if (!everConnected && attempt >= 2) { _status.value = GloveStatus.NotFound; return }
                delay(backoff(attempt++))
                continue
            }

            socket = s
            attempt = 0
            everConnected = true
            _status.value = GloveStatus.Connected(name, demo = false)
            val reason = readLines(s)
            closeSocket()
            if (!currentCoroutineContext().isActive) return
            _status.value = GloveStatus.Lost(reason)
            delay(backoff(attempt++))
        }
    }

    private fun backoff(attempt: Int): Long = (1_000L shl attempt.coerceAtMost(3)).coerceAtMost(8_000L)

    private suspend fun findDevice(a: BluetoothAdapter, quiet: Boolean): BluetoothDevice? {
        a.bondedDevices?.firstOrNull { it.name?.startsWith(NAME_PREFIX, ignoreCase = true) == true }?.let { return it }
        if (!quiet) _status.value = GloveStatus.Scanning
        return discover(a)
    }

    private suspend fun discover(a: BluetoothAdapter): BluetoothDevice? {
        val found = CompletableDeferred<BluetoothDevice>()
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(c: Context, intent: Intent) {
                if (intent.action != BluetoothDevice.ACTION_FOUND) return
                val d: BluetoothDevice? = if (Build.VERSION.SDK_INT >= 33) {
                    intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
                } else {
                    @Suppress("DEPRECATION") intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                }
                if (d?.name?.startsWith(NAME_PREFIX, ignoreCase = true) == true) found.complete(d)
            }
        }
        // The Bluetooth stack runs in its own process, so its broadcasts need an exported receiver.
        ContextCompat.registerReceiver(context, receiver, IntentFilter(BluetoothDevice.ACTION_FOUND), ContextCompat.RECEIVER_EXPORTED)
        return try {
            runCatching { a.startDiscovery() }
            withTimeoutOrNull(DISCOVERY_MS) { found.await() }
        } finally {
            runCatching { a.cancelDiscovery() }
            runCatching { context.unregisterReceiver(receiver) }
        }
    }

    /** Standard SPP first, then insecure SPP, then channel 1 directly (helps some ESP32 stacks). */
    private fun openSocket(a: BluetoothAdapter, d: BluetoothDevice, alive: () -> Boolean): BluetoothSocket? {
        runCatching { a.cancelDiscovery() }
        val makers: List<() -> BluetoothSocket> = listOf(
            { d.createRfcommSocketToServiceRecord(SPP_UUID) },
            { d.createInsecureRfcommSocketToServiceRecord(SPP_UUID) },
            { d.javaClass.getMethod("createRfcommSocket", Int::class.javaPrimitiveType).invoke(d, 1) as BluetoothSocket },
        )
        for (make in makers) {
            if (!alive()) return null
            val s = runCatching { make() }.getOrNull() ?: continue
            // Kept in [socket] so stop() can close it and abort a connect() that is still blocking.
            socket = s
            try {
                s.connect()
                return s
            } catch (_: IOException) {
                runCatching { s.close() }
                socket = null
            }
        }
        return null
    }

    private suspend fun readLines(s: BluetoothSocket): String = coroutineScope {
        val lastLine = AtomicLong(System.currentTimeMillis())
        val watchdog = launch {
            while (isActive) {
                delay(1_000)
                if (System.currentTimeMillis() - lastLine.get() > STALE_MS) { runCatching { s.close() }; break }
            }
        }
        val reason = try {
            val reader = s.inputStream.bufferedReader(Charsets.US_ASCII)
            while (isActive) {
                val line = reader.readLine() ?: break
                val frame = PacketParser.parse(line) ?: continue
                lastLine.set(System.currentTimeMillis())
                _frames.tryEmit(frame)
            }
            "Glove disconnected"
        } catch (_: IOException) {
            if (System.currentTimeMillis() - lastLine.get() > STALE_MS) "No data from the glove" else "Connection lost"
        }
        watchdog.cancel()
        reason
    }

    private fun closeSocket() {
        runCatching { socket?.close() }
        socket = null
    }
}
