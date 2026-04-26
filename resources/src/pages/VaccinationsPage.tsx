import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { Vaccination, VaccineInventory, User, Pet } from '@/types';

class VaccinationsErrorBoundary extends React.Component<{
  children: React.ReactNode;
}, {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('VaccinationsPage crashed:', error, info);
    this.setState({ error, errorInfo: info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-8">
          <div className="max-w-3xl rounded-lg border border-red-200 bg-red-50 p-8 text-left">
            <h1 className="text-2xl font-semibold text-red-700">Something went wrong</h1>
            <p className="mt-3 text-sm text-red-600">We could not load the vaccination page right now. Please refresh or try again later.</p>
            {this.state.error && (
              <div className="mt-6 rounded-md bg-white p-4 text-sm text-slate-800 shadow-sm">
                <p className="font-semibold">Error:</p>
                <pre className="whitespace-pre-wrap break-words">{this.state.error.message}</pre>
                {this.state.errorInfo?.componentStack && (
                  <details className="mt-3">
                    <summary className="cursor-pointer font-medium text-slate-700">Component stack</summary>
                    <pre className="whitespace-pre-wrap break-words text-xs text-slate-600">{this.state.errorInfo.componentStack}</pre>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, Syringe, AlertTriangle, Activity, CheckCircle2, History } from 'lucide-react';
import { format, isAfter, isBefore, addDays, isValid } from 'date-fns';

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

function VaccinationsPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [inventory, setInventory] = useState<VaccineInventory[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVax, setEditingVax] = useState<Vaccination | null>(null);

  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [stockFormData, setStockFormData] = useState({ name: '', quantity: '' });

  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [infoFormData, setInfoFormData] = useState({ name: '', batchNumber: '', origin: '', expirationDate: '', description: '' });
  
  // Form state
  const [formData, setFormData] = useState({
    ownerId: '',
    petId: '',
    name: '',
    customName: '',
    dateAdministered: format(new Date(), 'yyyy-MM-dd'),
    nextDueDate: '',
    batchNumber: '',
    notes: '',
  });

  const [allPets, setAllPets] = useState<Pet[]>([]);
  const [availableOwners, setAvailableOwners] = useState<User[]>([]);

  useEffect(() => {
    loadVaccinations();
    loadInventory();
    loadContextData();
  }, [user]);

  const loadContextData = async () => {
    if (!user) return;
    try {
      const ownersData = await api.getOwners();
      setAvailableOwners(ownersData);
      
      const petsData = await api.getPets({ per_page: 500 });
      setAllPets(Array.isArray(petsData) ? petsData : (petsData as any).data ?? []);
    } catch (err) {
      console.error('Failed to load context data', err);
    }
  };

  const loadVaccinations = async () => {
    if (!user) return;
    try {
      const response = await api.getVaccinations({ per_page: 500 });
      const data = Array.isArray(response) ? response : (response as any).data ?? [];
      
      // Sort is handled by backend usually, but for consistency:
      data.sort((a, b) => new Date(b.dateAdministered).getTime() - new Date(a.dateAdministered).getTime());
      setVaccinations(data);
    } catch (error) {
      console.error('Failed loading vaccinations', error);
      toast({ title: 'Load Error', description: 'Could not load vaccination records.', variant: 'destructive' });
    }
  };

  const loadInventory = async () => {
    if (user?.role === 'vet_clinic') {
      try {
        const data = await api.getInventory();
        setInventory(data);
      } catch (error) {
        console.error('Failed loading inventory', error);
        toast({ title: 'Inventory Load Error', description: 'Could not load vaccine inventory.', variant: 'destructive' });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      ownerId: user?.role === 'owner' ? user.id : '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!user) {
        toast({ title: 'Not authenticated', description: 'You must be signed in to record vaccinations.', variant: 'destructive' });
        return;
      }

      const vaccineName = (formData.name === 'Other' ? formData.customName : formData.name).trim();
      
      if (!formData.petId || !vaccineName) {
        toast({ title: 'Missing Information', description: 'Please fill in all required fields.', variant: 'destructive' });
        return;
      }

      const vaxPayload = {
        pet_id: formData.petId,
        name: vaccineName,
        date_administered: formData.dateAdministered,
        next_due_date: formData.nextDueDate || null,
        batch_number: formData.batchNumber || null,
        notes: formData.notes || null,
      };

      if (editingVax) {
        await api.updateVaccination(editingVax.id, vaxPayload);
        toast({ title: 'Vaccination Updated', description: 'Vaccination record has been updated.' });
      } else {
        await api.createVaccination(vaxPayload);
        toast({ title: 'Vaccination Added', description: 'Record saved successfully.' });
      }

      await loadVaccinations();
      await loadInventory();
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Vaccination submit failed', error);
      toast({ title: 'Submission Error', description: error.message || 'Unable to save vaccination.', variant: 'destructive' });
    }
  };

  const submitStockUpdate = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!user || user.role !== 'vet_clinic') return;
     const vol = parseInt(stockFormData.quantity);
     if (isNaN(vol) || vol <= 0) return;
     
     try {
       await api.upsertInventory(stockFormData.name, vol);
       toast({ title: 'Inventory Replenished', description: `Successfully added ${vol} units of ${stockFormData.name}.` });
       await loadInventory();
       setIsStockDialogOpen(false);
     } catch (err) {
       toast({ title: 'Stock Update Error', variant: 'destructive' });
     }
  };

  const handleUpdateStock = (vaxName: string) => {
     setStockFormData({ name: vaxName, quantity: '' });
     setIsStockDialogOpen(true);
  };

  const submitInfoUpdate = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!user || user.role !== 'vet_clinic') return;
     
     const item = inventory.find(i => i.name === infoFormData.name);
     if (!item) return;

     try {
       await api.updateInventory(item.id, {
          batch_number: infoFormData.batchNumber,
          origin: infoFormData.origin,
          expiration_date: infoFormData.expirationDate,
          description: infoFormData.description,
       });
       toast({ title: 'Information Saved', description: `Metadata updated for ${infoFormData.name}.` });
       await loadInventory();
       setIsInfoDialogOpen(false);
     } catch (err) {
       toast({ title: 'Information Update Error', variant: 'destructive' });
     }
  };

  const handleUpdateInfo = (vaxName: string, batchNumber: string, origin: string, expirationDate: string, description: string) => {
     setInfoFormData({ name: vaxName, batchNumber, origin, expirationDate, description });
     setIsInfoDialogOpen(true);
  };

  const handleEdit = (vax: Vaccination) => {
    setEditingVax(vax);
    const isCommonVax = COMMON_VACCINES.includes(vax.name);
    const pet = allPets.find(p => String(p.id) === String(vax.petId));
    setFormData({
      ownerId: pet?.ownerId?.toString() || (user?.role === 'owner' ? user.id : ''),
      petId: vax.petId.toString(),
      name: isCommonVax ? vax.name : 'Other',
      customName: isCommonVax ? '' : vax.name,
      dateAdministered: vax.dateAdministered,
      nextDueDate: vax.nextDueDate || '',
      batchNumber: vax.batchNumber || '',
      notes: vax.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (vax: Vaccination) => {
    if (confirm('Are you sure you want to delete this vaccination record?')) {
      try {
        await api.deleteVaccination(vax.id);
        toast({ title: 'Record Deleted', description: 'Vaccination record has been removed.', variant: 'destructive' });
        await loadVaccinations();
      } catch (err) {
        toast({ title: 'Delete Error', variant: 'destructive' });
      }
    }
  };

  const availablePets = user?.role === 'owner' ? allPets.filter(p => String(p.ownerId) === String(user.id)) : formData.ownerId ? allPets.filter(p => String(p.ownerId) === String(formData.ownerId)) : [];
  const canEdit = user?.role === 'admin' || user?.role === 'vet_clinic';
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayVaccinations = vaccinations.filter((vax) => {
    if (!vax.dateAdministered) {
      return false;
    }

    const administeredAt = new Date(vax.dateAdministered);

    return isValid(administeredAt) && format(administeredAt, 'yyyy-MM-dd') === today;
  });
  const totalPetsVaccinated = new Set(vaccinations.map((vax) => String(vax.petId))).size;
  const totalPetsVaccinatedToday = new Set(todayVaccinations.map((vax) => String(vax.petId))).size;

  const mostRecentVax = vaccinations.length > 0 ? vaccinations[0] : null;
  let mostRecentInfo = 'None yet';
  if (mostRecentVax) {
     const pet = (mostRecentVax as any).pet || allPets.find(p => String(p.id) === String(mostRecentVax.petId));
     mostRecentInfo = pet ? `${pet.name} (${mostRecentVax.name})` : mostRecentVax.name;
  }

  // Searching logic
  const matchSearch = (vax: Vaccination) => {
    const pet = (vax as any).pet || allPets.find(p => String(p.id) === String(vax.petId));
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return true;
    }

    return (pet?.name || '').toLowerCase().includes(normalizedSearch) || (vax.name || '').toLowerCase().includes(normalizedSearch);
  };

  const filteredVaccinations = vaccinations.filter(matchSearch);
  const filteredTodayVaccinations = todayVaccinations.filter(matchSearch);

  const getVaxStatus = (vax: Vaccination) => {
    if (!vax.nextDueDate) return 'current';
    const dueDate = new Date(vax.nextDueDate);
    if (!isValid(dueDate)) return 'current';
    const today = new Date();
    const weekFromNow = addDays(today, 7);
    if (isBefore(dueDate, today)) return 'overdue';
    if (isBefore(dueDate, weekFromNow)) return 'due-soon';
    return 'current';
  };

  const dueCount = vaccinations.filter(v => {
    const status = getVaxStatus(v);
    return status === 'overdue' || status === 'due-soon';
  }).length;

  const { 
    paginatedData, 
    currentPage, 
    totalPages, 
    nextPage, 
    prevPage 
  } = usePagination(filteredVaccinations, 10);

  const { 
    paginatedData: paginatedToday, 
    currentPage: currentTodayPage, 
    totalPages: totalTodayPages, 
    nextPage: nextTodayPage, 
    prevPage: prevTodayPage 
  } = usePagination(filteredTodayVaccinations, 10);

  const renderTable = (data: Vaccination[]) => {
    if (data.length === 0) {
       return (
         <div className="py-16 text-center">
           <Syringe className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
           <h3 className="text-lg font-semibold mb-2">No records found</h3>
         </div>
       );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Owner</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Vaccine Shot</TableHead>
            <TableHead>Date Administered</TableHead>
            <TableHead>Next Booster</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Clinician</TableHead>
            {canEdit && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((vax) => {
            const pet = (vax as any).pet || allPets.find(p => String(p.id) === String(vax.petId));
            const ownerUser = pet?.owner || availableOwners.find(o => String(o.id) === String(pet?.ownerId));
            const vetUser = (vax as any).administeredByVet || (vax as any).clinician;
            const status = getVaxStatus(vax);
            return (
              <TableRow key={vax.id}>
                <TableCell>
                   <p className="font-medium">{ownerUser?.name || 'Unknown'}</p>
                   <p className="text-xs text-muted-foreground">{ownerUser?.email || ''}</p>
                </TableCell>
                <TableCell><p className="font-medium">{pet?.name}</p><p className="text-sm text-muted-foreground capitalize">{pet?.species}</p></TableCell>
                <TableCell><p className="font-medium">{vax.name}</p>{vax.batchNumber && <p className="text-xs text-muted-foreground">Batch: {vax.batchNumber}</p>}</TableCell>
                <TableCell>{vax.dateAdministered && isValid(new Date(vax.dateAdministered)) ? format(new Date(vax.dateAdministered), 'MMM d, yyyy') : '-'}</TableCell>
                <TableCell>{vax.nextDueDate && isValid(new Date(vax.nextDueDate)) ? format(new Date(vax.nextDueDate), 'MMM d, yyyy') : '-'}</TableCell>
                <TableCell><Badge variant={status === 'overdue' ? 'destructive' : status === 'due-soon' ? 'secondary' : 'outline'}>{status === 'overdue' ? 'Overdue' : status === 'due-soon' ? 'Due Soon' : 'Current'}</Badge></TableCell>
                <TableCell><p>{vetUser?.name || 'Veterinarian'}</p></TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(vax)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(vax)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Vaccination</h1>
          <p className="text-muted-foreground">Track and manage pet vaccinations</p>
        </div>
        
        {canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Vaccination Log</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingVax ? 'Edit Record' : 'Administer Vaccine'}</DialogTitle>
                <DialogDescription>Record a new injection sequence</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  {user?.role !== 'owner' && (
                    <div className="space-y-2">
                      <Label>Owner *</Label>
                      <Select
                        value={formData.ownerId}
                        onValueChange={(value) => setFormData({ ...formData, ownerId: value, petId: '' })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                        <SelectContent>
                          {availableOwners.map((owner) => (
                            <SelectItem key={owner.id} value={owner.id}>{owner.name} ({owner.email})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Pet *</Label>
                    <Select
                      value={formData.petId}
                      onValueChange={(value) => setFormData({ ...formData, petId: value })}
                      disabled={user?.role !== 'owner' && !formData.ownerId}
                    >
                      <SelectTrigger><SelectValue placeholder={user?.role === 'owner' ? 'Select pet' : 'Select owner first'} /></SelectTrigger>
                      <SelectContent>
                        {availablePets.length > 0 ? (
                          availablePets.map((pet) => (
                            <SelectItem key={pet.id} value={pet.id}>{pet.name} ({pet.species})</SelectItem>
                          ))
                        ) : (
                          user?.role === 'owner' ? (
                            <SelectItem value="no-pets" disabled>No pets available</SelectItem>
                          ) : (
                            <SelectItem value="select-owner-first" disabled>Select an owner first</SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Vaccine Name *</Label>
                    <Select value={formData.name} onValueChange={(value) => setFormData({ ...formData, name: value })}>
                      <SelectTrigger><SelectValue placeholder="Select vaccine" /></SelectTrigger>
                      <SelectContent>
                        {COMMON_VACCINES.map((vax) => (<SelectItem key={vax} value={vax}>{vax}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.name === 'Other' && (
                    <div className="space-y-2">
                      <Label>Custom Vaccine Name *</Label>
                      <Input value={formData.customName} onChange={(e) => setFormData({ ...formData, customName: e.target.value })} required />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Date Administered *</Label><Input type="date" value={formData.dateAdministered} onChange={(e) => setFormData({ ...formData, dateAdministered: e.target.value })} required /></div>
                    <div className="space-y-2"><Label>Next Due Date</Label><Input type="date" value={formData.nextDueDate} onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Batch/Lot Number</Label><Input value={formData.batchNumber} onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} /></div>
                </div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button><Button type="submit">{editingVax ? 'Update' : 'Confirm Injection'}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="p-6 flex flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Pets Vaccinated</p>
              <p className="text-2xl font-bold">{totalPetsVaccinated}</p>
            </div>
            <Activity className="h-8 w-8 text-primary opacity-75" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Vaccinated Today</p>
              <p className="text-2xl font-bold">{totalPetsVaccinatedToday}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500 opacity-75" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Previous Vaccination</p>
              <p className="text-sm font-bold truncate max-w-[150px]" title={mostRecentInfo}>{mostRecentInfo}</p>
            </div>
            <History className="h-8 w-8 text-muted-foreground opacity-75" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="today" className="space-y-6">
        <TabsList>
           <TabsTrigger value="today"><CheckCircle2 className="mr-2 h-4 w-4" /> Today's Logs</TabsTrigger>
           <TabsTrigger value="history"><History className="mr-2 h-4 w-4" /> Vaccination History</TabsTrigger>
        </TabsList>

        <div className="space-y-6">
          {dueCount > 0 && (
            <Card className="border-warning bg-warning/10">
              <CardContent className="py-4">
                <div className="flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-warning" /><p className="text-sm font-medium">{dueCount} vaccination{dueCount > 1 ? 's' : ''} due or overdue</p></div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search logs by pet name or vaccine..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </CardContent>
          </Card>
        </div>

        <TabsContent value="today" className="space-y-6 mt-6">
          <Card>
            <CardContent className="p-0">
              {renderTable(paginatedToday)}
              {filteredTodayVaccinations.length > 0 && (
                <PaginationControls
                  currentPage={currentTodayPage}
                  totalPages={totalTodayPages}
                  onNext={nextTodayPage}
                  onPrev={prevTodayPage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6 mt-6">
          <Card>
            <CardContent className="p-0">
              {renderTable(paginatedData)}
              {filteredVaccinations.length > 0 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onNext={nextPage}
                  onPrev={prevPage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function VaccinationsPage() {
  return (
    <VaccinationsErrorBoundary>
      <VaccinationsPageContent />
    </VaccinationsErrorBoundary>
  );
}
