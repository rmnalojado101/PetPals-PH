import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  vaccinationsStorage, 
  petsStorage, 
  usersStorage 
} from '@/lib/storage';
import type { Vaccination } from '@/types';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search,  
  Edit,
  Trash2,
  Syringe,
  AlertTriangle
} from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';

const COMMON_VACCINES = [
  'Rabies',
  '5-in-1 (DHPP)',
  'Bordetella',
  'Leptospirosis',
  'Lyme Disease',
  'Canine Influenza',
  'FVRCP (Cats)',
  'FeLV (Cats)',
  'Other',
];

export default function VaccinationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVax, setEditingVax] = useState<Vaccination | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    petId: '',
    name: '',
    customName: '',
    dateAdministered: format(new Date(), 'yyyy-MM-dd'),
    nextDueDate: '',
    batchNumber: '',
    notes: '',
  });

  useEffect(() => {
    loadVaccinations();
  }, [user]);

  const loadVaccinations = () => {
    if (!user) return;
    
    let data: Vaccination[];
    if (user.role === 'owner') {
      const myPets = petsStorage.getByOwner(user.id);
      data = myPets.flatMap(pet => vaccinationsStorage.getByPet(pet.id));
    } else {
      data = vaccinationsStorage.getAll();
    }
    
    data.sort((a, b) => new Date(b.dateAdministered).getTime() - new Date(a.dateAdministered).getTime());
    setVaccinations(data);
  };

  const resetForm = () => {
    setFormData({
      petId: '',
      name: '',
      customName: '',
      dateAdministered: format(new Date(), 'yyyy-MM-dd'),
      nextDueDate: '',
      batchNumber: '',
      notes: '',
    });
    setEditingVax(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const vaccineName = formData.name === 'Other' ? formData.customName : formData.name;
    
    if (!formData.petId || !vaccineName) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const vaxData = {
      petId: formData.petId,
      name: vaccineName,
      dateAdministered: formData.dateAdministered,
      nextDueDate: formData.nextDueDate || undefined,
      administeredBy: user?.id || '',
      batchNumber: formData.batchNumber || undefined,
      notes: formData.notes || undefined,
    };

    if (editingVax) {
      vaccinationsStorage.update(editingVax.id, vaxData);
      toast({
        title: 'Vaccination Updated',
        description: 'Vaccination record has been updated.',
      });
    } else {
      vaccinationsStorage.create(vaxData);
      toast({
        title: 'Vaccination Added',
        description: 'Vaccination record has been saved.',
      });
    }

    loadVaccinations();
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (vax: Vaccination) => {
    setEditingVax(vax);
    const isCommonVax = COMMON_VACCINES.includes(vax.name);
    setFormData({
      petId: vax.petId,
      name: isCommonVax ? vax.name : 'Other',
      customName: isCommonVax ? '' : vax.name,
      dateAdministered: vax.dateAdministered,
      nextDueDate: vax.nextDueDate || '',
      batchNumber: vax.batchNumber || '',
      notes: vax.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (vax: Vaccination) => {
    if (confirm('Are you sure you want to delete this vaccination record?')) {
      vaccinationsStorage.delete(vax.id);
      toast({
        title: 'Record Deleted',
        description: 'Vaccination record has been removed.',
        variant: 'destructive',
      });
      loadVaccinations();
    }
  };

  const pets = user?.role === 'owner' 
    ? petsStorage.getByOwner(user.id)
    : petsStorage.getAll();

  const filteredVaccinations = vaccinations.filter(vax => {
    const pet = petsStorage.getById(vax.petId);
    const matchesSearch = 
      pet?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vax.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getVaxStatus = (vax: Vaccination) => {
    if (!vax.nextDueDate) return 'current';
    const dueDate = new Date(vax.nextDueDate);
    const today = new Date();
    const weekFromNow = addDays(today, 7);
    
    if (isBefore(dueDate, today)) return 'overdue';
    if (isBefore(dueDate, weekFromNow)) return 'due-soon';
    return 'current';
  };

  const canEdit = user?.role === 'veterinarian' || user?.role === 'admin' || user?.role === 'receptionist';

  // Get due/overdue count for alert
  const dueCount = vaccinations.filter(v => {
    const status = getVaxStatus(v);
    return status === 'overdue' || status === 'due-soon';
  }).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Vaccinations</h1>
          <p className="text-muted-foreground">Track and manage pet vaccinations</p>
        </div>
        
        {canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Vaccination
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingVax ? 'Edit Vaccination' : 'Add Vaccination'}</DialogTitle>
                <DialogDescription>
                  Record a vaccination for a pet
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Pet *</Label>
                    <Select
                      value={formData.petId}
                      onValueChange={(value) => setFormData({ ...formData, petId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select pet" />
                      </SelectTrigger>
                      <SelectContent>
                        {pets.map((pet) => (
                          <SelectItem key={pet.id} value={pet.id}>
                            {pet.name} ({pet.species})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Vaccine *</Label>
                    <Select
                      value={formData.name}
                      onValueChange={(value) => setFormData({ ...formData, name: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vaccine" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_VACCINES.map((vax) => (
                          <SelectItem key={vax} value={vax}>
                            {vax}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.name === 'Other' && (
                    <div className="space-y-2">
                      <Label>Vaccine Name *</Label>
                      <Input
                        value={formData.customName}
                        onChange={(e) => setFormData({ ...formData, customName: e.target.value })}
                        placeholder="Enter vaccine name"
                        required
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date Administered *</Label>
                      <Input
                        type="date"
                        value={formData.dateAdministered}
                        onChange={(e) => setFormData({ ...formData, dateAdministered: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Next Due Date</Label>
                      <Input
                        type="date"
                        value={formData.nextDueDate}
                        onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Batch Number</Label>
                    <Input
                      value={formData.batchNumber}
                      onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any additional notes..."
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingVax ? 'Update' : 'Add Vaccination'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Alert for due vaccinations */}
      {dueCount > 0 && (
        <Card className="border-warning bg-warning/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <p className="text-sm font-medium">
                {dueCount} vaccination{dueCount > 1 ? 's' : ''} due or overdue
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by pet name or vaccine..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Vaccinations Table */}
      <Card>
        <CardContent className="p-0">
          {filteredVaccinations.length === 0 ? (
            <div className="py-16 text-center">
              <Syringe className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No vaccinations found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search' : 'No vaccination records yet'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pet</TableHead>
                  <TableHead>Vaccine</TableHead>
                  <TableHead>Date Given</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Administered By</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVaccinations.map((vax) => {
                  const pet = petsStorage.getById(vax.petId);
                  const vet = usersStorage.getById(vax.administeredBy);
                  const status = getVaxStatus(vax);
                  return (
                    <TableRow key={vax.id}>
                      <TableCell>
                        <p className="font-medium">{pet?.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{pet?.species}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{vax.name}</p>
                        {vax.batchNumber && (
                          <p className="text-xs text-muted-foreground">Batch: {vax.batchNumber}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(vax.dateAdministered), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {vax.nextDueDate 
                          ? format(new Date(vax.nextDueDate), 'MMM d, yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          status === 'overdue' ? 'destructive' :
                          status === 'due-soon' ? 'secondary' : 'outline'
                        }>
                          {status === 'overdue' ? 'Overdue' :
                           status === 'due-soon' ? 'Due Soon' : 'Current'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p>{vet?.name || 'Unknown'}</p>
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(vax)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(vax)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
