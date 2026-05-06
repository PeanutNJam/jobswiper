import { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, Alert, Animated, PanResponder,
  Modal,
} from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import Agreement02Icon from '@hugeicons/core-free-icons/dist/esm/Agreement02Icon';
import Delete02Icon from '@hugeicons/core-free-icons/dist/esm/Delete02Icon';
import { Colors } from '../constants/colors';
import { Candidate, Job, MatchDetail } from '../types';
import api from '../services/api';
import ConversationScreen from './ConversationScreen';
import { useAuthStore } from '../store';

type ActiveConvo = { matchId: string; otherUserName: string; otherUserId: string };

const palette = ['#0A66C2','#057642','#7C3AED','#DC2626','#0284C7','#EA580C'];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return palette[h % palette.length] ?? '#0A66C2';
}

function MatchItem({
  match,
  onPress,
  onDelete,
  onProfile,
}: {
  match: MatchDetail;
  onPress: () => void;
  onDelete: (resetSwipe: () => void) => Promise<boolean>;
  onProfile: (match: MatchDetail) => void;
}) {
  const color = avatarColor(match.otherUserName);
  const preview = match.lastMessage?.trim() || 'No messages yet';
  const translateX = useRef(new Animated.Value(0)).current;
  const resetSwipe = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
  };
  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) =>
      Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_, gesture) => {
      translateX.setValue(Math.max(Math.min(gesture.dx, 0), -96));
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx < -72) {
        onDelete(resetSwipe).then(didDelete => {
          if (!didDelete) resetSwipe();
        });
        return;
      }
      resetSwipe();
    },
    onPanResponderTerminate: () => {
      resetSwipe();
    },
  })).current;

  return (
    <View style={styles.swipeItem}>
      <View style={styles.deleteReveal}>
        <HugeiconsIcon icon={Delete02Icon} size={22} color="#fff" strokeWidth={1.9} />
        <Text style={styles.deleteRevealText}>Delete</Text>
      </View>
      <Animated.View
        style={[styles.itemSlide, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity style={styles.item} activeOpacity={0.7} onPress={onPress}>
          <TouchableOpacity activeOpacity={0.75} onPress={() => onProfile(match)}>
            {match.otherUserPhoto ? (
              <Image source={{ uri: match.otherUserPhoto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: color }]}>
                <Text style={styles.avatarInitial}>{match.otherUserName[0]?.toUpperCase()}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{match.otherUserName}</Text>
            <Text style={[styles.preview, !match.lastMessage && styles.previewEmpty]} numberOfLines={1}>
              {preview}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function EmployerJobItem({
  job,
  matchesByUser,
  expanded,
  onToggle,
  onOpen,
  onProfile,
}: {
  job: Job;
  matchesByUser: Map<string, MatchDetail>;
  expanded: boolean;
  onToggle: () => void;
  onOpen: (match: MatchDetail) => void;
  onProfile: (match: MatchDetail) => void;
}) {
	  const candidates = job.matchedUsers ?? [];
	  const conversationCount = candidates.filter(candidate => matchesByUser.has(candidate.userId)).length;
	  const rightSwipeCount = job.rightSwipeCount ?? conversationCount;

	  return (
	    <View style={[styles.jobGroup, expanded && styles.jobGroupExpanded]}>
	      <TouchableOpacity style={styles.jobHeader} activeOpacity={0.75} onPress={onToggle}>
	        <View style={styles.jobHeaderText}>
	          <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
	          <View style={styles.jobMetaRow}>
	            {job.location ? <Text style={styles.jobMeta} numberOfLines={1}>📍 {job.location}</Text> : null}
	            <Text style={styles.jobMetaDot}>•</Text>
	            <Text style={styles.jobMeta}>{rightSwipeCount} interested</Text>
	          </View>
	        </View>
	        <View style={styles.jobCountWrap}>
	          <Text style={styles.jobCountText}>{conversationCount}</Text>
	          <Text style={styles.jobCountLabel}>chats</Text>
	        </View>
	        <View style={styles.jobChevronWrap}>
	          <Text style={styles.jobChevron}>{expanded ? '⌃' : '⌄'}</Text>
	        </View>
	      </TouchableOpacity>

	      {expanded && (
	        <View style={styles.jobBody}>
	          {conversationCount === 0 ? (
	            <View style={styles.emptyJobBox}>
	              <Text style={styles.emptyJobTitle}>No conversations yet</Text>
	              <Text style={styles.emptyJobText}>Matched candidates for this job will appear here.</Text>
	            </View>
	          ) : (
            candidates.map(candidate => {
              const match = matchesByUser.get(candidate.userId);
              if (!match) return null;
              const color = avatarColor(match.otherUserName || candidate.name);
              const preview = match.lastMessage?.trim() || 'No messages yet';
              return (
                <TouchableOpacity
                  key={`${job.id}-${candidate.userId}`}
                  style={styles.jobConversation}
                  activeOpacity={0.7}
                  onPress={() => onOpen(match)}
                >
                  <TouchableOpacity activeOpacity={0.75} onPress={() => onProfile(match)}>
                    {match.otherUserPhoto ? (
                      <Image source={{ uri: match.otherUserPhoto }} style={styles.avatarSmall} />
                    ) : (
                      <View style={[styles.avatarSmall, styles.avatarPlaceholder, { backgroundColor: color }]}>
                        <Text style={styles.avatarSmallInitial}>{(match.otherUserName || candidate.name)[0]?.toUpperCase()}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
	                  <View style={styles.info}>
	                    <Text style={styles.name} numberOfLines={1}>{match.otherUserName || candidate.name}</Text>
	                    <Text style={[styles.preview, !match.lastMessage && styles.previewEmpty]} numberOfLines={1}>
	                      {preview}
	                    </Text>
	                  </View>
	                  <Text style={styles.conversationArrow}>›</Text>
	                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

export default function MatchesScreen() {
  const isEmployer = useAuthStore(state => state.user?.userType === 'employer');
  const [matches, setMatches] = useState<MatchDetail[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [convo, setConvo] = useState<ActiveConvo | null>(null);
  const [expandedJobID, setExpandedJobID] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState<Candidate | null>(null);
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadMatches() {
      try {
        const nextMatches = await api.getMatches();
        const withLatest = await Promise.all(
          nextMatches.map(async match => {
            if (match.lastMessage) return match;

            try {
              const messages = await api.getMessages(match.matchId);
              const latest = [...messages].sort((a, b) => b.createdAt - a.createdAt)[0];
              return latest
                ? { ...match, lastMessage: latest.content, lastMessageAt: latest.createdAt }
                : match;
            } catch {
              return match;
            }
          })
        );
        withLatest.sort((a, b) => (b.lastMessageAt ?? b.createdAt) - (a.lastMessageAt ?? a.createdAt));
        if (mounted) {
          setMatches(withLatest);
          if (isEmployer) {
            const nextJobs = await api.getJobs();
            setJobs(nextJobs);
            setExpandedJobID(current => current ?? nextJobs[0]?.id ?? null);
          }
        }
      } catch {
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadMatches();
    return () => { mounted = false; };
  }, [isEmployer]);

  const deleteMatch = async (matchId: string) => {
    await api.deleteMatch(matchId);
    setMatches(prev => prev.filter(match => match.matchId !== matchId));
    setJobs(prev => prev.map(job => ({
      ...job,
      matchedUsers: job.matchedUsers?.filter(candidate => {
        const match = matches.find(item => item.matchId === matchId);
        return candidate.userId !== match?.otherUserId;
      }),
    })));
    setConvo(current => current?.matchId === matchId ? null : current);
  };

  const confirmDelete = (match: MatchDetail, resetSwipe: () => void) => new Promise<boolean>(resolve => {
    Alert.alert(
      'Delete conversation?',
      `Remove ${match.otherUserName} from your matches and delete the chat history.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            resetSwipe();
            resolve(false);
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMatch(match.matchId)
            .then(() => resolve(true))
            .catch(() => {
              Alert.alert('Could not delete', 'Please try again.');
              resetSwipe();
              resolve(false);
            }),
        },
      ],
      {
        onDismiss: () => {
          resetSwipe();
          resolve(false);
        },
      }
    );
  });

  if (convo) {
    return (
      <ConversationScreen
        matchId={convo.matchId}
        otherUserName={convo.otherUserName}
        otherUserId={convo.otherUserId}
        onBack={() => setConvo(null)}
        onDelete={() => deleteMatch(convo.matchId)}
      />
    );
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  const openMatch = (match: MatchDetail) => setConvo({
    matchId:       match.matchId,
    otherUserName: match.otherUserName,
    otherUserId:   match.otherUserId,
  });

  const openProfile = async (match: MatchDetail) => {
    setProfileOpen(true);
    setProfileName(match.otherUserName);
    setProfile(null);
    setProfileLoading(true);
    try {
      const nextProfile = await api.getMatchProfile(match.matchId);
      setProfile(nextProfile);
      setProfileName(nextProfile.name || match.otherUserName);
    } catch {
      Alert.alert('Profile unavailable', 'Could not load this profile right now.');
      setProfileOpen(false);
    } finally {
      setProfileLoading(false);
    }
  };

  const profileModal = (
    <Modal
      visible={profileOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setProfileOpen(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.profileModal}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setProfileOpen(false)}>
            <Text style={styles.modalCloseText}>×</Text>
          </TouchableOpacity>

          {profileLoading ? (
            <View style={styles.profileLoading}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : (
            <>
              {profile?.photoUrl ? (
                <Image source={{ uri: profile.photoUrl }} style={styles.profileAvatarImage} />
              ) : (
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>{profileName[0]?.toUpperCase() ?? '?'}</Text>
                </View>
              )}
              <Text style={styles.profileName}>{profileName || 'Profile'}</Text>
              {profile?.location ? <Text style={styles.profileLocation}>📍 {profile.location}</Text> : null}
              {profile?.description ? (
                <Text style={styles.profileDescription}>{profile.description}</Text>
              ) : (
                <Text style={styles.profileDescriptionEmpty}>No profile description yet.</Text>
              )}
              {(profile?.skills?.length ?? 0) > 0 && (
                <View style={styles.profileSkills}>
                  {profile!.skills!.map(skill => (
                    <View key={skill} style={styles.profileSkillChip}>
                      <Text style={styles.profileSkillText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  if (isEmployer) {
    const matchesByUser = new Map(matches.map(match => [match.otherUserId, match]));

    return (
      <View style={styles.container}>
        <Text style={styles.header}>Conversations</Text>
        {jobs.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <HugeiconsIcon icon={Agreement02Icon} size={54} color={Colors.primary} strokeWidth={1.9} />
            </View>
            <Text style={styles.emptyTitle}>No jobs posted yet</Text>
            <Text style={styles.emptySubtitle}>Create a job post to organize candidate conversations here.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.countLabel}>By job post</Text>
            <FlatList
              data={jobs}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <EmployerJobItem
                  job={item}
                  matchesByUser={matchesByUser}
                  expanded={expandedJobID === item.id}
                  onToggle={() => setExpandedJobID(current => current === item.id ? null : item.id)}
                  onOpen={openMatch}
                  onProfile={openProfile}
                />
              )}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}
        {profileModal}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Conversations</Text>
      {matches.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <HugeiconsIcon icon={Agreement02Icon} size={54} color={Colors.primary} strokeWidth={1.9} />
          </View>
          <Text style={styles.emptyTitle}>No connections yet</Text>
          <Text style={styles.emptySubtitle}>Keep swiping to get noticed!</Text>
        </View>
      ) : (
        <>
          <Text style={styles.countLabel}>
            Recent
          </Text>
          <FlatList
            data={matches}
            keyExtractor={item => item.matchId}
            renderItem={({ item }) => (
              <MatchItem
                match={item}
                onPress={() => openMatch(item)}
                onDelete={(resetSwipe) => confirmDelete(item, resetSwipe)}
                onProfile={openProfile}
              />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
      {profileModal}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  header: {
    fontSize: 28, fontWeight: '700', color: Colors.text1,
    paddingHorizontal: 20, paddingTop: 76, paddingBottom: 4,
  },
  countLabel: { fontSize: 14, color: Colors.text3, paddingHorizontal: 20, marginBottom: 8 },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  swipeItem: {
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  deleteReveal: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.red,
  },
  deleteRevealText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  itemSlide: {
    backgroundColor: Colors.background,
  },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: Colors.primaryLight },
  avatarSmall: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: Colors.primaryLight },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 22, fontWeight: '800', color: '#fff' },
  avatarSmallInitial: { fontSize: 18, fontWeight: '800', color: '#fff' },
  info: { flex: 1, marginLeft: 14 },
  name: { fontSize: 17, fontWeight: '700', color: Colors.text1 },
  preview: { fontSize: 14, color: Colors.text2, marginTop: 4 },
  previewEmpty: { color: Colors.text3 },
  jobGroup: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: Colors.text1,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  jobGroupExpanded: { borderColor: Colors.primaryLight },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
  },
  jobHeaderText: { flex: 1 },
  jobTitle: { color: Colors.text1, fontSize: 18, fontWeight: '800' },
  jobMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  jobMeta: { color: Colors.text2, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  jobMetaDot: { color: Colors.text3, fontSize: 13, fontWeight: '800' },
  jobCountWrap: {
    minWidth: 52,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.tagBg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  jobCountText: { color: Colors.primary, fontSize: 17, lineHeight: 19, fontWeight: '900' },
  jobCountLabel: { color: Colors.primary, fontSize: 10, lineHeight: 12, fontWeight: '800', marginTop: 1 },
  jobChevronWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
  },
  jobChevron: { color: Colors.primary, fontSize: 23, lineHeight: 24, fontWeight: '900' },
  jobBody: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: '#FAFCFF',
    paddingVertical: 6,
  },
  jobConversation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  conversationArrow: { color: Colors.primary, fontSize: 28, lineHeight: 28, marginLeft: 8 },
  emptyJobBox: {
    marginHorizontal: 14,
    marginVertical: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyJobTitle: { color: Colors.text1, fontSize: 14, fontWeight: '800', marginBottom: 3 },
  emptyJobText: { color: Colors.text2, fontSize: 13, lineHeight: 19 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 80 },
  emptyIcon: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
    marginBottom: 16,
  },
  emptyTitle:    { fontSize: 22, fontWeight: '700', color: Colors.text1, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { maxWidth: 320, fontSize: 16, color: Colors.text2, lineHeight: 23, textAlign: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  profileModal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.card,
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { color: Colors.text2, fontSize: 28, lineHeight: 30, fontWeight: '700' },
  profileLoading: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  profileAvatarImage: { width: 82, height: 82, borderRadius: 41, marginBottom: 14 },
  profileAvatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  profileAvatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  profileName: { color: Colors.text1, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  profileLocation: { color: Colors.text2, fontSize: 14, marginTop: 6, textAlign: 'center' },
  profileDescription: { color: Colors.text2, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 14 },
  profileDescriptionEmpty: { color: Colors.text3, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 14 },
  profileSkills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 },
  profileSkillChip: { backgroundColor: Colors.tagBg, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6 },
  profileSkillText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
});
