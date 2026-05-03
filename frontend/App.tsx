import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import MainNavigation from './src/navigation';
import { useAuthStore } from './src/store';
import { useNotifications } from './src/hooks/useNotifications';
import api from './src/services/api';
import { Colors } from './src/constants/colors';

function AppContent() {
  const isLoggedIn = useAuthStore(state => state.isLoggedIn);
  const profile    = useAuthStore(state => state.profile);
  const { setUser, setProfile, setToken, logout } = useAuthStore();
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const token = await api.getStoredToken();
        if (!token) return;

        let user = await api.getStoredUser();
        try {
          user = await api.getMe();
          await api.setStoredUser(user);
        } catch {
          if (!user) throw new Error('No stored user');
        }
        if (!mounted) return;
        setToken(token);
        setUser(user);

        try {
          const nextProfile = await api.getProfile();
          if (mounted) setProfile(nextProfile);
        } catch {
          if (mounted) setProfile(null);
        }
      } catch {
        await api.clearToken();
        if (mounted) logout();
      } finally {
        if (mounted) setRestoring(false);
      }
    }

    restoreSession();
    return () => { mounted = false; };
  }, []);

  useNotifications(isLoggedIn);
  if (restoring) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  if (!isLoggedIn)        return <AuthScreen />;
  if (!profile?.name)     return <OnboardingScreen />;
  return <MainNavigation />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
});
