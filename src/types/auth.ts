export type User = {
  id: string;
  email: string;
  created_at: string;
  role: 'super_admin' | 'admin' | 'user';
  profile?: UserProfile;
};

export type UserProfile = {
  display_name?: string;
  avatar_url?: string;
  organization?: string;
  title?: string;
};

export type AuthState = {
  user: User | null;
  loading: boolean;
};
