import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { 
  Calendar, 
  Download,
  CreditCard,
  Loader2,
  DollarSign,
  PieChart,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { format, subDays, startOfMonth, isValid } from 'date-fns';
import type { Billing } from '@/types';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';

const safeFormatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'N/A';
  const parsed = new Date(dateStr);
  return isValid(parsed) ? format(parsed, 'MMM dd, yyyy') : 'N/A';
};

export default function BillingReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [billings, setBillings] = useState<Billing[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const loadReport = useCallback(async (showError = true) => {
    const hasLoaded = billings.length > 0;
    setIsLoading(!hasLoaded);
    setIsRefreshing(hasLoaded);

    try {
      const now = new Date();
      let start: string | undefined;
      let end: string | undefined;
      
      if (dateRange === 'week') {
        start = format(subDays(now, 7), 'yyyy-MM-dd');
        end = format(now, 'yyyy-MM-dd');
      } else if (dateRange === 'month') {
        start = format(startOfMonth(now), 'yyyy-MM-dd');
        end = format(now, 'yyyy-MM-dd');
      }
      
      const [response, statsResponse] = await Promise.all([
        api.getBillings({ 
          per_page: 1000, 
          start_date: start, 
          end_date: end 
        }),
        api.getBillingStats({ 
          start_date: start, 
          end_date: end 
        })
      ]);
      
      const allData = Array.isArray(response) ? response : response.data || [];
      setBillings(allData);
      setLastUpdated(new Date());
      
      if (statsResponse) {
        // Stats are used directly from the response in the return JSX if needed
      }
    } catch (error) {
      console.error('Failed to load billing reports:', error);
      if (showError) {
        toast({
          title: 'Error',
          description: 'Failed to load financial data.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [billings.length, dateRange, toast]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  useEffect(() => {
    const refresh = () => void loadReport(false);
    const intervalId = window.setInterval(refresh, 10000);

    window.addEventListener('focus', refresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refresh);
    };
  }, [loadReport]);

  const exportToExcel = () => {
    if (billings.length === 0) {
      toast({ title: "No data", description: "No records to export.", variant: "destructive" });
      return;
    }

    const headers = ["Invoice #", "Date", "Owner", "Pet", "Total Amount", "Status"];
    const csvContent = [
      headers.join(","),
      ...billings.map(b => [
        `"${b.invoiceNumber}"`,
        `"${safeFormatDate(b.billingDate || b.createdAt)}"`,
        `"${b.owner?.name || 'Walk-in'}"`,
        `"${b.pet?.name || 'N/A'}"`,
        `"${b.totalAmount}"`,
        `"${b.status}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `billing_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalRevenue = billings.reduce((sum, b) => {
    if (b.status === 'paid') {
      return sum + Number(b.totalAmount);
    }
    return sum;
  }, 0);
  
  const pendingAmount = billings.reduce((sum, b) => {
    if (b.status !== 'paid') {
      return sum + Number(b.totalAmount);
    }
    return sum;
  }, 0);
  
  const collectionRate = billings.length > 0 
    ? (billings.filter(b => b.status === 'paid').length / billings.length) * 100 
    : 0;

  const { paginatedData, currentPage, totalPages, nextPage, prevPage } = usePagination(billings, 10);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
        <p className="mt-4 text-muted-foreground">Calculating Financial Reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Billing & Financial Reports</h1>
          </div>
          <p className="text-muted-foreground">Revenue and collection analysis from MySQL</p>
        </div>
        
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="hidden text-xs text-muted-foreground md:inline">
              Updated {format(lastUpdated, 'hh:mm:ss a')}
            </span>
          )}
          <Button variant="outline" onClick={() => loadReport()} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
            <SelectTrigger className="w-48">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time History</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>

          <Button variant="default" onClick={() => window.print()}>
            <Download className="mr-2 h-4 w-4" />
            Print Ledger
          </Button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-primary">
              <DollarSign className="h-4 w-4" /> Total Revenue (Paid)
            </CardDescription>
            <CardTitle className="text-3xl text-primary">₱{totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground font-medium">Successfully collected funds</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-yellow-600">
              <PieChart className="h-4 w-4" /> Outstanding / Pending
            </CardDescription>
            <CardTitle className="text-3xl">₱{pendingAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Unpaid invoices in this period</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Collection Rate
            </CardDescription>
            <CardTitle className="text-3xl">{collectionRate.toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-muted h-1.5 rounded-full mt-1 overflow-hidden">
              <div className="bg-green-500 h-full transition-all duration-1000" style={{ width: `${collectionRate}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Detailed billing records {dateRange === 'all' ? 'since clinic inception' : `for ${dateRange === 'week' ? 'the last 7 days' : 'this month'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client / Pet</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No billing activity found for this period.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono font-bold text-primary">{b.invoiceNumber}</TableCell>
                    <TableCell>
                      {safeFormatDate(b.billingDate || b.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{b.owner?.name || 'Walk-in'}</p>
                        <p className="text-xs text-muted-foreground">Patient: {b.pet?.name || 'N/A'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">₱{Number(b.totalAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">
                      <div className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        b.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {b.status}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {billings.length > 10 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onNext={nextPage}
              onPrev={prevPage}
              className="mt-4"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
