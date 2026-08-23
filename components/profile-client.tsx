'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/types';

interface ProfileClientProps {
  profile: Profile;
  email: string;
}

export function ProfileClient({ profile, email }: ProfileClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [timezone, setTimezone] = useState(profile.timezone || 'UTC');
  const [coachingStyle, setCoachingStyle] = useState(profile.coaching_style || 'balanced');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          timezone: timezone.trim(),
          coaching_style: coachingStyle,
        })
        .eq('id', profile.id);

      if (error) {
        throw error;
      }

      setMessage({ type: 'success', text: 'Profile updated successfully.' });
      router.refresh();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setMessage({ type: 'error', text: errorObj.message || 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-neutral-100">
          Profile Settings
        </h1>
        <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
          Manage your account details and coaching preferences
        </p>
      </div>

      {message && (
        <div
          className={`p-3 text-xs rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400'
              : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
            Email
          </label>
          <input
            type="email"
            disabled
            value={email}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-800 rounded-md bg-gray-100 dark:bg-neutral-900/50 text-gray-500 dark:text-neutral-500 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
            Display Name
          </label>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
            Timezone
          </label>
          <input
            type="text"
            required
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="e.g. America/New_York"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
          />
          <p className="mt-1 text-[11px] text-gray-500 dark:text-neutral-400">
            Timezone is used to trigger daily task schedules and reminders in your local time.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
            Coaching Style
          </label>
          <select
            value={coachingStyle}
            onChange={(e) => setCoachingStyle(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
          >
            <option value="supportive">Supportive & Encouraging</option>
            <option value="balanced">Balanced & Practical</option>
            <option value="direct">Direct & Uncompromising</option>
          </select>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
