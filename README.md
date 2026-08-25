# Habit-Builder

A habit and goal tracking web application built with Next.js (App Router), TypeScript, Tailwind CSS, and Supabase.

## Features

- **Auth & Profiles**: Supabase Authentication with user timezone support.
- **Goal & Habit Management**: Flexible target frequencies (`every_day`, `selected_days`, `times_per_week`), customizable scheduled times, and completion proof requirements.
- **Daily Dashboard**: Date-filtered habit checklist, status toggling (complete/skip/pending), and streak tracking.
- **Reminders & Missed Days**: Automated missed-day backfilling and reminder evaluations logged to database.

## Environment Variables

Copy `.env.example` to `.env.local` and configure the required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
CRON_SECRET=your-vercel-cron-secret # Optional: Secures /api/reminders/check endpoint
```

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase public anonymous API key.
- `CRON_SECRET`: Optional authorization secret used by Vercel Cron to invoke `/api/reminders/check`.

## Database Setup

1. Create a new project in [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase project dashboard.
3. Paste the contents of `supabase/schema.sql` and execute the SQL query to create tables (`profiles`, `goals`, `daily_tasks`, `reminder_logs`), triggers, functions, indexes, and Row Level Security (RLS) policies.

## Local Development

Install dependencies:
```bash
npm install
```

Run the development server:
```bash
npm run dev
```

Run TypeScript type-checking and linting:
```bash
npx tsc --noEmit
npm run lint
```

Build for production:
```bash
npm run build
```

## Deployment on Vercel

1. Connect your repository to [Vercel](https://vercel.com).
2. Configure Environment Variables in project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `CRON_SECRET`
3. Deploy the project. Vercel will automatically read `vercel.json` and configure Vercel Cron for `/api/reminders/check`.
