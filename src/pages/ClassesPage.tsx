import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ClassEntity, Institute, getClasses, addClass, updateClass, deleteClass, getInstitutes } from '@/lib/database';
import { format } from 'date-fns';
import { Plus, MoreHorizontal, BookOpen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassEntity | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    instituteId: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [classesData, institutesData] = await Promise.all([
        getClasses(),
        getInstitutes()
      ]);
      setClasses(classesData);
      setInstitutes(institutesData);
    } catch (error) {
      toast({ title: 'Error loading data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const getInstituteName = (id: string) => {
    const inst = institutes.find(i => i.id === id);
    return inst ? inst.name : 'Unknown Institute';
  };

  const handleOpenDialog = (classEntity?: ClassEntity) => {
    if (classEntity) {
      setSelectedClass(classEntity);
      setFormData({ name: classEntity.name, instituteId: classEntity.instituteId });
    } else {
      setSelectedClass(null);
      setFormData({ name: '', instituteId: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.instituteId) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    try {
      if (selectedClass) {
        await updateClass(selectedClass.id, formData);
        toast({ title: 'Class updated successfully' });
      } else {
        await addClass(formData);
        toast({ title: 'Class created successfully' });
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({ title: error.message || 'Failed to save class', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!selectedClass) return;
    try {
      await deleteClass(selectedClass.id);
      toast({ title: 'Class deleted' });
      setIsDeleteDialogOpen(false);
      setSelectedClass(null);
      loadData();
    } catch (error) {
      toast({ title: 'Failed to delete class', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-muted-foreground"><p>Loading classes...</p></div>;
  }

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
          <p className="text-muted-foreground mt-1">Manage classes and their institutes</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Add Class
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Classes</CardTitle>
          <CardDescription>
            A list of all classes in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead>Institute</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((classEntity) => (
                  <TableRow key={classEntity.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="font-medium">{classEntity.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getInstituteName(classEntity.instituteId)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {classEntity.createdAt ? format(new Date(classEntity.createdAt), 'MMM d, yyyy') : 'Unknown'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleOpenDialog(classEntity)}>
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => { setSelectedClass(classEntity); setIsDeleteDialogOpen(true); }}
                          >
                            Delete Class
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {classes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No classes found. Add one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedClass ? 'Edit Class' : 'Add New Class'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Class Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex. 10th Grade - A"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="institute">Institute</Label>
              <Select value={formData.instituteId} onValueChange={(value) => setFormData({ ...formData, instituteId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an institute" />
                </SelectTrigger>
                <SelectContent>
                  {institutes.map(inst => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{selectedClass ? 'Save Changes' : 'Create Class'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the class <span className="font-medium text-foreground">{selectedClass?.name}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete Class</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
