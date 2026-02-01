import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User, getAllUsers, addUser, updateUser, deleteUser } from '@/lib/database';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'teacher' as 'admin' | 'teacher' | 'viewer',
  });
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      toast({ title: 'Error loading users', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setSelectedUser(user);
      setFormData({ name: user.name, email: user.email, password: '', role: user.role });
    } else {
      setSelectedUser(null);
      setFormData({ name: '', email: '', password: '', role: 'teacher' });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    if (!selectedUser && !formData.password) {
      toast({ title: 'Password is required for new users', variant: 'destructive' });
      return;
    }

    try {
      if (selectedUser) {
        const updates: Partial<User> = { name: formData.name, email: formData.email, role: formData.role };
        if (formData.password) updates.password = formData.password;
        await updateUser(selectedUser.id, updates);
        toast({ title: 'User updated' });
      } else {
        await addUser({ name: formData.name, email: formData.email, password: formData.password, role: formData.role, status: 'active' });
        toast({ title: 'User added' });
      }
      setIsDialogOpen(false);
      loadUsers();
    } catch (error: any) {
      toast({ title: error.message || 'Failed to save user', variant: 'destructive' });
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await updateUser(user.id, { status: user.status === 'active' ? 'disabled' : 'active' });
      toast({ title: `User ${user.status === 'active' ? 'disabled' : 'enabled'}` });
      loadUsers();
    } catch (error) {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    if (selectedUser.id === currentUser?.id) {
      toast({ title: 'Cannot delete your own account', variant: 'destructive' });
      return;
    }
    try {
      await deleteUser(selectedUser.id);
      toast({ title: 'User deleted' });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      toast({ title: 'Failed to delete user', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><p>Loading...</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage system users and access levels</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>Add User</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="capitalize">{user.role}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.status}
                    </span>
                  </TableCell>
                  <TableCell>{user.lastLogin ? format(new Date(user.lastLogin), 'MMM d, yyyy HH:mm') : 'Never'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(user)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(user)} disabled={user.id === currentUser?.id}>
                        {user.status === 'active' ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => { setSelectedUser(user); setIsDeleteDialogOpen(true); }}
                        disabled={user.id === currentUser?.id}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedUser ? 'Edit User' : 'Add New User'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john@school.edu" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password {selectedUser ? '(leave blank to keep current)' : '*'}</Label>
              <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value: 'admin' | 'teacher' | 'viewer') => setFormData({ ...formData, role: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Full access</SelectItem>
                  <SelectItem value="teacher">Faculty - Take attendance & reports</SelectItem>
                  <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{selectedUser ? 'Update' : 'Create'} User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedUser?.name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
