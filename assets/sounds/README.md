# Notification Sounds

## new_booking.mp3 / new_booking.wav

Used for the **New Job Assignment** alert — plays for 15 seconds when a booking is confirmed.

### Requirements
- Duration: ~15 seconds (or shorter; it will loop until 15s elapsed)
- Format: MP3 for in-app playback (`expo-av`), WAV for Android system notification channel
- Volume: Full loudness, no fade-in

### Where to get a sound
1. [Mixkit](https://mixkit.co/free-sound-effects/notification/) — free notification sounds
2. [Freesound](https://freesound.org) — search "notification alert"
3. Record a custom sound

### Files needed
- `new_booking.mp3` — used by expo-av for in-app 15s looped playback
- `new_booking.wav` — used by Android notification channel (background push sound)

Both files can be the same audio converted to two formats.
Convert with: `ffmpeg -i new_booking.mp3 new_booking.wav`
