'use client';

import { Goal } from '@/lib/types';
import Link from 'next/link';
import { formatShortTime } from '@/lib/utils/date';
import { Edit2, Power, Trash2 } from 'lucide-react';

interface GoalCardProps {
  goal: Goal;
  onToggleActive: (goalId: string, currentActive: boolean) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
}

export function GoalCard({ goal, onToggleActive, onDeleteGoal }: GoalCardProps) {
  const getFrequencyLabel = () => {
    switch (goal.frequency) {
      case 'every_day':
        return 'Every day';
      case 'selected_days':
        return goal.selected_days && goal.selected_days.length > 0
          ? goal.selected_days.map((d) => d.toUpperCase()).join(', ')
          : 'Selected days';
      case 'times_per_week':
        return `${goal.target_per_week || 1} times / week`;
      default:
        return goal.frequency;
    }
  };

  return (
    <div
      className={`p-4 rounded-xl border transition-colors ${
        goal.active
          ? 'bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700'
          : 'bg-gray-50 dark:bg-neutral-900/50 border-gray-200 dark:border-neutral-800 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-neutral-100">
              {goal.name}
            </h3>
            {!goal.active && (
              <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-neutral-300 rounded">
                Inactive
              </span>
            )}
          </div>
          {goal.description && (
            <p className="text-xs text-gray-500 dark:text-neutral-400">
              {goal.description}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <Link
            href={`/goals/${goal.id}`}
            className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-neutral-100 rounded hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
            title="Edit Goal"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => onToggleActive(goal.id, goal.active)}
            className={`p-1.5 rounded transition-colors ${
              goal.active
                ? 'text-gray-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                : 'text-gray-400 hover:text-green-600 dark:text-neutral-500 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30'
            }`}
            title={goal.active ? 'Deactivate Goal' : 'Activate Goal'}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (confirm(`Are you sure you want to delete "${goal.name}"?`)) {
                onDeleteGoal(goal.id);
              }
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 dark:text-neutral-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
            title="Delete Goal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-neutral-400 pt-2 border-t border-gray-100 dark:border-neutral-700/50">
        <span className="font-mono">{formatShortTime(goal.scheduled_time)}</span>
        <span>{getFrequencyLabel()}</span>
      </div>
    </div>
  );
}
