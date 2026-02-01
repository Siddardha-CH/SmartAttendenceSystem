import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const mainNavigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Attendance', href: '/attendance', requireAttendance: true },
  { name: 'Students', href: '/students', requireAttendance: true },
  { name: 'Register Face', href: '/register-face', requireAttendance: true },
  { name: 'Reports', href: '/reports' },
];

const adminNavigation = [
  { name: 'Users', href: '/users' },
  { name: 'Settings', href: '/settings' },
];

export function AppSidebar() {
  const { user, logout, isAdmin, canTakeAttendance } = useAuth();
  const location = useLocation();

  const filteredMainNav = mainNavigation.filter((item) => {
    if (item.requireAttendance && !canTakeAttendance) return false;
    return true;
  });

  return (
    <aside className="flex h-screen w-56 flex-col bg-sidebar-background text-sidebar-foreground">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
        <span className="font-semibold">AttendanceAI</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="mb-2 px-2 text-xs uppercase tracking-wider text-sidebar-muted">Menu</div>
        {filteredMainNav.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                'block rounded px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50'
              )}
            >
              {item.name}
            </NavLink>
          );
        })}

        {isAdmin && (
          <>
            <div className="mb-2 mt-4 px-2 text-xs uppercase tracking-wider text-sidebar-muted">Admin</div>
            {adminNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'block rounded px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50'
                  )}
                >
                  {item.name}
                </NavLink>
              );
            })}
          </>
        )}
      </nav>

      {/* User Info */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="mb-2 px-2 py-1 text-sm">
          <p className="truncate font-medium">{user?.name}</p>
          <p className="text-xs text-sidebar-muted capitalize">{user?.role}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
          onClick={logout}
        >
          Logout
        </Button>
      </div>
    </aside>
  );
}
