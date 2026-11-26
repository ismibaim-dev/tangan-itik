# Gripwise design handoff

The approved Gripwise app design that the Android app in `app/` is built from. The tokens now live in `app/src/main/java/io/github/ismibaimdev/gripwise/ui/theme/`.

- Live design canvas: https://claude.ai/artifact/7YaEm2HJYysJ3Jrbrbqxtv
- Clickable simulator: https://claude.ai/artifact/EfTRGjDz4tfL4AShmhbksy (also `simulator.html` here, opens offline)

## What is in this folder

| Path | What it is |
|---|---|
| `screenshots/light/*.png`, `screenshots/dark/*.png` | Every screen at 390×844 (2× pixels). `state-*` = extra states, `exercise-*` = the live session for each exercise. **Treat these as the visual spec.** |
| `screens/*.html` | Source of each screen: exact spacing, radii, font sizes, copy and the behaviour logic (in the `<script>` at the bottom of each file). |
| `simulator.html` | Runs every screen. Use it to check flows and what each button does. |
| `tokens.json` | The colour tokens, Light and Dark. One semantic set used by every screen. |

## Visual rules

- Font: Plus Jakarta Sans (400–800). Sizes used: 11, 12, 13, 14, 15, 16, 20–21, 24–30.
- Cards: radius 20–24, no borders in light mode; screen padding 20 dp; top safe area ≈ 52 dp, bottom ≈ 30–34 dp.
- Colour meaning: blue = active / in target zone, green = completed, amber/orange = corrective cue or tingling/pain, red = errors only.
- Every tappable control ≥ 44×44 dp. All screens scroll; bottom bar and session controls stay pinned.
- Theme: Light / Dark / System, chosen in Profile → Appearance, applied app-wide. Dark is true black (`#000`) with grey surfaces.
- Bottom nav: 4 tabs (Home, Exercises, Progress, Profile). No floating action button.

## Screens and routes (suggested)

| Screen | Route | Notes |
|---|---|---|
| Welcome | `welcome` | Get started → Create account; "I already have an account" → Sign in |
| Create account | `signup` | Step 1 of 3. Inline validation (name, email, password ≥ 8, consent). |
| Connect glove | `pair` | Step 2 of 3. States: Scanning, Connected, No glove found, Low battery (< 15%). |
| Calibrate | `calibrate?context=onboarding\|settings` | Step 3 of 3. 3 holds × 3 s with ring + progress bar, Redo per step, Recalibrate all. Settings context = "Glove & calibration" screen. |
| Sign in | `login` | Inline validation, Forgot password and email-link both show a confirmation. |
| Home | `home` | Daily check-in (Great/Okay/Stiff/Sore/Tingly), Today's plan. Morning card → session summary; Evening card → sheet (Start now, reminder time). |
| Exercises | `exercises` | Tabs: Routines (4) / Single moves (4). |
| Live session | `session/{exerciseId}` | See "Live session behaviour". |
| Session complete | `done/{sessionId}` | 5 gold bars, reps / time / % in zone. |
| Session summary | `review/{sessionId}` | Per-step accuracy and how it felt. |
| Progress | `progress` | Week / Month toggle changes KPIs, chart and finger rows. |
| Export | `export` | CSV data or PDF report for physio; human-readable summary; Share sheet → confirmation. |
| Profile | `profile` | Account + Edit sheet, Appearance, Glove & calibration, Export, Reminders, Sign out. |

## Live session behaviour

- **Hands-free:** when every tracked sensor is inside its target zone, the hold ring counts down (hold seconds per exercise) and the screen moves to the next step automatically. A header toggle turns the sound/vibration cue on/off.
- Off-target: amber hint naming the finger or wrist direction ("Ring finger: straighten a little more").
- Controls: Back (disabled on step 1) · Pause/Resume (primary) · Skip. Above them: **Felt tingling or pain**.
- Symptom stop: opens a sheet (Tingling / Numbness / Pain / Something else) → "Save and end set" logs it and offers Back to home.
- X opens a confirmation sheet: Resume / End session.
- Glove disconnected: amber banner, timer paused, Reconnect.
- After the last step: "Round N complete" with Finish for now / Start next round.
- All 8 exercises, their steps, cues, target zones and hold times are in `screens/Session.html` (`exData()`). The zones and angles are placeholders until a physiotherapist confirms them.

## Data it expects (Supabase)

- `user_profiles`: calibration (0% / 100% bend per finger, neutral wrist), theme mode, reminder times.
- `exercise_sessions`: one row per finished set (exercise, reps, duration, % in zone, per-step results).
- `daily_exercise_summary` view: drives Progress (week and month) and Export.
- New: `symptom_logs` (user_id, session_id, step, symptom, created_at) and `daily_checkins` (user_id, date, feeling).
- Live data comes from `GripwiseProcessor` (flex % per finger + `WristState`), streamed into the Session screen.

## Status

The native app in `app/` implements this design (v3.0.0). Login and sign-up screens are kept here for when accounts return with a Supabase backend; the app currently uses a local profile.
