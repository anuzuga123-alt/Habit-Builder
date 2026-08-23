import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { GoalForm } from '@/components/goal-form';
import { Goal } from '@/lib/types';

interface EditGoalPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditGoalPage({ params }: EditGoalPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: goal } = await supabase
    .from('goals')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!goal) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-neutral-100">
          Edit Goal
        </h1>
        <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
          Update goal details and schedule
        </p>
      </div>

      <GoalForm initialGoal={goal as Goal} userId={user.id} />
    </div>
  );
}
