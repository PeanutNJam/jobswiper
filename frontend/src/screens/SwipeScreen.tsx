import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, PanResponder,
  Dimensions, TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import Certificate01Icon from '@hugeicons/core-free-icons/dist/esm/Certificate01Icon';
import { Colors } from '../constants/colors';
import { DiscoverUser, DiscoverJob } from '../types';
import api from '../services/api';

const { width: W } = Dimensions.get('window');
const SWIPE_THRESHOLD = W * 0.3;

function avatarColor(name: string): string {
  const palette = ['#0A66C2','#057642','#7C3AED','#DC2626','#0284C7','#EA580C'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return palette[h % palette.length] ?? '#0A66C2';
}

function Card({ item }: { item: DiscoverUser | DiscoverJob }) {
  const isJob = 'jobId' in item;

  if (isJob) {
    const job = item as DiscoverJob;
    return (
      <>
        <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: '#0A66C2' }]}>
          <Text style={styles.avatarInitial}>💼</Text>
        </View>
        <Text style={styles.name}>{job.title}</Text>
        <Text style={styles.location}>🏢 {job.employerName}</Text>
        {job.location ? <Text style={styles.location}>📍 {job.location}</Text> : null}
        {job.description ? (
          <Text style={styles.description} numberOfLines={5}>{job.description}</Text>
        ) : null}
        {job.skills && job.skills.length > 0 ? (
          <View style={styles.requiredSkills}>
            <Text style={styles.requiredSkillsTitle}>Skills required</Text>
            <View style={styles.skills}>
              {job.skills.map(s => (
                <View key={s} style={styles.skillChip}>
                  <Text style={styles.skillChipText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        <View style={styles.chip}>
          <Text style={styles.chipText}>Job</Text>
        </View>
      </>
    );
  } else {
    const user = item as DiscoverUser;
    return (
      <>
        {user.photoUrl ? (
          <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: avatarColor(user.name || user.username) }]}>
            <Text style={styles.avatarInitial}>
              {(user.name || user.username)[0]?.toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.name}>{user.name || user.username}</Text>
        {user.location ? <Text style={styles.location}>📍 {user.location}</Text> : null}
        {user.description ? (
          <Text style={styles.description} numberOfLines={5}>{user.description}</Text>
        ) : null}
        {user.skills && user.skills.length > 0 && (
          <View style={styles.skills}>
            {user.skills.map(s => (
              <View key={s} style={styles.skillChip}>
                <Text style={styles.skillChipText}>{s}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.chip}>
          <Text style={styles.chipText}>Job Seeker</Text>
        </View>
      </>
    );
  }
}

export default function SwipeScreen() {
  const [items, setItems] = useState<(DiscoverUser | DiscoverJob)[]>([]);
  const [loading, setLoading] = useState(true);
  const pan = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    api.getDiscover()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const rotate = pan.x.interpolate({
    inputRange: [-W, 0, W], outputRange: ['-15deg','0deg','15deg'], extrapolate: 'clamp',
  });
  const applyOpacity = pan.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD / 2], outputRange: [0, 1], extrapolate: 'clamp' });
  const skipOpacity  = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD / 2, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const advanceCard = (dir: 'right' | 'left') => {
    const top = itemsRef.current[0];
    if (top) {
      const targetId = 'jobId' in top ? top.jobId : top.userId;
      api.createSwipe(targetId, dir).catch(() => {});
    }
    setItems(prev => prev.slice(1));
    pan.setValue({ x: 0, y: 0 });
  };

  const advanceCardRef = useRef(advanceCard);
  advanceCardRef.current = advanceCard;

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5,
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      if (g.dx > SWIPE_THRESHOLD) {
        Animated.timing(pan, { toValue: { x: W * 1.5, y: g.dy }, duration: 280, useNativeDriver: false }).start(() => advanceCardRef.current('right'));
      } else if (g.dx < -SWIPE_THRESHOLD) {
        Animated.timing(pan, { toValue: { x: -W * 1.5, y: g.dy }, duration: 280, useNativeDriver: false }).start(() => advanceCardRef.current('left'));
      } else {
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      }
    },
  })).current;

  const handleBtn = (dir: 'right' | 'left') => {
    const x = dir === 'right' ? W * 1.5 : -W * 1.5;
    Animated.timing(pan, { toValue: { x, y: 0 }, duration: 280, useNativeDriver: false }).start(() => advanceCard(dir));
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (!items[0]) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <HugeiconsIcon icon={Certificate01Icon} size={46} color={Colors.primary} strokeWidth={1.8} />
        </View>
        <Text style={styles.emptyTitle}>You're all caught up!</Text>
        <Text style={styles.emptySubtitle}>Check back later for more opportunities</Text>
        <TouchableOpacity style={styles.resetBtn} onPress={() => { setLoading(true); api.getDiscover().then(setItems).catch(() => {}).finally(() => setLoading(false)); }}>
          <Text style={styles.resetBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Jobs for you</Text>
      <Text style={styles.subheader}>Swipe right to apply · left to skip</Text>

      <View style={styles.cardStack}>
        {items[1] && (
          <View style={[styles.card, styles.cardBehind]}>
            <Card item={items[1]} />
          </View>
        )}
        <Animated.View
          style={[styles.card, { transform: [...pan.getTranslateTransform(), { rotate }] }]}
          {...panResponder.panHandlers}
        >
          <Animated.View style={[styles.badge, styles.badgeApply, { opacity: applyOpacity }]}>
            <Text style={styles.badgeApplyText}>APPLY ✓</Text>
          </Animated.View>
          <Animated.View style={[styles.badge, styles.badgeSkip, { opacity: skipOpacity }]}>
            <Text style={styles.badgeSkipText}>SKIP ✕</Text>
          </Animated.View>
          <Card item={items[0]} />
        </Animated.View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, styles.actionSkip]} onPress={() => handleBtn('left')}>
          <Text style={styles.actionSkipIcon}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionApply]} onPress={() => handleBtn('right')}>
          <Text style={styles.actionApplyIcon}>✓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  header: { fontSize: 28, fontWeight: '700', color: Colors.text1, paddingHorizontal: 20, paddingTop: 76, paddingBottom: 2 },
  subheader: { fontSize: 14, color: Colors.text3, paddingHorizontal: 20, marginBottom: 16 },
  cardStack: { flex: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: 16 },
  card: {
    position: 'absolute', width: '100%', backgroundColor: Colors.card,
    borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  cardBehind: { transform: [{ scale: 0.94 }, { translateY: 12 }], opacity: 0.7 },
  badge: { position: 'absolute', top: 24, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 3, zIndex: 10 },
  badgeApply: { right: 20, borderColor: Colors.green, backgroundColor: 'rgba(76, 175, 80, 0.1)' },
  badgeApplyText: { color: Colors.green, fontSize: 18, fontWeight: '800' },
  badgeSkip: { left: 20, borderColor: Colors.red, backgroundColor: 'rgba(244, 67, 54, 0.1)' },
  badgeSkipText: { color: Colors.red, fontSize: 18, fontWeight: '800' },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 16, borderWidth: 3, borderColor: Colors.primaryLight },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 32, fontWeight: '800', color: '#fff' },
  name: { fontSize: 24, fontWeight: '700', color: Colors.text1, marginBottom: 6, textAlign: 'center' },
  location: { fontSize: 14, color: Colors.text2, marginBottom: 12, textAlign: 'center' },
  description: { fontSize: 16, color: Colors.text2, lineHeight: 24, marginBottom: 16, textAlign: 'center' },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, justifyContent: 'center' },
  requiredSkills: { alignItems: 'center', marginBottom: 12 },
  requiredSkillsTitle: { color: Colors.text3, fontSize: 12, fontWeight: '700', marginBottom: 2, textTransform: 'uppercase' },
  skillChip: { backgroundColor: Colors.tagBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  skillChipText: { color: Colors.primary, fontSize: 12, fontWeight: '600' },
  chip: { alignSelf: 'center', backgroundColor: Colors.primaryLight, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  chipText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 40, paddingVertical: 24, paddingBottom: 32 },
  actionBtn: {
    width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6
  },
  actionSkip: { backgroundColor: Colors.card, borderWidth: 2, borderColor: Colors.red },
  actionSkipIcon: { fontSize: 28, color: Colors.red },
  actionApply: { backgroundColor: Colors.primary },
  actionApplyIcon: { fontSize: 28, color: '#fff' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, backgroundColor: Colors.background },
  emptyIcon: {
    width: 82, height: 82, borderRadius: 41, marginBottom: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: Colors.text1, marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: Colors.text2, textAlign: 'center', marginBottom: 32 },
  resetBtn: { backgroundColor: Colors.primary, borderRadius: 28, paddingHorizontal: 32, paddingVertical: 16, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  resetBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
