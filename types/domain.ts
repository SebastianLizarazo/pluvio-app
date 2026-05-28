export type UserRole = 'user' | 'admin';
export type UserStatus = 'pending' | 'active' | 'inactive';

export type BehaviorTag =
  | 'granizo'
  | 'lluvia_torrencial'
  | 'lluvias_intermitentes'
  | 'vientos_muy_fuertes';

export interface Pluviometer {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  diameterCm: number;
  heightCm: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppUser {
  id: string;
  documentId: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  pluviometerId: string | null;
  notificationsEnabled: boolean;
  createdAt: string;
}

export interface Measurement {
  id: string;
  userId: string;
  pluviometerId: string;
  measuredAt: string;
  volumeMl: number | null;
  rainfallMm: number;
  noRain: boolean;
  elapsedMinutes: number | null;
  observations: string | null;
  behaviors: BehaviorTag[];
  synced: boolean;
  localId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyTotal {
  id: string;
  pluviometerId: string;
  year: number;
  month: number;
  totalMm: number;
  measurementCount: number;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
