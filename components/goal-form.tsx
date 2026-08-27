'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Goal, FrequencyOption, DayOfWeek } from '@/lib/types';

interface GoalFormProps {
  initialGoal?: Goal;
  userId: string;
}

const ALL_DAYS: { code: DayOfWeek; label: string }[] = [
  { code: 'mon', label: 'Mon' },
  { code: 'tue', label: 'Tue' },
  { code: 'wed', label: 'Wed' },
  { code: 'thu', label: 'Thu' },
  { code: 'fri', label: 'Fri' },
  { code: 'sat', label: 'Sat' },
  { code: 'sun', label: 'Sun' },
];

export function GoalForm({ initialGoal, userId }: GoalFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialGoal?.name || '');
  const [description, setDescription] = useState(initialGoal?.description || '');
  const [frequency, setFrequency] = useState<FrequencyOption>(initialGoal?.frequency || 'every_day');
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(initialGoal?.selected_days || []);
  const [targetPerWeek, setTargetPerWeek] = useState<number>(initialGoal?.target_per_week || 3);
  const [scheduledTime, setScheduledTime] = useState(initialGoal?.scheduled_time ? initialGoal.scheduled_time.slice(0, 5) : '08:00');
  const [durationTarget, setDurationTarget] = useState(initialGoal?.duration_target || '');
  const [reminderEnabled, setReminderEnabled] = useState(initialGoal?.reminder_enabled || false);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(initialGoal?.reminder_minutes_before || 15);
  const [proofRequired, setProofRequired] = useState(initialGoal?.proof_required || false);
  const [showAdvanced, setShowAdvanced] = useState(Boolean(initialGoal?.description || initialGoal?.duration_target || initialGoal?.proof_required));

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleDay = (day: DayOfWeek) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Goal name is required.');
      return;
    }

    if (frequency === 'selected_days' && selectedDays.length === 0) {
      setError('Please select at least one day for selected days frequency.');
      return;
    }

    setLoading(true);

    const goalData = {
      user_id: userId,
      name: name.trim(),
      description: description.trim() || null,
      frequency,
      selected_days: frequency === 'selected_days' ? selectedDays : [],
      target_per_week: frequency === 'times_per_week' ? targetPerWeek : null,
      scheduled_time: `${scheduledTime}:00`,
      duration_target: durationTarget.trim() || null,
      reminder_enabled: reminderEnabled,
      reminder_minutes_before: Number(reminderMinutesBefore),
      proof_required: proofRequired,
      active: initialGoal ? initialGoal.active : true,
    };

    try {
      const supabase = createClient();
      if (initialGoal) {
        const { error: updateErr } = await supabase
          .from('goals')
          .update(goalData)
          .eq('id', initialGoal.id);

        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('goals')
          .insert(goalData);

        if (insertErr) throw insertErr;
      }

      router.push('/');
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to save goal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {error && (
        <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950/30 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Goal Name */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
          Goal Name *
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Morning Workout"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
        />
      </div>

      {/* Frequency */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
          Frequency *
        </label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as FrequencyOption)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
        >
          <option value="every_day">Every day</option>
          <option value="selected_days">Selected days</option>
          <option value="times_per_week">X times per week</option>
        </select>
      </div>

      {/* Selected Days (if frequency === 'selected_days') */}
      {frequency === 'selected_days' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-2">
            Select Days *
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_DAYS.map((d) => {
              const isSelected = selectedDays.includes(d.code);
              return (
                <button
                  type="button"
                  key={d.code}
                  onClick={() => toggleDay(d.code)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                    isSelected
                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-neutral-900 dark:border-neutral-100'
                      : 'border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Target per week (if frequency === 'times_per_week') */}
      {frequency === 'times_per_week' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
            Times per week
          </label>
          <input
            type="number"
            min={1}
            max={7}
            value={targetPerWeek}
            onChange={(e) => setTargetPerWeek(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
          />
        </div>
      )}

      {/* Scheduled Time */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
          Scheduled Time *
        </label>
        <input
          type="time"
          required
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
        />
      </div>

      {/* Reminder Option */}
      <div className="border-t border-gray-200 dark:border-neutral-800 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-700 dark:text-neutral-300">
            Enable Reminder
          </label>
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
            className="rounded border-gray-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-900 h-4 w-4 cursor-pointer"
          />
        </div>

        {reminderEnabled && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Reminder minutes before
            </label>
            <input
              type="number"
              min={1}
              value={reminderMinutesBefore}
              onChange={(e) => setReminderMinutesBefore(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
            />
          </div>
        )}
      </div>

      {/* Advanced / Optional Fields Toggle */}
      <div className="border-t border-gray-200 dark:border-neutral-800 pt-3">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
        >
          {showAdvanced ? '− Hide optional details' : '+ Show optional details (Description, Target, Proof)'}
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. 30 minutes cardio + stretch"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
                Duration / Target (Optional)
              </label>
              <input
                type="text"
                value={durationTarget}
                onChange={(e) => setDurationTarget(e.target.value)}
                placeholder="e.g. 30 mins or 10 pages"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700 dark:text-neutral-300">
                Require Photo Proof
              </label>
              <input
                type="checkbox"
                checked={proofRequired}
                onChange={(e) => setProofRequired(e.target.checked)}
                className="rounded border-gray-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-900 h-4 w-4 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-neutral-300 border border-gray-300 dark:border-neutral-700 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-xs font-medium text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-md transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : initialGoal ? 'Update Goal' : 'Create Goal'}
        </button>
      </div>
    </form>
  );
}
