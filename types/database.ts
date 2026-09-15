import type {
  EventType,
  Level,
  Role,
  SessionSource,
  SessionSport,
  Sport,
  TestimonialStatus,
} from './index';

/**
 * Shape of the Postgres schema in supabase/migrations.
 * Passed to createClient<Database>() so every query is typed.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          avatar_url: string | null;
          sport: Sport;
          level: Level;
          goal: string | null;
          role: Role;
          joined_at: string;
          removed_at: string | null;
          removed_by: string | null;
        };
        Insert: {
          id: string;
          name: string;
          avatar_url?: string | null;
          sport?: Sport;
          level?: Level;
          goal?: string | null;
          role?: Role;
          joined_at?: string;
        };
        Update: {
          name?: string;
          avatar_url?: string | null;
          sport?: Sport;
          level?: Level;
          goal?: string | null;
          role?: Role;
          removed_at?: string | null;
          removed_by?: string | null;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          title: string;
          type: EventType;
          date: string;
          time: string;
          location: string;
          lat: number | null;
          lng: number | null;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          type: EventType;
          date: string;
          time: string;
          location: string;
          lat?: number | null;
          lng?: number | null;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          type?: EventType;
          date?: string;
          time?: string;
          location?: string;
          lat?: number | null;
          lng?: number | null;
          note?: string | null;
        };
        Relationships: [];
      };
      rsvps: {
        Row: { event_id: string; user_id: string; created_at: string };
        Insert: { event_id: string; user_id: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      weekly_sessions: {
        Row: {
          id: string;
          iso_dow: number;
          title: string;
          type: EventType;
          time: string;
          location: string;
          lat: number | null;
          lng: number | null;
          note: string | null;
          pace_groups: string[];
          pace_group_limits: Record<string, number>;
          active: boolean;
          ground_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          iso_dow: number;
          title: string;
          type: EventType;
          time: string;
          location: string;
          lat?: number | null;
          lng?: number | null;
          note?: string | null;
          pace_groups?: string[];
          pace_group_limits?: Record<string, number>;
          active?: boolean;
          ground_id?: string | null;
        };
        Update: {
          iso_dow?: number;
          title?: string;
          type?: EventType;
          time?: string;
          location?: string;
          lat?: number | null;
          lng?: number | null;
          note?: string | null;
          pace_groups?: string[];
          pace_group_limits?: Record<string, number>;
          active?: boolean;
          ground_id?: string | null;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          sport: SessionSport;
          title: string;
          distance_m: number;
          duration_s: number;
          note: string | null;
          source: SessionSource;
          strava_activity_id: number | null;
          ground_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          sport: SessionSport;
          title: string;
          distance_m: number;
          duration_s: number;
          note?: string | null;
          source?: SessionSource;
          strava_activity_id?: number | null;
          ground_id?: string | null;
        };
        Update: {
          date?: string;
          sport?: SessionSport;
          title?: string;
          distance_m?: number;
          duration_s?: number;
          note?: string | null;
          source?: SessionSource;
          strava_activity_id?: number | null;
          ground_id?: string | null;
        };
        Relationships: [];
      };
      training_grounds: {
        Row: {
          id: string;
          sport: SessionSport;
          title: string;
          subtitle: string;
          stats: { label: string; value: string }[];
          elevation: number[];
          waypoints: { lat: number; lng: number }[];
          gpx: string | null;
          strava: string | null;
          status_note: string | null;
          meet_at: string | null;
          parking: string | null;
          facilities: string | null;
          lat: number | null;
          lng: number | null;
          position: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sport: SessionSport;
          title: string;
          subtitle: string;
          stats?: { label: string; value: string }[];
          elevation?: number[];
          waypoints?: { lat: number; lng: number }[];
          gpx?: string | null;
          strava?: string | null;
          status_note?: string | null;
          meet_at?: string | null;
          parking?: string | null;
          facilities?: string | null;
          lat?: number | null;
          lng?: number | null;
          position?: number;
          active?: boolean;
        };
        Update: {
          sport?: SessionSport;
          title?: string;
          subtitle?: string;
          stats?: { label: string; value: string }[];
          elevation?: number[];
          waypoints?: { lat: number; lng: number }[];
          gpx?: string | null;
          strava?: string | null;
          status_note?: string | null;
          meet_at?: string | null;
          parking?: string | null;
          facilities?: string | null;
          lat?: number | null;
          lng?: number | null;
          position?: number;
          active?: boolean;
        };
        Relationships: [];
      };
      strava_connections: {
        Row: {
          user_id: string;
          athlete_id: number;
          athlete_name: string | null;
          athlete_avatar: string | null;
          access_token: string;
          refresh_token: string;
          expires_at: string;
          scope: string;
          last_synced_at: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          athlete_id: number;
          athlete_name?: string | null;
          athlete_avatar?: string | null;
          access_token: string;
          refresh_token: string;
          expires_at: string;
          scope: string;
          last_synced_at?: string | null;
        };
        Update: {
          athlete_name?: string | null;
          athlete_avatar?: string | null;
          access_token?: string;
          refresh_token?: string;
          expires_at?: string;
          scope?: string;
          last_synced_at?: string | null;
        };
        Relationships: [];
      };
      testimonials: {
        Row: {
          id: string;
          user_id: string;
          text: string;
          status: TestimonialStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          text: string;
          status?: TestimonialStatus;
          created_at?: string;
        };
        Update: { status?: TestimonialStatus };
        Relationships: [];
      };
      session_changes: {
        Row: {
          weekly_session_id: string;
          occurs_on: string;
          status: 'cancelled' | 'moved';
          reason: string | null;
          new_time: string | null;
          new_location: string | null;
          new_lat: number | null;
          new_lng: number | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          weekly_session_id: string;
          occurs_on: string;
          status: 'cancelled' | 'moved';
          reason?: string | null;
          new_time?: string | null;
          new_location?: string | null;
          new_lat?: number | null;
          new_lng?: number | null;
          created_by?: string | null;
        };
        Update: {
          status?: 'cancelled' | 'moved';
          reason?: string | null;
          new_time?: string | null;
          new_location?: string | null;
          new_lat?: number | null;
          new_lng?: number | null;
          created_by?: string | null;
        };
        Relationships: [];
      };
      session_rsvps: {
        Row: {
          weekly_session_id: string;
          occurs_on: string;
          user_id: string;
          pace_group: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          weekly_session_id: string;
          occurs_on: string;
          user_id: string;
          pace_group?: string | null;
        };
        Update: { pace_group?: string | null };
        Relationships: [];
      };
      /** Single row (id is always true): the club's uploaded logo and its switch. */
      club_settings: {
        Row: {
          id: boolean;
          use_custom_logo: boolean;
          logo_url: string | null;
          logo_path: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: boolean;
          use_custom_logo?: boolean;
          logo_url?: string | null;
          logo_path?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          use_custom_logo?: boolean;
          logo_url?: string | null;
          logo_path?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      /** Definer-rights read model: approved quotes + author display fields. */
      public_testimonials: {
        Row: {
          id: string;
          text: string;
          created_at: string;
          author_name: string;
          author_avatar: string | null;
          author_sport: Sport;
          author_level: Level;
        };
        Relationships: [];
      };
      /** Definer-rights read model: club totals for the current week, in metres. */
      public_week_volume: {
        Row: { run_m: number; bike_m: number; swim_m: number; members: number };
        Relationships: [];
      };
      /** Definer-rights read model: weekly session head-counts per date and pace group. */
      public_session_rsvp_counts: {
        Row: {
          weekly_session_id: string;
          occurs_on: string;
          pace_group: string | null;
          rsvp_count: number;
        };
        Relationships: [];
      };
      /** Definer-rights read model: head-counts without exposing who. */
      public_event_rsvp_counts: {
        Row: { event_id: string; rsvp_count: number };
        Relationships: [];
      };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      sport: Sport;
      session_sport: SessionSport;
      level: Level;
      user_role: Role;
      event_type: EventType;
      testimonial_status: TestimonialStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
