package io.github.ismibaimdev.gripwise.data

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import io.github.ismibaimdev.gripwise.processing.Calibration
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map

enum class ThemeMode { Light, Dark, System }

/** Minutes after midnight, or -1 when that reminder is off. */
data class ReminderTimes(val morning: Int = 9 * 60, val afternoon: Int = 14 * 60, val evening: Int = 20 * 60) {
    fun forSlot(slot: String): Int = when (slot) { "morning" -> morning; "afternoon" -> afternoon; else -> evening }
}

data class Settings(
    val name: String = "",
    val consent: Boolean = false,
    val onboarded: Boolean = false,
    val themeMode: ThemeMode = ThemeMode.System,
    val demoMode: Boolean = false,
    val soundCue: Boolean = true,
    val remindersOn: Boolean = true,
    val reminders: ReminderTimes = ReminderTimes(),
    val calibration: Calibration = Calibration.DEFAULT,
)

private val Context.store by preferencesDataStore(name = "gripwise_settings")

class SettingsRepository(private val context: Context) {
    private object K {
        val name = stringPreferencesKey("name")
        val consent = booleanPreferencesKey("consent")
        val onboarded = booleanPreferencesKey("onboarded")
        val theme = stringPreferencesKey("theme")
        val demo = booleanPreferencesKey("demo")
        val sound = booleanPreferencesKey("sound")
        val remindersOn = booleanPreferencesKey("reminders_on")
        val morning = intPreferencesKey("rem_morning")
        val afternoon = intPreferencesKey("rem_afternoon")
        val evening = intPreferencesKey("rem_evening")
        val calOpen = (0..3).map { intPreferencesKey("cal_open_$it") }
        val calFist = (0..3).map { intPreferencesKey("cal_fist_$it") }
        val calAx = floatPreferencesKey("cal_ax")
        val calAt = longPreferencesKey("cal_at")
    }

    val flow: Flow<Settings> = context.store.data.map { it.toSettings() }.distinctUntilChanged()

    private fun Preferences.toSettings(): Settings {
        val d = Calibration.DEFAULT
        val cal = Calibration(
            open = (0..3).map { this[K.calOpen[it]] ?: d.open[it] },
            fist = (0..3).map { this[K.calFist[it]] ?: d.fist[it] },
            axNeutral = this[K.calAx] ?: 0f,
            savedAt = this[K.calAt] ?: 0L,
        )
        val r = ReminderTimes()
        return Settings(
            name = this[K.name] ?: "",
            consent = this[K.consent] ?: false,
            onboarded = this[K.onboarded] ?: false,
            themeMode = runCatching { ThemeMode.valueOf(this[K.theme] ?: "System") }.getOrDefault(ThemeMode.System),
            demoMode = this[K.demo] ?: false,
            soundCue = this[K.sound] ?: true,
            remindersOn = this[K.remindersOn] ?: true,
            reminders = ReminderTimes(this[K.morning] ?: r.morning, this[K.afternoon] ?: r.afternoon, this[K.evening] ?: r.evening),
            calibration = cal,
        )
    }

    suspend fun setProfile(name: String, consent: Boolean) = context.store.edit { it[K.name] = name.trim(); it[K.consent] = consent }
    suspend fun setName(name: String) = context.store.edit { it[K.name] = name.trim() }
    suspend fun setOnboarded(v: Boolean) = context.store.edit { it[K.onboarded] = v }
    suspend fun setTheme(m: ThemeMode) = context.store.edit { it[K.theme] = m.name }
    suspend fun setDemo(v: Boolean) = context.store.edit { it[K.demo] = v }
    suspend fun setSound(v: Boolean) = context.store.edit { it[K.sound] = v }
    suspend fun setRemindersOn(v: Boolean) = context.store.edit { it[K.remindersOn] = v }
    suspend fun setReminder(slot: String, minutes: Int) = context.store.edit {
        when (slot) { "morning" -> it[K.morning] = minutes; "afternoon" -> it[K.afternoon] = minutes; else -> it[K.evening] = minutes }
    }

    suspend fun setCalibration(c: Calibration) = context.store.edit {
        for (i in 0..3) { it[K.calOpen[i]] = c.open[i]; it[K.calFist[i]] = c.fist[i] }
        it[K.calAx] = c.axNeutral
        it[K.calAt] = c.savedAt
    }

    /** Erases the profile and calibration; theme stays. */
    suspend fun clearAll() = context.store.edit { prefs ->
        val theme = prefs[K.theme]
        prefs.clear()
        if (theme != null) prefs[K.theme] = theme
    }
}
