'use client';

import { DerivedTodayTask } from '@/lib/types';
import { Check, Circle, Flame, FastForward, Link as LinkIcon } from 'lucide-react';

interface TodayTaskItemProps {
  task: DerivedTodayTask;
  onToggleComplete: (task: DerivedTodayTask) => Promise<void>;
  onSkipTask: (task: DerivedTodayTask) => Promise<void>;
  loading?: boolean;
}

export function TodayTaskItem({ task, onToggleComplete, onSkipTask, loading }: TodayTaskItemProps) {
  const isCompleted = task.status === 'completed';
  const isSkipped = task.status === 'skipped';

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl transition-colors">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-gray-500 dark:text-neutral-400">
            {task.scheduled_time}
          </span>
          {task.weeklyProgress && (
            <span className="text-[11px] font-medium text-gray-500 dark:text-neutral-400 border border-gray-200 dark:border-neutral-700 px-1.5 py-0.5 rounded">
              {task.weeklyProgress.completed} / {task.weeklyProgress.target} this week
            </span>
          )}
          {task.streak && task.streak > 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-1.5 py-0.5 rounded">
              <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
              {task.streak}d streak
            </span>
          ) : null}
          {isSkipped && (
            <span className="text-[11px] font-medium text-gray-500 dark:text-neutral-400 bg-gray-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded">
              Skipped
            </span>
          )}
          {task.goal.proof_required && (
            <span className="text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900">
              Proof required
            </span>
          )}
        </div>
        <div className={`text-sm font-semibold transition-colors ${
          isCompleted ? 'line-through text-gray-400 dark:text-neutral-500' : isSkipped ? 'italic text-gray-500 dark:text-neutral-400' : 'text-gray-900 dark:text-neutral-100'
        }`}>
          {task.goal.name}
        </div>
        {task.goal.description && (
          <div className="text-xs text-gray-500 dark:text-neutral-400">
            {task.goal.description}
          </div>
        )}
        {task.proof_url && (
          <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 pt-0.5">
            <LinkIcon className="w-3 h-3" />
            <a href={task.proof_url} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline truncate max-w-xs">
              {task.proof_url}
            </a>
          </div>
        )}
        {task.consecutiveMissMessage && !isCompleted && !isSkipped && (
          <div
            className={`text-xs font-medium px-2 py-1 rounded border mt-1.5 flex items-center gap-1.5 ${
              (task.consecutiveMisses || 0) >= 3
                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300'
                : (task.consecutiveMisses || 0) === 2
                ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300'
                : 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:border-orange-900 dark:text-orange-300'
            }`}
          >
            <span>{task.consecutiveMissMessage}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {!isCompleted && (
          <button
            type="button"
            disabled={loading}
            onClick={() => onSkipTask(task)}
            className={`p-2 rounded-full transition-colors cursor-pointer text-gray-400 hover:text-gray-700 dark:text-neutral-500 dark:hover:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 ${
              isSkipped ? 'bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-neutral-200' : ''
            }`}
            title={isSkipped ? 'Unskip task' : 'Skip task'}
          >
            <FastForward className="w-4 h-4 stroke-[1.75]" />
          </button>
        )}

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
    </div>
  );
}
