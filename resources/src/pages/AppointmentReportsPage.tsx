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
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  BarChart3
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, parse, isValid } from 'date-fns';
import type { Appointment } from '@/types';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';

const safeFormatTime = (timeStr: string | null | undefined) => {
  if (!timeStr) return 'N/A';
  try {
    // Check if already in 12h format
    if (/ (AM|PM)$/i.test(timeStr)) return timeStr;
    
    // Try parsing as HH:mm:ss or HH:mm
    let parsed = parse(timeStr, 'HH:mm:ss', new Date());
    if (!isValid(parsed)) {
      parsed = parse(timeStr, 'HH:mm', new Date());
    }
    
    return isValid(parsed) ? format(parsed, 'hh:mm a') : timeStr;
  } catch (e) {
    return timeStr;
  }
};

const safeFormatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'N/A';
  try {
    const parsed = new Date(dateStr);
    return isValid(parsed) ? format(parsed, 'MMM dd, yyyy') : dateStr;
  } catch (e) {
    return dateStr;
  }
};

export default function AppointmentReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  const loadReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.getAppointments({ per_page: 1000 }); // Get more for detailed export
      const allData = Array.isArray(response) ? response : response.data || [];
      
      const now = new Date();
      let filtered = allData;
      
      if (dateRange === 'week') {
        const start = subDays(now, 7);
        filtered = allData.filter(a => a.appointmentDate && isWithinInterval(new Date(a.appointmentDate), { start, end: now }));
      } else if (dateRange === 'month') {
        const start = startOfMonth(now);
        const end = endOfMonth(now);
        filtered = allData.filter(a => a.appointmentDate && isWithinInterval(new Date(a.appointmentDate), { start, end }));
      }
      
      setAppointments(filtered);
    } catch (error) {
      console.error('Failed to load appointment reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to load appointment data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, toast]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const exportToExcel = () => {
    if (appointments.length === 0) {
      toast({ title: "No data", description: "No records to export.", variant: "destructive" });
      return;
    }

    const headers = ["Date", "Time", "Pet", "Owner", "Reason", "Veterinarian", "Status"];
    const csvContent = [
      headers.join(","),
      ...appointments.map(a => [
        `"${safeFormatDate(a.appointmentDate)}"`,
        `"${safeFormatTime(a.time || a.appointmentTime)}"`,
        `"${a.pet?.name || 'Unknown'}"`,
        `"${a.owner?.name || 'N/A'}"`,
        `"${a.reason || 'General Checkup'}"`,
        `"${a.veterinarian?.name || 'Not Assigned'}"`,
        `"${a.status}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `appointment_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const total = appointments.length;
  const completed = appointments.filter(a => a.status === 'completed').length;
  const cancelled = appointments.filter(a => a.status === 'cancelled').length;
  const pending = appointments.filter(a => a.status === 'pending').length;
  
  const completionRate = total > 0 ? (completed / total) * 100 : 0;

  const { paginatedData, currentPage, totalPages, nextPage, prevPage } = usePagination(appointments, 10);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
        <p className="mt-4 text-muted-foreground">Analyzing Appointment History...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Appointment Reports</h1>
          </div>
          <p className="text-muted-foreground">Review visit frequency and scheduling efficiency</p>
        </div>
        
        <div className="flex items-center gap-3">
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
            Export Excel
          </Button>

          <Button variant="default" onClick={() => window.print()}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" /> Total Bookings
            </CardDescription>
            <CardTitle className="text-3xl">{total}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Completed
            </CardDescription>
            <CardTitle className="text-3xl">{completed}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-yellow-600">
              <Clock className="h-4 w-4" /> Pending
            </CardDescription>
            <CardTitle className="text-3xl">{pending}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-red-600">
              <XCircle className="h-4 w-4" /> Cancelled
            </CardDescription>
            <CardTitle className="text-3xl">{cancelled}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-primary uppercase tracking-wider">Clinic Fulfillment Rate</p>
            <h3 className="text-2xl font-black text-primary">{completionRate.toFixed(1)}%</h3>
          </div>
          <div className="w-2/3 bg-white/50 h-3 rounded-full overflow-hidden">
            <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${completionRate}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Appointment History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment History Log</CardTitle>
          <CardDescription>
            Detailed list of all visits {dateRange === 'all' ? 'on record' : `for ${dateRange === 'week' ? 'the past 7 days' : 'this month'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Patient / Owner</TableHead>
                <TableHead>Service / Reason</TableHead>
                <TableHead>Veterinarian</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No appointments found for the selected period.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <p className="font-semibold">{safeFormatDate(a.appointmentDate)}</p>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {safeFormatTime(a.time || a.appointmentTime)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{a.pet?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">Owner: {a.owner?.name || 'N/A'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{a.reason || 'General Checkup'}</span>
                    </TableCell>
                    <TableCell>{a.veterinarian?.name || 'Not Assigned'}</TableCell>
                    <TableCell className="text-right">
                      <div className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        a.status === 'completed' ? 'bg-green-100 text-green-700' : 
                        a.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {a.status}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {appointments.length > 10 && (
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
