import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Billing } from '@/types';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Image as ImageIcon, CheckCircle2, QrCode, CreditCard } from 'lucide-react';

interface PaymentProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  billing: Billing | null;
}

export function PaymentProofModal({ isOpen, onClose, billing }: PaymentProofModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Only validate billing existence if modal is open
  // Use silent error handling to avoid showing errors during normal operations
  const { data: freshBilling, isError: billingNotFound, isLoading: isValidating } = useQuery({
    queryKey: ['billing', billing?.id],
    queryFn: () => {
      if (!billing?.id) return Promise.reject(new Error('No billing id'));
      return api.getBillingById(billing.id);
    },
    enabled: isOpen && !!billing?.id,
    staleTime: 0,
    retry: 0, // Don't retry 404s
    throwOnError: false, // Don't throw errors
  });

  // Deriving clinic ID from the billing record
  const clinicId = billing?.medicalRecord?.veterinarian?.clinicId || 
                   (billing?.medicalRecord?.veterinarian as any)?.clinic_id ||
                   billing?.vaccination?.administeredByUser?.clinicId ||
                   (billing?.vaccination?.administeredByUser as any)?.clinic_id ||
                   (billing?.medicalRecord?.veterinarian?.role === 'vet_clinic' ? billing?.medicalRecord?.veterinarian?.id : null) ||
                   (billing?.vaccination?.administeredByUser?.role === 'vet_clinic' ? billing?.vaccination?.administeredByUser?.id : null);

  const { data: settings } = useQuery({
    queryKey: ['settings', clinicId],
    queryFn: () => clinicId ? api.getClinicSettings(clinicId) : api.getSettings(),
    enabled: isOpen, // Only fetch settings when modal is open
  });

  // Close modal if billing record was deleted
  useEffect(() => {
    if (isOpen && billingNotFound) {
      onClose();
    }
  }, [billingNotFound, isOpen, onClose]);

  const paymentMethods = (settings as any)?.paymentMethodsWithUrls || [];
  const selectedMethod = paymentMethods.find((m: any) => m.id === selectedMethodId) || (paymentMethods.length > 0 ? paymentMethods[0] : null);

  const mutation = useMutation({
    mutationFn: (formData: FormData) => api.updateBilling(billing!.id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billings'] });
      toast({
        title: "Proof uploaded",
        description: "Your proof of payment has been submitted for review.",
      });
      setFile(null);
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload proof.",
        variant: "destructive",
      });
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !billing) return;

    const formData = new FormData();
    formData.append('proof_of_payment', file);
    formData.append('payment_method', selectedMethod?.label || 'online');
    
    mutation.mutate(formData);
  };

  if (!billing) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Online Payment - {billing.invoiceNumber}
          </DialogTitle>
          <DialogDescription>
            Choose your preferred payment method and scan the QR code.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Payment Method Selection */}
          {paymentMethods.length > 0 ? (
            <div className="space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {paymentMethods.map((method: any) => (
                  <Button
                    key={method.id}
                    variant={selectedMethod?.id === method.id ? 'default' : 'outline'}
                    className="shrink-0"
                    onClick={() => setSelectedMethodId(method.id)}
                  >
                    {method.label}
                  </Button>
                ))}
              </div>

              {selectedMethod && (
                <div className="flex flex-col items-center p-4 bg-primary/5 rounded-xl border border-primary/10 animate-in fade-in zoom-in duration-300">
                  <p className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                    <QrCode className="h-4 w-4" /> Scan {selectedMethod.label} QR
                  </p>
                  <div className="bg-white p-2 rounded-lg shadow-sm border mb-3">
                    <img 
                      src={selectedMethod.qrCodeUrl} 
                      alt={selectedMethod.label} 
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Please make sure to save a screenshot of your transaction.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-muted/30 rounded-xl border border-dashed text-center">
              <p className="text-sm text-muted-foreground">
                No payment methods provided by the clinic yet.
                Please contact the clinic for payment details.
              </p>
            </div>
          )}

          {/* Upload Section */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="proof" className="font-semibold">Upload Proof of Payment</Label>
              <div className={`
                relative border-2 border-dashed rounded-xl p-8 transition-all
                flex flex-col items-center justify-center gap-3 cursor-pointer
                ${file ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:border-primary hover:bg-primary/5'}
              `}>
                <Input 
                  id="proof" 
                  type="file" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                />
                
                {file ? (
                  <>
                    <div className="bg-green-500 p-2 rounded-full shadow-lg">
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-green-700 line-clamp-1">{file.name}</p>
                      <p className="text-xs text-green-600">{(file.size / 1024 / 1024).toFixed(2)} MB • Ready to upload</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-primary/10 p-3 rounded-full text-primary">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold">Click or drag to upload</p>
                      <p className="text-xs text-muted-foreground mt-1">Supports JPG, PNG, PDF, Word (Max 10MB)</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={!file || mutation.isPending} className="px-8">
                {mutation.isPending ? 'Uploading...' : 'Submit Payment Proof'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
