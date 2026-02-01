import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getAllStudents, addStudent, updateStudent, deleteStudent, Student } from '@/lib/database';
import { exportStudentsToExcel } from '@/lib/excelExport';
import { useNavigate } from 'react-router-dom';

const classes = ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
const sections = ['A', 'B', 'C', 'D'];

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    email: '',
    class: '',
    section: '',
  });

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    try {
      const data = await getAllStudents();
      setStudents(data);
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = filterClass === 'all' || student.class === filterClass;
    return matchesSearch && matchesClass;
  });

  const handleOpenDialog = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        class: student.class,
        section: student.section,
      });
    } else {
      setEditingStudent(null);
      setFormData({ studentId: '', name: '', email: '', class: '', section: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, formData);
        toast({ title: 'Student Updated' });
      } else {
        await addStudent({
          ...formData,
          phone: '',
          faceDescriptor: null,
          faceImages: [],
        });
        toast({ title: 'Student Added' });
      }
      await loadStudents();
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save student.', variant: 'destructive' });
    }
  };

  const handleDelete = async (student: Student) => {
    if (!confirm(`Are you sure you want to delete ${student.name}?`)) return;
    try {
      await deleteStudent(student.id);
      await loadStudents();
      toast({ title: 'Student Deleted' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete student.', variant: 'destructive' });
    }
  };

  const handleExport = () => {
    exportStudentsToExcel(filteredStudents, { filename: `students_${new Date().toISOString().split('T')[0]}` });
    toast({ title: 'Export Complete' });
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><p>Loading...</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-muted-foreground">Manage student records</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>Export</Button>
          <Button onClick={() => handleOpenDialog()}>Add Student</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{students.length}</p>
            <p className="text-sm text-muted-foreground">Total Students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-green-600">{students.filter(s => s.faceDescriptor).length}</p>
            <p className="text-sm text-muted-foreground">Face Registered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-yellow-600">{students.filter(s => !s.faceDescriptor).length}</p>
            <p className="text-sm text-muted-foreground">Pending Registration</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <Input
              placeholder="Search by name, ID, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Face Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-mono">{student.studentId}</TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.class}</TableCell>
                    <TableCell>{student.section}</TableCell>
                    <TableCell>
                      {student.faceDescriptor ? (
                        <span className="text-green-600 text-sm">Registered ({student.faceImages.length} samples)</span>
                      ) : (
                        <span className="text-yellow-600 text-sm">Not Registered</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!student.faceDescriptor && (
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/register-face?student=${student.id}`)}>
                            Register
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(student)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(student)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="studentId">Student ID</Label>
                <Input
                  id="studentId"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  placeholder="e.g., STU001"
                  required
                  disabled={!!editingStudent}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="student@school.edu"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="class">Class</Label>
                  <Select value={formData.class} onValueChange={(value) => setFormData({ ...formData, class: value })}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="section">Section</Label>
                  <Select value={formData.section} onValueChange={(value) => setFormData({ ...formData, section: value })}>
                    <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                    <SelectContent>
                      {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingStudent ? 'Save Changes' : 'Add Student'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
