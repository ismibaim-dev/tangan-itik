package io.github.ismibaimdev.gripwise

import android.app.Application
import androidx.room.Room
import io.github.ismibaimdev.gripwise.data.GripwiseDatabase
import io.github.ismibaimdev.gripwise.data.Settings
import io.github.ismibaimdev.gripwise.data.SettingsRepository
import io.github.ismibaimdev.gripwise.export.Exporter
import io.github.ismibaimdev.gripwise.glove.GloveManager
import io.github.ismibaimdev.gripwise.processing.Calibration
import io.github.ismibaimdev.gripwise.processing.GripwiseProcessor
import io.github.ismibaimdev.gripwise.processing.LiveReading
import io.github.ismibaimdev.gripwise.reminders.ReminderScheduler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class GripwiseApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}

/** Hand-wired dependencies shared by every screen. */
class AppContainer(app: Application) {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    val settings = SettingsRepository(app)
    val db: GripwiseDatabase = Room.databaseBuilder(app, GripwiseDatabase::class.java, "gripwise.db")
        .fallbackToDestructiveMigration(true)
        .build()
    val dao = db.dao()
    val glove = GloveManager(app, scope)
    val reminders = ReminderScheduler(app)
    val exporter = Exporter(app, dao)

    val settingsState: StateFlow<Settings?> = settings.flow.stateIn(scope, SharingStarted.Eagerly, null)

    private val _reading = MutableStateFlow<LiveReading?>(null)
    /** The latest calibrated reading from whichever glove is active. */
    val reading: StateFlow<LiveReading?> = _reading.asStateFlow()

    private val processor = GripwiseProcessor()
    @Volatile private var calibration: Calibration = Calibration.DEFAULT

    init {
        reminders.ensureChannel()
        scope.launch {
            settings.flow.map { it.demoMode }.distinctUntilChanged().collect { glove.setDemoMode(it) }
        }
        scope.launch {
            settings.flow.map { it.calibration }.distinctUntilChanged().collect { calibration = it; processor.reset() }
        }
        scope.launch {
            settings.flow.distinctUntilChanged { a, b -> a.reminders == b.reminders && a.remindersOn == b.remindersOn && a.onboarded == b.onboarded }
                .collect { reminders.reschedule(it) }
        }
        scope.launch {
            glove.frames.collect { frame -> _reading.value = processor.process(frame, calibration) }
        }
        scope.launch {
            glove.status.collect { if (it !is io.github.ismibaimdev.gripwise.glove.GloveStatus.Connected) processor.reset() }
        }
    }
}
