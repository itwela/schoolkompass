# Expo Notifications Documentation

## scheduleNotificationAsync

```typescript
scheduleNotificationAsync(request: Notifications.NotificationRequestInput): Promise<string>
```

Schedules a notification to be triggered in the future.

> **Note:** This does not mean that the notification will be presented when it is triggered. For the notification to be presented you have to set a notification handler with `setNotificationHandler` that will return an appropriate notification behavior.

### Parameters

- `request` — An object describing the notification to be triggered.

### Returns

Returns a Promise resolving to a string which is a notification identifier you can later use to cancel the notification or to identify an incoming notification.

### Examples

#### Schedule a one-time notification (triggers in one minute)

```javascript
import * as Notifications from 'expo-notifications';

Notifications.scheduleNotificationAsync({
  content: {
    title: "Time's up!",
    body: 'Change sides!',
  },
  trigger: {
    type: SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: 60,
  },
});
```

#### Schedule a recurring notification (every 20 minutes)

```javascript
import * as Notifications from 'expo-notifications';

Notifications.scheduleNotificationAsync({
  content: {
    title: 'Remember to drink water!',
  },
  trigger: {
    type: SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: 60 * 20,
    repeats: true,
  },
});
```

#### Schedule a notification for the next hour

```javascript
import * as Notifications from 'expo-notifications';

const trigger = new Date(Date.now() + 60 * 60 * 1000);
trigger.setMinutes(0);
trigger.setSeconds(0);

Notifications.scheduleNotificationAsync({
  content: {
    title: 'Happy new hour!',
  },
  trigger,
});
```
-----

Grok ⬇️

-----

# Expo iOS Build Guide: Background Audio & Push Notifications for TestFlight

This guide walks you through setting up an Expo app for iOS with background audio and push notifications, built as a standalone app for TestFlight distribution. It assumes you’re starting from scratch (no APN Key) and using the Expo managed workflow (no native libraries unless specified). It’s designed for reuse across multiple apps, with notes on handling native libraries if needed.

**Date**: February 23, 2025  
**Prerequisites**: 
- Expo project initialized (`npx create-expo-app`).
- Apple Developer Account ($99/year).
- Node.js and npm installed.

---

## Step 1: Project Setup

### 1.1 Configure `app.json`
Ensure your `app.json` has the basics for iOS and supports updates:
```json
{
  "expo": {
    "name": "YourAppName",
    "slug": "your-app-slug",
    "version": "1.0.0",
    "platforms": ["ios"],
    "ios": {
      "bundleIdentifier": "com.yourname.yourapp" // Unique, e.g., com.itwela.app1
    },
    "updates": {
      "enabled": true,
      "fallbackToCacheTimeout": 0
    },
    "extra": {
      "eas": {
        "projectId": "your-project-id" // Run `eas config` to get this later
      }
    }
  }
}
```
- Replace `YourAppName`, `your-app-slug`, and `com.yourname.yourapp` with app-specific values.
- `updates`: Enables OTA updates for quick code changes post-build.

### 1.2 Install EAS CLI
```bash
npm install -g eas-cli
```
- Verify: `eas --version` (aim for 15.0.12 or later as of Feb 2025).

---

## Step 2: Configure Background Audio

### 2.1 Add Audio Code
In your main component (e.g., `ReadListenScreen.js`):
```jsx
import { Audio } from 'expo-av';
import { useEffect, useState } from 'react';

export default function YourComponent() {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Configure audio mode for background playback
  useEffect(() => {
    const configureAudio = async () => {
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX
      });
    };
    configureAudio();
  }, []);

  // Load and play audio
  const loadAudio = async () => {
    const { sound } = await Audio.Sound.createAsync(
      { uri: 'your-audio-url.mp3' }, // Replace with your audio source
      { shouldPlay: false }
    );
    setSound(sound);
  };

  const playPauseAudio = async () => {
    if (!sound) return;
    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    loadAudio();
    return () => sound?.unloadAsync();
  }, []);

  return (
    // Your UI with play/pause button
    <Button title={isPlaying ? "Pause" : "Play"} onPress={playPauseAudio} />
  );
}
```
- Test locally with `npx expo start`—audio won’t play in background yet (Expo Go limitation).

---

## Step 3: Set Up Push Notifications (No APN Key Yet)

### 3.1 Generate an APN Key
- **Go to**: [developer.apple.com/account](https://developer.apple.com/account) > “Certificates, Identifiers & Profiles” > “Keys.”
- **Create Key**:
  - Click “+” > Name: “YourAppName APN Key” (no special chars: @, &, *, ', ", -, .).
  - Check “Apple Push Notifications service (APNs).”
  - Click “Configure”:
    - **Environment**: Select “Both” (Development & Production) or “Production” if “Both” isn’t available.
    - **Key Restriction**: Choose “Unrestricted” (works for all apps).
    - Save configuration.
  - Click “Continue” > “Register.”
- **Download**: Save the `.p8` file (e.g., `AuthKey_XXXXXXXXXX.p8`).
- **Note**: Copy the Key ID (10 characters, e.g., `XXXXXXXXXX`).

### 3.2 Enable Push in App ID
- **Go to**: “Identifiers” > Find or create `com.yourname.yourapp`.
- **Edit**: Check “Push Notifications” > Save.
- **Note**: No SSL certificates needed—Expo uses the APN Key.

### 3.3 Add Push Notification Code
In your component:
```jsx
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

useEffect(() => {
  const setupPush = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id' // From `eas config` or app.json
      });
      console.log('Push Token:', token.data);
    }
  };
  setupPush();
}, []);
```
- Test locally to log the token.

---

## Step 4: Configure EAS Build

### 4.1 Create `eas.json`
```json
{
  "cli": {
    "version": ">= 0.52.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "testflight": {
      "distribution": "internal",
      "ios": {
        "credentialsSource": "remote"
      }
    }
  }
}
```
- **development**: For QR code testing (optional).
- **testflight**: For standalone TestFlight build.

### 4.2 Upload APN Key to EAS
```bash
eas credentials
```
- Select iOS > Your app (`@yourusername/your-app-slug`).
- Choose “Manage push notification credentials.”
- Select “Upload my own key”:
  - Path: `/path/to/AuthKey_XXXXXXXXXX.p8`.
  - Key ID: `XXXXXXXXXX`.
- Confirm it’s assigned.

### 4.3 Build for TestFlight
```bash
eas build --profile testflight --platform ios
```
- **First Time**:
  - Log in with Apple ID when prompted.
  - Let EAS generate certificates/provisioning profiles.
- **Output**: Build uploads to TestFlight.

---

## Step 5: Install and Test

### 5.1 Install via TestFlight
- Go to App Store Connect > Your App > TestFlight.
- Add yourself as a tester (your Apple ID email).
- Open TestFlight app on iPhone > Install.

### 5.2 Test Features
- **Background Audio**: Play audio, minimize app (home screen/lock), confirm it continues.
- **Push Notifications**:
  - Log push token from app.
  - Send test via [expo.dev/notifications](https://expo.dev/notifications):
    ```json
    {
      "to": "your-push-token",
      "title": "Test",
      "body": "Hello!"
    }
    ```
  - Minimize app, send again, check lock screen.

### 5.3 OTA Updates
- Update code locally > Run `expo publish`.
- Relaunch TestFlight app to fetch updates (no rebuild needed).

---

## Handling Native Libraries
If you need native libraries (e.g., beyond Expo’s managed workflow):
- **Config Plugins**: Use Expo’s config plugins in `app.json` (e.g., for custom permissions).
  - Example: Add `expo-background-fetch`:
    ```json
    {
      "expo": {
        "plugins": ["expo-background-fetch"]
      }
    }
    ```
- **Custom Dev Client**: Build with `"developmentClient": true`:
  ```bash
  eas build --profile development --platform ios
  ```
  - Install custom client > Run `npx expo start` > Scan QR code.
- **Bare Workflow**: If libraries require native code (e.g., `react-native-track-player`):
  - Run `npx expo prebuild` to eject to bare workflow.
  - Manage native builds manually (Xcode, Android Studio).
  - Update APN Key in Xcode (not EAS).

---

## Troubleshooting
- **Build Fails**: Check logs (EAS provides URL). Validate `eas.json` (no invalid fields like `"testflight": true` in `ios`).
- **Push Not Working**: Verify APN Key in EAS (`eas credentials`), re-upload if needed.
- **Audio Stops**: Ensure `staysActiveInBackground: true` in `Audio.setAudioModeAsync`.
- **Expo Status**: Check [status.expo.dev](https://status.expo.dev) for APN Key issues (e.g., Feb 21, 2025 outage).

---

## Notes
- **APN Key**: One key works for all apps under your Apple account—reuse it.
- **TestFlight**: Builds take 10-30 mins; OTA updates are faster.
- **Multiple Apps**: Repeat steps, updating `app.json` bundle ID and `eas credentials` per app.

Save this guide in your project root (e.g., `BUILD_GUIDE.md`)—it’s your blueprint for future apps! Let me know if you want to tweak it further or add app-specific details.

---

How’s that? Does it capture everything you need for your multi-app setup? Anything else you’d like to include?