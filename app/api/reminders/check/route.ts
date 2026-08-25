import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { evaluateGoalReminders } from '@/lib/utils/reminders';
import { getFormattedDateString } from '@/lib/utils/date';
import { Goal, DailyTask } from '@/lib/types';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user.id)
    .single();

  const userTimezone = profile?.timezone || 'UTC';
  const todayDateStr = getFormattedDateString(new Date(), userTimezone);

  // Fetch goals & daily tasks
  const { data: goalsData } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true)
    .is('deleted_at', null);

  const { data: tasksData } = await supabase
    .from('daily_tasks')
    .select('*')
    .eq('user_id', user.id);

  const goals = (goalsData as Goal[]) || [];
  const tasks = (tasksData as DailyTask[]) || [];

  const activeReminders = evaluateGoalReminders(goals, tasks, todayDateStr, userTimezone);

  // Log active reminders to database preventing duplicate logs
  const loggedReminders = [];
  for (const rem of activeReminders) {
    const { data, error } = await supabase
      .from('reminder_logs')
      .upsert(
        {
          user_id: user.id,
          goal_id: rem.goalId,
          task_date: rem.taskDate,
          reminder_type: rem.reminderType,
          sent_at: new Date().toISOString(),
        },
        { onConflict: 'goal_id,task_date,reminder_type' }
      )
      .select('*')
      .single();

    if (!error && data) {
      loggedReminders.push(data);
    }
  }

  return NextResponse.json({
    success: true,
    processedCount: activeReminders.length,
    reminders: activeReminders,
    logs: loggedReminders,
  });
}
