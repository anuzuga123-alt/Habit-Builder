import { Goal, DailyTask, DerivedTodayTask } from '../types';
import { getDayOfWeekFromDateString, formatShortTime, getWeekDateRange } from './date';

/**
 * Checks whether a given Goal is scheduled to be performed on a specific date string (YYYY-MM-DD).
 */
export function isGoalScheduledForDate(goal: Goal, dateStr: string): boolean {
  if (!goal.active || goal.deleted_at) {
    return false;
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
