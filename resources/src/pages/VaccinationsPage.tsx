import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  vaccinationsStorage, 
  vaccineInventoryStorage,
  petsStorage, 
  usersStorage,
  veterinariansStorage
} from '@/lib/storage';

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
import type { Vaccination, VaccineInventory } from '@/types';
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
import { Plus, Search, Edit, Trash2, Syringe, AlertTriangle, PackagePlus } from 'lucide-react';
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

  useEffect(() => {
    loadVaccinations();
    loadInventory();
  }, [user]);

  const loadVaccinations = () => {
    if (!user) return;
    try {
      let data: Vaccination[];
      if (user.role === 'owner') {
        const myPets = petsStorage.getByOwner(user.id);
        data = myPets.flatMap(pet => vaccinationsStorage.getByPet(pet.id));
      } else if (user.role === 'vet_clinic') {
        const clinicVets = veterinariansStorage.getByClinic(user.id).map(v => v.id);
        data = vaccinationsStorage.getAll().filter(v => 
          v.administeredBy === user.id || clinicVets.includes(v.administeredBy)
        );
      } else {
        data = vaccinationsStorage.getAll();
      }

      data.sort((a, b) => new Date(b.dateAdministered).getTime() - new Date(a.dateAdministered).getTime());
      setVaccinations(data);
    } catch (error) {
      console.error('Failed loading vaccinations', error);
      toast({ title: 'Load Error', description: 'Could not load vaccination records.', variant: 'destructive' });
    }
  };

  const loadInventory = () => {
    if (user?.role === 'vet_clinic') {
      try {
        setInventory(vaccineInventoryStorage.getByClinic(user.id));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!user) {
        toast({ title: 'Not authenticated', description: 'You must be signed in to record vaccinations.', variant: 'destructive' });
        return;
      }

      const vaccineName = (formData.name === 'Other' ? formData.customName : formData.name).trim();
      const administeredDate = new Date(formData.dateAdministered);
      const nextDue = formData.nextDueDate ? new Date(formData.nextDueDate) : undefined;

      if (!formData.petId || !vaccineName) {
        toast({ title: 'Missing Information', description: 'Please fill in all required fields.', variant: 'destructive' });
        return;
      }

      if (!isValid(administeredDate)) {
        toast({ title: 'Invalid Date', description: 'Please enter a valid administered date.', variant: 'destructive' });
        return;
      }

      if (formData.nextDueDate && nextDue && !isValid(nextDue)) {
        toast({ title: 'Invalid Booster Date', description: 'Please enter a valid next booster date.', variant: 'destructive' });
        return;
      }

      const vaxData = {
        petId: formData.petId,
        name: vaccineName,
        dateAdministered: formData.dateAdministered,
        nextDueDate: formData.nextDueDate || undefined,
        administeredBy: user.id,
        batchNumber: formData.batchNumber || undefined,
        notes: formData.notes || undefined,
      };

      if (editingVax) {
        vaccinationsStorage.update(editingVax.id, vaxData);
        toast({ title: 'Vaccination Updated', description: 'Vaccination record has been updated.' });
      } else {
        if (user.role === 'vet_clinic' && formData.name !== 'Other') {
          const currentStock = vaccineInventoryStorage.getByClinicAndName(user.id, vaccineName)?.stock || 0;
          if (currentStock <= 0) {
            toast({
              title: 'Insufficient Inventory Stock',
              description: `You do not have any physical stock of ${vaccineName} available! Please refill your inventory first.`,
              variant: 'destructive',
            });
            return;
          }
          vaccineInventoryStorage.upsert(user.id, vaccineName, -1);
        }

        vaccinationsStorage.create(vaxData);
        toast({ title: 'Vaccination Added', description: 'Record saved and clinical inventory decremented.' });
      }

      loadVaccinations();
      loadInventory();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Vaccination submit failed', error);
      toast({ title: 'Submission Error', description: 'Unable to save vaccination. Check console for details.', variant: 'destructive' });
    }
  };

  const submitStockUpdate = (e: React.FormEvent) => {
     e.preventDefault();
     if (!user || user.role !== 'vet_clinic') return;
     const vol = parseInt(stockFormData.quantity);
     if (isNaN(vol) || vol <= 0) return;
     
     vaccineInventoryStorage.upsert(user.id, stockFormData.name, vol);
     toast({ title: 'Inventory Replenished', description: `Successfully added ${vol} units of ${stockFormData.name}.` });
     loadInventory();
     setIsStockDialogOpen(false);
  };

  const handleUpdateStock = (vaxName: string) => {
     setStockFormData({ name: vaxName, quantity: '' });
     setIsStockDialogOpen(true);
  };

  const submitInfoUpdate = (e: React.FormEvent) => {
     e.preventDefault();
     if (!user || user.role !== 'vet_clinic') return;
     
     vaccineInventoryStorage.update(user.id, infoFormData.name, {
        batchNumber: infoFormData.batchNumber,
        origin: infoFormData.origin,
        expirationDate: infoFormData.expirationDate,
        description: infoFormData.description,
     });
     toast({ title: 'Information Saved', description: `Metadata updated for ${infoFormData.name}.` });
     loadInventory();
     setIsInfoDialogOpen(false);
  };

  const handleUpdateInfo = (vaxName: string, batchNumber: string, origin: string, expirationDate: string, description: string) => {
     setInfoFormData({ name: vaxName, batchNumber, origin, expirationDate, description });
     setIsInfoDialogOpen(true);
  };

  const handleEdit = (vax: Vaccination) => {
    setEditingVax(vax);
    const isCommonVax = COMMON_VACCINES.includes(vax.name);
    const pet = petsStorage.getById(vax.petId);
    setFormData({
      ownerId: pet?.ownerId || (user?.role === 'owner' ? user.id : ''),
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
    if (confirm('Are you sure you want to delete this vaccination record? (Inventory will not be refunded)')) {
      vaccinationsStorage.delete(vax.id);
      toast({ title: 'Record Deleted', description: 'Vaccination record has been removed.', variant: 'destructive' });
      loadVaccinations();
    }
  };

  const pets = user?.role === 'owner' ? petsStorage.getByOwner(user.id) : petsStorage.getAll();
  const availableOwners = usersStorage.getByRole('owner');
  const availablePets = user?.role === 'owner' ? pets : formData.ownerId ? petsStorage.getByOwner(formData.ownerId) : [];
  const canEdit = user?.role === 'admin' || user?.role === 'vet_clinic';
  const showInventory = user?.role === 'vet_clinic' || user?.role === 'admin';

  useEffect(() => {
    if (user?.role !== 'owner' && availableOwners.length > 0 && !formData.ownerId) {
      setFormData((prev) => ({ ...prev, ownerId: availableOwners[0].id, petId: '' }));
    }
  }, [availableOwners, formData.ownerId, user?.role]);

  const filteredVaccinations = vaccinations.filter(vax => {
    const pet = petsStorage.getById(vax.petId);
    return pet?.name.toLowerCase().includes(searchTerm.toLowerCase()) || vax.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Vaccination</h1>
          <p className="text-muted-foreground">{showInventory ? "Manage clinical vaccine inventory and consultation logs" : "Track and manage pet vaccinations"}</p>
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

      <Tabs defaultValue="records" className="space-y-6">
        <TabsList>
           <TabsTrigger value="records"><Syringe className="mr-2 h-4 w-4" /> Consultation Logs</TabsTrigger>
           {showInventory && <TabsTrigger value="inventory"><PackagePlus className="mr-2 h-4 w-4" /> Vaccine Inventory</TabsTrigger>}
        </TabsList>

        <TabsContent value="records" className="space-y-6">
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

          <Card>
            <CardContent className="p-0">
              {filteredVaccinations.length === 0 ? (
                <div className="py-16 text-center"><Syringe className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" /><h3 className="text-lg font-semibold mb-2">No records found</h3></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead><TableHead>Vaccine Shot</TableHead><TableHead>Date Administered</TableHead><TableHead>Next Booster</TableHead><TableHead>Status</TableHead><TableHead>Clinician</TableHead>{canEdit && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVaccinations.map((vax) => {
                      const pet = petsStorage.getById(vax.petId);
                      const vetUser = usersStorage.getById(vax.administeredBy);
                      const status = getVaxStatus(vax);
                      return (
                        <TableRow key={vax.id}>
                          <TableCell><p className="font-medium">{pet?.name}</p><p className="text-sm text-muted-foreground capitalize">{pet?.species}</p></TableCell>
                          <TableCell><p className="font-medium">{vax.name}</p>{vax.batchNumber && <p className="text-xs text-muted-foreground">Batch: {vax.batchNumber}</p>}</TableCell>
                          <TableCell>{isValid(new Date(vax.dateAdministered)) ? format(new Date(vax.dateAdministered), 'MMM d, yyyy') : '-'}</TableCell>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {showInventory && (
           <TabsContent value="inventory" className="space-y-6">
              <Card>
                 <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[15%]">Vaccine Classification</TableHead>
                          <TableHead>Batch / Lot Ref</TableHead>
                          <TableHead>Origin Factory</TableHead>
                          <TableHead>Expiration</TableHead>
                          <TableHead>In Stock Vol.</TableHead>
                          <TableHead>Availability Grid</TableHead>
                          <TableHead className="text-right">Supply Chain Control</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {COMMON_VACCINES.filter(v => v !== 'Other').map(vaxName => {
                           const item = inventory.find(i => i.name === vaxName);
                           const stock = item?.stock || 0;
                           const batchNumber = item?.batchNumber || '-';
                           const origin = item?.origin || '-';
                           return (
                              <TableRow key={vaxName}>
                                <TableCell className="font-medium">
                                  {vaxName}
                                  {item?.description && <p className="text-xs text-muted-foreground mt-1 truncate max-w-[120px]" title={item.description}>{item.description}</p>}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{batchNumber}</TableCell>
                                <TableCell className="text-muted-foreground">{origin}</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {item?.expirationDate && isValid(new Date(item.expirationDate)) ? format(new Date(item.expirationDate), 'MMM d, yyyy') : '-'}
                                </TableCell>
                                <TableCell className="font-mono text-lg">{stock}</TableCell>
                                <TableCell>
                                  <Badge variant={stock === 0 ? 'destructive' : stock <= 10 ? 'secondary' : 'default'} className="px-3">
                                    {stock === 0 ? 'Out of Stock' : stock <= 10 ? 'Low Supplies' : 'Warehouse Stable'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                     <Button size="sm" variant="outline" onClick={() => handleUpdateInfo(vaxName, item?.batchNumber || '', item?.origin || '', item?.expirationDate || '', item?.description || '')}><Edit className="h-4 w-4 lg:mr-2" /><span className="hidden lg:inline">Edit Details</span></Button>
                                     <Button size="sm" variant="outline" onClick={() => handleUpdateStock(vaxName)}><PackagePlus className="h-4 w-4 lg:mr-2" /><span className="hidden lg:inline">Stock</span></Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                           )
                        })}
                      </TableBody>
                    </Table>
                 </CardContent>
              </Card>

              {/* Add Stock Dialog */}
              <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
                 <DialogContent className="max-w-sm">
                    <DialogHeader>
                       <DialogTitle>Replenish Inventory</DialogTitle>
                       <DialogDescription>Adding units to {stockFormData.name}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitStockUpdate}>
                       <div className="space-y-4 py-4">
                          <div className="space-y-2">
                             <Label>Amount to Add</Label>
                             <Input type="number" min="1" value={stockFormData.quantity} onChange={(e) => setStockFormData({...stockFormData, quantity: e.target.value})} placeholder="e.g. 50" required />
                          </div>
                       </div>
                       <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsStockDialogOpen(false)}>Cancel</Button>
                          <Button type="submit">Deploy Shipment</Button>
                       </DialogFooter>
                    </form>
                 </DialogContent>
              </Dialog>

              {/* Edit Info Dialog */}
              <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
                 <DialogContent className="max-w-sm">
                    <DialogHeader>
                       <DialogTitle>Update Vaccine Origin Info</DialogTitle>
                       <DialogDescription>Editing details for {infoFormData.name}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitInfoUpdate}>
                       <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                          <div className="space-y-2">
                             <Label>Batch / Lot Number</Label>
                             <Input value={infoFormData.batchNumber} onChange={(e) => setInfoFormData({...infoFormData, batchNumber: e.target.value})} placeholder="e.g. BATCH-2026-X" />
                          </div>
                          <div className="space-y-2">
                             <Label>Manufacturer / Origin</Label>
                             <Input value={infoFormData.origin} onChange={(e) => setInfoFormData({...infoFormData, origin: e.target.value})} placeholder="e.g. Zoetis, Boehringer Ingelheim" />
                          </div>
                          <div className="space-y-2">
                             <Label>Expiration Date</Label>
                             <Input type="date" value={infoFormData.expirationDate} onChange={(e) => setInfoFormData({...infoFormData, expirationDate: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                             <Label>Item Description / Medical Notes</Label>
                             <Textarea value={infoFormData.description} onChange={(e) => setInfoFormData({...infoFormData, description: e.target.value})} placeholder="Contraindications, handling instructions..." rows={2} />
                          </div>
                       </div>
                       <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsInfoDialogOpen(false)}>Cancel</Button>
                          <Button type="submit">Save Updates</Button>
                       </DialogFooter>
                    </form>
                 </DialogContent>
              </Dialog>
           </TabsContent>
        )}
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
