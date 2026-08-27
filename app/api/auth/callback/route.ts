import { createClient } from '@/lib/supabase/server';
import { getURL } from '@/lib/utils/url';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/';

  // Prevent open redirect vulnerabilities: only allow safe internal relative paths
  const safeNext = rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('\\')
    ? rawNext
    : '/';

  const baseUrl = getURL();

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const redirectUrl = safeNext === '/' ? baseUrl : `${baseUrl}${safeNext}`;
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.redirect(`${baseUrl}/login?error=Could%20not%20authenticate`);
}
