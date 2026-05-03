import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import api from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotifications(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    registerAndSaveToken().catch(err =>
      console.warn('Push notification setup failed:', err)
    );
  }, [enabled]);
}

async function registerAndSaveToken(): Promise<void> {
  if (!Device.isDevice) {
    // Expo push tokens are not available on simulators/emulators
    return;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return;
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync();
  await api.saveDeviceToken(token);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('matches', {
      name: 'Matches',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}
