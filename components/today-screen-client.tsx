'use client';

import { useState, useEffect, useRef } from 'react';
import { Goal, DailyTask, DerivedTodayTask } from '@/lib/types';
import { deriveDailyTasks, getMissingPastTaskPayloads } from '@/lib/utils/tasks';
import { evaluateGoalReminders, ActiveReminder } from '@/lib/utils/reminders';
import { TodayTaskItem } from '@/components/today-task-item';
import { createClient } from '@/lib/supabase/client';
import { formatDisplayDate } from '@/lib/utils/date';
import Link from 'next/link';
import { Bell, X } from 'lucide-react';

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

  const derivedTasks = deriveDailyTasks(goals, persistedTasks, dateStr);

  const completedCount = derivedTasks.filter((t) => t.status === 'completed').length;
  const totalCount = derivedTasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const saveTaskStatus = async (
    task: DerivedTodayTask,
    newStatus: 'pending' | 'completed' | 'skipped',
    proofUrl?: string | null
  ) => {
    const goalId = task.goal.id;
    setLoadingTaskId(goalId);

    const nowIso = newStatus === 'completed' ? new Date().toISOString() : null;

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
        alert('Failed to update task completion status.');
      } else if (data) {
        setPersistedTasks((prev) => {
          const filtered = prev.filter((t) => t.goal_id !== goalId || t.date !== dateStr);
          return [...filtered, data as DailyTask];
        });
      }
    } catch (err) {
      console.error('Unexpected error toggling task status:', err);
    } finally {
      setLoadingTaskId(null);
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
      {/* Header section */}
      <div className="space-y-1.5">
        <div className="text-xs font-mono font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400">
          TODAY • {formatDisplayDate(dateStr)}
        </div>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-neutral-100">
            Good morning, {displayName}
          </h1>
          <span className="text-xs font-mono text-gray-500 dark:text-neutral-400 font-medium">
            {completedCount} of {totalCount} completed ({progressPercent}%)
          </span>
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

      {/* Active Reminders Banner */}
      {activeReminders.length > 0 && (
        <div className="space-y-2">
          {activeReminders.map((rem) => (
            <div
              key={rem.goalId}
              className="p-3.5 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 rounded-xl flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200"
            >
              <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">{rem.goalName}: </span>
                <span>{rem.message}</span>
              </div>
            </div>
          ))}
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
              loading={loadingTaskId === task.goal.id}
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
