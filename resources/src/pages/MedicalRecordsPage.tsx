import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { petsStorage } from '@/lib/storage';
import type { MedicalRecord, User, Pet, Veterinarian } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Search, Calendar as CalendarIcon, Eye, Edit, Trash2, Stethoscope, Download, ArrowLeft, Users, Heart } from 'lucide-react';
import { format, isValid } from 'date-fns';

export default function MedicalRecordsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Drill-down states
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

  // Data states
  const [owners, setOwners] = useState<User[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  
  // Form states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<MedicalRecord | null>(null);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [clinicVets, setClinicVets] = useState<Veterinarian[]>([]);
  const [formData, setFormData] = useState({
    diagnosis: '',
    treatment: '',
    prescription: '',
    labResults: '',
    notes: '',
    weight: '',
    temperature: '',
    followUpDate: '',
    veterinarianId: '',
  });

  const filteredOwners = useMemo(() => {
    return owners.filter(o => 
      (o.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (o.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [owners, searchTerm]);

  const {
    paginatedData: ownersToShow,
    currentPage: ownersPage,
    totalPages: ownersTotalPages,
    nextPage: ownersNextPage,
    prevPage: ownersPrevPage
  } = usePagination(filteredOwners, 10);

  const filteredPets = useMemo(() => {
    return pets.filter(p => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
  }, [pets, searchTerm]);

  const {
    paginatedData: petsToShow,
    currentPage: petsPage,
    totalPages: petsTotalPages,
    nextPage: petsNextPage,
    prevPage: petsPrevPage
  } = usePagination(filteredPets, 10);

  const filteredRecords = useMemo(() => {
    return records.filter(r => 
      (r.diagnosis || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.treatment || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [records, searchTerm]);

  const {
    paginatedData: recordsToShow,
    currentPage: recordsPage,
    totalPages: recordsTotalPages,
    nextPage: recordsNextPage,
    prevPage: recordsPrevPage
  } = usePagination(filteredRecords, 10);

  useEffect(() => {
    if (!user) return;
    
    // Auto-skip Level 1 for 'owner' role
    if (user.role === 'owner' && !selectedOwnerId) {
      setSelectedOwnerId(user.id);
      return;
    }

    if (!selectedOwnerId) {
      loadOwners();
    } else if (selectedOwnerId && !selectedPet) {
      loadPetsForOwner(selectedOwnerId);
    } else if (selectedPet) {
      loadRecordsForPet((selectedPet as any).id);
    }
  }, [user, selectedOwnerId, selectedPet]);

  // Load clinic vets for vet_clinic users (needed for the medical record form)
  useEffect(() => {
    if (user?.role === 'vet_clinic') {
      api.getVeterinarians().then(vets => {
        const arr = Array.isArray(vets) ? vets : (vets as any).data ?? [];
        setClinicVets(arr);
      }).catch(console.error);
    }
  }, [user]);

  const loadOwners = async () => {
    if (!user) return;
    try {
      // api.getOwners() applies server-side role-based filtering:
      // admin → all owners, vet_clinic → owners with appointments at this clinic
      const data = await api.getOwners();
      setOwners(data);
    } catch (err) {
      console.error('Failed to load owners from API:', err);
      setOwners([]);
    }
  };

  const loadPetsForOwner = async (ownerId: string) => {
    try {
      const response = await api.getPets({ owner_id: ownerId, per_page: 200 });
      const list: Pet[] = Array.isArray(response) ? response : (response as any).data ?? [];
      setPets(list);
    } catch (err) {
      console.error('Failed to load pets from API:', err);
      setPets(petsStorage.getByOwner(ownerId));
    }
  };

  const loadRecordsForPet = async (petId: string) => {
    try {
      // /api/pets/{id}/medical-history returns records filtered by role
      const data = await api.getPetHistory(petId);
      const list: MedicalRecord[] = Array.isArray(data) ? data : [];
      list.sort((a, b) => {
        const dateA = (a as any).recordDate || (a as any).record_date || (a as any).date || '';
        const dateB = (b as any).recordDate || (b as any).record_date || (b as any).date || '';
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
      setRecords(list);
    } catch (err) {
      console.error('Failed to load medical records from API:', err);
      setRecords([]);
    }
  };

  // UI Handlers
  const handleBack = () => {
    setSearchTerm('');
    if (selectedPet) {
      setSelectedPet(null);
    } else if (selectedOwnerId) {
      if (user?.role === 'owner') return; // Owners can't go back further than pets list
      setSelectedOwnerId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      diagnosis: '', treatment: '', prescription: '', labResults: '',
      notes: '', weight: '', temperature: '', followUpDate: '',
      veterinarianId: '',
    });
    setSelectedDate(new Date());
    setEditingRecord(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPet || !formData.diagnosis || !formData.treatment) {
      toast({ title: 'Missing Information', description: 'Please fill in required fields.', variant: 'destructive' });
      return;
    }

    const petId = (selectedPet as any).id?.toString();
    const vetId = (selectedPet as any).veterinarianId ||
      (selectedPet as any).owner?.id ||
      null;

    try {
      if (editingRecord) {
        await api.updateMedicalRecord((editingRecord as any).id, {
          diagnosis: formData.diagnosis,
          treatment: formData.treatment,
          prescription: formData.prescription || null,
          lab_results: formData.labResults || null,
          notes: formData.notes || null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          temperature: formData.temperature ? parseFloat(formData.temperature) : null,
          follow_up_date: formData.followUpDate || null,
          veterinarian_id: formData.veterinarianId || undefined,
        });
        toast({ title: 'Record Updated', description: 'Medical record has been updated.' });
      } else {
        // For vet_clinic creating a record, veterinarian_id must be provided
        await api.createMedicalRecord({
          pet_id: petId,
          record_date: format(selectedDate, 'yyyy-MM-dd'),
          diagnosis: formData.diagnosis,
          treatment: formData.treatment,
          prescription: formData.prescription || null,
          lab_results: formData.labResults || null,
          notes: formData.notes || null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          temperature: formData.temperature ? parseFloat(formData.temperature) : null,
          follow_up_date: formData.followUpDate || null,
          veterinarian_id: formData.veterinarianId || undefined,
        });
        toast({ title: 'Record Created', description: 'Medical record has been saved for ' + selectedPet.name });
      }
      await loadRecordsForPet(petId);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to save record.', variant: 'destructive' });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (record: MedicalRecord) => {
    const r = record as any;
    setEditingRecord(record);
    setFormData({
      diagnosis: record.diagnosis, treatment: record.treatment, prescription: record.prescription || '',
      labResults: r.labResults || record.labResults || '', notes: record.notes || '', weight: record.weight?.toString() || '',
      temperature: record.temperature?.toString() || '', followUpDate: r.followUpDate || record.followUpDate || '',
      veterinarianId: r.veterinarianId?.toString() || '',
    });
    const dateVal = r.recordDate || record.date;
    setSelectedDate(dateVal ? new Date(dateVal) : new Date());
    setIsDialogOpen(true);
  };

  const handleDelete = async (record: MedicalRecord) => {
    if (confirm('Are you sure you want to delete this medical record?')) {
      try {
        await api.deleteMedicalRecord((record as any).id);
        toast({ title: 'Record Deleted', variant: 'destructive' });
        if (selectedPet) loadRecordsForPet((selectedPet as any).id);
      } catch (err: any) {
        toast({ title: 'Error', description: err?.message || 'Failed to delete record.', variant: 'destructive' });
      }
    }
  };

  const handleExportPDF = (record: MedicalRecord) => {
    const r = record as any;
    // Data may come from API (embedded) or localStorage
    const pet = r.pet || petsStorage.getById(r.petId);
    const owner = r.pet?.owner || null;
    const vet = r.veterinarian;
    const recordDate = r.recordDate || record.date;
    const dateStr = recordDate && isValid(new Date(recordDate))
      ? format(new Date(recordDate), 'MMMM d, yyyy')
      : '-';
    
    // Create printable content
    const content = `
      <html>
        <head>
          <title>Medical Record - ${pet?.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1e1b4b; }
            .header { border-bottom: 2px solid #1e1b4b; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin-bottom: 15px; }
            .label { font-weight: bold; color: #666; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🐾 PetPals PH</h1>
            <p>Veterinary Medical Record</p>
          </div>
          <div class="grid">
            <div class="section"><p class="label">Patient:</p><p>${pet?.name} (${pet?.species})</p></div>
            <div class="section"><p class="label">Owner:</p><p>${owner?.name}</p></div>
            <div class="section"><p class="label">Date:</p><p>${dateStr}</p></div>
            <div class="section"><p class="label">Attending Veterinarian:</p><p>${vet?.name || 'N/A'}</p></div>
          </div>
          <div class="section"><p class="label">Diagnosis:</p><p>${record.diagnosis}</p></div>
          <div class="section"><p class="label">Treatment:</p><p>${record.treatment}</p></div>
          ${record.prescription ? `<div class="section"><p class="label">Prescription:</p><p>${record.prescription}</p></div>` : ''}
          ${record.notes ? `<div class="section"><p class="label">Notes:</p><p>${record.notes}</p></div>` : ''}
          <div class="grid">
            ${record.weight ? `<div class="section"><p class="label">Weight:</p><p>${record.weight} kg</p></div>` : ''}
            ${record.temperature ? `<div class="section"><p class="label">Temperature:</p><p>${record.temperature}°C</p></div>` : ''}
          </div>
          ${record.followUpDate ? `<div class="section"><p class="label">Follow-up Date:</p><p>${record.followUpDate}</p></div>` : ''}
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) { printWindow.document.write(content); printWindow.document.close(); printWindow.print(); }
  };

  const getBreadcrumbs = () => {
    let trace = 'Patient Directory';
    if (selectedOwnerId) {
      const o = owners.find(ow => String(ow.id) === String(selectedOwnerId));
      trace = `Patient Directory > ${o?.name || selectedOwnerId}'s Pets`;
      if (selectedPet) {
        trace += ` > ${selectedPet.name}'s Medical History`;
      }
    }
    return trace;
  };

  const canEdit = user?.role === 'veterinarian' || user?.role === 'admin' || user?.role === 'vet_clinic';

  // --- RENDER VIEWS ---

  // LEVEL 1: Owners List
  const renderOwnersView = () => {

    return (
      <>
        <Table>
        <TableHeader><TableRow>
          <TableHead>Owner Name</TableHead>
          <TableHead>Contact Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {ownersToShow.map((owner) => (
            <TableRow key={owner.id}>
              <TableCell className="font-medium">{owner.name}</TableCell>
              <TableCell>{owner.email}</TableCell>
              <TableCell>{owner.phone || 'N/A'}</TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => setSelectedOwnerId(owner.id)}>
                  View Pets <Heart className="ml-2 h-3 w-3" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {filteredOwners.length > 0 && (
        <PaginationControls
          currentPage={ownersPage}
          totalPages={ownersTotalPages}
          onNext={ownersNextPage}
          onPrev={ownersPrevPage}
          className="mt-4"
        />
      )}
    </>
  );
};

  // LEVEL 2: Pets List
  const renderPetsView = () => {

    return (
      <>
        <Table>
        <TableHeader><TableRow>
          <TableHead>Pet Name</TableHead>
          <TableHead>Species & Breed</TableHead>
          <TableHead>Age</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {petsToShow.map((pet) => (
            <TableRow key={pet.id}>
              <TableCell className="font-medium">{pet.name}</TableCell>
              <TableCell className="capitalize">{pet.species} - {pet.breed}</TableCell>
              <TableCell>{pet.age} years</TableCell>
              <TableCell className="text-right">
                <Button variant="default" size="sm" onClick={() => setSelectedPet(pet)}>
                  Medical History <Stethoscope className="ml-2 h-3 w-3" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {petsToShow.length === 0 && (
            <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No pets formally registered to this owner yet.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
      {filteredPets.length > 0 && (
        <PaginationControls
          currentPage={petsPage}
          totalPages={petsTotalPages}
          onNext={petsNextPage}
          onPrev={petsPrevPage}
          className="mt-4"
        />
      )}
    </>
  );
};

  // LEVEL 3: Medical Records List
  const renderRecordsView = () => {

    return (
      <>
        <Table>
        <TableHeader><TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Diagnosis</TableHead>
          <TableHead>Treatment</TableHead>
          <TableHead>Veterinarian</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {recordsToShow.map((record) => {
            return (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{(() => { const d = (record as any).recordDate || record.date; return d && isValid(new Date(d)) ? format(new Date(d), 'MMM d, yyyy') : '-'; })()}</TableCell>
                <TableCell><p className="line-clamp-2 max-w-xs">{record.diagnosis}</p></TableCell>
                <TableCell><p className="line-clamp-2 max-w-xs">{record.treatment}</p></TableCell>
                <TableCell>{(record as any).veterinarian?.name || (record as any).veterinarianName || 'Unknown Vet'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setViewingRecord(record)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleExportPDF(record)}><Download className="h-4 w-4" /></Button>
                    {canEdit && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(record)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(record)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {recordsToShow.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No medical records exist for this pet yet.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
      {filteredRecords.length > 0 && (
        <PaginationControls
          currentPage={recordsPage}
          totalPages={recordsTotalPages}
          onNext={recordsNextPage}
          onPrev={recordsPrevPage}
          className="mt-4"
        />
      )}
    </>
  );
};

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {(selectedOwnerId || selectedPet) && user?.role !== 'owner' && (
              <Button variant="outline" size="sm" onClick={handleBack} className="h-8 shadow-sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            )}
            <Badge variant="secondary" className="px-3 py-1 font-mono text-xs text-muted-foreground bg-muted">
              {getBreadcrumbs()}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold">
            {!selectedOwnerId ? "Patient Directory" : !selectedPet ? "Owner's Pets" : `${selectedPet.name}'s Medical History`}
          </h1>
          <p className="text-muted-foreground">
            {!selectedOwnerId ? "Select an owner to view their pets" : !selectedPet ? "Select a pet to view their consultation records" : "View and manage consultation records"}
          </p>
        </div>
        
        {/* ADD RECORD Modal (Only visible on level 3) */}
        {canEdit && selectedPet && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Record</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRecord ? 'Edit Record' : `New Medical Record for ${selectedPet.name}`}</DialogTitle>
                <DialogDescription>Enter the consultation details below</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{format(selectedDate, 'PPP')}</Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  {user?.role === 'vet_clinic' && (
                    <div className="space-y-2">
                      <Label>Veterinarian *</Label>
                      <Select 
                        value={formData.veterinarianId} 
                        onValueChange={(val) => setFormData({ ...formData, veterinarianId: val })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Veterinarian" />
                        </SelectTrigger>
                        <SelectContent>
                          {clinicVets.map(vet => (
                            <SelectItem key={vet.id} value={vet.id.toString()}>
                              {vet.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Weight (kg)</Label><Input type="number" step="0.1" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Temperature (°C)</Label><Input type="number" step="0.1" value={formData.temperature} onChange={(e) => setFormData({ ...formData, temperature: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Diagnosis *</Label><Textarea value={formData.diagnosis} onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })} rows={2} required /></div>
                  <div className="space-y-2"><Label>Treatment *</Label><Textarea value={formData.treatment} onChange={(e) => setFormData({ ...formData, treatment: e.target.value })} rows={2} required /></div>
                  <div className="space-y-2"><Label>Prescription</Label><Textarea value={formData.prescription} onChange={(e) => setFormData({ ...formData, prescription: e.target.value })} rows={2} /></div>
                  <div className="space-y-2"><Label>Additional Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} /></div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">{editingRecord ? 'Update Record' : 'Save Record'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={!selectedOwnerId ? "Search owners..." : !selectedPet ? "Search pets..." : "Search diagnosis or treatment..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
           {!selectedOwnerId ? renderOwnersView() : !selectedPet ? renderPetsView() : renderRecordsView()}
        </CardContent>
      </Card>

      {/* View Record Read-Only Modal */}
      <Dialog open={!!viewingRecord} onOpenChange={() => setViewingRecord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Medical Record Details</DialogTitle></DialogHeader>
          {viewingRecord && (() => {
            const pet = (viewingRecord as any).pet || petsStorage.getById((viewingRecord as any).petId);
            const vet = (viewingRecord as any).veterinarian;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground">Date</Label><p className="font-medium">{(() => { const d = (viewingRecord as any).recordDate || viewingRecord.date; return d && isValid(new Date(d)) ? format(new Date(d), 'MMMM d, yyyy') : '-'; })()}</p></div>
                  <div><Label className="text-muted-foreground">Veterinarian</Label><p className="font-medium">{vet?.name}</p></div>
                </div>
                <div><Label className="text-muted-foreground">Diagnosis</Label><p>{viewingRecord.diagnosis}</p></div>
                <div><Label className="text-muted-foreground">Treatment</Label><p>{viewingRecord.treatment}</p></div>
                {viewingRecord.prescription && <div><Label className="text-muted-foreground">Prescription</Label><p>{viewingRecord.prescription}</p></div>}
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => handleExportPDF(viewingRecord)}><Download className="mr-2 h-4 w-4" /> Print / Export</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
