export type FrequencyOption = 'every_day' | 'selected_days' | 'times_per_week';
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type TaskStatus = 'pending' | 'completed' | 'skipped' | 'missed';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  coaching_style: string;
  notification_preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  active: boolean;
  deleted_at: string | null;
  frequency: FrequencyOption;
  selected_days: DayOfWeek[];
  target_per_week: number | null;
  scheduled_time: string; // e.g., '06:30' or '06:30:00'
  duration_target: string | null;
  reminder_enabled: boolean;
  reminder_minutes_before: number;
  proof_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyTask {
  id: string;
  user_id: string;
  goal_id: string;
  date: string; // 'YYYY-MM-DD'
  scheduled_time: string; // e.g., '06:30' or '06:30:00'
  status: TaskStatus;
  completed_at: string | null;
  notes: string | null;
  proof_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DerivedTodayTask {
  goal: Goal;
  taskRecord: DailyTask | null; // Persisted daily task if exists
  scheduled_time: string;
  status: TaskStatus;
  completed_at: string | null;
  weeklyProgress?: {
    completed: number;
    target: number;
  };
}
