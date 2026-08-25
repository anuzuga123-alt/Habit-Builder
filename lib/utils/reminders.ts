import { Goal, DailyTask } from '../types';
import { isGoalScheduledForDate } from './tasks';
import { formatShortTime } from './date';

export interface ActiveReminder {
  goalId: string;
  goalName: string;
  taskDate: string;
  scheduledTime: string;
  reminderType: 'due_soon' | 'scheduled' | 'overdue';
  message: string;
}

/**
 * Evaluates active goals to determine if any pending habits have due/upcoming reminders for todayDateStr.
 */
export function evaluateGoalReminders(
  goals: Goal[],
  tasks: DailyTask[],
  todayDateStr: string,
  userTimezone: string
): ActiveReminder[] {
  const activeReminders: ActiveReminder[] = [];

  const taskMap = new Map<string, DailyTask>();
  for (const t of tasks) {
    if (t.date === todayDateStr) {
      taskMap.set(t.goal_id, t);
    }
  }

  // Get current local time in user's timezone (HH:MM)
  let currentLocalTimeMinutes = 0;
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value || '0');
    const minute = Number(parts.find((p) => p.type === 'minute')?.value || '0');
    currentLocalTimeMinutes = hour * 60 + minute;
  } catch {
    const now = new Date();
    currentLocalTimeMinutes = now.getHours() * 60 + now.getMinutes();
  }

  for (const goal of goals) {
    if (!goal.reminder_enabled || !goal.active || goal.deleted_at) {
      continue;
    }

    if (!isGoalScheduledForDate(goal, todayDateStr)) {
      continue;
    }

    const todayTask = taskMap.get(goal.id);
    if (todayTask && (todayTask.status === 'completed' || todayTask.status === 'skipped')) {
      continue;
    }

    const shortTime = formatShortTime(goal.scheduled_time);
    const [schedHour, schedMin] = shortTime.split(':').map(Number);
    const schedMinutes = schedHour * 60 + schedMin;

    const reminderMinutesBefore = goal.reminder_minutes_before || 15;
    const triggerMinutes = schedMinutes - reminderMinutesBefore;

    if (currentLocalTimeMinutes >= triggerMinutes) {
      let reminderType: 'due_soon' | 'scheduled' | 'overdue' = 'scheduled';
      let message = `Reminder: "${goal.name}" is scheduled for ${shortTime}.`;

      if (currentLocalTimeMinutes > schedMinutes + 30) {
        reminderType = 'overdue';
        message = `"${goal.name}" was scheduled for ${shortTime}. Don't forget to complete it today!`;
      } else if (currentLocalTimeMinutes >= schedMinutes) {
        reminderType = 'due_soon';
        message = `It's time for "${goal.name}" (${shortTime}).`;
      }

      activeReminders.push({
        goalId: goal.id,
        goalName: goal.name,
        taskDate: todayDateStr,
        scheduledTime: shortTime,
        reminderType,
        message,
      });
    }
  }

  return activeReminders;
}
