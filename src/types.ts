export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  language: "he" | "en";
  onboarded: boolean;
  tone_preference: "direct" | "warm" | "analytical";
  strong_time_window: string; // e.g., "08:00-11:00"
  drift_time_window: string;  // e.g., "16:00-18:00"
  reminder_frequency: "regular" | "mild" | "off";
  quiet_hours_start: string;  // e.g., "22:00"
  quiet_hours_end: string;    // e.g., "07:00"
  calendar_connected: boolean;
  ai_enabled: boolean;
  created_at?: string;
  health_goals?: string[];
  activity_level?: string;
  focus_areas?: string[];
}

export interface ActionItem {
  id: string;
  user_id: string;
  title: string;
  icon: string; // lucide icon identifier
  duration_minutes: number;
  energy_level: "high" | "medium" | "low";
  category: "health" | "development" | "organization" | "mindfulness" | "leisure" | "other";
  smart_suggestion_enabled: boolean;
  preferred_time_window?: string; // e.g. "morning", "afternoon", "evening"
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CheckIn {
  id: string;
  user_id: string;
  action_id: string | null;
  date: string; // ISO string Date (YYYY-MM-DD)
  status: "done" | "partial" | "not_today";
  note?: string;
  minutes_completed?: number;
  created_at?: string;
}

export interface UserSettings {
  user_id: string;
  language: "he" | "en";
  appearance: "light" | "dark" | "system";
  tone: "direct" | "warm" | "analytical";
  reminder_frequency: "regular" | "mild" | "off";
  quiet_hours_start: string;
  quiet_hours_end: string;
  pause_for_today: boolean;
  notifications_enabled: boolean;
  calendar_sync_enabled: boolean;
  ai_enabled: boolean;
  updated_at?: string;
}

export interface LayoutBlockItem {
  id: string;
  user_id: string;
  block_id: "progress" | "empty_window_hero" | "suggested_actions" | "up_next" | "quick_check_in" | "small_insight" | "ai_messages_box";
  visible: boolean;
  sort_order: number;
}

export interface CalendarConnection {
  id: string;
  user_id: string;
  provider: "google";
  google_account_email: string;
  connected: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CalendarEventItem {
  id: string;
  user_id: string;
  title: string;
  start_time: string; // ISO datetime
  end_time: string;   // ISO datetime
  is_busy: boolean;
  source: "google" | "mock";
}

export interface AiChatMessage {
  id: string;
  user_id: string;
  role: "user" | "model";
  content: string;
  created_at?: string;
}

export interface AiInsightItem {
  id: string;
  user_id: string;
  type: "daily" | "weekly";
  title: string;
  body: string;
  suggested_action?: {
    action_type: "move_morning" | "shorten_duration" | "less_evening" | "keep_same";
    action_id?: string;
    target_minutes?: number;
  };
  accepted?: boolean;
  created_at?: string;
}

export interface DeviceNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  scheduled_for: string; // datetime string
  type: "free_window" | "action_start" | "check_in" | "daily_recap";
  status: "scheduled" | "sent" | "failed";
}

export interface FreeWindow {
  start: string;  // e.g., "15:30"
  end: string;    // e.g., "17:00"
  durationMinutes: number;
  source: "calendar" | "mock";
  confidence: number;
}
