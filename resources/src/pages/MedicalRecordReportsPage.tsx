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
  Stethoscope,
  Loader2,
  Activity,
  ClipboardList
} from 'lucide-react';
import { format, subDays, startOfMonth } from 'date-fns';
import type { MedicalRecord } from '@/types';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';

export default function MedicalRecordReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  
  const loadReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      let start = null;
      const end = format(now, 'yyyy-MM-dd');
      
      if (dateRange === 'week') {
        start = format(subDays(now, 7), 'yyyy-MM-dd');
      } else if (dateRange === 'month') {
        start = format(startOfMonth(now), 'yyyy-MM-dd');
      }
      
      const [response, statsResponse] = await Promise.all([
        api.getMedicalRecords({ 
          per_page: 1000, 
          start_date: start, 
          end_date: end 
        }),
        api.getMedicalRecordStats({ 
          start_date: start, 
          end_date: end 
        })
      ]);
      
      const allData = Array.isArray(response) ? response : response.data || [];
      setRecords(allData);
      
      // We can also use statsResponse for the totals
      if (statsResponse) {
        // Option to use statsResponse.total if preferred
      }
    } catch (error) {
      console.error('Failed to load medical record reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to load consultation data.',
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
    if (records.length === 0) {
      toast({ title: "No data", description: "No records to export.", variant: "destructive" });
      return;
    }

    const headers = ["Date", "Pet Name", "Owner", "Diagnosis", "Treatment", "Veterinarian"];
    const csvContent = [
      headers.join(","),
      ...records.map(r => [
        r.recordDate || 'N/A',
        `"${r.pet?.name || 'Unknown'}"`,
        `"${r.pet?.owner?.name || 'N/A'}"`,
        `"${(r.diagnosis || '').replace(/"/g, '""')}"`,
        `"${(r.treatment || '').replace(/"/g, '""')}"`,
        `"${r.veterinarian?.name || 'Staff'}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `medical_record_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalConsultations = records.length;
  const uniquePatients = Array.from(new Set(records.map(r => r.petId))).length;
  
  const { paginatedData, currentPage, totalPages, nextPage, prevPage } = usePagination(records, 10);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
        <p className="mt-4 text-muted-foreground">Analyzing Clinical Records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Consultation Reports</h1>
          </div>
          <p className="text-muted-foreground">Overview of clinical visits and diagnoses</p>
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
            Export CSV
          </Button>

          <Button variant="default" onClick={() => window.print()}>
            <Download className="mr-2 h-4 w-4" />
            Print Log
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-blue-500" /> Total Consultations
            </CardDescription>
            <CardTitle className="text-3xl">{totalConsultations}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Total records found in this period</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" /> Unique Patients
            </CardDescription>
            <CardTitle className="text-3xl">{uniquePatients}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Number of distinct animals treated</p>
          </CardContent>
        </Card>
        
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary">Clinical Volume</CardDescription>
            <CardTitle className="text-xl">
              {(totalConsultations / (dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 365)).toFixed(1)} / day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Average consultations per day</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clinical Activity Log</CardTitle>
          <CardDescription>
            Detailed consultation records {dateRange === 'all' ? 'on file' : `for ${dateRange === 'week' ? 'the past 7 days' : 'this month'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Patient / Owner</TableHead>
                <TableHead>Diagnosis</TableHead>
                <TableHead>Veterinarian</TableHead>
                <TableHead className="text-right">Follow-up</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No medical records found for the selected period.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.recordDate ? format(new Date(r.recordDate), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{r.pet?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{r.pet?.owner?.name || 'N/A'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="line-clamp-2 text-xs">{r.diagnosis || 'No diagnosis recorded'}</span>
                    </TableCell>
                    <TableCell>{r.veterinarian?.name || 'Staff'}</TableCell>
                    <TableCell className="text-right">
                      {r.followUpDate ? format(new Date(r.followUpDate), 'MMM dd') : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {records.length > 10 && (
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
