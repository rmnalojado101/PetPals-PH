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
  Loader2,
  CreditCard,
  Syringe,
  History,
  TrendingUp,
  History as HistoryIcon
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { format, subDays, startOfMonth, endOfMonth, parse, isValid } from 'date-fns';
import type { AppointmentStats, DashboardStats, SpeciesDistributionItem, VeterinarianActivityItem } from '@/types';

const safeFormatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'N/A';
  const parsed = new Date(dateStr);
  return isValid(parsed) ? format(parsed, 'MMM dd, yyyy') : 'N/A';
};

export default function ReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [apptStats, setApptStats] = useState<AppointmentStats | null>(null);
  const [speciesDistribution, setSpeciesDistribution] = useState<SpeciesDistributionItem[]>([]);
  const [vetActivity, setVetActivity] = useState<VeterinarianActivityItem[]>([]);
  const [billingStats, setBillingStats] = useState<any>(null);
  const [vaxStats, setVaxStats] = useState<any>(null);
  const [medStats, setMedStats] = useState<any>(null);
  const [globalActivity, setGlobalActivity] = useState<any[]>([]);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const start = dateRange === 'week' ? subDays(new Date(), 7) : dateRange === 'month' ? startOfMonth(new Date()) : null;
      const end = dateRange === 'all' ? null : endOfMonth(new Date());
      
      const params = start ? { 
        start_date: format(start, 'yyyy-MM-dd'),
        end_date: format(end || new Date(), 'yyyy-MM-dd')
      } : {};

      const [summary, appts, species, vets, billing, vax, med, activity] = await Promise.all([
        api.getDashboardData().catch(() => ({ totalPets: 0, totalOwners: 0, totalAppointments: 0, todaysAppointments: 0, pendingAppointments: 0, completedAppointments: 0, totalVaccinations: 0, upcomingVaccinations: 0, totalMedicalRecords: 0, totalRevenue: 0 })),
        api.getAppointmentStats(params).catch(() => null),
        api.getSpeciesDistribution().catch(() => []),
        api.getVeterinarianActivity(params).catch(() => []),
        api.getBillingStats(params).catch(() => null),
        api.getVaccinationStats(params).catch(() => null),
        api.getMedicalRecordStats(params).catch(() => null),
        api.getGlobalActivity(50).catch(() => [])
      ]);

      setStats(summary);
      setApptStats(appts);
      setSpeciesDistribution(species);
      setVetActivity(vets);
      setBillingStats(billing);
      setVaxStats(vax);
      setMedStats(med);
      setGlobalActivity(activity);
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
          <h1 className="text-2xl font-bold">Comprehensive Clinic Reports</h1>
          <p className="text-muted-foreground">Consolidated operational and financial analytics</p>
        </div>
        
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as 'week' | 'month' | 'all')}>
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
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-primary">
              <span className="h-2 w-2 rounded-full bg-primary"></span> Revenue (Collected)
            </CardDescription>
            <CardTitle className="text-3xl text-primary">₱{(billingStats?.totalRevenue || 0).toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500"></span> Total Pets
            </CardDescription>
            <CardTitle className="text-3xl">{stats.totalPets}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-yellow-500"></span> Appointments
            </CardDescription>
            <CardTitle className="text-3xl">{stats.totalAppointments}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
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
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="clinical">Clinical Activity</TabsTrigger>
          <TabsTrigger value="activity">Staff Activity</TabsTrigger>
          <TabsTrigger value="activity-log">Operations Log</TabsTrigger>
        </TabsList>

        <TabsContent value="activity-log" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Operations Feed</CardTitle>
              <CardDescription>Live stream of system-wide transactions and clinical actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead>Operation Type</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Patient / Owner</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {globalActivity.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                          No recent operations found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      globalActivity.map((activity, idx) => (
                        <TableRow key={`${activity.type}-${activity.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "p-1.5 rounded-lg",
                                activity.type === 'billing' ? "bg-emerald-100 text-emerald-600" :
                                activity.type === 'vaccination' ? "bg-purple-100 text-purple-600" :
                                activity.type === 'appointment' ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
                              )}>
                                {activity.type === 'billing' ? <CreditCard className="h-3.5 w-3.5" /> :
                                 activity.type === 'vaccination' ? <Syringe className="h-3.5 w-3.5" /> :
                                 activity.type === 'appointment' ? <Calendar className="h-3.5 w-3.5" /> : <Stethoscope className="h-3.5 w-3.5" />}
                              </div>
                              <span className="capitalize font-semibold text-xs tracking-wide">
                                {activity.type.replace('_', ' ')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {safeFormatDate(activity.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-bold">{activity.pet?.name || 'Walk-in'}</p>
                              <p className="text-[10px] text-slate-400">Owner: {activity.owner?.name || activity.pet?.owner?.name || 'N/A'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">
                            {activity.type === 'billing' ? `Invoice #${activity.invoiceNumber} - ₱${activity.totalAmount}` :
                             activity.type === 'vaccination' ? `Vax: ${activity.name}` :
                             activity.type === 'appointment' ? `Appt: ${activity.reason || 'General'}` : `Diagnosis: ${activity.diagnosis || 'Recorded'}`}
                          </TableCell>
                          <TableCell className="text-right">
                             <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider" asChild>
                               <NavLink to={
                                 activity.type === 'billing' ? '/billing' :
                                 activity.type === 'vaccination' ? '/vaccinations' :
                                 activity.type === 'appointment' ? '/appointments' : '/medical-records'
                               }>View</NavLink>
                             </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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

        <TabsContent value="financials" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Paid Revenue</CardDescription>
                <CardTitle className="text-2xl text-green-600">₱{(billingStats?.totalRevenue || 0).toLocaleString()}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Total collected funds in this period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Outstanding Payments</CardDescription>
                <CardTitle className="text-2xl text-yellow-600">₱{(billingStats?.totalPending || 0).toLocaleString()}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Pending invoices for this period</p>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardDescription className="text-primary">Collection Efficiency</CardDescription>
                <CardTitle className="text-2xl text-primary">
                  {billingStats?.totalRevenue + billingStats?.totalPending > 0 
                    ? ((billingStats.totalRevenue / (billingStats.totalRevenue + billingStats.totalPending)) * 100).toFixed(1)
                    : 0}%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-1">
                   <div 
                     className="bg-primary h-full transition-all duration-1000" 
                     style={{ width: `${(billingStats?.totalRevenue / (billingStats?.totalRevenue + billingStats?.totalPending || 1)) * 100}%` }} 
                   />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Stream</CardTitle>
              <CardDescription>Daily collected revenue (paid invoices)</CardDescription>
            </CardHeader>
            <CardContent>
              {billingStats?.dailyRevenue?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingStats.dailyRevenue.map((day: any) => (
                      <TableRow key={day.date}>
                        <TableCell>{format(new Date(day.date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">₱{Number(day.revenue).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">No revenue recorded for this period.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clinical" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Vaccination Activity</CardTitle>
                <CardDescription>Most administered vaccines in this period</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vaccine</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vaxStats?.byVaccine?.map((v: any) => (
                      <TableRow key={v.name}>
                        <TableCell>{v.name}</TableCell>
                        <TableCell className="text-right font-bold">{v.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Consultation Volume</CardTitle>
                <CardDescription>Daily medical record entries</CardDescription>
              </CardHeader>
              <CardContent>
                 <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Consultations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medStats?.daily?.map((d: any) => (
                      <TableRow key={d.date}>
                        <TableCell>{format(new Date(d.date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="text-right font-bold">{d.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle>Staff Activity</CardTitle>
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
