'use client';

import { DerivedTodayTask } from '@/lib/types';
import { Check, Flame, FastForward, Link as LinkIcon } from 'lucide-react';

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
    <div
      className={`flex items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-800 border rounded-xl transition-all ${
        isCompleted
          ? 'border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-800/40 opacity-80'
          : isSkipped
          ? 'border-gray-200 dark:border-neutral-800 bg-gray-50/30 dark:bg-neutral-800/20'
          : 'border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600'
      }`}
    >
      <div className="space-y-1.5 min-w-0 flex-1">
        {/* Meta badges line */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono text-gray-500 dark:text-neutral-400 font-medium">
            {task.scheduled_time}
          </span>

          {task.weeklyProgress && (
            <span className="text-[11px] font-medium text-gray-600 dark:text-neutral-300 bg-gray-100 dark:bg-neutral-700/60 px-2 py-0.5 rounded-full">
              {task.weeklyProgress.completed}/{task.weeklyProgress.target} this week
            </span>
          )}

          {task.streak && task.streak > 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/60 px-2 py-0.5 rounded-full">
              <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
              {task.streak}d streak
            </span>
          ) : null}

          {isSkipped && (
            <span className="text-[11px] font-medium text-gray-500 dark:text-neutral-400 bg-gray-100 dark:bg-neutral-700 px-2 py-0.5 rounded-full">
              Skipped
            </span>
          )}

          {task.goal.proof_required && (
            <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/60 px-2 py-0.5 rounded-full">
              Proof required
            </span>
          )}
        </div>

        {/* Goal Name */}
        <div
          className={`text-sm font-semibold tracking-tight transition-colors break-words ${
            isCompleted
              ? 'line-through text-gray-400 dark:text-neutral-500'
              : isSkipped
              ? 'italic text-gray-500 dark:text-neutral-400'
              : 'text-gray-900 dark:text-neutral-100'
          }`}
        >
          {task.goal.name}
        </div>

        {/* Description */}
        {task.goal.description && (
          <p className="text-xs text-gray-500 dark:text-neutral-400 line-clamp-2">
            {task.goal.description}
          </p>
        )}

        {/* Proof URL Link */}
        {task.proof_url && (
          <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 pt-0.5">
            <LinkIcon className="w-3 h-3 shrink-0" />
            <a
              href={task.proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline truncate max-w-xs"
            >
              {task.proof_url}
            </a>
          </div>
        )}

        {/* Consecutive Miss Warning */}
        {task.consecutiveMissMessage && !isCompleted && !isSkipped && (
          <div
            className={`text-xs font-medium px-2.5 py-1 rounded-md border mt-1.5 flex items-center gap-1.5 ${
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

      {/* Action Buttons with 44px minimum touch targets for mobile */}
      <div className="flex items-center gap-1 shrink-0">
        {!isCompleted && (
          <button
            type="button"
            disabled={loading}
            onClick={() => onSkipTask(task)}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors cursor-pointer text-gray-400 hover:text-gray-700 dark:text-neutral-500 dark:hover:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 ${
              isSkipped ? 'bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-neutral-200' : ''
            }`}
            title={isSkipped ? 'Unskip habit' : 'Skip habit'}
            aria-label={isSkipped ? 'Unskip habit' : 'Skip habit'}
          >
            <FastForward className="w-4 h-4 stroke-[1.75]" />
          </button>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={() => onToggleComplete(task)}
          className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors cursor-pointer ${
            isCompleted
              ? 'text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500'
              : 'text-gray-400 border border-gray-300 dark:border-neutral-600 hover:border-gray-400 dark:hover:border-neutral-500 hover:bg-gray-50 dark:hover:bg-neutral-700'
          }`}
          title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
          aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {isCompleted ? (
            <Check className="w-5 h-5 stroke-[2.5]" />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-current" />
          )}
        </button>
      </div>
    </div>
  );
}
