import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, PanResponder,
  Dimensions, TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { Colors } from '../constants/colors';
import { DiscoverUser } from '../types';
import api from '../services/api';

const { width: W } = Dimensions.get('window');
const SWIPE_THRESHOLD = W * 0.3;

const palette = ['#0A66C2','#057642','#7C3AED','#DC2626','#0284C7','#EA580C'];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return palette[h % palette.length] ?? '#0A66C2';
}

function CardContent({ candidate }: { candidate: DiscoverUser }) {
  const color = avatarColor(candidate.name);
  return (
    <>
      {candidate.photoUrl ? (
        <Image source={{ uri: candidate.photoUrl }} style={styles.avatarImage} />
      ) : (
        <View style={[styles.avatarCircle, { backgroundColor: color }]}>
          <Text style={styles.avatarInitial}>{candidate.name[0]?.toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.candidateName}>{candidate.name}</Text>
      {candidate.location ? <Text style={styles.location}>📍 {candidate.location}</Text> : null}
      {candidate.description ? (
        <Text style={styles.description} numberOfLines={4}>{candidate.description}</Text>
      ) : null}
      {candidate.skills && candidate.skills.length > 0 && (
        <View style={styles.skills}>
          {candidate.skills.map(s => (
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

export default function CandidatesScreen() {
  const [candidates, setCandidates] = useState<DiscoverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const pan = useRef(new Animated.ValueXY()).current;

  const load = () => {
    setLoading(true);
    api.getDiscover()
      .then(setCandidates)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const rotate = pan.x.interpolate({
    inputRange: [-W, 0, W], outputRange: ['-15deg','0deg','15deg'], extrapolate: 'clamp',
  });
  const connectOpacity = pan.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD / 2], outputRange: [0, 1], extrapolate: 'clamp' });
  const passOpacity    = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD / 2, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  const candidatesRef = useRef(candidates);
  candidatesRef.current = candidates;

  const advanceCard = (dir: 'right' | 'left') => {
    const top = candidatesRef.current[0];
    if (top) api.createSwipe(top.userId, dir).catch(() => {});
    setCandidates(prev => prev.slice(1));
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

  if (!candidates[0]) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>👥</Text>
        <Text style={styles.emptyTitle}>No candidates right now</Text>
        <Text style={styles.emptySubtitle}>Check back soon</Text>
        <TouchableOpacity style={styles.resetBtn} onPress={load}>
          <Text style={styles.resetBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>DiscoverUsers</Text>
      <Text style={styles.subheader}>Swipe right to connect · left to pass</Text>

      <View style={styles.cardStack}>
        {candidates[1] && (
          <View style={[styles.card, styles.cardBehind]}>
            <CardContent candidate={candidates[1]} />
          </View>
        )}
        <Animated.View
          style={[styles.card, { transform: [...pan.getTranslateTransform(), { rotate }] }]}
          {...panResponder.panHandlers}
        >
          <Animated.View style={[styles.badge, styles.badgeConnect, { opacity: connectOpacity }]}>
            <Text style={styles.badgeConnectText}>CONNECT ✓</Text>
          </Animated.View>
          <Animated.View style={[styles.badge, styles.badgePass, { opacity: passOpacity }]}>
            <Text style={styles.badgePassText}>PASS ✕</Text>
          </Animated.View>
          <CardContent candidate={candidates[0]} />
        </Animated.View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, styles.actionPass]} onPress={() => handleBtn('left')}>
          <Text style={styles.actionPassIcon}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionConnect]} onPress={() => handleBtn('right')}>
          <Text style={styles.actionConnectIcon}>✓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  header: { fontSize: 28, fontWeight: '700', color: Colors.text1, paddingHorizontal: 20, paddingTop: 60, paddingBottom: 2 },
  subheader: { fontSize: 14, color: Colors.text3, paddingHorizontal: 20, marginBottom: 16 },
  cardStack: { flex: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: 16 },
  card: {
    position: 'absolute', width: '100%', backgroundColor: Colors.card,
    borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  cardBehind: { transform: [{ scale: 0.94 }, { translateY: 12 }], opacity: 0.7 },
  badge: { position: 'absolute', top: 24, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 3, zIndex: 10 },
  badgeConnect: { right: 20, borderColor: Colors.green, backgroundColor: 'rgba(76, 175, 80, 0.1)' },
  badgeConnectText: { color: Colors.green, fontSize: 18, fontWeight: '800' },
  badgePass: { left: 20, borderColor: Colors.red, backgroundColor: 'rgba(244, 67, 54, 0.1)' },
  badgePassText: { color: Colors.red, fontSize: 18, fontWeight: '800' },
  avatarImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 16, borderWidth: 3, borderColor: Colors.primaryLight },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarInitial: { fontSize: 32, fontWeight: '800', color: '#fff' },
  candidateName: { fontSize: 24, fontWeight: '700', color: Colors.text1, marginBottom: 6, textAlign: 'center' },
  location: { fontSize: 14, color: Colors.text2, marginBottom: 12, textAlign: 'center' },
  description: { fontSize: 16, color: Colors.text2, lineHeight: 24, marginBottom: 16, textAlign: 'center' },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, justifyContent: 'center' },
  skillChip: { backgroundColor: Colors.tagBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  skillChipText: { color: Colors.primary, fontSize: 12, fontWeight: '600' },
  chip: { alignSelf: 'center', backgroundColor: Colors.primaryLight, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  chipText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 40, paddingVertical: 24, paddingBottom: 32 },
  actionBtn: {
    width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6
  },
  actionPass: { backgroundColor: Colors.card, borderWidth: 2, borderColor: Colors.red },
  actionPassIcon: { fontSize: 28, color: Colors.red },
  actionConnect: { backgroundColor: Colors.primary },
  actionConnectIcon: { fontSize: 28, color: '#fff' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, backgroundColor: Colors.background },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: Colors.text1, marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: Colors.text2, textAlign: 'center', marginBottom: 32 },
  resetBtn: { backgroundColor: Colors.primary, borderRadius: 28, paddingHorizontal: 32, paddingVertical: 16, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  resetBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
