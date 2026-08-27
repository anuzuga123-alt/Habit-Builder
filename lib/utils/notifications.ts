/**
 * Browser Habit Alarm Notification Manager
 */

export interface NotificationPermissionState {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
}

export function checkNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { supported: false, permission: 'unsupported' };
  }
  return { supported: true, permission: Notification.permission };
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { supported: false, permission: 'unsupported' };
  }
  try {
    const result = await Notification.requestPermission();
    return { supported: true, permission: result };
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return { supported: true, permission: Notification.permission };
  }
}

const NOTIFICATION_LOG_KEY = 'focus_notified_reminders';

function getNotifiedKey(goalId: string, taskDate: string, reminderType: string): string {
  return `${goalId}_${taskDate}_${reminderType}`;
}

export function hasAlreadyNotified(goalId: string, taskDate: string, reminderType: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(NOTIFICATION_LOG_KEY);
    const list: string[] = stored ? JSON.parse(stored) : [];
    return list.includes(getNotifiedKey(goalId, taskDate, reminderType));
  } catch {
    return false;
  }
}

export function markAsNotified(goalId: string, taskDate: string, reminderType: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getNotifiedKey(goalId, taskDate, reminderType);
    const stored = localStorage.getItem(NOTIFICATION_LOG_KEY);
    let list: string[] = stored ? JSON.parse(stored) : [];
    if (!list.includes(key)) {
      list.push(key);
      // Keep only last 100 entries
      if (list.length > 100) {
        list = list.slice(list.length - 100);
      }
      localStorage.setItem(NOTIFICATION_LOG_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.warn('Error saving notification log:', err);
  }
}

export async function triggerHabitBrowserNotification(params: {
  goalId: string;
  goalName: string;
  taskDate: string;
  scheduledTime: string;
  reminderType: 'due_soon' | 'scheduled' | 'overdue';
  message: string;
}): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  const { goalId, goalName, taskDate, scheduledTime, reminderType, message } = params;

  if (hasAlreadyNotified(goalId, taskDate, reminderType)) {
    return false;
  }

  const title = `⏰ Habit Alarm: ${goalName}`;
  const options: NotificationOptions = {
    body: `${message} (${scheduledTime})`,
    icon: '/favicon.ico',
    tag: `habit_${goalId}_${taskDate}`,
    requireInteraction: true,
    data: { url: '/' },
  };

  markAsNotified(goalId, taskDate, reminderType);

  try {
    // Try service worker notification if available
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.showNotification) {
        await registration.showNotification(title, options);
        return true;
      }
    }

    // Fallback to standard Notification API
    const notification = new Notification(title, options);
    notification.onclick = function (event) {
      event.preventDefault();
      window.focus();
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
      notification.close();
    };
    return true;
  } catch (err) {
    console.error('Error triggering notification:', err);
    return false;
  }
}
