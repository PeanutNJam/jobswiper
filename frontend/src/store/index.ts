import { create } from 'zustand';
import { User, Profile } from '../types';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  token: string | null;
  isLoggedIn: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  token: null,
  isLoggedIn: false,
  setUser: (user) => set({ user, isLoggedIn: !!user }),
  setProfile: (profile) => set({ profile }),
  setToken: (token) => set({ token }),
  logout: () => set({ user: null, profile: null, token: null, isLoggedIn: false }),
}));

interface UIState {
  loading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  loading: false,
  error: null,
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
