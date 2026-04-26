import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { PaginatedResponse, User } from '@/types';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search,  
  Edit,
  Trash2,
  UserCog,
  Filter,
  Loader2
} from 'lucide-react';

const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-800',
  vet_clinic: 'bg-green-100 text-green-800',
  owner: 'bg-gray-100 text-gray-800',
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'owner' as User['role'],
    phone: '',
    address: '',
  });

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.getUsers({ role: roleFilter !== 'all' ? roleFilter : undefined });
      // Laravel returns a paginated object
      setUsers(Array.isArray(response) ? response : (response as PaginatedResponse<User>).data); 
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'owner',
      phone: '',
      address: '',
    });
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingUser) {
        const updateData: Record<string, string> = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          phone: formData.phone,
          address: formData.address,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await api.updateUser(editingUser.id, updateData);
        toast({
          title: 'User Updated',
          description: 'User profile has been updated in MySQL.',
        });
      } else {
        if (!formData.password) {
          toast({
            title: 'Password Required',
            description: 'Please set a password for the new user.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
        await api.createUser(formData);
        toast({
          title: 'User Created',
          description: 'New user has been added to database.',
        });
      }

      await loadUsers();
      setIsDialogOpen(false);
      resetForm();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save user.';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      phone: user.phone || '',
      address: user.address || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (user: User) => {
    if (user.id === currentUser?.id) {
      toast({
        title: 'Cannot Delete',
        description: 'You cannot delete your own account.',
        variant: 'destructive',
      });
      return;
    }
    
    if (confirm(`Are you sure you want to delete ${user.name}?`)) {
      try {
        await api.deleteUser(user.id);
        toast({
          title: 'User Deleted',
          description: `${user.name} has been removed from database.`,
          variant: 'destructive',
        });
        void loadUsers();
      } catch (error) {
        toast({ title: 'Delete Failed', variant: 'destructive' });
      }
    }
  };

  const filteredUsers = users.filter((listedUser) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      listedUser.name.toLowerCase().includes(search) ||
      listedUser.email.toLowerCase().includes(search);
    const matchesRole = roleFilter === 'all' || listedUser.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const { paginatedData, currentPage, totalPages, nextPage, prevPage } = usePagination(filteredUsers, 10);

  if (isLoading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
        <p className="mt-4 text-muted-foreground">Loading Users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-tour="users-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage system users and roles in MySQL database</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
              <DialogDescription>
                {editingUser ? 'Update user information' : 'Create a new user account'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>{editingUser ? 'New Password (leave blank to keep current)' : 'Password *'}</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? 'Leave blank to keep current' : 'Enter password'}
                    required={!editingUser}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value as User['role'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">System Administrator</SelectItem>
                      <SelectItem value="vet_clinic">Vet Clinic</SelectItem>
                      <SelectItem value="owner">Pet Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+63 917 123 4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="City, Province"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (editingUser ? 'Update User' : 'Add User')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={(val) => {
               setRoleFilter(val);
            }}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">System Administrator</SelectItem>
                <SelectItem value="vet_clinic">Vet Clinic</SelectItem>
                <SelectItem value="owner">Pet Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {(isLoading || filteredUsers.length === 0) ? (
            <div className="py-16 text-center">
              {isLoading ? (
                <Loader2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground animate-spin opacity-50" />
              ) : (
                <UserCog className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              )}
              <h3 className="text-lg font-semibold mb-2">
                {isLoading ? 'Loading Users...' : 'No users found'}
              </h3>
              <p className="text-muted-foreground">
                {!isLoading && (searchTerm || roleFilter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Add your first user to get started')}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={ROLE_COLORS[user.role as keyof typeof ROLE_COLORS]}>
                        {user.role === 'vet_clinic' ? 'Vet Clinic' :
                         user.role === 'admin' ? 'System Administrator' : 'Pet Owner'}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.phone || '-'}</TableCell>
                    <TableCell>{user.address || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(user)}
                          disabled={user.id === currentUser?.id}
                          className="text-destructive hover:text-destructive disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isLoading && filteredUsers.length > 0 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onNext={nextPage}
              onPrev={prevPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
