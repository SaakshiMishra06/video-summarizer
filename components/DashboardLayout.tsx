'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Video, 
  User, 
  LogOut, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  Sparkles,
  ChevronDown
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = getSupabaseBrowserClient();
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isThemeDark, setIsThemeDark] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Authenticate session on load
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          router.replace('/login');
          return;
        }
        setUser(user);
      } catch (err) {
        console.error('Auth verification error:', err);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }
    
    checkAuth();
    
    // Subscribe to auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        router.replace('/login');
      } else if (session?.user) {
        setUser(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  // Load and apply theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const shouldBeDark = savedTheme ? savedTheme === 'dark' : systemPrefersDark;
    setIsThemeDark(shouldBeDark);
    
    if (shouldBeDark) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isThemeDark;
    setIsThemeDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    
    if (newTheme) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="relative h-12 w-12 flex items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
          <Sparkles className="h-8 w-8 text-violet-500 animate-spin-slow" />
        </div>
        <p className="text-slate-400 font-outfit text-sm animate-pulse">Sourcing secure session...</p>
      </div>
    );
  }

  if (!user) return null;

  const userAvatarChar = user.email ? user.email.charAt(0).toUpperCase() : 'U';
  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans transition-colors duration-300">
      <div className="bg-mesh"></div>

      {/* 1. Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/5 glass-panel bg-slate-950/40 relative z-30">
        {/* Brand Header */}
        <div className="p-6 border-b border-white/5 flex items-center space-x-3">
          <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 p-2 rounded-xl text-white shadow-lg shadow-violet-500/20">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <span className="font-outfit font-bold text-xl tracking-wider bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            VidBrief AI
          </span>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium',
                  isActive
                    ? 'bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 text-violet-200'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive ? 'text-violet-400' : 'text-slate-400 group-hover:text-slate-200')} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer / Theme switcher */}
        <div className="p-4 border-t border-white/5 space-y-4">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-white/5 text-slate-400 hover:text-slate-200 transition"
          >
            <span className="text-sm font-medium">Theme Mode</span>
            {isThemeDark ? <Moon className="h-4.5 w-4.5 text-violet-400" /> : <Sun className="h-4.5 w-4.5 text-amber-500" />}
          </button>

          <button
            onClick={handleSignOut}
            className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen relative z-10">
        {/* Header Bar */}
        <header className="h-16 border-b border-white/5 bg-slate-950/20 backdrop-blur-md flex items-center justify-between px-6 md:px-8 relative z-20">
          <div className="flex items-center space-x-4 md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-900"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <span className="font-outfit font-bold text-lg tracking-wider bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              VidBrief AI
            </span>
          </div>

          <div className="hidden md:block">
            <h1 className="text-slate-400 font-medium font-outfit text-sm">
              SaaS Engine: <span className="text-violet-400 font-semibold uppercase tracking-wider">Active</span>
            </h1>
          </div>

          {/* Top Right Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center space-x-3 bg-slate-900/60 border border-white/5 pl-2.5 pr-3 py-1.5 rounded-xl hover:bg-slate-900 transition"
            >
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center font-bold text-white shadow-md">
                {userAvatarChar}
              </div>
              <span className="text-sm font-medium max-w-[120px] truncate text-slate-200 hidden sm:block">
                {userName}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsProfileOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/5 glass-panel bg-slate-950 p-2 shadow-2xl z-40 animate-in fade-in slide-in-from-top-3 duration-200">
                  <div className="px-3 py-2.5 border-b border-white/5">
                    <p className="text-sm font-semibold text-slate-200 truncate">{userName}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                  <div className="p-1 space-y-1">
                    <button
                      onClick={toggleTheme}
                      className="w-full flex sm:hidden items-center justify-between px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 rounded-lg transition"
                    >
                      <span>Theme</span>
                      {isThemeDark ? <Moon className="h-4 w-4 text-violet-400" /> : <Sun className="h-4 w-4 text-amber-500" />}
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* 3. Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            ></div>
            <nav className="fixed top-0 bottom-0 left-0 w-64 glass-panel bg-slate-950/95 border-r border-white/5 p-6 space-y-6 z-40 md:hidden animate-in slide-in-from-left duration-300">
              <div className="flex items-center justify-between">
                <span className="font-outfit font-bold text-xl tracking-wider bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  VidBrief AI
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center space-x-3 px-4 py-3 rounded-xl transition group font-medium',
                        isActive
                          ? 'bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 text-violet-200'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                      )}
                    >
                      <Icon className="h-5 w-5 text-violet-400" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="pt-6 border-t border-white/5 space-y-4">
                <button
                  onClick={toggleTheme}
                  className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-slate-200 transition"
                >
                  <span className="text-sm font-medium">Theme Mode</span>
                  {isThemeDark ? <Moon className="h-4.5 w-4.5 text-violet-400" /> : <Sun className="h-4.5 w-4.5 text-amber-500" />}
                </button>

                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </nav>
          </>
        )}

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto px-6 md:px-8 py-8 relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
