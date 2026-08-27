'use client';

import { useState, useEffect } from 'react';
import {
  checkNotificationPermission,
  requestNotificationPermission,
  NotificationPermissionState,
} from '@/lib/utils/notifications';
import { unlockAudioContext } from '@/lib/utils/alarm-sound';
import { Bell, BellOff, Volume2, CheckCircle2 } from 'lucide-react';

interface HabitAlarmsControlProps {
  className?: string;
  compact?: boolean;
}

export function HabitAlarmsControl({ className = '', compact = false }: HabitAlarmsControlProps) {
  const [permState, setPermState] = useState<NotificationPermissionState>({
    supported: true,
    permission: 'default',
  });
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const state = checkNotificationPermission();
    setPermState(state);
  }, []);

  const handleEnable = async () => {
    setLoading(true);

    // 1. Unlock Web Audio Context via user gesture
    const unlocked = unlockAudioContext();
    setAudioUnlocked(unlocked);

    // 2. Request browser notification permission
    const newState = await requestNotificationPermission();
    setPermState(newState);

    setLoading(false);
  };

  const isGranted = permState.supported && permState.permission === 'granted';
  const isDenied = permState.supported && permState.permission === 'denied';
  const isUnsupported = !permState.supported;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {isGranted ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Habit Alarms Enabled</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleEnable}
            disabled={loading || isDenied || isUnsupported}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-neutral-800 dark:text-neutral-200 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-gray-300 dark:border-neutral-700 rounded-full transition-colors cursor-pointer disabled:opacity-50"
          >
            <Bell className="w-3 h-3 text-amber-500 shrink-0" />
            <span>{loading ? 'Enabling...' : 'Enable Habit Alarms'}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl space-y-3 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500 shrink-0" />
            <h3 className="text-xs font-semibold text-gray-900 dark:text-neutral-100 uppercase tracking-wider">
              Habit Alarms & Notifications
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-neutral-400">
            Receive prominent alarm notifications and audio chimes when your scheduled habits are due.
          </p>
        </div>

        {isGranted ? (
          <div className="px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60 rounded-md shrink-0 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Enabled</span>
          </div>
        ) : isDenied ? (
          <div className="px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md shrink-0 flex items-center gap-1">
            <BellOff className="w-3.5 h-3.5" />
            <span>Blocked</span>
          </div>
        ) : isUnsupported ? (
          <div className="px-2.5 py-1 text-xs font-medium text-gray-500 bg-gray-100 dark:bg-neutral-700 rounded-md shrink-0">
            Unsupported
          </div>
        ) : (
          <button
            type="button"
            onClick={handleEnable}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 rounded-md transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            {loading ? 'Enabling...' : 'Enable Alarms'}
          </button>
        )}
      </div>

      {isDenied && (
        <p className="text-[11px] text-red-600 dark:text-red-400 pt-1 border-t border-gray-100 dark:border-neutral-700">
          Notifications are currently blocked by your browser permissions. To receive habit alarms, please unblock notifications in your browser address bar settings.
        </p>
      )}

      {isGranted && (
        <div className="pt-2 border-t border-gray-100 dark:border-neutral-700 text-[11px] text-gray-500 dark:text-neutral-400 flex items-center gap-2">
          <Volume2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Browser notifications and sound chimes are active for habits with reminders enabled.</span>
        </div>
      )}
    </div>
  );
}
