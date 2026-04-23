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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Download,
  Users,
  Stethoscope,
  Loader2
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import type { AppointmentStats, DashboardStats, SpeciesDistributionItem, VeterinarianActivityItem } from '@/types';

export default function ReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('month');
  const [isLoading, setIsLoading] = useState(true);
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [apptStats, setApptStats] = useState<AppointmentStats | null>(null);
  const [speciesDistribution, setSpeciesDistribution] = useState<SpeciesDistributionItem[]>([]);
  const [vetActivity, setVetActivity] = useState<VeterinarianActivityItem[]>([]);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const start = dateRange === 'week' ? subDays(new Date(), 7) : dateRange === 'month' ? startOfMonth(new Date()) : null;
      const end = dateRange === 'all' ? null : endOfMonth(new Date());
      
      const params = start ? { 
        start_date: format(start, 'yyyy-MM-dd'),
        end_date: format(end || new Date(), 'yyyy-MM-dd')
      } : {};

      const [summary, appts, species, vets] = await Promise.all([
        api.getDashboardData(),
        api.getAppointmentStats(params),
        api.getSpeciesDistribution(),
        api.getVeterinarianActivity(params)
      ]);

      setStats(summary);
      setApptStats(appts);
      setSpeciesDistribution(species);
      setVetActivity(vets);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  if (isLoading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
        <p className="mt-4 text-muted-foreground">Generating Reports from MySQL...</p>
      </div>
    );
  }

  const exportAppointments = async () => {
    try {
      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const blob = await api.exportAppointmentsCsv({
        start_date: startDate,
        end_date: endDate,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `appointments-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export appointments report:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Could not export the appointment report.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10" data-tour="reports-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">View clinic statistics and export reports from MySQL</p>
        </div>
        
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as 'week' | 'month' | 'all')}>
          <SelectTrigger className="w-48">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 text-center sm:text-left">
            <CardDescription className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500"></span> Total Pets
            </CardDescription>
            <CardTitle className="text-3xl">{stats.totalPets}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2 text-center sm:text-left">
            <CardDescription className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500"></span> Pet Owners
            </CardDescription>
            <CardTitle className="text-3xl">{stats.totalOwners}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2 text-center sm:text-left">
            <CardDescription className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-yellow-500"></span> Appointments
            </CardDescription>
            <CardTitle className="text-3xl">{stats.totalAppointments}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2 text-center sm:text-left">
            <CardDescription className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-500"></span> Vaccinations
            </CardDescription>
            <CardTitle className="text-3xl">{stats.totalVaccinations}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="appointments" className="space-y-4">
        <TabsList className="bg-muted p-1 rounded-lg">
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="activity">Vet Activity</TabsTrigger>
          <TabsTrigger value="pets">Pet Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle>Appointment Summary</CardTitle>
                <CardDescription>
                  Status distribution for the selected period
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportAppointments}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-3 mb-8">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-600 mb-1">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div> Completed
                  </div>
                  <p className="text-2xl font-bold">{apptStats?.byStatus?.completed || 0}</p>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-medium text-yellow-600 mb-1">
                    <div className="h-2 w-2 rounded-full bg-yellow-500"></div> Pending
                  </div>
                  <p className="text-2xl font-bold">{apptStats?.byStatus?.pending || 0}</p>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-medium text-red-600 mb-1">
                    <div className="h-2 w-2 rounded-full bg-red-500"></div> Cancelled
                  </div>
                  <p className="text-2xl font-bold">{apptStats?.byStatus?.cancelled || 0}</p>
                </div>
              </div>

              {!apptStats?.daily || apptStats.daily.length === 0 ? (
                <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-2" />
                  <p className="text-muted-foreground">No appointment activity in this period</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Daily Activity Log</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Total Appointments</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apptStats.daily.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell className="font-medium">{format(new Date(day.date), 'MMMM d, yyyy')}</TableCell>
                          <TableCell className="text-right font-bold">{day.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle>Veterinarian Activity</CardTitle>
              <CardDescription>
                Staff performance metrics for {dateRange === 'all' ? 'all time' : `this ${dateRange}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veterinarian</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead className="text-center">Appointments Managed</TableHead>
                    <TableHead className="text-center">Medical Records Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vetActivity.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No activity recorded for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    vetActivity.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                             <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                               {activity.name.charAt(0)}
                             </div>
                             {activity.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground italic text-sm">
                          {activity.specialty || 'General Practice'}
                        </TableCell>
                        <TableCell className="text-center font-bold">{activity.appointmentsCount}</TableCell>
                        <TableCell className="text-center font-bold">{activity.recordsCount}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pets" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader className="border-b pb-4 bg-muted/5">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-primary mt-1">🐾</span> Pets by Species
                </CardTitle>
                <CardDescription>
                  Distribution of registered pets in the system
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {speciesDistribution.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No pets registered yet.</p>
                  ) : (
                    speciesDistribution.map((item) => (
                      <div key={item.species} className="group flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl transition-transform group-hover:scale-110">
                            {item.species.toLowerCase() === 'dog' ? '🐕' : 
                             item.species.toLowerCase() === 'cat' ? '🐈' : 
                             item.species.toLowerCase() === 'bird' ? '🐦' : 
                             item.species.toLowerCase() === 'rabbit' ? '🐰' : 
                             item.species.toLowerCase() === 'fish' ? '🐠' : '🐾'}
                          </div>
                          <span className="capitalize font-semibold text-gray-700">{item.species}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2.5 rounded-full bg-muted overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all duration-1000"
                              style={{ width: `${(item.count / stats.totalPets) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-primary w-8">{item.count}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="border-b pb-4 bg-muted/5">
                <CardTitle className="flex items-center gap-2 text-primary">
                   <Stethoscope className="h-5 w-5" /> Vaccination Summary
                </CardTitle>
                <CardDescription>
                  Operational overview of clinical services
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="h-32 w-32 rounded-full border-8 border-primary/20 flex items-center justify-center relative">
                    <div className="text-4xl font-black text-primary">{stats.totalVaccinations}</div>
                    <div className="absolute -bottom-4 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">administered</div>
                  </div>
                  <p className="mt-8 text-sm text-balance text-center text-muted-foreground max-w-[200px]">
                    Showing <span className="font-bold text-foreground">{stats.totalVaccinations} total</span> immunizations recorded in MySQL.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="rounded-2xl bg-muted/30 p-4 text-center border border-transparent hover:border-primary/20 transition-all">
                    <p className="text-2xl font-black text-primary">{stats.upcomingVaccinations}</p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-wider">Due Next 30 Days</p>
                  </div>
                  <div className="rounded-2xl bg-muted/30 p-4 text-center border border-transparent hover:border-primary/20 transition-all">
                    <p className="text-2xl font-black text-primary">Persisted</p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-wider">Data Reliability</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
