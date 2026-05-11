export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      app_users: {
        Row: {
          id: string;
          document_id: string;
          full_name: string;
          email: string;
          role: 'user' | 'admin';
          status: 'pending' | 'active' | 'inactive';
          pluviometer_id: string | null;
          notifications_enabled: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          document_id: string;
          full_name: string;
          email: string;
          role?: 'user' | 'admin';
          status?: 'pending' | 'active' | 'inactive';
          pluviometer_id?: string | null;
          notifications_enabled?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['app_users']['Insert']>;
      };
      pluviometers: {
        Row: {
          id: string;
          user_id: string;
          latitude: number;
          longitude: number;
          diameter_cm: number;
          height_cm: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          latitude: number;
          longitude: number;
          diameter_cm: number;
          height_cm: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['pluviometers']['Insert']>;
      };
      measurements: {
        Row: {
          id: string;
          user_id: string;
          pluviometer_id: string;
          measured_at: string;
          volume_ml: number | null;
          rainfall_mm: number;
          no_rain: boolean;
          elapsed_minutes: number | null;
          observations: string | null;
          behaviors: string[];
          synced: boolean;
          local_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          pluviometer_id: string;
          measured_at: string;
          volume_ml?: number | null;
          rainfall_mm: number;
          no_rain?: boolean;
          elapsed_minutes?: number | null;
          observations?: string | null;
          behaviors?: string[];
          synced?: boolean;
          local_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['measurements']['Insert']>;
      };
      monthly_totals: {
        Row: {
          id: string;
          pluviometer_id: string;
          year: number;
          month: number;
          total_mm: number;
          measurement_count: number;
        };
        Insert: {
          id?: string;
          pluviometer_id: string;
          year: number;
          month: number;
          total_mm?: number;
          measurement_count?: number;
        };
        Update: Partial<Database['public']['Tables']['monthly_totals']['Insert']>;
      };
      audit_log: {
        Row: {
          id: string;
          admin_id: string;
          action: 'edit' | 'delete' | 'approve' | 'reject' | 'sync_conflict';
          target_table: string;
          target_id: string;
          previous_value: Json | null;
          new_value: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          action: 'edit' | 'delete' | 'approve' | 'reject' | 'sync_conflict';
          target_table: string;
          target_id: string;
          previous_value?: Json | null;
          new_value?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_log']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body: string;
          read?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      device_tokens: {
        Row: {
          id: string;
          user_id: string;
          platform: 'ios' | 'android' | 'web' | 'unknown';
          token: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          platform: 'ios' | 'android' | 'web' | 'unknown';
          token: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['device_tokens']['Insert']>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
