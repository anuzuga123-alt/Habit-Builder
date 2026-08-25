import { NextResponse, NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { evaluateGoalReminders } from '@/lib/utils/reminders';
import { getFormattedDateString } from '@/lib/utils/date';
import { Goal, DailyTask } from '@/lib/types';

async function handleCheck(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isCronAuthorized = Boolean(
    cronSecret && authHeader === `Bearer ${cronSecret}`
  );

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isCronAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Authenticated user request path
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', user.id)
      .single();

    const userTimezone = profile?.timezone || 'UTC';
    const todayDateStr = getFormattedDateString(new Date(), userTimezone);

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

  // 2. Automated Cron request path across all users
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is required for cron checks' },
      { status: 500 }
    );
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Fetch profiles to map user_id -> timezone
  const { data: profilesData } = await adminClient
    .from('profiles')
    .select('id, timezone');

  const userTimezoneMap = new Map<string, string>();
  if (profilesData) {
    for (const p of profilesData) {
      userTimezoneMap.set(p.id, p.timezone || 'UTC');
    }
  }

  // Fetch active goals and daily tasks
  const { data: goalsData } = await adminClient
    .from('goals')
    .select('*')
    .eq('active', true)
    .is('deleted_at', null);

  const { data: tasksData } = await adminClient
    .from('daily_tasks')
    .select('*');

  const allGoals = (goalsData as Goal[]) || [];
  const allTasks = (tasksData as DailyTask[]) || [];

  // Group goals by user_id
  const userGoalsMap = new Map<string, Goal[]>();
  for (const g of allGoals) {
    const list = userGoalsMap.get(g.user_id) || [];
    list.push(g);
    userGoalsMap.set(g.user_id, list);
  }

  // Group tasks by user_id
  const userTasksMap = new Map<string, DailyTask[]>();
  for (const t of allTasks) {
    const list = userTasksMap.get(t.user_id) || [];
    list.push(t);
    userTasksMap.set(t.user_id, list);
  }

  const allActiveReminders = [];
  const loggedReminders = [];

  for (const [userId, userGoals] of userGoalsMap.entries()) {
    const userTimezone = userTimezoneMap.get(userId) || 'UTC';
    const todayDateStr = getFormattedDateString(new Date(), userTimezone);
    const userTasks = userTasksMap.get(userId) || [];

    const activeReminders = evaluateGoalReminders(
      userGoals,
      userTasks,
      todayDateStr,
      userTimezone
    );

    for (const rem of activeReminders) {
      allActiveReminders.push(rem);

      const { data, error } = await adminClient
        .from('reminder_logs')
        .upsert(
          {
            user_id: userId,
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
  }

  return NextResponse.json({
    success: true,
    processedCount: allActiveReminders.length,
    reminders: allActiveReminders,
    logs: loggedReminders,
  });
}

export async function GET(request: NextRequest) {
  return handleCheck(request);
}

export async function POST(request: NextRequest) {
  return handleCheck(request);
}
