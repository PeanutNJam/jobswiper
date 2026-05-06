export interface User {
  id: string;
  email: string;
  username: string;
  userType: 'job_seeker' | 'employer';
  createdAt: string;
}

export interface Profile {
  userId: string;
  name: string;
  description: string;
  photoUrl?: string;
  location: string;
  skills?: string[];
  updatedAt: string;
}

export interface Job {
  id: string;
  employerId: string;
  title: string;
  description: string;
  location: string;
  skills?: string[];
  createdAt: string;
  swipeCount?: number;
  rightSwipeCount?: number;
  matchedCount?: number;
  matchedUsers?: Candidate[];
}

export interface Swipe {
  id: string;
  userId: string;
  targetId: string;
  direction: 'right' | 'left';
  createdAt: string;
}

export interface Match {
  id: string;
  userId1: string;
  userId2: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  expiresIn: number;
}

export interface Candidate {
  userId: string;
  name: string;
  description: string;
  photoUrl?: string;
  location: string;
  skills?: string[];
}

export interface UploadUrlResponse {
  uploadUrl: string;
  publicUrl: string;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  createdAt: number; // unix ms
}

export interface DiscoverUser {
  userId: string;
  username: string;
  name: string;
  description: string;
  photoUrl?: string;
  location: string;
  skills?: string[];
}

export interface DiscoverJob {
  jobId: string;
  title: string;
  description: string;
  location: string;
  skills?: string[];
  employerName: string;
}

export interface MatchDetail {
  matchId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserPhoto?: string;
  createdAt: number;
  lastMessage?: string;
  lastMessageAt?: number;
}
