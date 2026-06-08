'use client';

import React, { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useThemeStore } from '../../store/themeStore';
import { useDashboardStore } from '../../store/dashboardStore';
import io from 'socket.io-client';
import { API_URL } from '@/lib/config';
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { isDark, toggleTheme } = useThemeStore();
  const pathname = usePathname();
  const router = useRouter();
  const { activeTab, setActiveTab } = useDashboardStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!(session as any)?.accessToken) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/notifications', {
        headers: { Authorization: `Bearer ${(session as any).accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchNotifications();
    }
  }, [status, session]);

  // Handle auto-collapsing sidebar on mobile
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        if (window.innerWidth < 768) {
          setSidebarOpen(false);
        } else {
          setSidebarOpen(true);
        }
      };

      // Set initial state
      handleResize();

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Real-time Socket.io initialization
  useEffect(() => {
    if (!session?.user || status !== 'authenticated') return;

    const socket = io(`${API_URL}');

    // Join room on connection
    socket.on('connect', () => {
      console.log('[Socket] Connected to backend');
      socket.emit('join', (session.user as any).id);
    });

    // Listen for notification updates
    socket.on('notification', (newNotif) => {
      console.log('[Socket] Real-time notification received:', newNotif);
      setNotifications((prev) => [newNotif, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, [session, status]);

  const handleMarkAsRead = async (id: string) => {
    if (!(session as any)?.accessToken) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${(session as any).accessToken}` },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!(session as any)?.accessToken) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${(session as any).accessToken}` },
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTabClick = (tab: 'recommendations' | 'admin' | 'member') => {
    setActiveTab(tab);
    if (pathname !== '/dashboard') {
      router.push('/dashboard');
    }
    // Auto-close sidebar on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <i className="ti ti-loader animate-spin text-4xl text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      
      {/* Top Header */}
      <header className="h-16 sticky top-0 z-40 glass px-6 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-secondary text-foreground cursor-pointer"
            aria-label="Toggle Sidebar"
          >
            <i className="ti ti-menu-2 text-lg" />
          </button>
          
          <div className="flex items-center gap-2">
            <i className="ti ti-flame text-primary text-xl" />
            <span className="font-bold tracking-tight text-sm md:text-base">I'm On It Bruh</span>
          </div>
        </div>

        <div className="flex items-center gap-4 relative">
          
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotificationPanel(!showNotificationPanel);
                fetchNotifications();
              }}
              className="p-2.5 rounded-full hover:bg-secondary text-foreground cursor-pointer relative"
              aria-label="Notifications"
            >
              <i className="ti ti-bell text-lg" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {showNotificationPanel && (
              <div className="absolute right-0 mt-3 w-80 max-h-96 overflow-y-auto rounded-2xl bg-card border border-border shadow-xl p-4 z-50">
                <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                  <span className="font-bold text-sm">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-primary font-bold hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No notifications yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {notifications.map((n) => (
                      <div
                        key={n._id}
                        onClick={() => handleMarkAsRead(n._id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          n.isRead
                            ? 'border-border bg-card'
                            : 'border-primary/20 bg-primary/5 hover:border-primary/40'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className={`text-xs font-bold ${n.isRead ? 'text-foreground' : 'text-primary'}`}>
                            {n.title}
                          </span>
                          {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">{n.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Theme Toggler */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full hover:bg-secondary text-foreground cursor-pointer"
            aria-label="Toggle theme"
          >
            <i className={`ti ${isDark ? 'ti-sun' : 'ti-moon'} text-lg`} />
          </button>

          {/* User Avatar & Log Out */}
          <div className="flex items-center gap-3 pl-3 border-l border-border">
            <span className="hidden md:inline text-xs font-bold text-foreground">
              {session?.user?.name}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <i className="ti ti-logout text-base" />
              <span className="hidden md:inline">Log out</span>
            </button>
          </div>

        </div>
      </header>

      {/* Sidebar + Main Content Layout */}
      <div className="flex-1 flex relative">
        
        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden transition-all duration-300"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar */}
        {sidebarOpen && (
          <aside className="fixed md:relative top-16 md:top-0 left-0 bottom-0 z-30 w-64 border-r border-border bg-card flex flex-col gap-2 p-4 shrink-0 shadow-xl md:shadow-none transition-all duration-300">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold px-3 py-2">
              Primary Shell
            </div>

            <button
              onClick={() => handleTabClick('recommendations')}
              className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'recommendations' && pathname === '/dashboard'
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <i className="ti ti-apps text-lg" />
              Recommendations
            </button>

            <button
              onClick={() => handleTabClick('admin')}
              className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'admin' && pathname === '/dashboard'
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <i className="ti ti-shield-half text-lg" />
              Admin Hubs
            </button>

            <button
              onClick={() => handleTabClick('member')}
              className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'member' && pathname === '/dashboard'
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <i className="ti ti-users text-lg" />
              Member Hubs
            </button>
          </aside>
        )}

        {/* Content Box */}
        <main className="flex-1 p-6 md:p-8 bg-background relative overflow-y-auto max-w-full">
          {children}
        </main>

      </div>
    </div>
  );
}
