import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store';
import { Colors } from '../constants/colors';
import api from '../services/api';

type UserType = 'job_seeker' | 'employer';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password123');
  const [username, setUsername] = useState('');
  const [userType, setUserType] = useState<UserType>('job_seeker');
  const [loading, setLoading] = useState(false);

  const { setUser, setProfile, setToken } = useAuthStore();

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const resp = isLogin
        ? await api.login(email.trim(), password)
        : await api.register(email.trim(), username.trim(), password, userType);

      setUser(resp.user);
      setToken(resp.token);

      try {
        const profile = await api.getProfile();
        setProfile(profile);
      } catch {
        // new user — profile not yet created, that's fine
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Something went wrong. Check your details and try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* LinkedIn-style blue header */}
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>in</Text>
          </View>
          <Text style={styles.headerTitle}>JobSwiper</Text>
          <Text style={styles.headerSubtitle}>Find your next opportunity</Text>
        </View>

        {/* White card */}
        <View style={styles.card}>
          {/* Login / Sign Up toggle */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, isLogin && styles.tabActive]}
              onPress={() => setIsLogin(true)}
            >
              <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>Log In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, !isLogin && styles.tabActive]}
              onPress={() => setIsLogin(false)}
            >
              <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* User type picker */}
          <Text style={styles.pickerLabel}>I am a</Text>
          <View style={styles.userTypePicker}>
            <TouchableOpacity
              style={[styles.userTypeBtn, userType === 'job_seeker' && styles.userTypeBtnActive]}
              onPress={() => setUserType('job_seeker')}
            >
              <Text style={[styles.userTypeBtnText, userType === 'job_seeker' && styles.userTypeBtnTextActive]}>
                Job Seeker
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.userTypeBtn, userType === 'employer' && styles.userTypeBtnActive]}
              onPress={() => setUserType('employer')}
            >
              <Text style={[styles.userTypeBtnText, userType === 'employer' && styles.userTypeBtnTextActive]}>
                Employer
              </Text>
            </TouchableOpacity>
          </View>

          {/* Inputs */}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.text3}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={Colors.text3}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.text3}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{isLogin ? 'Log In' : 'Create Account'}</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>Demo: fields are pre-filled — just tap Log In</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  scrollContent: { flexGrow: 1 },

  header: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    paddingTop: 76,
    paddingBottom: 40,
    paddingHorizontal: 32,
  },
  logoMark: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoMarkText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    fontStyle: 'italic',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
  },

  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 48,
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 6,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tabText: { fontSize: 14, color: Colors.text2, fontWeight: '500' },
  tabTextActive: { color: Colors.text1, fontWeight: '700' },

  pickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text2,
    marginBottom: 8,
  },
  userTypePicker: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  userTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  userTypeBtnActive: {
    backgroundColor: Colors.primary,
  },
  userTypeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  userTypeBtnTextActive: {
    color: '#fff',
  },

  input: {
    backgroundColor: Colors.card,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.text1,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 24,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 13, color: Colors.text3, textAlign: 'center' },
});
