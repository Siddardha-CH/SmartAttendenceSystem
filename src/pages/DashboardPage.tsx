import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { getAllStudents, getAttendanceByDate, Student, AttendanceRecord } from '@/lib/database';
import { format } from 'date-fns';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const studentsData = await getAllStudents();
        const today = format(new Date(), 'yyyy-MM-dd');
        const attendanceData = await getAttendanceByDate(today);
        setStudents(studentsData);
        setTodayAttendance(attendanceData);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const totalStudents = students.length;
  const presentToday = todayAttendance.filter(a => a.status === 'present').length;
  const lateToday = todayAttendance.filter(a => a.status === 'late').length;
  const absentToday = totalStudents - presentToday - lateToday;
  const registeredFaces = students.filter(s => s.faceDescriptor).length;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <Button onClick={() => navigate('/attendance')}>
          Start Attendance
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalStudents}</p>
            <p className="text-xs text-muted-foreground">Registered in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Present Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{presentToday}</p>
            <p className="text-xs text-muted-foreground">{absentToday} absent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Late Arrivals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{lateToday}</p>
            <p className="text-xs text-muted-foreground">After threshold time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Face Registered</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{registeredFaces}</p>
            <p className="text-xs text-muted-foreground">{totalStudents - registeredFaces} pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Attendance */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          {todayAttendance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No attendance marked today</p>
              <Button variant="link" onClick={() => navigate('/attendance')}>
                Start taking attendance
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {todayAttendance.slice(0, 5).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div>
                    <p className="font-medium">{record.studentName}</p>
                    <p className="text-sm text-muted-foreground">{record.studentId}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      record.status === 'present' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {record.status}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">{record.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => navigate('/students')}>
            Manage Students
          </Button>
          <Button variant="outline" onClick={() => navigate('/register-face')}>
            Register Face
          </Button>
          <Button variant="outline" onClick={() => navigate('/reports')}>
            View Reports
          </Button>
          <Button variant="outline" onClick={() => navigate('/attendance')}>
            Take Attendance
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
