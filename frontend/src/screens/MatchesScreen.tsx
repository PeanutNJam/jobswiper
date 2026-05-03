import { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, Alert, Animated, PanResponder,
} from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import Delete02Icon from '@hugeicons/core-free-icons/dist/esm/Delete02Icon';
import { Colors } from '../constants/colors';
import { MatchDetail } from '../types';
import api from '../services/api';
import ConversationScreen from './ConversationScreen';

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
}: {
  match: MatchDetail;
  onPress: () => void;
  onDelete: (resetSwipe: () => void) => Promise<boolean>;
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
          {match.otherUserPhoto ? (
            <Image source={{ uri: match.otherUserPhoto }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: color }]}>
              <Text style={styles.avatarInitial}>{match.otherUserName[0]?.toUpperCase()}</Text>
            </View>
          )}
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

export default function MatchesScreen() {
  const [matches, setMatches] = useState<MatchDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [convo, setConvo] = useState<ActiveConvo | null>(null);

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
        if (mounted) setMatches(withLatest);
      } catch {
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadMatches();
    return () => { mounted = false; };
  }, []);

  const deleteMatch = async (matchId: string) => {
    await api.deleteMatch(matchId);
    setMatches(prev => prev.filter(match => match.matchId !== matchId));
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

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Conversations</Text>
      {matches.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🤝</Text>
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
                onPress={() => setConvo({
                  matchId:       item.matchId,
                  otherUserName: item.otherUserName,
                  otherUserId:   item.otherUserId,
                })}
                onDelete={(resetSwipe) => confirmDelete(item, resetSwipe)}
              />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  header: {
    fontSize: 28, fontWeight: '700', color: Colors.text1,
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 4,
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
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 22, fontWeight: '800', color: '#fff' },
  info: { flex: 1, marginLeft: 14 },
  name: { fontSize: 17, fontWeight: '700', color: Colors.text1 },
  preview: { fontSize: 14, color: Colors.text2, marginTop: 4 },
  previewEmpty: { color: Colors.text3 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  emptyEmoji:    { fontSize: 64, marginBottom: 16 },
  emptyTitle:    { fontSize: 22, fontWeight: '700', color: Colors.text1, marginBottom: 8 },
  emptySubtitle: { fontSize: 16, color: Colors.text2 },
});
