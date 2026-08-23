import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileClient } from '@/components/profile-client';
import { Profile } from '@/lib/types';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    // Fallback profile object if trigger hasn't completed yet
    profile = {
      id: user.id,
      display_name: user.email?.split('@')[0] || 'User',
      avatar_url: null,
      timezone: 'UTC',
      coaching_style: 'balanced',
      notification_preferences: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return <ProfileClient profile={profile as Profile} email={user.email || ''} />;
}
