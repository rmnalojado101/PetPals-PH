import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Billing, BillingStatus } from '@/types';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Eye, 
  Download, 
  Trash2, 
  Printer,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Image as ImageIcon,
  FileCheck,
  Wallet,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { BillingModal } from '@/components/billing/BillingModal';
import { ReceiptTemplate } from '@/components/billing/ReceiptTemplate';
import { PaymentProofModal } from '@/components/billing/PaymentProofModal';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';

export default function BillingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<Billing | null>(null);
  const [isReceiptVisible, setIsReceiptVisible] = useState(false);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: billingsData, isLoading } = useQuery({
    queryKey: ['billings', searchTerm, statusFilter],
    queryFn: () => {
      const params: any = { search: searchTerm };
      if (statusFilter !== 'all' && statusFilter !== 'proofs') {
        params.status = statusFilter;
      }
      return api.getBillings(params);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteBilling(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billings'] });
      setSelectedBilling(null);
      setIsModalOpen(false);
      setIsProofModalOpen(false);
      toast({
        title: "Billing deleted",
        description: "The billing record has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete billing.",
        variant: "destructive",
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: BillingStatus }) => 
      api.updateBilling(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billings'] });
      toast({
        title: "Status updated",
        description: "The billing status has been successfully updated.",
      });
    }
  });

  const rawBillings = Array.isArray(billingsData) 
    ? billingsData 
    : (billingsData as any)?.data ?? [];

  const billings = statusFilter === 'proofs' 
    ? rawBillings.filter((b: Billing) => b.proofOfPaymentUrl && b.status !== 'paid')
    : rawBillings;

  const { paginatedData, currentPage, totalPages, nextPage, prevPage } = usePagination(billings, 10);

  const stats = {
    total: rawBillings.reduce((acc: number, b: Billing) => acc + Number(b.totalAmount), 0),
    pending: rawBillings.filter((b: Billing) => b.status === 'pending').length,
    paid: rawBillings.filter((b: Billing) => b.status === 'paid').length,
    proofs: rawBillings.filter((b: Billing) => b.proofOfPaymentUrl && b.status !== 'paid').length
  };

  const getStatusBadge = (status: BillingStatus) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 shadow-sm"><CheckCircle2 className="mr-1 h-3 w-3" /> Paid</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-200/50"><Clock className="mr-1 h-3 w-3" /> Pending</Badge>;
      case 'partially_paid':
        return <Badge variant="secondary" className="bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 border-sky-200/50"><AlertCircle className="mr-1 h-3 w-3" /> Partial</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="bg-rose-500 hover:bg-rose-600 shadow-sm"><XCircle className="mr-1 h-3 w-3" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handlePrint = (billing: Billing) => {
    setSelectedBilling(billing);
    setIsReceiptVisible(true);
  };

  if (isReceiptVisible && selectedBilling) {
    return (
      <div className="p-8 max-w-4xl mx-auto bg-white min-h-screen shadow-lg my-8 rounded-xl animate-in zoom-in-95 duration-300">
        <div className="mb-8 flex justify-between items-center print:hidden border-b pb-6">
          <Button variant="ghost" onClick={() => setIsReceiptVisible(false)} className="hover:bg-slate-100">
            Back to List
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print</Button>
            <Button onClick={() => window.print()}><Download className="mr-2 h-4 w-4" /> Export PDF</Button>
          </div>
        </div>
        <ReceiptTemplate billing={selectedBilling} />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12" data-tour="billing-page">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between bg-white p-8 rounded-2xl border shadow-sm">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Wallet className="h-10 w-10 text-primary" />
            Billing & Payments
          </h1>
          <p className="text-slate-500 text-lg">Manage invoices, track payments, and verify online transactions.</p>
        </div>
        <div className="flex items-center gap-3">
          {(user?.role === 'admin' || user?.role === 'vet_clinic') && (
            <Button size="lg" className="rounded-full px-8 shadow-lg shadow-primary/20 hover:scale-105 transition-transform" onClick={() => { setSelectedBilling(null); setIsModalOpen(true); }}>
              <Plus className="mr-2 h-5 w-5" /> Create New Bill
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none bg-primary/5 shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary/60 uppercase tracking-wider">Total Billing</p>
                <p className="text-2xl font-bold text-primary">PHP {stats.total.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-amber-50 shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600/60 uppercase tracking-wider">Pending Bills</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-emerald-50 shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600/60 uppercase tracking-wider">Paid Invoices</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.paid}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-blue-50 shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600/60 uppercase tracking-wider">Online Proofs</p>
                <p className="text-2xl font-bold text-blue-600">{stats.proofs}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileCheck className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden p-6 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
            <TabsList className="bg-slate-100 p-1 rounded-xl h-auto">
              <TabsTrigger value="all" className="rounded-lg px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">All</TabsTrigger>
              <TabsTrigger value="pending" className="rounded-lg px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Pending</TabsTrigger>
              <TabsTrigger value="partially_paid" className="rounded-lg px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Partial</TabsTrigger>
              <TabsTrigger value="paid" className="rounded-lg px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Paid</TabsTrigger>
              <TabsTrigger value="cancelled" className="rounded-lg px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Canceled</TabsTrigger>
              <TabsTrigger value="proofs" className="rounded-lg px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                Proofs
                {stats.proofs > 0 && <span className="h-5 w-5 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center animate-pulse">{stats.proofs}</span>}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search invoices..."
              className="pl-10 border-slate-200 focus:ring-primary/20 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-bold text-slate-700">Invoice #</TableHead>
                <TableHead className="font-bold text-slate-700">Pet / Owner</TableHead>
                <TableHead className="font-bold text-slate-700">Date</TableHead>
                <TableHead className="font-bold text-slate-700 text-right">Amount</TableHead>
                <TableHead className="font-bold text-slate-700">Status</TableHead>
                <TableHead className="font-bold text-slate-700">Proof</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      <span className="text-slate-500 font-medium animate-pulse">Fetching records...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : billings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Receipt className="h-12 w-12 opacity-20 mb-2" />
                      <p className="text-lg font-medium">No billing records found</p>
                      <p className="text-sm">Try adjusting your filters or search term.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((billing: Billing) => (
                  <TableRow key={billing.id} className="hover:bg-slate-50/80 transition-colors group">
                    <TableCell className="font-bold text-primary tracking-tight">#{billing.invoiceNumber}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">{billing.pet?.name}</span>
                        <span className="text-xs text-slate-500">
                          {billing.owner?.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-600 font-medium">
                        {billing.billingDate ? format(new Date(billing.billingDate), 'MMM dd, yyyy') : 'No date'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-slate-900 font-extrabold text-lg tracking-tight">
                        PHP {Number(billing.totalAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(billing.status)}</TableCell>
                    <TableCell>
                      {billing.proofOfPaymentUrl ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 rounded-full border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-all flex items-center gap-1.5"
                          onClick={() => window.open(billing.proofOfPaymentUrl, '_blank')}
                        >
                          <ImageIcon className="h-3.5 w-3.5" /> 
                          <span className="text-[11px] font-bold uppercase tracking-wider">Review Proof</span>
                        </Button>
                      ) : (
                        <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest ml-2">No Proof</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                            <MoreVertical className="h-4 w-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl shadow-xl border-slate-100">
                          <DropdownMenuItem className="rounded-lg py-2.5" onClick={() => handlePrint(billing)}>
                            <Eye className="mr-2 h-4 w-4 text-slate-500" /> View Receipt
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg py-2.5" onClick={() => handlePrint(billing)}>
                            <Printer className="mr-2 h-4 w-4 text-slate-500" /> Print / Export
                          </DropdownMenuItem>

                          
                          {user?.role === 'owner' && (billing.status === 'pending' || billing.status === 'partially_paid') && (
                            <DropdownMenuItem className="rounded-lg py-2.5 bg-primary/5 text-primary font-bold mt-1" onClick={() => { setSelectedBilling(billing); setIsProofModalOpen(true); }}>
                              <CreditCard className="mr-2 h-4 w-4" /> Pay Online Now
                            </DropdownMenuItem>
                          )}
  
                          {(user?.role === 'admin' || user?.role === 'vet_clinic') && (
                            <>
                              <div className="h-px bg-slate-100 my-1" />
                              <DropdownMenuItem className="rounded-lg py-2.5" onClick={() => { setSelectedBilling(billing); setIsModalOpen(true); }}>
                                <CreditCard className="mr-2 h-4 w-4 text-slate-500" /> Edit / Add Payment
                              </DropdownMenuItem>
                              {billing.status === 'pending' && (
                                <DropdownMenuItem 
                                  className="rounded-lg py-2.5 text-emerald-600 font-bold bg-emerald-50 mt-1"
                                  onClick={() => updateStatusMutation.mutate({ id: billing.id, status: 'paid' })}
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Full Paid
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                className="rounded-lg py-2.5 text-rose-600 mt-1 hover:bg-rose-50"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this billing record?')) {
                                    deleteMutation.mutate(billing.id);
                                  }
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Remove Record
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {billings.length > 10 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onNext={nextPage}
            onPrev={prevPage}
          />
        )}
      </div>

      <BillingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        billing={selectedBilling}
      />

      <PaymentProofModal
        isOpen={isProofModalOpen}
        onClose={() => setIsProofModalOpen(false)}
        billing={selectedBilling}
      />
    </div>
  );
}
