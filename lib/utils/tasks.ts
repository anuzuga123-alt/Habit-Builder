import { Goal, DailyTask, DerivedTodayTask, DayOfWeek } from '../types';
import { getDayOfWeekFromDateString, formatShortTime } from './date';

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
      // For times_per_week, if selected_days are specified, check inclusion;
      // otherwise default to showing active task for schedule tracking.
      if (Array.isArray(goal.selected_days) && goal.selected_days.length > 0) {
        return goal.selected_days.includes(dayOfWeek);
      }
      return true;

    default:
      return false;
  }
}

/**
 * Derives the daily tasks list for a given date by taking active goals and existing task records.
 * Sorts derived tasks chronologically by scheduled time.
 */
export function deriveDailyTasks(
  goals: Goal[],
  persistedTasks: DailyTask[],
  dateStr: string
): DerivedTodayTask[] {
  const taskMap = new Map<string, DailyTask>();
  for (const task of persistedTasks) {
    if (task.date === dateStr) {
      taskMap.set(task.goal_id, task);
    }
  }

  const derived: DerivedTodayTask[] = [];

  for (const goal of goals) {
    if (isGoalScheduledForDate(goal, dateStr)) {
      const existingTask = taskMap.get(goal.id) || null;
      derived.push({
        goal,
        taskRecord: existingTask,
        scheduled_time: formatShortTime(goal.scheduled_time),
        status: existingTask ? existingTask.status : 'pending',
        completed_at: existingTask ? existingTask.completed_at : null,
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
