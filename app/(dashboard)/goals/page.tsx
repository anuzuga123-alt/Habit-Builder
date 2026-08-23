import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { GoalsListClient } from '@/components/goals-list-client';
import { Goal } from '@/lib/types';

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: goals, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching goals:', error);
  }

  return <GoalsListClient initialGoals={(goals as Goal[]) || []} />;
}
