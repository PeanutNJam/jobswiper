import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, Image, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store';
import api from '../services/api';
import { Colors } from '../constants/colors';

function SkillsInput({ skills, onChange }: { skills: string[]; onChange: (s: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const s = draft.trim();
    if (s && !skills.includes(s)) onChange([...skills, s]);
    setDraft('');
  };
  return (
    <View>
      <View style={styles.skillRow}>
        <TextInput
          style={styles.skillInput}
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a skill…"
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
        <View style={styles.skillChips}>
          {skills.map(s => (
            <TouchableOpacity key={s} style={styles.skillChip} onPress={() => onChange(skills.filter(x => x !== s))}>
              <Text style={styles.skillChipText}>{s}</Text>
              <Text style={styles.skillChipX}> ×</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const { user, profile, setProfile, logout } = useAuthStore();
  const [editing,        setEditing]        = useState(false);
  const [name,           setName]           = useState(profile?.name ?? '');
  const [description,    setDescription]    = useState(profile?.description ?? '');
  const [location,       setLocation]       = useState(profile?.location ?? '');
  const [skills,         setSkills]         = useState<string[]>(profile?.skills ?? []);
  const [saving,         setSaving]         = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!profile) {
      api.getProfile().then(setProfile).catch(() => {});
    }
  }, []);

  useEffect(() => {
    setName(profile?.name ?? '');
    setDescription(profile?.description ?? '');
    setLocation(profile?.location ?? '');
    setSkills(profile?.skills ?? []);
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateProfile({ name, description, location, skills });
      setProfile(updated);
      setEditing(false);
    } catch {
      Alert.alert('Error', 'Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(profile?.name ?? '');
    setDescription(profile?.description ?? '');
    setLocation(profile?.location ?? '');
    setSkills(profile?.skills ?? []);
    setEditing(false);
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => { await api.clearToken(); logout(); },
      },
    ]);
  };

  const handleChangePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      setUploadingPhoto(true);
      const uri = result.assets[0].uri;
      const { uploadUrl, publicUrl } = await api.getUploadUrl('profile.jpg', 'image/jpeg');
      const blob = await (await fetch(uri)).blob();
      await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
      const updated = await api.updateProfile({
        name, description, location, skills, photoUrl: publicUrl,
      });
      setProfile(updated);
    } catch {
      Alert.alert('Upload Failed', 'Could not upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const avatarLetter = (profile?.name ?? user?.username ?? '?')[0]?.toUpperCase() ?? '?';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Profile</Text>

      <View style={styles.avatarRow}>
        {profile?.photoUrl ? (
          <Image source={{ uri: profile.photoUrl }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
        )}
        <TouchableOpacity onPress={handleChangePhoto} disabled={uploadingPhoto} style={styles.changePhotoBtn}>
          <Text style={styles.changePhotoText}>
            {uploadingPhoto ? 'Uploading…' : 'Change Photo'}
          </Text>
        </TouchableOpacity>
      </View>

      {editing ? (
        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName}
            placeholder="Your name" placeholderTextColor={Colors.text3} />

          <Text style={styles.label}>About</Text>
          <TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription}
            placeholder="Tell employers about yourself..." placeholderTextColor={Colors.text3}
            multiline numberOfLines={4} textAlignVertical="top" />

          <Text style={styles.label}>Location</Text>
          <TextInput style={styles.input} value={location} onChangeText={setLocation}
            placeholder="City, State" placeholderTextColor={Colors.text3} />

          <Text style={styles.label}>Skills</Text>
          <Text style={styles.hint}>Tap a chip to remove it</Text>
          <SkillsInput skills={skills} onChange={setSkills} />

          <View style={styles.editActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={saving}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.viewSection}>
          <Text style={styles.name}>{profile?.name ?? user?.username ?? 'Unknown'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {user?.userType === 'employer' ? '🏢 Employer' : '👤 Job Seeker'}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.infoText}>
              {profile?.description?.length ? profile.description : 'No bio yet. Tap Edit to add one.'}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.infoText}>
              📍 {profile?.location?.length ? profile.location : 'Not set'}
            </Text>
          </View>

          {(profile?.skills?.length ?? 0) > 0 && (
            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>Skills</Text>
              <View style={styles.skillChips}>
                {profile!.skills!.map(s => (
                  <View key={s} style={styles.skillChipView}>
                    <Text style={styles.skillChipText}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { paddingBottom: 48 },
  header: {
    fontSize: 28, fontWeight: '700', color: Colors.text1,
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 24,
  },
  avatarRow:      { alignItems: 'center', marginBottom: 16 },
  avatar:         { width: 84, height: 84, borderRadius: 42, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarImage:    { width: 84, height: 84, borderRadius: 42 },
  avatarText:     { fontSize: 34, color: '#fff', fontWeight: '700' },
  changePhotoBtn: { marginTop: 8 },
  changePhotoText:{ fontSize: 14, color: Colors.primary, fontWeight: '600' },

  viewSection: { paddingHorizontal: 20 },
  name:  { fontSize: 24, fontWeight: '700', color: Colors.text1, textAlign: 'center', marginBottom: 4 },
  email: { fontSize: 14, color: Colors.text2, textAlign: 'center' },
  typeBadge: {
    alignSelf: 'center', backgroundColor: Colors.primaryLight,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5,
    marginTop: 10, marginBottom: 24,
  },
  typeBadgeText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },

  infoCard: {
    backgroundColor: Colors.card, borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  infoText:     { fontSize: 16, color: Colors.text2, lineHeight: 24 },

  editBtn: {
    backgroundColor: Colors.primary, borderRadius: 28, paddingVertical: 14, alignItems: 'center', marginTop: 12,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  editBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  form:    { paddingHorizontal: 20 },
  label:   { fontSize: 14, fontWeight: '600', color: Colors.text2, marginBottom: 8, marginTop: 20 },
  hint:    { fontSize: 13, color: Colors.text3, marginBottom: 8, marginTop: -4 },
  input:   {
    backgroundColor: Colors.primaryLight, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: Colors.text1, borderWidth: 1, borderColor: Colors.border,
  },
  textarea:{ height: 120 },

  skillRow:  { flexDirection: 'row', gap: 10 },
  skillInput:{
    flex: 1, backgroundColor: Colors.primaryLight, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: Colors.text1, borderWidth: 1, borderColor: Colors.border,
  },
  addBtn:    { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center' },
  addBtnText:{ color: '#fff', fontWeight: '700', fontSize: 16 },

  skillChips:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  skillChip:    { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.tagBg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  skillChipView:{ backgroundColor: Colors.tagBg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  skillChipText:{ color: Colors.primary, fontSize: 14, fontWeight: '600' },
  skillChipX:   { color: Colors.primary, fontSize: 18, fontWeight: '700' },

  editActions:  { flexDirection: 'row', gap: 16, marginTop: 32 },
  cancelBtn:    {
    flex: 1, borderRadius: 28, paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  cancelBtnText:{ color: Colors.text2, fontSize: 16, fontWeight: '600' },
  saveBtn:      {
    flex: 2, borderRadius: 28, paddingVertical: 16, alignItems: 'center', backgroundColor: Colors.primary,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  saveBtnText:  { color: '#fff', fontSize: 16, fontWeight: '600' },

  logoutBtn:    {
    marginHorizontal: 20, marginTop: 14, borderRadius: 28, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.red, backgroundColor: '#FFF5F5',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  logoutBtnText:{ color: Colors.red, fontSize: 16, fontWeight: '600' },
});
