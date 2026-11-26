package io.github.ismibaimdev.gripwise.reminders

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import io.github.ismibaimdev.gripwise.GripwiseApp
import io.github.ismibaimdev.gripwise.MainActivity
import io.github.ismibaimdev.gripwise.R
import io.github.ismibaimdev.gripwise.data.Settings
import io.github.ismibaimdev.gripwise.exercises.ExerciseCatalog
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime

/** Schedules one inexact daily alarm per plan slot. No exact-alarm permission is needed. */
class ReminderScheduler(private val context: Context) {
    companion object {
        const val CHANNEL = "reminders"
        const val EXTRA_SLOT = "slot"
        private val SLOTS = listOf("morning", "afternoon", "evening")
    }

    private val alarms get() = context.getSystemService(AlarmManager::class.java)

    fun ensureChannel() {
        val nm = context.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CHANNEL, context.getString(R.string.reminder_channel), NotificationManager.IMPORTANCE_DEFAULT))
    }

    fun reschedule(s: Settings) {
        SLOTS.forEachIndexed { i, slot ->
            val pi = pending(slot, i)
            alarms.cancel(pi)
            val minutes = s.reminders.forSlot(slot)
            if (!s.onboarded || !s.remindersOn || minutes < 0) return@forEachIndexed
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextTrigger(minutes), pi)
        }
    }

    private fun pending(slot: String, code: Int): PendingIntent {
        val intent = Intent(context, ReminderReceiver::class.java).putExtra(EXTRA_SLOT, slot)
        return PendingIntent.getBroadcast(context, 100 + code, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun nextTrigger(minutes: Int, zone: ZoneId = ZoneId.systemDefault()): Long {
        val now = ZonedDateTime.now(zone)
        var t = ZonedDateTime.of(LocalDate.now(zone), LocalTime.of(minutes / 60, minutes % 60), zone)
        if (!t.isAfter(now.plusSeconds(30))) t = t.plusDays(1)
        return t.toInstant().toEpochMilli()
    }
}

/** Posts the reminder, then schedules tomorrow's. Tapping it opens that slot's exercise. */
class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val slot = intent.getStringExtra(ReminderScheduler.EXTRA_SLOT) ?: return
        val container = (context.applicationContext as GripwiseApp).container
        val settings = runBlocking { container.settings.flow.first() }
        container.reminders.reschedule(settings)
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return
        val exerciseId = ExerciseCatalog.dailyPlan.firstOrNull { it.first == slot }?.second ?: return
        val exercise = ExerciseCatalog.byId(exerciseId)
        val open = Intent(context, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            .putExtra(MainActivity.EXTRA_ROUTE, "session/${exercise.id}")
        val tap = PendingIntent.getActivity(context, 200 + slot.hashCode() % 50, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val n = NotificationCompat.Builder(context, ReminderScheduler.CHANNEL)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Time for ${exercise.name.lowercase()}")
            .setContentText("${exercise.meta}. Put on the glove when you're ready.")
            .setContentIntent(tap)
            .setAutoCancel(true)
            .build()
        runCatching { NotificationManagerCompat.from(context).notify(slot.hashCode(), n) }
    }
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        val container = (context.applicationContext as GripwiseApp).container
        container.reminders.reschedule(runBlocking { container.settings.flow.first() })
    }
}
