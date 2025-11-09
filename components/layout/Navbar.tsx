'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CheckSquare, Calendar, User, LogOut, Megaphone } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { href: '/announcements', icon: Megaphone, label: 'Announcements' },
    { href: '/calendar', icon: Calendar, label: 'Calendar' },
    { href: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/dashboard" className="flex items-center px-2 text-xl font-bold text-blue-600 dark:text-blue-400">
              Clariti
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="sm:hidden border-t border-gray-200 dark:border-gray-800">
        <div className="grid grid-cols-4 gap-1 p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center p-2 rounded-md transition-colors ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
