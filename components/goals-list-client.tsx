'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Goal } from '@/lib/types';
import { GoalCard } from '@/components/goal-card';
import { createClient } from '@/lib/supabase/client';
import { Plus } from 'lucide-react';

interface GoalsListClientProps {
  initialGoals: Goal[];
}

export function GoalsListClient({ initialGoals }: GoalsListClientProps) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const supabase = createClient();

  const handleToggleActive = async (goalId: string, currentActive: boolean) => {
    // Optimistic update
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, active: !currentActive } : g))
    );

    const { error } = await supabase
      .from('goals')
      .update({ active: !currentActive })
      .eq('id', goalId);

    if (error) {
      // Revert if error
      setGoals((prev) =>
        prev.map((g) => (g.id === goalId ? { ...g, active: currentActive } : g))
      );
      alert('Failed to update goal state.');
    }
  };

  const activeGoals = goals.filter((g) => g.active);
  const inactiveGoals = goals.filter((g) => !g.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-neutral-100">
            Goals
          </h1>
          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
            Manage your daily habits and schedules
          </p>
        </div>
        <Link
          href="/goals/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Goal</span>
        </Link>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-300 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-800/50">
          <p className="text-sm text-gray-600 dark:text-neutral-400">
            You don&apos;t have any goals yet.
          </p>
          <Link
            href="/goals/new"
            className="mt-3 inline-block text-xs font-medium text-neutral-900 dark:text-neutral-100 underline hover:no-underline"
          >
            Create your first goal
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {activeGoals.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                Active Goals ({activeGoals.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {activeGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </div>
            </div>
          )}

          {inactiveGoals.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-neutral-800">
              <h2 className="text-xs font-semibold text-gray-400 dark:text-neutral-500 uppercase tracking-wider">
                Inactive Goals ({inactiveGoals.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {inactiveGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
