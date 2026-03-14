import { Audio } from 'expo-av';

const ALERT_DURATION_MS = 15000; // 15 seconds

let activeSound: Audio.Sound | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Play the new booking alert sound for 15 seconds.
 * Loops until the duration is reached or stopBookingAlert() is called.
 */
export const playBookingAlert = async (): Promise<void> => {
  try {
    // Stop any currently playing alert first
    await stopBookingAlert();

    // Set audio mode for alert (play over silent mode on iOS)
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/sounds/new_booking.mp3'),
      {
        shouldPlay: true,
        isLooping: true,
        volume: 1.0,
      }
    );

    activeSound = sound;

    // Auto-stop after 15 seconds
    stopTimer = setTimeout(() => {
      stopBookingAlert();
    }, ALERT_DURATION_MS);
  } catch (error) {
    // Sound file may not exist or device has no audio — fail silently
    console.warn('[SoundPlayer] Could not play booking alert:', error);
  }
};

/**
 * Stop the booking alert sound immediately.
 */
export const stopBookingAlert = async (): Promise<void> => {
  try {
    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }

    if (activeSound) {
      await activeSound.stopAsync();
      await activeSound.unloadAsync();
      activeSound = null;
    }
  } catch (error) {
    // Ignore cleanup errors
  }
};
