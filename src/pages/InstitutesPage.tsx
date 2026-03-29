import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Institute, getInstitutes, addInstitute, updateInstitute, deleteInstitute } from '@/lib/database';
import { format } from 'date-fns';
import { Plus, MoreHorizontal, Building2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function InstitutesPage() {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedInstitute, setSelectedInstitute] = useState<Institute | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadInstitutes();
  }, []);

  const loadInstitutes = async () => {
    try {
      const data = await getInstitutes();
      setInstitutes(data);
    } catch (error) {
      toast({ title: 'Error loading institutes', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (institute?: Institute) => {
    if (institute) {
      setSelectedInstitute(institute);
      setFormData({ name: institute.name, address: institute.address });
    } else {
      setSelectedInstitute(null);
      setFormData({ name: '', address: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.address) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    try {
      if (selectedInstitute) {
        await updateInstitute(selectedInstitute.id, formData);
        toast({ title: 'Institute updated successfully' });
      } else {
        await addInstitute(formData);
        toast({ title: 'Institute created successfully' });
      }
      setIsDialogOpen(false);
      loadInstitutes();
    } catch (error: any) {
      toast({ title: error.message || 'Failed to save institute', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!selectedInstitute) return;
    try {
      await deleteInstitute(selectedInstitute.id);
      toast({ title: 'Institute deleted' });
      setIsDeleteDialogOpen(false);
      setSelectedInstitute(null);
      loadInstitutes();
    } catch (error) {
      toast({ title: 'Failed to delete institute', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-muted-foreground"><p>Loading institutes...</p></div>;
  }

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Institutes</h1>
          <p className="text-muted-foreground mt-1">Manage educational institutes</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Add Institute
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Institutes</CardTitle>
          <CardDescription>
            A list of all institutes managed by the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {institutes.map((institute) => (
                  <TableRow key={institute.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="font-medium">{institute.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>{institute.address}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {institute.createdAt ? format(new Date(institute.createdAt), 'MMM d, yyyy') : 'Unknown'}
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
                          <DropdownMenuItem onClick={() => handleOpenDialog(institute)}>
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => { setSelectedInstitute(institute); setIsDeleteDialogOpen(true); }}
                          >
                            Delete Institute
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {institutes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No institutes found. Add one to get started.
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
            <DialogTitle>{selectedInstitute ? 'Edit Institute' : 'Add New Institute'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Institute Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex. Global Tech Institute"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Ex. 123 Education Blvd"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{selectedInstitute ? 'Save Changes' : 'Create Institute'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Institute?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the institute <span className="font-medium text-foreground">{selectedInstitute?.name}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete Institute</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
