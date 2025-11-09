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
    <nav className="bg-gradient-to-r from-cream-white to-sage-gray/10 backdrop-blur-sm border-b-2 border-moss-green/20 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/dashboard" className="flex items-center px-2 text-2xl font-bold font-serif text-forest-green hover:text-moss-green transition-colors duration-300">
              🌿 Clariti
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
                      isActive
                        ? 'text-cream-white bg-gradient-to-br from-forest-green to-moss-green shadow-md shadow-forest-green/30 transform scale-105'
                        : 'text-bark-brown hover:text-forest-green hover:bg-sage-gray/20 hover:shadow-sm'
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
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-bark-brown hover:text-sunset-coral rounded-full hover:bg-sage-gray/20 transition-all duration-300 hover:shadow-sm"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="sm:hidden border-t border-moss-green/20 bg-cream-white/50">
        <div className="grid grid-cols-4 gap-1 p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'text-cream-white bg-gradient-to-br from-forest-green to-moss-green shadow-md'
                    : 'text-bark-brown hover:text-forest-green hover:bg-sage-gray/20'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
