import { Goal, DailyTask, DerivedTodayTask } from '../types';
import { getDayOfWeekFromDateString, formatShortTime, getWeekDateRange } from './date';

/**
 * Checks whether a given Goal is scheduled to be performed on a specific date string (YYYY-MM-DD).
 */
export function isGoalScheduledForDate(goal: Goal, dateStr: string): boolean {
  if (!goal.active || goal.deleted_at) {
    return false;
  }

  // If dateStr is before the goal was created, it was not scheduled
  if (goal.created_at) {
    const createdDateStr = goal.created_at.split('T')[0];
    if (dateStr < createdDateStr) {
      return false;
    }
  }

  const dayOfWeek = getDayOfWeekFromDateString(dateStr);

  switch (goal.frequency) {
    case 'every_day':
      return true;

    case 'selected_days':
      return Array.isArray(goal.selected_days) && goal.selected_days.includes(dayOfWeek);

    case 'times_per_week':
      // For times_per_week: if selected_days are specified, check inclusion;
      // otherwise, eligible every day (weekly completion limit is checked separately).
      if (Array.isArray(goal.selected_days) && goal.selected_days.length > 0) {
        return goal.selected_days.includes(dayOfWeek);
      }
      return true;

    default:
      return false;
  }
}

/**
 * Derives the daily tasks list for a given date by taking active goals and week's task records.
 * Sorts derived tasks chronologically by scheduled time.
 */
/**
 * Calculates the current completion streak (in days) for a goal leading up to or including today.
 */
export function calculateGoalStreak(goal: Goal, tasks: DailyTask[], dateStr: string): number {
  if (!goal.active || goal.deleted_at) return 0;

  const taskMap = new Map<string, DailyTask>();
  for (const t of tasks) {
    if (t.goal_id === goal.id) {
      taskMap.set(t.date, t);
    }
  }

  let streak = 0;
  const currentDate = new Date(dateStr + 'T00:00:00Z');

  // Check today first. If completed today, count it. If pending today, check yesterday without breaking.
  const todayTask = taskMap.get(dateStr);
  if (todayTask && todayTask.status === 'completed') {
    streak++;
    currentDate.setUTCDate(currentDate.getUTCDate() - 1);
  } else {
    // If not completed today, move to yesterday to check previous streak
    currentDate.setUTCDate(currentDate.getUTCDate() - 1);
  }

  // Count backwards past days
  while (true) {
    const dStr = currentDate.toISOString().split('T')[0];

    // Check if goal was scheduled for this past date
    if (isGoalScheduledForDate(goal, dStr)) {
      const task = taskMap.get(dStr);
      if (task && task.status === 'completed') {
        streak++;
      } else {
        break; // Streak broken on a scheduled day
      }
    }
    // Go back 1 day
    currentDate.setUTCDate(currentDate.getUTCDate() - 1);

    // Safety limit to avoid infinite loop (e.g. max 365 days)
    if (streak > 365) break;
  }

  return streak;
}

/**
 * Calculates consecutive missed scheduled days for a goal starting from yesterday (relative to todayDateStr).
 */
export function calculateConsecutiveMisses(
  goal: Goal,
  tasks: DailyTask[],
  todayDateStr: string
): { count: number; message: string | null } {
  if (!goal.active || goal.deleted_at) return { count: 0, message: null };

  const taskMap = new Map<string, DailyTask>();
  for (const t of tasks) {
    if (t.goal_id === goal.id) {
      taskMap.set(t.date, t);
    }
  }

  let count = 0;
  const currentDate = new Date(todayDateStr + 'T00:00:00Z');
  // Start checking from yesterday
  currentDate.setUTCDate(currentDate.getUTCDate() - 1);

  const goalCreatedDateStr = goal.created_at ? goal.created_at.split('T')[0] : '1970-01-01';

  while (true) {
    const dStr = currentDate.toISOString().split('T')[0];

    // Stop if date is before the goal was created
    if (dStr < goalCreatedDateStr) {
      break;
    }

    if (isGoalScheduledForDate(goal, dStr)) {
      const task = taskMap.get(dStr);
      // Completed or Skipped break the consecutive miss chain!
      if (task && (task.status === 'completed' || task.status === 'skipped')) {
        break;
      } else {
        // Either task status is 'missed' or missing/pending on a past scheduled date
        count++;
      }
    }

    currentDate.setUTCDate(currentDate.getUTCDate() - 1);
    // Safety limit (e.g. max 60 days)
    if (count > 60) break;
  }

  let message: string | null = null;
  if (count === 1) {
    message = 'You missed yesterday. Get back today.';
  } else if (count === 2) {
    message = "Two days in a row is a habit. Don't break the chain today!";
  } else if (count >= 3) {
    message = `${count}+ missed days in a row. Let's make today a small win!`;
  }

  return { count, message };
}

/**
 * Returns payloads for past scheduled tasks that were not completed or skipped,
 * and need to be persisted as 'missed' in daily_tasks.
 */
export function getMissingPastTaskPayloads(
  goals: Goal[],
  tasks: DailyTask[],
  todayDateStr: string
): Partial<DailyTask>[] {
  const payloads: Partial<DailyTask>[] = [];
  const taskMap = new Map<string, DailyTask>();

  for (const t of tasks) {
    taskMap.set(`${t.goal_id}_${t.date}`, t);
  }

  for (const goal of goals) {
    if (!goal.active || goal.deleted_at) continue;

    const goalCreatedDateStr = goal.created_at ? goal.created_at.split('T')[0] : todayDateStr;
    const currentDate = new Date(todayDateStr + 'T00:00:00Z');
    currentDate.setUTCDate(currentDate.getUTCDate() - 1);

    // Limit check to last 30 days or goal creation date
    let daysChecked = 0;
    while (daysChecked < 30) {
      const dStr = currentDate.toISOString().split('T')[0];
      if (dStr < goalCreatedDateStr) break;

      if (isGoalScheduledForDate(goal, dStr)) {
        const key = `${goal.id}_${dStr}`;
        const existingTask = taskMap.get(key);

        if (!existingTask) {
          payloads.push({
            user_id: goal.user_id,
            goal_id: goal.id,
            date: dStr,
            scheduled_time: goal.scheduled_time,
            status: 'missed',
          });
        } else if (existingTask.status === 'pending') {
          payloads.push({
            id: existingTask.id,
            user_id: goal.user_id,
            goal_id: goal.id,
            date: dStr,
            scheduled_time: goal.scheduled_time,
            status: 'missed',
          });
        }
      }

      currentDate.setUTCDate(currentDate.getUTCDate() - 1);
      daysChecked++;
    }
  }

  return payloads;
}

export function deriveDailyTasks(
  goals: Goal[],
  weekTasks: DailyTask[],
  dateStr: string
): DerivedTodayTask[] {
  const { startOfWeek, endOfWeek } = getWeekDateRange(dateStr);

  // Map tasks for today
  const todayTaskMap = new Map<string, DailyTask>();
  // Map weekly completed count per goal
  const weeklyCompletedCountMap = new Map<string, number>();

  for (const task of weekTasks) {
    if (task.date >= startOfWeek && task.date <= endOfWeek && task.status === 'completed') {
      const current = weeklyCompletedCountMap.get(task.goal_id) || 0;
      weeklyCompletedCountMap.set(task.goal_id, current + 1);
    }
    if (task.date === dateStr) {
      todayTaskMap.set(task.goal_id, task);
    }
  }

  const derived: DerivedTodayTask[] = [];

  for (const goal of goals) {
    if (!isGoalScheduledForDate(goal, dateStr)) {
      continue;
    }

    const existingTodayTask = todayTaskMap.get(goal.id) || null;
    const completedThisWeek = weeklyCompletedCountMap.get(goal.id) || 0;

    const streak = calculateGoalStreak(goal, weekTasks, dateStr);
    const { count: consecutiveMisses, message: consecutiveMissMessage } = calculateConsecutiveMisses(
      goal,
      weekTasks,
      dateStr
    );

    if (goal.frequency === 'times_per_week') {
      const target = goal.target_per_week || 1;
      const isTodayCompleted = existingTodayTask?.status === 'completed';

      // Show goal on Today screen if target not reached OR if it was already completed today
      if (completedThisWeek < target || isTodayCompleted) {
        derived.push({
          goal,
          taskRecord: existingTodayTask,
          scheduled_time: formatShortTime(goal.scheduled_time),
          status: existingTodayTask ? existingTodayTask.status : 'pending',
          completed_at: existingTodayTask ? existingTodayTask.completed_at : null,
          proof_url: existingTodayTask ? existingTodayTask.proof_url : null,
          streak,
          consecutiveMisses,
          consecutiveMissMessage,
          weeklyProgress: {
            completed: completedThisWeek,
            target,
          },
        });
      }
    } else {
      derived.push({
        goal,
        taskRecord: existingTodayTask,
        scheduled_time: formatShortTime(goal.scheduled_time),
        status: existingTodayTask ? existingTodayTask.status : 'pending',
        completed_at: existingTodayTask ? existingTodayTask.completed_at : null,
        proof_url: existingTodayTask ? existingTodayTask.proof_url : null,
        streak,
        consecutiveMisses,
        consecutiveMissMessage,
      });
    }
  }

  // Sort by scheduled time ASC, then by goal name
  return derived.sort((a, b) => {
    const timeCompare = a.scheduled_time.localeCompare(b.scheduled_time);
    if (timeCompare !== 0) return timeCompare;
    return a.goal.name.localeCompare(b.goal.name);
  });
}
