import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors } from '../constants/colors';
import { useAuthStore } from '../store';
import api from '../services/api';

function SkillsInput({ skills, onChange }: { skills: string[]; onChange: (s: string[]) => void }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const s = draft.trim();
    if (s && !skills.includes(s)) onChange([...skills, s]);
    setDraft('');
  };

  return (
    <View>
      <View style={styles.skillInputRow}>
        <TextInput
          style={styles.skillInput}
          value={draft}
          onChangeText={setDraft}
          placeholder="e.g. React Native"
          placeholderTextColor={Colors.text3}
          returnKeyType="done"
          onSubmitEditing={add}
          blurOnSubmit={false}
        />
        <TouchableOpacity style={styles.addBtn} onPress={add}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
      {skills.length > 0 && (
        <View style={styles.chips}>
          {skills.map(s => (
            <TouchableOpacity key={s} style={styles.chip} onPress={() => onChange(skills.filter(x => x !== s))}>
              <Text style={styles.chipText}>{s}</Text>
              <Text style={styles.chipX}> ×</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function OnboardingScreen() {
  const { user, setProfile } = useAuthStore();
  const [name,        setName]        = useState('');
  const [location,    setLocation]    = useState('');
  const [description, setDescription] = useState('');
  const [skills,      setSkills]      = useState<string[]>([]);
  const [saving,      setSaving]      = useState(false);

  const isEmployer = user?.userType === 'employer';

  const handleContinue = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your name to continue.');
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updateProfile({
        name: name.trim(),
        location: location.trim(),
        description: description.trim(),
        skills,
      });
      setProfile(updated);
    } catch {
      Alert.alert('Error', 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.emoji}>{isEmployer ? '🏢' : '👋'}</Text>
          <Text style={styles.title}>Set up your profile</Text>
          <Text style={styles.subtitle}>
            {isEmployer
              ? 'Tell job seekers about your company'
              : 'Let employers know who you are'}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>
            {isEmployer ? 'Company / Your Name' : 'Full Name'} <Text style={styles.req}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={isEmployer ? 'Acme Corp / Jane Smith' : 'Jane Smith'}
            placeholderTextColor={Colors.text3}
          />

          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="San Francisco, CA"
            placeholderTextColor={Colors.text3}
          />

          <Text style={styles.label}>{isEmployer ? 'About the role / company' : 'About you'}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder={
              isEmployer
                ? 'Describe your company culture and what you\'re hiring for…'
                : 'What are you looking for? What\'s your background?'
            }
            placeholderTextColor={Colors.text3}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={styles.label}>{isEmployer ? 'Tech stack / tags' : 'Skills'}</Text>
          <Text style={styles.hint}>Tap a chip to remove it</Text>
          <SkillsInput skills={skills} onChange={setSkills} />
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleContinue} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Continue →</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll:    { flexGrow: 1, paddingBottom: 48 },

  header: { alignItems: 'center', paddingTop: 76, paddingBottom: 32, paddingHorizontal: 32 },
  emoji:    { fontSize: 52, marginBottom: 16 },
  title:    { fontSize: 26, fontWeight: '700', color: Colors.text1, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: Colors.text2, textAlign: 'center', lineHeight: 22 },

  form:  { paddingHorizontal: 24 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text2, marginTop: 20, marginBottom: 6 },
  req:   { color: Colors.red },
  hint:  { fontSize: 12, color: Colors.text3, marginBottom: 8, marginTop: -4 },

  input: {
    backgroundColor: Colors.card, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: Colors.text1,
    borderWidth: 1, borderColor: Colors.border,
  },
  textarea: { height: 110 },

  skillInputRow: { flexDirection: 'row', gap: 8 },
  skillInput: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: Colors.text1,
    borderWidth: 1, borderColor: Colors.border,
  },
  addBtn: {
    backgroundColor: Colors.primary, borderRadius: 8,
    paddingHorizontal: 18, justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.tagBg, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  chipText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  chipX:    { color: Colors.primary, fontSize: 16, fontWeight: '700' },

  btn: {
    marginHorizontal: 24, marginTop: 36,
    backgroundColor: Colors.primary, borderRadius: 28,
    paddingVertical: 16, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
