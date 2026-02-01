import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireAttendance?: boolean;
}

export function ProtectedRoute({ children, requireAdmin, requireAttendance }: ProtectedRouteProps) {
  const { user, isLoading, isAdmin, canTakeAttendance } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireAttendance && !canTakeAttendance) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requireAdmin>{children}</ProtectedRoute>;
}

export function AttendanceRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requireAttendance>{children}</ProtectedRoute>;
}
