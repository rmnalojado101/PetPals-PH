import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  Billing, 
  User,
  Pet, 
  MedicalRecord, 
  Vaccination, 
  BillingItem, 
  BillingStatus 
} from '@/types';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Plus, 
  Trash2, 
  User as UserIcon,
  PawPrint,
  Syringe, 
  Stethoscope 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  billing: Billing | null;
}

export function BillingModal({ isOpen, onClose, billing }: BillingModalProps) {
  const [ownerId, setOwnerId] = useState<string>('');
  const [petId, setPetId] = useState<string>('');
  const [medicalRecordId, setMedicalRecordId] = useState<string>('none');
  const [vaccinationId, setVaccinationId] = useState<string>('none');
  const [items, setItems] = useState<BillingItem[]>([]);
  const [status, setStatus] = useState<BillingStatus>('pending');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [notes, setNotes] = useState<string>('');
  const [billingDate, setBillingDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all owners
  const { data: ownersData } = useQuery({
    queryKey: ['owners-billing'],
    queryFn: () => api.getOwners(),
    enabled: isOpen,
  });
  const owners = Array.isArray(ownersData) ? ownersData : ownersData?.data ?? [];

  // Fetch pets for the selected owner
  const { data: pets = [] } = useQuery({
    queryKey: ['pets-billing', ownerId],
    queryFn: async () => {
      const response = await api.getPets({ owner_id: ownerId });
      return Array.isArray(response) ? response : response.data ?? [];
    },
    enabled: !!ownerId && isOpen,
  });

  // Fetch unbilled medical records for the selected pet
  const { data: medicalRecordsData } = useQuery({
    queryKey: ['pet-unbilled-records', petId],
    queryFn: () => api.getPetHistory(petId, { unbilled: 'true' }),
    enabled: !!petId && isOpen,
  });
  const medicalRecords = Array.isArray(medicalRecordsData) ? medicalRecordsData : medicalRecordsData?.data ?? [];

  // Fetch unbilled vaccinations for the selected pet
  const { data: vaccinationsData } = useQuery({
    queryKey: ['pet-unbilled-vaccinations', petId],
    queryFn: () => api.getVaccinations({ pet_id: petId, unbilled: 'true' }),
    enabled: !!petId && isOpen,
  });

  const vaccinations = Array.isArray(vaccinationsData) ? vaccinationsData : vaccinationsData?.data ?? [];

  useEffect(() => {
    if (billing) {
      setOwnerId(String(billing.ownerId));
      setPetId(String(billing.petId));
      setMedicalRecordId(billing.medicalRecordId ? String(billing.medicalRecordId) : 'none');
      setVaccinationId(billing.vaccinationId ? String(billing.vaccinationId) : 'none');
      setItems(billing.items);
      setStatus(billing.status);
      setPaymentMethod(billing.paymentMethod || 'cash');
      setNotes(billing.notes || '');
      setBillingDate(billing.billingDate ? format(new Date(billing.billingDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    } else {
      setOwnerId('');
      setPetId('');
      setMedicalRecordId('none');
      setVaccinationId('none');
      setItems([{ description: 'Consultation Fee', quantity: 1, price: 500 }]);
      setStatus('pending');
      setPaymentMethod('cash');
      setNotes('');
      setBillingDate(format(new Date(), 'yyyy-MM-dd'));
    }
  }, [billing, isOpen]);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [items]);

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof BillingItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleMedicalRecordSelect = (id: string) => {
    setMedicalRecordId(id);
    if (id !== 'none') {
      setVaccinationId('none');
    }
    if (id !== 'none') {
      const record = medicalRecords.find((r: any) => String(r.id) === id);
      if (record) {
        setItems([{ description: `Consultation: ${record.diagnosis || 'General Checkup'}`, quantity: 1, price: 500 }]);
      }
    }
  };

  const handleVaccinationSelect = (id: string) => {
    setVaccinationId(id);
    if (id !== 'none') {
      setMedicalRecordId('none');
    }
    if (id !== 'none') {
      const vac = vaccinations.find((v: any) => String(v.id) === id);
      if (vac) {
        setItems([{ description: `Vaccination: ${vac.name}`, quantity: 1, price: 800 }]);
      }
    }
  };

  const mutation = useMutation({
    mutationFn: (data: any) => billing 
      ? api.updateBilling(billing.id, data) 
      : api.createBilling(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billings'] });
      toast({
        title: billing ? "Billing updated" : "Billing created",
        description: `Successfully ${billing ? 'updated' : 'created'} the billing record.`,
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save billing.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerId) {
      toast({ title: "Error", description: "Please select an owner.", variant: "destructive" });
      return;
    }
    if (!petId) {
      toast({ title: "Error", description: "Please select a pet.", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Error", description: "Please add at least one item.", variant: "destructive" });
      return;
    }

    mutation.mutate({
      pet_id: petId,
      owner_id: ownerId,
      medical_record_id: medicalRecordId === 'none' ? null : medicalRecordId,
      vaccination_id: vaccinationId === 'none' ? null : vaccinationId,
      total_amount: totalAmount,
      status,
      payment_method: paymentMethod,
      items,
      billing_date: billingDate,
      notes,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <span className="bg-primary/10 p-2 rounded-full"><PawPrint className="h-5 w-5 text-primary" /></span>
            {billing ? 'Edit Billing' : 'Create New Billing'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="owner" className="flex items-center gap-2 font-semibold">
                <UserIcon className="h-4 w-4 text-primary" /> Select Pet Owner
              </Label>
              <Select
                value={ownerId}
                onValueChange={(val) => {
                  setOwnerId(val);
                  setPetId('');
                  setMedicalRecordId('none');
                  setVaccinationId('none');
                }}
              >
                <SelectTrigger className="border-primary/20 focus:ring-primary/30 bg-white">
                  <SelectValue placeholder="-- Choose an Owner --" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {owners.length === 0 ? (
                    <div className="p-2 text-sm text-center text-muted-foreground">No owners found</div>
                  ) : (
                    owners.map((owner) => (
                      <SelectItem key={owner.id} value={String(owner.id)}>
                        {owner.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pet" className="flex items-center gap-2 font-semibold">
                <PawPrint className="h-4 w-4 text-primary" /> Select Pet
              </Label>
              <Select
                value={petId}
                onValueChange={(val) => {
                  setPetId(val);
                  setMedicalRecordId('none');
                  setVaccinationId('none');
                }}
                disabled={!ownerId}
              >
                <SelectTrigger className="border-primary/20 focus:ring-primary/30 bg-white">
                  <SelectValue placeholder={ownerId ? "-- Choose a Pet --" : "Select owner first"} />
                </SelectTrigger>
                <SelectContent>
                  {pets.length === 0 ? (
                    <div className="p-2 text-sm text-center text-muted-foreground">No pets found</div>
                  ) : (
                    pets.map((pet) => (
                      <SelectItem key={pet.id} value={String(pet.id)}>
                        {pet.name} ({pet.breed})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Billing Date</Label>
            <Input 
              id="date" 
              type="date" 
              value={billingDate} 
              onChange={(e) => setBillingDate(e.target.value)} 
              className="border-primary/20"
            />
          </div>

          {petId && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 p-4 bg-primary/5 rounded-xl border border-primary/10">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-primary font-semibold">
                  <Stethoscope className="h-4 w-4" /> 
                  Unbilled Consultations
                </Label>
                <Select value={medicalRecordId} onValueChange={handleMedicalRecordSelect}>
                  <SelectTrigger className="bg-white border-primary/20">
                    <SelectValue placeholder="Select a record" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {medicalRecords.map((record: any) => {
                      const dateVal = record.recordDate || record.date;
                      const formattedDate = dateVal ? format(new Date(dateVal), 'MMM dd') : 'No date';
                      return (
                        <SelectItem key={record.id} value={String(record.id)}>
                          {formattedDate} - {record.diagnosis || 'No diagnosis'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-primary font-semibold">
                  <Syringe className="h-4 w-4" /> 
                  Unbilled Vaccinations
                </Label>
                <Select value={vaccinationId} onValueChange={handleVaccinationSelect}>
                  <SelectTrigger className="bg-white border-primary/20">
                    <SelectValue placeholder="Select a vaccination" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vaccinations.map((vac: any) => {
                      const dateVal = vac.dateAdministered;
                      const formattedDate = dateVal ? format(new Date(dateVal), 'MMM dd') : 'No date';
                      return (
                        <SelectItem key={vac.id} value={String(vac.id)}>
                          {formattedDate} - {vac.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <Label className="text-lg font-bold text-slate-700">Billing Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="border-primary/50 text-primary hover:bg-primary/5">
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-3 items-end p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Description</Label>
                    <Input 
                      placeholder="e.g. Consultation, Medicine" 
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="border-slate-200 focus:border-primary"
                    />
                  </div>
                  <div className="w-20 space-y-1">
                    <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Qty</Label>
                    <Input 
                      type="number" 
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                      className="border-slate-200"
                    />
                  </div>
                  <div className="w-32 space-y-1">
                    <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Price (₱)</Label>
                    <Input 
                      type="number" 
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
                      className="border-slate-200"
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:bg-destructive/10 h-10 w-10"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end p-6 bg-slate-900 rounded-xl shadow-inner">
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Total Amount Due</p>
                <p className="text-4xl font-black text-primary drop-shadow-sm">₱{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Payment Status</Label>
              <Select value={status} onValueChange={(val: BillingStatus) => setStatus(val)}>
                <SelectTrigger className="border-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="border-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="gcash">GCash</SelectItem>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea 
              id="notes" 
              placeholder="Additional information or internal notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border-slate-200 min-h-[100px]"
            />
          </div>

          <DialogFooter className="gap-2 border-t pt-6">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="px-8 font-bold shadow-lg shadow-primary/20">
              {mutation.isPending ? 'Saving...' : (billing ? 'Update Billing' : 'Generate Invoice')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
