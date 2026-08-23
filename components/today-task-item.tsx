'use client';

import { DerivedTodayTask } from '@/lib/types';
import { Check, Circle } from 'lucide-react';

interface TodayTaskItemProps {
  task: DerivedTodayTask;
  onToggleComplete: (task: DerivedTodayTask) => Promise<void>;
  loading?: boolean;
}

export function TodayTaskItem({ task, onToggleComplete, loading }: TodayTaskItemProps) {
  const isCompleted = task.status === 'completed';

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl transition-colors">
      <div className="space-y-1">
        <div className="text-xs font-mono text-gray-500 dark:text-neutral-400">
          {task.scheduled_time}
        </div>
        <div className={`text-sm font-semibold transition-colors ${
          isCompleted ? 'line-through text-gray-400 dark:text-neutral-500' : 'text-gray-900 dark:text-neutral-100'
        }`}>
          {task.goal.name}
        </div>
        {task.goal.description && (
          <div className="text-xs text-gray-500 dark:text-neutral-400">
            {task.goal.description}
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={() => onToggleComplete(task)}
        className={`p-2 rounded-full transition-colors cursor-pointer ${
          isCompleted
            ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 hover:bg-green-100 dark:hover:bg-green-900/50'
            : 'text-gray-400 hover:text-gray-700 dark:text-neutral-500 dark:hover:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700'
        }`}
        title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {isCompleted ? (
          <Check className="w-5 h-5 stroke-[2.5]" />
        ) : (
          <Circle className="w-5 h-5 stroke-[1.5]" />
        )}
      </button>
    </div>
  );
}
