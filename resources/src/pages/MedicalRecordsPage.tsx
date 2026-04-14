import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  medicalRecordsStorage, 
  petsStorage, 
  usersStorage,
  appointmentsStorage 
} from '@/lib/storage';
import type { MedicalRecord } from '@/types';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Plus, 
  Search,  
  Calendar as CalendarIcon,
  Eye,
  Edit,
  Trash2,
  Stethoscope,
  FileText,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function MedicalRecordsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<MedicalRecord | null>(null);
  
  // Form state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    petId: '',
    diagnosis: '',
    treatment: '',
    prescription: '',
    labResults: '',
    notes: '',
    weight: '',
    temperature: '',
    followUpDate: '',
  });

  useEffect(() => {
    loadRecords();
  }, [user]);

  const loadRecords = () => {
    if (!user) return;
    
    let data: MedicalRecord[];
    if (user.role === 'owner') {
      const myPets = petsStorage.getByOwner(user.id);
      data = myPets.flatMap(pet => medicalRecordsStorage.getByPet(pet.id));
    } else if (user.role === 'veterinarian') {
      data = medicalRecordsStorage.getByVet(user.id);
    } else {
      data = medicalRecordsStorage.getAll();
    }
    
    data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setRecords(data);
  };

  const resetForm = () => {
    setFormData({
      petId: '',
      diagnosis: '',
      treatment: '',
      prescription: '',
      labResults: '',
      notes: '',
      weight: '',
      temperature: '',
      followUpDate: '',
    });
    setSelectedDate(new Date());
    setEditingRecord(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.petId || !formData.diagnosis || !formData.treatment) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const recordData = {
      petId: formData.petId,
      veterinarianId: user?.id || '',
      date: format(selectedDate, 'yyyy-MM-dd'),
      diagnosis: formData.diagnosis,
      treatment: formData.treatment,
      prescription: formData.prescription || undefined,
      labResults: formData.labResults || undefined,
      notes: formData.notes || undefined,
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
      followUpDate: formData.followUpDate || undefined,
    };

    if (editingRecord) {
      medicalRecordsStorage.update(editingRecord.id, recordData);
      toast({
        title: 'Record Updated',
        description: 'Medical record has been updated.',
      });
    } else {
      medicalRecordsStorage.create(recordData);
      toast({
        title: 'Record Created',
        description: 'Medical record has been saved.',
      });
    }

    loadRecords();
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (record: MedicalRecord) => {
    setEditingRecord(record);
    setFormData({
      petId: record.petId,
      diagnosis: record.diagnosis,
      treatment: record.treatment,
      prescription: record.prescription || '',
      labResults: record.labResults || '',
      notes: record.notes || '',
      weight: record.weight?.toString() || '',
      temperature: record.temperature?.toString() || '',
      followUpDate: record.followUpDate || '',
    });
    setSelectedDate(new Date(record.date));
    setIsDialogOpen(true);
  };

  const handleDelete = (record: MedicalRecord) => {
    if (confirm('Are you sure you want to delete this medical record?')) {
      medicalRecordsStorage.delete(record.id);
      toast({
        title: 'Record Deleted',
        description: 'Medical record has been removed.',
        variant: 'destructive',
      });
      loadRecords();
    }
  };

  const handleExportPDF = (record: MedicalRecord) => {
    const pet = petsStorage.getById(record.petId);
    const owner = pet ? usersStorage.getById(pet.ownerId) : null;
    const vet = usersStorage.getById(record.veterinarianId);
    
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
            <div class="section">
              <p class="label">Patient:</p>
              <p>${pet?.name} (${pet?.species} - ${pet?.breed})</p>
            </div>
            <div class="section">
              <p class="label">Owner:</p>
              <p>${owner?.name}</p>
            </div>
            <div class="section">
              <p class="label">Date:</p>
              <p>${format(new Date(record.date), 'MMMM d, yyyy')}</p>
            </div>
            <div class="section">
              <p class="label">Attending Veterinarian:</p>
              <p>${vet?.name}</p>
            </div>
          </div>
          <div class="section">
            <p class="label">Diagnosis:</p>
            <p>${record.diagnosis}</p>
          </div>
          <div class="section">
            <p class="label">Treatment:</p>
            <p>${record.treatment}</p>
          </div>
          ${record.prescription ? `<div class="section"><p class="label">Prescription:</p><p>${record.prescription}</p></div>` : ''}
          ${record.labResults ? `<div class="section"><p class="label">Lab Results:</p><p>${record.labResults}</p></div>` : ''}
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
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const pets = user?.role === 'owner' 
    ? petsStorage.getByOwner(user.id)
    : petsStorage.getAll();

  const filteredRecords = records.filter(record => {
    const pet = petsStorage.getById(record.petId);
    const matchesSearch = 
      pet?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.treatment.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const canEdit = user?.role === 'veterinarian' || user?.role === 'admin';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Medical Records</h1>
          <p className="text-muted-foreground">View and manage consultation records</p>
        </div>
        
        {canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRecord ? 'Edit Record' : 'New Medical Record'}</DialogTitle>
                <DialogDescription>
                  Enter the consultation details
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
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
                      <Label>Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(selectedDate, 'PPP')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => date && setSelectedDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Weight (kg)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                        placeholder="e.g., 5.5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Temperature (°C)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.temperature}
                        onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                        placeholder="e.g., 38.5"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Diagnosis *</Label>
                    <Textarea
                      value={formData.diagnosis}
                      onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                      placeholder="Enter diagnosis..."
                      rows={2}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Treatment *</Label>
                    <Textarea
                      value={formData.treatment}
                      onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                      placeholder="Enter treatment plan..."
                      rows={2}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Prescription</Label>
                    <Textarea
                      value={formData.prescription}
                      onChange={(e) => setFormData({ ...formData, prescription: e.target.value })}
                      placeholder="Medications and dosage..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Lab Results</Label>
                    <Textarea
                      value={formData.labResults}
                      onChange={(e) => setFormData({ ...formData, labResults: e.target.value })}
                      placeholder="Any lab test results..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Additional Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any other observations..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Follow-up Date</Label>
                    <Input
                      type="date"
                      value={formData.followUpDate}
                      onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingRecord ? 'Update Record' : 'Save Record'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* View Record Dialog */}
      <Dialog open={!!viewingRecord} onOpenChange={() => setViewingRecord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Medical Record Details</DialogTitle>
          </DialogHeader>
          {viewingRecord && (() => {
            const pet = petsStorage.getById(viewingRecord.petId);
            const owner = pet ? usersStorage.getById(pet.ownerId) : null;
            const vet = usersStorage.getById(viewingRecord.veterinarianId);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Date</Label>
                    <p className="font-medium">{format(new Date(viewingRecord.date), 'MMMM d, yyyy')}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Veterinarian</Label>
                    <p className="font-medium">{vet?.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Pet</Label>
                    <p className="font-medium">{pet?.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{pet?.species} - {pet?.breed}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Owner</Label>
                    <p className="font-medium">{owner?.name}</p>
                  </div>
                </div>
                {(viewingRecord.weight || viewingRecord.temperature) && (
                  <div className="grid grid-cols-2 gap-4">
                    {viewingRecord.weight && (
                      <div>
                        <Label className="text-muted-foreground">Weight</Label>
                        <p>{viewingRecord.weight} kg</p>
                      </div>
                    )}
                    {viewingRecord.temperature && (
                      <div>
                        <Label className="text-muted-foreground">Temperature</Label>
                        <p>{viewingRecord.temperature}°C</p>
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Diagnosis</Label>
                  <p>{viewingRecord.diagnosis}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Treatment</Label>
                  <p>{viewingRecord.treatment}</p>
                </div>
                {viewingRecord.prescription && (
                  <div>
                    <Label className="text-muted-foreground">Prescription</Label>
                    <p>{viewingRecord.prescription}</p>
                  </div>
                )}
                {viewingRecord.labResults && (
                  <div>
                    <Label className="text-muted-foreground">Lab Results</Label>
                    <p>{viewingRecord.labResults}</p>
                  </div>
                )}
                {viewingRecord.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p>{viewingRecord.notes}</p>
                  </div>
                )}
                {viewingRecord.followUpDate && (
                  <div>
                    <Label className="text-muted-foreground">Follow-up Date</Label>
                    <p>{viewingRecord.followUpDate}</p>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => handleExportPDF(viewingRecord)}>
                    <Download className="mr-2 h-4 w-4" />
                    Print / Export
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by pet name, diagnosis, or treatment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardContent className="p-0">
          {filteredRecords.length === 0 ? (
            <div className="py-16 text-center">
              <Stethoscope className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No medical records found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search' : 'No records have been created yet'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Pet</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead>Treatment</TableHead>
                  <TableHead>Veterinarian</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => {
                  const pet = petsStorage.getById(record.petId);
                  const vet = usersStorage.getById(record.veterinarianId);
                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        <p className="font-medium">{format(new Date(record.date), 'MMM d, yyyy')}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{pet?.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{pet?.species}</p>
                      </TableCell>
                      <TableCell>
                        <p className="line-clamp-2 max-w-48">{record.diagnosis}</p>
                      </TableCell>
                      <TableCell>
                        <p className="line-clamp-2 max-w-48">{record.treatment}</p>
                      </TableCell>
                      <TableCell>
                        <p>{vet?.name}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingRecord(record)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleExportPDF(record)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(record)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(record)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
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
