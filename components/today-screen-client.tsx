'use client';

import { useState, useEffect, useRef } from 'react';
import { Goal, DailyTask, DerivedTodayTask } from '@/lib/types';
import { deriveDailyTasks, getMissingPastTaskPayloads } from '@/lib/utils/tasks';
import { evaluateGoalReminders, ActiveReminder } from '@/lib/utils/reminders';
import { TodayTaskItem } from '@/components/today-task-item';
import { HabitAlarmsControl } from '@/components/habit-alarms-control';
import { playHabitAlarmSound } from '@/lib/utils/alarm-sound';
import { triggerHabitBrowserNotification } from '@/lib/utils/notifications';
import { createClient } from '@/lib/supabase/client';
import { formatDisplayDate } from '@/lib/utils/date';
import Link from 'next/link';
import { Bell, Check, X, Volume2 } from 'lucide-react';

interface TodayScreenClientProps {
  goals: Goal[];
  initialPersistedTasks: DailyTask[];
  dateStr: string;
  displayName: string;
  userId: string;
  userTimezone?: string;
}

export function TodayScreenClient({
  goals,
  initialPersistedTasks,
  dateStr,
  displayName,
  userId,
  userTimezone = 'UTC',
}: TodayScreenClientProps) {
  const [persistedTasks, setPersistedTasks] = useState<DailyTask[]>(initialPersistedTasks);
  const [prevInitialTasks, setPrevInitialTasks] = useState<DailyTask[]>(initialPersistedTasks);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);

  // Proof Modal State
  const [proofModalTask, setProofModalTask] = useState<DerivedTodayTask | null>(null);
  const [proofUrlInput, setProofUrlInput] = useState('');

  // Sync state during render if initialPersistedTasks prop changes
  if (prevInitialTasks !== initialPersistedTasks) {
    setPrevInitialTasks(initialPersistedTasks);
    setPersistedTasks(initialPersistedTasks);
  }

  const persistedTasksRef = useRef(persistedTasks);
  useEffect(() => {
    persistedTasksRef.current = persistedTasks;
  }, [persistedTasks]);

  const hasSyncedRef = useRef(false);

  // Reset sync flag if goals or dateStr changes
  useEffect(() => {
    hasSyncedRef.current = false;
  }, [goals, dateStr]);

  // Detect missed days on mount/goals update and sync to daily_tasks exactly once per load
  useEffect(() => {
    if (hasSyncedRef.current) return;

    const missingPayloads = getMissingPastTaskPayloads(goals, persistedTasksRef.current, dateStr);
    if (missingPayloads.length === 0) {
      hasSyncedRef.current = true;
      return;
    }

    hasSyncedRef.current = true;
    const syncMissedTasks = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('daily_tasks')
          .upsert(missingPayloads, { onConflict: 'goal_id,date' })
          .select('*');

        if (!error && data) {
          setPersistedTasks((prev) => {
            const taskMap = new Map(prev.map((t) => [`${t.goal_id}_${t.date}`, t]));
            for (const t of data as DailyTask[]) {
              taskMap.set(`${t.goal_id}_${t.date}`, t);
            }
            return Array.from(taskMap.values());
          });
        }
      } catch (err) {
        console.error('Error syncing missed past tasks:', err);
      }
    };

    syncMissedTasks();
  }, [goals, dateStr]);

  const activeReminders: ActiveReminder[] = evaluateGoalReminders(
    goals,
    persistedTasks,
    dateStr,
    userTimezone
  );

  const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set());
  const previousActiveRemindersRef = useRef<ActiveReminder[]>([]);

  // Trigger web audio alarm & browser notifications when a new active reminder is evaluated
  useEffect(() => {
    if (activeReminders.length > 0) {
      const prevKeys = new Set(
        previousActiveRemindersRef.current.map((r) => `${r.goalId}_${r.reminderType}`)
      );
      let isNewReminderTriggered = false;

      for (const rem of activeReminders) {
        const key = `${rem.goalId}_${rem.reminderType}`;
        if (!prevKeys.has(key)) {
          isNewReminderTriggered = true;
          // Trigger browser notification if permitted
          triggerHabitBrowserNotification({
            goalId: rem.goalId,
            goalName: rem.goalName,
            taskDate: rem.taskDate,
            scheduledTime: rem.scheduledTime,
            reminderType: rem.reminderType,
            message: rem.message,
          });
        }
      }

      if (isNewReminderTriggered) {
        playHabitAlarmSound();
      }
    }

    previousActiveRemindersRef.current = activeReminders;
  }, [activeReminders]);

  const visibleReminders = activeReminders.filter((rem) => !dismissedReminders.has(rem.goalId));

  const derivedTasks = deriveDailyTasks(goals, persistedTasks, dateStr);

  const completedCount = derivedTasks.filter((t) => t.status === 'completed').length;
  const totalCount = derivedTasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const [pendingGoalIds, setPendingGoalIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const saveTaskStatus = async (
    task: DerivedTodayTask,
    newStatus: 'pending' | 'completed' | 'skipped',
    proofUrl?: string | null
  ) => {
    const goalId = task.goal.id;

    // Prevent double submission for the same goal while persistence is in flight
    if (pendingGoalIds.has(goalId)) return;

    setPendingGoalIds((prev) => new Set(prev).add(goalId));
    setErrorMessage(null);

    const nowIso = newStatus === 'completed' ? new Date().toISOString() : null;
    const previousTasks = [...persistedTasks];

    // Optimistically update local state immediately
    const optimisticTask: DailyTask = {
      id: task.taskRecord?.id || `temp_${goalId}_${dateStr}`,
      user_id: userId,
      goal_id: goalId,
      date: dateStr,
      scheduled_time: task.goal.scheduled_time,
      status: newStatus,
      completed_at: nowIso,
      notes: task.taskRecord?.notes || null,
      proof_url: newStatus === 'completed' ? (proofUrl ?? task.proof_url ?? null) : null,
      created_at: task.taskRecord?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setPersistedTasks((prev) => {
      const filtered = prev.filter((t) => !(t.goal_id === goalId && t.date === dateStr));
      return [...filtered, optimisticTask];
    });

    try {
      const supabase = createClient();
      const payload: Partial<DailyTask> = {
        user_id: userId,
        goal_id: goalId,
        date: dateStr,
        scheduled_time: task.goal.scheduled_time,
        status: newStatus,
        completed_at: nowIso,
        proof_url: newStatus === 'completed' ? (proofUrl ?? task.proof_url ?? null) : null,
      };

      const { data, error } = await supabase
        .from('daily_tasks')
        .upsert(payload, { onConflict: 'goal_id,date' })
        .select('*')
        .single();

      if (error) {
        console.error('Error saving task status:', error);
        // Revert to previous state
        setPersistedTasks(previousTasks);
        setErrorMessage(`Failed to update task status for "${task.goal.name}". Changes reverted.`);
      } else if (data) {
        setPersistedTasks((prev) => {
          const filtered = prev.filter((t) => !(t.goal_id === goalId && t.date === dateStr));
          return [...filtered, data as DailyTask];
        });
      }
    } catch (err) {
      console.error('Unexpected error toggling task status:', err);
      setPersistedTasks(previousTasks);
      setErrorMessage(`Unexpected error updating task. Changes reverted.`);
    } finally {
      setPendingGoalIds((prev) => {
        const next = new Set(prev);
        next.delete(goalId);
        return next;
      });
    }
  };

  const handleToggleComplete = async (task: DerivedTodayTask) => {
    const isCurrentlyCompleted = task.status === 'completed';

    if (!isCurrentlyCompleted && task.goal.proof_required && !task.proof_url) {
      setProofModalTask(task);
      setProofUrlInput('');
      return;
    }

    const newStatus = isCurrentlyCompleted ? 'pending' : 'completed';
    await saveTaskStatus(task, newStatus);
  };

  const handleSkipTask = async (task: DerivedTodayTask) => {
    const isCurrentlySkipped = task.status === 'skipped';
    const newStatus = isCurrentlySkipped ? 'pending' : 'skipped';
    await saveTaskStatus(task, newStatus);
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofModalTask) return;

    const task = proofModalTask;
    setProofModalTask(null);
    await saveTaskStatus(task, 'completed', proofUrlInput.trim() || null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Global error notification banner */}
      {errorMessage && (
        <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300 rounded-xl flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 dark:hover:text-red-200 p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header section */}
      <div className="space-y-1.5">
        <div className="text-xs font-mono font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400">
          TODAY • {formatDisplayDate(dateStr)}
        </div>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-neutral-100">
            Good morning, {displayName}
          </h1>
          <div className="flex items-center gap-3">
            <HabitAlarmsControl compact />
            <span className="text-xs font-mono text-gray-500 dark:text-neutral-400 font-medium">
              {completedCount} of {totalCount} completed ({progressPercent}%)
            </span>
          </div>
        </div>

        {/* Minimal progress bar indicator */}
        {totalCount > 0 && (
          <div className="w-full bg-gray-200 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden mt-1">
            <div
              className="bg-neutral-900 dark:bg-neutral-100 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Active Habit Alarm Cards */}
      {visibleReminders.length > 0 && (
        <div className="space-y-3">
          {visibleReminders.map((rem) => {
            const matchingTask = derivedTasks.find((t) => t.goal.id === rem.goalId);
            return (
              <div
                key={rem.goalId}
                className="p-4 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800 rounded-xl shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-500/15 text-amber-700 dark:text-amber-300 rounded-lg shrink-0 mt-0.5">
                      <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-pulse" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider font-mono">
                          Habit Alarm • {rem.scheduledTime}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-neutral-100">
                        {rem.goalName}
                      </h3>
                      <p className="text-xs text-amber-900/80 dark:text-amber-200/80 font-medium">
                        Time for your habit: {rem.message}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDismissedReminders((prev) => new Set(prev).add(rem.goalId))}
                    className="p-1.5 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 hover:bg-amber-200/50 dark:hover:bg-amber-900/50 rounded-md transition-colors shrink-0"
                    title="Dismiss alarm"
                    aria-label="Dismiss alarm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-amber-200/60 dark:border-amber-900/60">
                  <button
                    type="button"
                    onClick={() => playHabitAlarmSound()}
                    className="flex items-center gap-1 text-[11px] font-medium text-amber-800 dark:text-amber-300 hover:underline"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Play chime</span>
                  </button>

                  {matchingTask && matchingTask.status !== 'completed' && (
                    <button
                      type="button"
                      disabled={pendingGoalIds.has(rem.goalId)}
                      onClick={() => handleToggleComplete(matchingTask)}
                      className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Complete Now</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Today's Tasks List */}
      {derivedTasks.length === 0 ? (
        <div className="text-center py-12 px-4 border border-dashed border-gray-300 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-800/40">
          <p className="text-sm font-medium text-gray-700 dark:text-neutral-300">
            No habits scheduled for today.
          </p>
          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
            Rest day or time to configure active goals.
          </p>
          <Link
            href="/goals"
            className="mt-4 inline-block px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg hover:opacity-90 transition-opacity"
          >
            Manage active goals
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {derivedTasks.map((task) => (
            <TodayTaskItem
              key={task.goal.id}
              task={task}
              onToggleComplete={handleToggleComplete}
              onSkipTask={handleSkipTask}
              loading={pendingGoalIds.has(task.goal.id)}
            />
          ))}
        </div>
      )}

      {/* Proof Submission Modal */}
      {proofModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-gray-200 dark:border-neutral-700 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-neutral-100">
                  Proof Required
                </h3>
                <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                  Enter a link or proof URL for &quot;{proofModalTask.goal.name}&quot;.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProofModalTask(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitProof} className="space-y-4 pt-1">
              <input
                type="url"
                required
                placeholder="https://example.com/proof.jpg"
                value={proofUrlInput}
                onChange={(e) => setProofUrlInput(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProofModalTask(null)}
                  className="min-h-[44px] px-4 py-2 text-xs font-semibold text-gray-700 dark:text-neutral-300 border border-gray-300 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-lg"
                >
                  Submit & Complete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
