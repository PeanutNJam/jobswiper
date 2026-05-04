import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HugeiconsIcon } from '@hugeicons/react-native';
import Delete02Icon from '@hugeicons/core-free-icons/dist/esm/Delete02Icon';
import { Colors } from '../constants/colors';
import { Message } from '../types';
import api from '../services/api';
import { useAuthStore } from '../store';

type Props = {
  matchId: string;
  otherUserName: string;
  otherUserId: string;
  onBack: () => void;
  onDelete: () => Promise<void>;
};

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
const WS_BASE  = API_BASE.replace(/^https/, 'wss').replace(/^http/, 'ws');

function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ConversationScreen({ matchId, otherUserName, onBack, onDelete }: Props) {
  const currentUserId = useAuthStore(s => s.user?.id);

  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(true);
  const [sending,   setSending]   = useState(false);
  const [connected, setConnected] = useState(false);

  const listRef = useRef<FlatList>(null);
  const wsRef   = useRef<WebSocket | null>(null);

  const scrollBottom = (animated = true) =>
    setTimeout(() => listRef.current?.scrollToEnd({ animated }), 60);

  // ── Load history + open WebSocket ─────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    api.getMessages(matchId)
      .then(msgs => { if (mounted) { setMessages(msgs); scrollBottom(false); } })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });

    AsyncStorage.getItem('authToken').then(token => {
      if (!token || !mounted) return;
      // @ts-ignore — React Native WebSocket accepts options as 3rd arg
      const ws = new WebSocket(`${WS_BASE}/api/matches/${matchId}/ws`, [], {
        headers: { Authorization: `Bearer ${token}` },
      });
      ws.onopen    = () => { if (mounted) setConnected(true); };
      ws.onclose   = () => { if (mounted) setConnected(false); };
      ws.onerror   = () => { if (mounted) setConnected(false); };
      ws.onmessage = (e: MessageEvent) => {
        if (!mounted) return;
        try {
          const raw = JSON.parse(e.data as string);
          // WS frames are raw snake_case — map to camelCase manually
          const msg: Message = {
            id:        raw.id,
            matchId:   raw.match_id   ?? raw.matchId,
            senderId:  raw.sender_id  ?? raw.senderId,
            content:   raw.content,
            createdAt: raw.created_at ?? raw.createdAt,
          };
          if (msg.senderId === currentUserId) return; // already optimistically added
          setMessages(prev => [...prev, msg]);
          scrollBottom();
        } catch { /* ignore malformed frame */ }
      };
      wsRef.current = ws;
    });

    return () => {
      mounted = false;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [matchId]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const temp: Message = {
      id:        `tmp-${Date.now()}`,
      matchId,
      senderId:  currentUserId ?? 'me',
      content:   text,
      createdAt: Date.now(),
    };
    setMessages(prev => [...prev, temp]);
    setInput('');
    scrollBottom();

    setSending(true);
    try {
      const saved = await api.sendMessage(matchId, text);
      // replace temp id with server-confirmed id + timestamp
      setMessages(prev => prev.map(m => m.id === temp.id ? saved : m));
    } catch {
      // keep the message visible — server may be unavailable or using mock data
    } finally {
      setSending(false);
    }
  }, [input, sending, matchId, currentUserId]);

  const confirmDelete = () => {
    Alert.alert(
      'Delete conversation?',
      `Remove ${otherUserName} from your matches and delete the chat history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete().catch(() => {
            Alert.alert('Could not delete', 'Please try again.');
          }),
        },
      ]
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerName} numberOfLines={1}>{otherUserName}</Text>
          {connected && <Text style={styles.onlineLabel}>● online</Text>}
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete} hitSlop={10}>
          <HugeiconsIcon icon={Delete02Icon} size={21} color={Colors.red} strokeWidth={1.9} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollBottom(false)}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>No messages yet.{'\n'}Say hello 👋</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMe = item.senderId === currentUserId;
              return (
                <View style={[styles.row, isMe ? styles.rowRight : styles.rowLeft]}>
                  <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                    <Text style={[styles.bubbleText, isMe ? styles.textMe : styles.textThem]}>
                      {item.content}
                    </Text>
                  </View>
                  <Text style={[styles.time, isMe ? styles.timeRight : styles.timeLeft]}>
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
              );
            }}
          />
        )}

        {/* Input bar */}
        <View style={styles.bar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Message…"
            placeholderTextColor={Colors.text3}
            multiline
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnOff]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.sendIcon}>›</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.card },
  flex:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  backBtn:      { width: 44, alignItems: 'center' },
  backIcon:     { fontSize: 32, color: Colors.primary, lineHeight: 36 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerName:   { fontSize: 17, fontWeight: '700', color: Colors.text1 },
  onlineLabel:  { fontSize: 11, color: Colors.green, marginTop: 1 },
  deleteBtn:    { width: 44, alignItems: 'center' },

  listContent: { paddingHorizontal: 16, paddingVertical: 16, flexGrow: 1 },
  emptyChat:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyChatText: { fontSize: 15, color: Colors.text3, textAlign: 'center', lineHeight: 24 },

  row:      { marginBottom: 14 },
  rowRight: { alignItems: 'flex-end' },
  rowLeft:  { alignItems: 'flex-start' },

  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: {
    backgroundColor: Colors.primary,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: Colors.background,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  textMe:     { color: '#fff' },
  textThem:   { color: Colors.text1 },

  time:      { fontSize: 11, color: Colors.text3, marginTop: 3 },
  timeRight: { marginRight: 4 },
  timeLeft:  { marginLeft: 4 },

  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text1,
    maxHeight: 120,
    backgroundColor: Colors.background,
  },
  sendBtn:    { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: Colors.border },
  sendIcon:   { fontSize: 26, color: '#fff', lineHeight: 30 },
});
