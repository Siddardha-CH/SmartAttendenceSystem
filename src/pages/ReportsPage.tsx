import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getAllAttendance, getAllStudents, AttendanceRecord, Student } from '@/lib/database';
import { exportAttendanceToExcel, exportDailyReport } from '@/lib/excelExport';
import { format } from 'date-fns';

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

  const handleExportDaily = () => {
    exportDailyReport(dateFilter, filteredAttendance, students.length);
    toast({ title: 'Report Exported' });
  };

  const handleExportAll = () => {
    exportAttendanceToExcel(attendance, { filename: 'all_attendance_records' });
    toast({ title: 'Export Complete' });
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><p>Loading...</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">View and export attendance reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportDaily}>Export Daily</Button>
          <Button variant="outline" onClick={handleExportAll}>Export All</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{students.length}</p>
            <p className="text-sm text-muted-foreground">Total Students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-green-600">{presentCount}</p>
            <p className="text-sm text-muted-foreground">Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-yellow-600">{lateCount}</p>
            <p className="text-sm text-muted-foreground">Late</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-red-600">{students.length - presentCount - lateCount}</p>
            <p className="text-sm text-muted-foreground">Absent</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Attendance Records</CardTitle>
            <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-auto" />
          </div>
        </CardHeader>
        <CardContent>
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
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No records for this date
                  </TableCell>
                </TableRow>
              ) : (
                filteredAttendance.map(record => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono">{record.studentId}</TableCell>
                    <TableCell className="font-medium">{record.studentName}</TableCell>
                    <TableCell>{record.time}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        record.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {record.status}
                      </span>
                    </TableCell>
                    <TableCell>{record.confidence}%</TableCell>
                    <TableCell>{record.markedBy === 'face-recognition' ? 'Auto' : 'Manual'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
