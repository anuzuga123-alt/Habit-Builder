import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { GoalForm } from '@/components/goal-form';

export default async function NewGoalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-neutral-100">
          Create Goal
        </h1>
        <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
          Set up a new recurring habit or target
        </p>
      </div>

      <GoalForm userId={user.id} />
    </div>
  );
}
