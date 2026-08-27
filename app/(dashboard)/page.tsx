import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TodayScreenClient } from '@/components/today-screen-client';
import { getFormattedDateString } from '@/lib/utils/date';
import { Goal, DailyTask } from '@/lib/types';

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Calculate date string 366 days ago to bound the daily_tasks query window (streak calculation max 365 days)
  const pastWindowDate = new Date();
  pastWindowDate.setUTCDate(pastWindowDate.getUTCDate() - 366);
  const minDateStr = pastWindowDate.toISOString().split('T')[0];

  // Fetch profile, goals, and recent 365-day tasks in parallel to eliminate waterfall latency
  const [profileResult, goalsResult, tasksResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, timezone')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .is('deleted_at', null),
    supabase
      .from('daily_tasks')
      .select('id, user_id, goal_id, date, scheduled_time, status, completed_at, notes, proof_url, created_at, updated_at')
      .eq('user_id', user.id)
      .gte('date', minDateStr),
  ]);

  const profile = profileResult.data;
  const goalsData = goalsResult.data;
  const tasksData = tasksResult.data;

  const userTimezone = profile?.timezone || 'UTC';
  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User';

  const dateStr = getFormattedDateString(new Date(), userTimezone);

  return (
    <TodayScreenClient
      goals={(goalsData as Goal[]) || []}
      initialPersistedTasks={(tasksData as DailyTask[]) || []}
      dateStr={dateStr}
      displayName={displayName}
      userId={user.id}
      userTimezone={userTimezone}
    />
  );
}
