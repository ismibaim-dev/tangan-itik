package io.github.ismibaimdev.gripwise.data

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "exercise_sessions")
data class SessionEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val exerciseId: String,
    val exerciseName: String,
    val startedAt: Long,
    val endedAt: Long,
    val durationSec: Int,
    val roundsDone: Int,
    val holdsDone: Int,
    val holdsTarget: Int,
    val inZonePct: Int,
    val bestThumb: Float,
    val bestIndex: Float,
    val bestMiddle: Float,
    val bestRing: Float,
    /** False when the set was ended early (exit or symptom stop). */
    val completed: Boolean,
    val demo: Boolean,
)

@Entity(
    tableName = "step_results",
    foreignKeys = [ForeignKey(entity = SessionEntity::class, parentColumns = ["id"], childColumns = ["sessionId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("sessionId")],
)
data class StepResultEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: Long,
    val stepIndex: Int,
    val stepName: String,
    val inZonePct: Int,
)

@Entity(tableName = "symptom_logs")
data class SymptomEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: Long?,
    val exerciseId: String,
    val stepName: String,
    val symptom: String,
    val createdAt: Long,
)

@Entity(tableName = "daily_checkins")
data class CheckinEntity(
    /** yyyy-MM-dd in the phone's time zone. */
    @PrimaryKey val date: String,
    val feeling: String,
    val updatedAt: Long,
)

/** Raw glove frames recorded while a session runs, for the raw-data export. */
@Entity(
    tableName = "raw_frames",
    foreignKeys = [ForeignKey(entity = SessionEntity::class, parentColumns = ["id"], childColumns = ["sessionId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("sessionId")],
)
data class RawFrameEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: Long,
    val timeMs: Long,
    val thumb: Int,
    val index: Int,
    val middle: Int,
    val ring: Int,
    val ax: Float,
    val ay: Float,
    val wrist: String,
)

@Dao
interface GripwiseDao {
    @Insert suspend fun insertSession(s: SessionEntity): Long
    @Insert suspend fun insertSteps(s: List<StepResultEntity>)
    @Insert suspend fun insertFrames(f: List<RawFrameEntity>)
    @Insert suspend fun insertSymptom(s: SymptomEntity): Long
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun upsertCheckin(c: CheckinEntity)

    @Transaction
    suspend fun saveSession(s: SessionEntity, steps: List<StepResultEntity>, frames: List<RawFrameEntity>): Long {
        val id = insertSession(s)
        insertSteps(steps.map { it.copy(sessionId = id) })
        if (frames.isNotEmpty()) insertFrames(frames.map { it.copy(sessionId = id) })
        return id
    }

    @Query("SELECT * FROM exercise_sessions WHERE id = :id") suspend fun session(id: Long): SessionEntity?
    @Query("SELECT * FROM step_results WHERE sessionId = :id ORDER BY stepIndex") suspend fun steps(id: Long): List<StepResultEntity>
    @Query("SELECT * FROM exercise_sessions WHERE startedAt >= :from ORDER BY startedAt DESC") fun sessionsSince(from: Long): Flow<List<SessionEntity>>
    @Query("SELECT * FROM exercise_sessions WHERE startedAt >= :from ORDER BY startedAt") suspend fun sessionsFrom(from: Long): List<SessionEntity>
    @Query("SELECT * FROM symptom_logs WHERE createdAt >= :from ORDER BY createdAt") fun symptomsSince(from: Long): Flow<List<SymptomEntity>>
    @Query("SELECT * FROM symptom_logs WHERE createdAt >= :from ORDER BY createdAt") suspend fun symptomsFrom(from: Long): List<SymptomEntity>
    @Query("SELECT * FROM symptom_logs WHERE sessionId = :id") suspend fun symptomsFor(id: Long): List<SymptomEntity>
    @Query("SELECT * FROM daily_checkins WHERE date >= :from ORDER BY date") fun checkinsSince(from: String): Flow<List<CheckinEntity>>
    @Query("SELECT * FROM daily_checkins WHERE date >= :from ORDER BY date") suspend fun checkinsFrom(from: String): List<CheckinEntity>
    @Query("SELECT * FROM daily_checkins WHERE date = :date") fun checkin(date: String): Flow<CheckinEntity?>
    @Query("SELECT * FROM raw_frames WHERE sessionId IN (SELECT id FROM exercise_sessions WHERE startedAt >= :from) ORDER BY timeMs") suspend fun framesFrom(from: Long): List<RawFrameEntity>
    @Query("SELECT COUNT(*) FROM raw_frames WHERE sessionId IN (SELECT id FROM exercise_sessions WHERE startedAt >= :from)") suspend fun frameCountFrom(from: Long): Int

    @Query("DELETE FROM exercise_sessions") suspend fun clearSessions()
    @Query("DELETE FROM symptom_logs") suspend fun clearSymptoms()
    @Query("DELETE FROM daily_checkins") suspend fun clearCheckins()
}

@Database(
    entities = [SessionEntity::class, StepResultEntity::class, SymptomEntity::class, CheckinEntity::class, RawFrameEntity::class],
    version = 1,
    exportSchema = true,
)
abstract class GripwiseDatabase : RoomDatabase() {
    abstract fun dao(): GripwiseDao
}
