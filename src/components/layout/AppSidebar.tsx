import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, CalendarCheck, Users, ScanFace, FileText, UserCog, Settings, LogOut } from 'lucide-react';

const mainNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Attendance', href: '/attendance', requireAttendance: true, icon: CalendarCheck },
  { name: 'Students', href: '/students', requireAttendance: true, icon: Users },
  { name: 'Register Face', href: '/register-face', requireAttendance: true, icon: ScanFace },
  { name: 'Reports', href: '/reports', icon: FileText },
];

const adminNavigation = [
  { name: 'Users', href: '/users', icon: UserCog },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function AppSidebar() {
  const { user, logout, isAdmin, canTakeAttendance } = useAuth();
  const location = useLocation();

  const filteredMainNav = mainNavigation.filter((item) => {
    if (item.requireAttendance && !canTakeAttendance) return false;
    return true;
  });

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card text-card-foreground">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b">
        <span className="font-bold text-lg">SmartAttend</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Menu</div>
        {filteredMainNav.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </NavLink>
          );
        })}

        {isAdmin && (
          <>
            <div className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin</div>
            {adminNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </NavLink>
              );
            })}
          </>
        )}
      </nav>

      {/* User Info */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
