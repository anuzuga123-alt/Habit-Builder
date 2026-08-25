'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CheckSquare, Target, User, LogOut } from 'lucide-react';

interface NavbarProps {
  displayName?: string | null;
}

export function Navbar({ displayName }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { name: 'Today', href: '/', icon: CheckSquare },
    { name: 'Goals', href: '/goals', icon: Target },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <header className="bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <div className="flex items-center space-x-6">
          <Link href="/" className="font-semibold text-gray-900 dark:text-neutral-100 text-base">
            Focus
          </Link>
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-neutral-100'
                      : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          {displayName && (
            <span className="text-xs text-gray-500 dark:text-neutral-400 hidden sm:inline-block">
              {displayName}
            </span>
          )}
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
