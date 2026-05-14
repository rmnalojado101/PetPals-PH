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
  Syringe,
  Loader2,
  TrendingUp,
  History
} from 'lucide-react';
import { format, subDays, startOfMonth, isValid } from 'date-fns';
import type { Vaccination } from '@/types';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';

const safeFormatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'N/A';
  const parsed = new Date(dateStr);
  return isValid(parsed) ? format(parsed, 'MMM dd, yyyy') : 'N/A';
};

export default function VaccinationReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  
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
        api.getVaccinations({ 
          per_page: 1000, 
          start_date: start, 
          end_date: end 
        }),
        api.getVaccinationStats({ 
          start_date: start, 
          end_date: end 
        })
      ]);
      
      const allData = Array.isArray(response) ? response : response.data || [];
      setVaccinations(allData);
      
      if (statsResponse) {
        // Stats response used for totals if needed
      }
    } catch (error) {
      console.error('Failed to load vaccination reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to load vaccination data.',
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
    if (vaccinations.length === 0) {
      toast({ title: "No data", description: "No records to export.", variant: "destructive" });
      return;
    }

    const headers = ["Date", "Pet Name", "Species", "Vaccine", "Batch #", "Veterinarian", "Next Due Date"];
    const csvContent = [
      headers.join(","),
      ...vaccinations.map(v => [
        `"${safeFormatDate(v.dateAdministered)}"`,
        `"${v.pet?.name || 'Unknown'}"`,
        `"${v.pet?.species || 'N/A'}"`,
        `"${v.name}"`,
        `"${v.batchNumber || ''}"`,
        `"${v.administeredByUser?.name || 'Staff'}"`,
        `"${v.nextDueDate ? safeFormatDate(v.nextDueDate) : ''}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `vaccination_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalAdministered = vaccinations.length;
  const uniqueVaccines = Array.from(new Set(vaccinations.map(v => v.name))).length;
  
  const { paginatedData, currentPage, totalPages, nextPage, prevPage } = usePagination(vaccinations, 10);

  const mostCommonVaccine = vaccinations.reduce((acc, curr) => {
    acc[curr.name] = (acc[curr.name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topVaccine = Object.entries(mostCommonVaccine).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
        <p className="mt-4 text-muted-foreground">Generating Vaccination Report...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Syringe className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Vaccination Reports</h1>
          </div>
          <p className="text-muted-foreground">Statistical overview of immunizations administered</p>
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

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" /> Administered
            </CardDescription>
            <CardTitle className="text-3xl">{totalAdministered}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Total vaccines given in this period</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Syringe className="h-4 w-4 text-blue-500" /> Vaccine Types
            </CardDescription>
            <CardTitle className="text-3xl">{uniqueVaccines}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Unique types of vaccines used</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <History className="h-4 w-4 text-purple-500" /> Most Used
            </CardDescription>
            <CardTitle className="text-xl truncate">{topVaccine}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Highest volume vaccine administered</p>
          </CardContent>
        </Card>
      </div>

      {/* Vaccination History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Immunization History</CardTitle>
          <CardDescription>
            Detailed log of vaccinations {dateRange === 'all' ? 'throughout clinic history' : `for ${dateRange === 'week' ? 'the last 7 days' : 'this month'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Patient (Pet)</TableHead>
                <TableHead>Vaccine Name</TableHead>
                <TableHead>Veterinarian</TableHead>
                <TableHead className="text-right">Next Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vaccinations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No vaccinations recorded for this period.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{safeFormatDate(v.dateAdministered)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{v.pet?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{v.pet?.species}</p>
                      </div>
                    </TableCell>
                    <TableCell>{v.name}</TableCell>
                    <TableCell>{v.administeredByUser?.name || 'Staff'}</TableCell>
                    <TableCell className="text-right">
                      {v.nextDueDate ? safeFormatDate(v.nextDueDate) : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {vaccinations.length > 10 && (
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
