'use client';

import { useState } from 'react';
import { Goal, DailyTask, DerivedTodayTask } from '@/lib/types';
import { deriveDailyTasks } from '@/lib/utils/tasks';
import { TodayTaskItem } from '@/components/today-task-item';
import { createClient } from '@/lib/supabase/client';
import { formatDisplayDate } from '@/lib/utils/date';
import Link from 'next/link';

interface TodayScreenClientProps {
  goals: Goal[];
  initialPersistedTasks: DailyTask[];
  dateStr: string;
  displayName: string;
  userId: string;
}

export function TodayScreenClient({
  goals,
  initialPersistedTasks,
  dateStr,
  displayName,
  userId,
}: TodayScreenClientProps) {
  const [persistedTasks, setPersistedTasks] = useState<DailyTask[]>(initialPersistedTasks);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const supabase = createClient();

  const derivedTasks = deriveDailyTasks(goals, persistedTasks, dateStr);

  const completedCount = derivedTasks.filter((t) => t.status === 'completed').length;
  const totalCount = derivedTasks.length;

  const handleToggleComplete = async (task: DerivedTodayTask) => {
    const goalId = task.goal.id;
    setLoadingTaskId(goalId);

    const isCurrentlyCompleted = task.status === 'completed';
    const newStatus = isCurrentlyCompleted ? 'pending' : 'completed';
    const nowIso = isCurrentlyCompleted ? null : new Date().toISOString();

    try {
      const payload = {
        user_id: userId,
        goal_id: goalId,
        date: dateStr,
        scheduled_time: task.goal.scheduled_time,
        status: newStatus,
        completed_at: nowIso,
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

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400">
          TODAY • {formatDisplayDate(dateStr)}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-neutral-100">
          Good morning, {displayName}
        </h1>
        <p className="text-sm font-medium text-gray-600 dark:text-neutral-400 pt-1">
          {completedCount} / {totalCount} completed
        </p>
      </div>

      {/* Today's Tasks List */}
      {derivedTasks.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-300 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-800/50">
          <p className="text-sm text-gray-600 dark:text-neutral-400">
            No habits scheduled for today.
          </p>
          <Link
            href="/goals"
            className="mt-3 inline-block text-xs font-medium text-neutral-900 dark:text-neutral-100 underline hover:no-underline"
          >
            Manage active goals
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {derivedTasks.map((task) => (
            <TodayTaskItem
              key={task.goal.id}
              task={task}
              onToggleComplete={handleToggleComplete}
              loading={loadingTaskId === task.goal.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
