import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getAllAttendance, getAllStudents, AttendanceRecord, Student } from '@/lib/database';
import { exportAttendanceToExcel, exportDailyReport } from '@/lib/excelExport';
import { format } from 'date-fns';
import { FileDown, Calendar, Users, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

export default function ReportsPage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
      const [attendanceData, studentsData] = await Promise.all([
        getAllAttendance(),
        getAllStudents(),
      ]);
      setAttendance(attendanceData);
      setStudents(studentsData);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const filteredAttendance = attendance.filter(r => r.date === dateFilter);
  const presentCount = filteredAttendance.filter(r => r.status === 'present').length;
  const lateCount = filteredAttendance.filter(r => r.status === 'late').length;
  const absentCount = students.length - presentCount - lateCount;

  const handleExportDaily = () => {
    exportDailyReport(dateFilter, filteredAttendance, students.length);
    toast({ title: 'Daily Report Exported' });
  };

  const handleExportAll = () => {
    exportAttendanceToExcel(attendance, { filename: 'all_attendance_records' });
    toast({ title: 'Full Export Complete' });
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-muted-foreground"><p>Loading reports...</p></div>;
  }

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">Attendance analytics and exports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportDaily}>
            <FileDown className="mr-2 h-4 w-4" /> Daily Report
          </Button>
          <Button variant="outline" onClick={handleExportAll}>
            <FileDown className="mr-2 h-4 w-4" /> Export All
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{presentCount}</div>
            <p className="text-xs text-muted-foreground">On time attendance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lateCount}</div>
            <p className="text-xs text-muted-foreground">Checked in after threshold</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{absentCount > 0 ? absentCount : 0}</div>
            <p className="text-xs text-muted-foreground">Not checked in yet</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>Attendance Log</CardTitle>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-auto"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Marked By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No attendance records found for this date
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAttendance.map(record => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono">{record.studentId}</TableCell>
                      <TableCell className="font-medium">{record.studentName}</TableCell>
                      <TableCell>{record.time}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${record.status === 'present'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                          }`}>
                          {record.status === 'present' ? 'Present' : 'Late'}
                        </span>
                      </TableCell>
                      <TableCell>{record.confidence ? `${Math.round(record.confidence)}%` : '-'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {record.markedBy === 'face-recognition' ? 'Auto' : 'Manual'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
