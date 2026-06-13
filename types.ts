export interface Birthday {
  id: string;
  name: string;
  birthDate: string; // YYYY-MM-DD
  relationship?: 'Friend' | 'Family' | 'Partner' | 'Work' | 'Other';
  image?: string;
  emoji?: string;
  notes?: string;
  notificationEnabled: boolean;
  createdAt: number;
}

export interface AppSettings {
  notificationTime: { hour: number; minute: number };
  theme: 'dark' | 'light';
}

export interface CelebrationHistory {
  birthdayId: string;
  year: number;
  celebratedAt: string;
}