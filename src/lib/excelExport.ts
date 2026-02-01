import * as XLSX from 'xlsx';
import { AttendanceRecord, Student } from './database';

export interface ExportOptions {
  filename: string;
  sheetName?: string;
}

export function exportAttendanceToExcel(
  records: AttendanceRecord[],
  options: ExportOptions
): void {
  const data = records.map((record) => ({
    'Student ID': record.studentId,
    'Student Name': record.studentName,
    'Date': record.date,
    'Time': record.time,
    'Status': record.status.charAt(0).toUpperCase() + record.status.slice(1),
    'Confidence': `${record.confidence}%`,
    'Marked By': record.markedBy === 'face-recognition' ? 'Auto (Face Recognition)' : 'Manual',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  
  // Auto-size columns
  const maxWidths = Object.keys(data[0] || {}).map((key) => {
    const maxContent = Math.max(
      key.length,
      ...data.map((row) => String(row[key as keyof typeof row]).length)
    );
    return { wch: maxContent + 2 };
  });
  worksheet['!cols'] = maxWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || 'Attendance');
  XLSX.writeFile(workbook, `${options.filename}.xlsx`);
}

export function exportStudentsToExcel(
  students: Student[],
  options: ExportOptions
): void {
  const data = students.map((student) => ({
    'Student ID': student.studentId,
    'Name': student.name,
    'Email': student.email,
    'Class': student.class,
    'Section': student.section,
    'Face Registered': student.faceDescriptor ? 'Yes' : 'No',
    'Images Count': student.faceImages.length,
    'Registered On': new Date(student.createdAt).toLocaleDateString(),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  const maxWidths = Object.keys(data[0] || {}).map((key) => {
    const maxContent = Math.max(
      key.length,
      ...data.map((row) => String(row[key as keyof typeof row]).length)
    );
    return { wch: maxContent + 2 };
  });
  worksheet['!cols'] = maxWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || 'Students');
  XLSX.writeFile(workbook, `${options.filename}.xlsx`);
}

export function exportDailyReport(
  date: string,
  records: AttendanceRecord[],
  totalStudents: number
): void {
  const presentCount = records.filter((r) => r.status === 'present').length;
  const lateCount = records.filter((r) => r.status === 'late').length;
  const absentCount = totalStudents - presentCount - lateCount;

  const summaryData = [
    { Metric: 'Date', Value: date },
    { Metric: 'Total Students', Value: totalStudents },
    { Metric: 'Present', Value: presentCount },
    { Metric: 'Late', Value: lateCount },
    { Metric: 'Absent', Value: absentCount },
    { Metric: 'Attendance Rate', Value: `${Math.round((presentCount / totalStudents) * 100)}%` },
  ];

  const attendanceData = records.map((record) => ({
    'Student ID': record.studentId,
    'Student Name': record.studentName,
    'Time': record.time,
    'Status': record.status.charAt(0).toUpperCase() + record.status.slice(1),
    'Confidence': `${record.confidence}%`,
  }));

  const workbook = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  const attendanceSheet = XLSX.utils.json_to_sheet(attendanceData);
  XLSX.utils.book_append_sheet(workbook, attendanceSheet, 'Attendance');

  XLSX.writeFile(workbook, `attendance_report_${date}.xlsx`);
}
