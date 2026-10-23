# Changelog

All notable changes to GripWise are listed here. Versions follow [semantic versioning](https://semver.org/).
The release workflow publishes each version's section below as its GitHub release notes.

## [2.0.0] - 2026-10-23

GripWise is now an Android app. Everything stays on the phone: there is no server and no account.

### Added

- **Android app:** an APK built with Capacitor is attached to every GitHub release, ready to download and install on Android 6.0 or newer.
- **On-device storage:** all data lives in a SQLite database in the app's private storage, using the same schema and programme rules as before.
- **CSV export:** Profile > Your data exports everything as five CSV files (profile, sessions, exercises per session, symptom logs and weekly checks) through Android's share sheet, so they can be saved to Files or Drive, or emailed.
- **Daily reminder notification** at the practice time chosen in onboarding, which can be switched on or off in Profile.
- **Erase all data** in Profile.

### Changed

- No sign-up or sign-in. Onboarding asks for a first name instead.
- CI builds a debug APK for every change, downloadable from the run's artifacts.
- CI and release workflows use `actions/checkout` and `actions/setup-node` v5, which run on Node 24 instead of the deprecated Node 20.

### Fixed

- The release workflow no longer fails when a release was already published from the GitHub web UI. It now replaces that release's notes with the version's changelog section.

### Removed

- The Express API server, server-side database and Docker image. Version 1.0.0 was never hosted, so there is no server data to migrate.

## [1.0.0] - 2026-10-23

First release of GripWise, a full-stack web app for guided carpal tunnel rehabilitation.

### Features

- **Accounts:** register, sign in and out, and delete the account with all its data
- **Onboarding:** affected and dominant hand, symptom duration, past surgery, goals, daily practice time and a safety acknowledgement
- **Three-phase programme:** *Calm & glide*, *Restore flexibility* and *Rebuild strength*. A phase unlocks after 6 sessions, a 7-day average pain of 3/10 or less, and no recent sessions that made pain worse. Users can step back a phase at any time
- **Pain-aware routine:** when the latest pain score is 7/10 or higher, the day's routine switches to gentle glides only
- **Guided session player:** pain check-in, then timed get ready, hold, relax and rest steps with sound, vibration and screen wake lock, then a pain check-out with feedback
- **Symptom log:** pain, numbness and tingling (0–10), night waking, optional grip strength and notes
- **Weekly symptom check:** 11 questions adapted from the Boston Carpal Tunnel Questionnaire symptom scale, scored 1–5 and compared with the previous check
- **Progress:** streaks, totals, symptom trends, sessions per day or week, weekly scores and grip strength over 30 or 90 days, each with a table view
- **Exercise library:** 13 exercises with steps, dose, equipment and cautions
- **Reminders:** a repeating calendar event (.ics) at the chosen practice time

### Technical

- React 19, Vite, Tailwind CSS v4, TanStack Query, React Router and Recharts on the client
- Express 5, TypeScript and Zod on the server, with a JWT session cookie
- SQLite database with versioned migrations and `CHECK` constraints
- 25 API and unit tests, a CI workflow, a Dockerfile and a demo-data script

### Getting started

```bash
npm install
npm run db:demo   # demo account: demo@gripwise.app / gripwise-demo
npm run dev       # http://localhost:5173
```

GripWise offers general exercises and tracking. It does not diagnose or treat any condition and is not a substitute for a doctor or hand therapist.
