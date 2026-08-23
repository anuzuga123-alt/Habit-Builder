import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TodayScreenClient } from '@/components/today-screen-client';
import { getFormattedDateString, getWeekDateRange } from '@/lib/utils/date';
import { Goal, DailyTask } from '@/lib/types';

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch profile for timezone & display name
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, timezone')
    .eq('id', user.id)
    .single();

  const userTimezone = profile?.timezone || 'UTC';
  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User';

  const dateStr = getFormattedDateString(new Date(), userTimezone);
  const { startOfWeek, endOfWeek } = getWeekDateRange(dateStr);

  // Fetch active goals
  const { data: goalsData } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true)
    .is('deleted_at', null);

  // Fetch current week's persisted tasks for weekly progress calculations
  const { data: tasksData } = await supabase
    .from('daily_tasks')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', startOfWeek)
    .lte('date', endOfWeek);

  return (
    <TodayScreenClient
      goals={(goalsData as Goal[]) || []}
      initialPersistedTasks={(tasksData as DailyTask[]) || []}
      dateStr={dateStr}
      displayName={displayName}
      userId={user.id}
    />
  );
}
