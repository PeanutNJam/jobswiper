import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponse, Profile, Candidate, UploadUrlResponse, MatchDetail, Message, DiscoverUser, DiscoverJob, User, Job } from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const AUTH_USER_KEY = 'authUser';

// Convert all snake_case keys in API responses to camelCase
function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}
function keysToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(keysToCamel);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [toCamel(k), keysToCamel(v)])
    );
  }
  return obj;
}

class APIService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api`,
      timeout: Number(process.env.EXPO_PUBLIC_API_TIMEOUT) || 30000,
    });

    this.client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
      const token = await this.getToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // Convert all snake_case response keys to camelCase
    this.client.interceptors.response.use((response: AxiosResponse) => {
      response.data = keysToCamel(response.data);
      return response;
    });
  }

  private async getToken(): Promise<string | null> {
    if (!this.token) this.token = await AsyncStorage.getItem('authToken');
    return this.token;
  }

  async setToken(token: string): Promise<void> {
    this.token = token;
    await AsyncStorage.setItem('authToken', token);
  }

  async setStoredUser(user: User): Promise<void> {
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }

  async clearToken(): Promise<void> {
    this.token = null;
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem(AUTH_USER_KEY);
  }

  async getStoredToken(): Promise<string | null> {
    return this.getToken();
  }

  async getMe(): Promise<User> {
    const { data } = await this.client.get<{ user: User }>('/me');
    return data.user;
  }

  async getStoredUser(): Promise<User | null> {
    const raw = await AsyncStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      return null;
    }
  }

  async register(email: string, username: string, password: string, userType: 'job_seeker' | 'employer'): Promise<AuthResponse> {
    const { data } = await this.client.post<AuthResponse>('/auth/register', {
      email, username, password, user_type: userType,
    });
    await this.setToken(data.token);
    await this.setStoredUser(data.user);
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await this.client.post<AuthResponse>('/auth/login', { email, password });
    await this.setToken(data.token);
    await this.setStoredUser(data.user);
    return data;
  }

  async getProfile(): Promise<Profile> {
    const { data } = await this.client.get<Profile>('/profile');
    return data;
  }

  async updateProfile(profile: Partial<Profile>): Promise<Profile> {
    const { data } = await this.client.put<Profile>('/profile', {
      name:        profile.name,
      description: profile.description,
      photo_url:   profile.photoUrl,
      location:    profile.location,
      skills:      profile.skills ?? [],
    });
    return data;
  }

  async createSwipe(targetId: string, direction: 'right' | 'left'): Promise<{ match: boolean }> {
    const { data } = await this.client.post<{ match: boolean }>('/swipe', {
      target_id: targetId, direction,
    });
    return data;
  }

  async saveDeviceToken(token: string): Promise<void> {
    await this.client.put('/device-token', { token });
  }

  async getDiscover(): Promise<DiscoverUser[] | DiscoverJob[]> {
    const { data } = await this.client.get<{ users?: DiscoverUser[]; jobs?: DiscoverJob[] }>('/discover');
    if (data.users) {
      return data.users ?? [];
    } else if (data.jobs) {
      return data.jobs ?? [];
    }
    return [];
  }

  async getCandidates(): Promise<Candidate[]> {
    const { data } = await this.client.get<{ candidates: Candidate[] }>('/candidates');
    return data.candidates ?? [];
  }

  async createJob(job: { title: string; description: string; location: string; skills?: string[] }): Promise<Job> {
    const { data } = await this.client.post<Job>('/jobs', job);
    return data;
  }

  async getJobs(): Promise<Job[]> {
    const { data } = await this.client.get<{ jobs: Job[] }>('/jobs');
    return data.jobs ?? [];
  }

  async getJob(jobId: string): Promise<Job> {
    const { data } = await this.client.get<Job>(`/jobs/${jobId}`);
    return data;
  }

  async updateJob(jobId: string, job: { title?: string; description?: string; location?: string; skills?: string[] }): Promise<Job> {
    const { data } = await this.client.put<Job>(`/jobs/${jobId}`, job);
    return data;
  }

  async deleteJob(jobId: string): Promise<void> {
    await this.client.delete(`/jobs/${jobId}`);
  }

  async getMatches(): Promise<MatchDetail[]> {
    const { data } = await this.client.get<{ matches: MatchDetail[] }>('/matches');
    return data.matches ?? [];
  }

  async getMessages(matchId: string): Promise<Message[]> {
    const { data } = await this.client.get<{ messages: Message[] }>(`/matches/${matchId}/messages`);
    return data.messages ?? [];
  }

  async getMatchProfile(matchId: string): Promise<Candidate> {
    const { data } = await this.client.get<Candidate>(`/matches/${matchId}/profile`);
    return data;
  }

  async deleteMatch(matchId: string): Promise<void> {
    await this.client.delete(`/matches/${matchId}`);
  }

  async sendMessage(matchId: string, content: string): Promise<Message> {
    const { data } = await this.client.post<Message>(`/matches/${matchId}/messages`, { content });
    return data;
  }

  async getUploadUrl(filename: string, contentType: string): Promise<UploadUrlResponse> {
    const { data } = await this.client.get<UploadUrlResponse>('/upload-url', {
      params: { filename, content_type: contentType },
    });
    return data;
  }

  async healthCheck(): Promise<boolean> {
    try { await axios.get(`${API_BASE_URL}/health`); return true; } catch { return false; }
  }
}

export default new APIService();
