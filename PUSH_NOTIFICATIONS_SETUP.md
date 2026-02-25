# Push Notifications Setup

## Dependencies Installation

Run the following command to install required dependencies:

```bash
cd urban-mobile-professional
npx expo install expo-notifications expo-device expo-constants
```

## Backend Dependencies

The backend also needs the Expo Server SDK:

```bash
cd urban-backend
npm install expo-server-sdk
npm install --save-dev @types/expo-server-sdk
```

## Configuration

### app.json

The notification icon configuration has already been added to `app.json`:

```json
{
  "android": {
    "notification": {
      "icon": "./assets/notification-icon.png"
    }
  }
}
```

### Android Notification Icon

Create a simple white/transparent icon at `assets/notification-icon.png` (96x96 px).
The icon should be white on transparent background as Android will colorize it.

## Testing

1. **Development**: Notifications work in Expo Go app for testing
2. **Production**: Requires building with EAS Build for full functionality

## Permissions

The app will automatically request notification permissions on first launch.
Users can manage permissions in device settings.

## Troubleshooting

- **No notifications received**: Check if user has granted permissions
- **Token registration fails**: Ensure device has internet connection
- **iOS notifications not working**: Ensure app is built with EAS Build (not Expo Go)
