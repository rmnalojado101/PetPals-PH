import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  appointmentsStorage, 
  petsStorage, 
  usersStorage,
  medicalRecordsStorage,
  vaccinationsStorage 
} from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  FileText,
  Users,
  Stethoscope,
  TrendingUp
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export default function ReportsPage() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('month');
  
  const appointments = appointmentsStorage.getAll();
  const pets = petsStorage.getAll();
  const owners = usersStorage.getByRole('owner');
  const vets = usersStorage.getByRole('veterinarian');
  const records = medicalRecordsStorage.getAll();
  const vaccinations = vaccinationsStorage.getAll();

  const getDateRange = () => {
    const now = new Date();
    if (dateRange === 'week') {
      return { start: subDays(now, 7), end: now };
    } else if (dateRange === 'month') {
      return { start: startOfMonth(now), end: endOfMonth(now) };
    }
    return null;
  };

  const filterByDate = <T extends { date?: string; createdAt?: string; dateAdministered?: string }>(items: T[]) => {
    const range = getDateRange();
    if (!range) return items;
    
    return items.filter(item => {
      const dateStr = item.date || item.createdAt || item.dateAdministered;
      if (!dateStr) return false;
      const date = new Date(dateStr);
      return isWithinInterval(date, range);
    });
  };

  const filteredAppointments = filterByDate(appointments);
  const filteredRecords = filterByDate(records);
  const filteredVaccinations = filterByDate(vaccinations);

  // Stats
  const completedAppointments = filteredAppointments.filter(a => a.status === 'completed').length;
  const pendingAppointments = filteredAppointments.filter(a => a.status === 'pending').length;
  const cancelledAppointments = filteredAppointments.filter(a => a.status === 'cancelled').length;

  // Vet activity
  const vetActivity = vets.map(vet => {
    const vetAppointments = filteredAppointments.filter(a => a.veterinarianId === vet.id);
    const vetRecords = filteredRecords.filter(r => r.veterinarianId === vet.id);
    return {
      vet,
      appointments: vetAppointments.length,
      completed: vetAppointments.filter(a => a.status === 'completed').length,
      records: vetRecords.length,
    };
  });

  // Species breakdown
  const speciesCount = pets.reduce((acc, pet) => {
    acc[pet.species] = (acc[pet.species] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleExportCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => 
        headers.map(h => {
          const val = row[h];
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const exportAppointments = () => {
    const data = filteredAppointments.map(apt => {
      const pet = petsStorage.getById(apt.petId);
      const owner = usersStorage.getById(apt.ownerId);
      const vet = usersStorage.getById(apt.veterinarianId);
      return {
        Date: apt.date,
        Time: apt.time,
        Pet: pet?.name || 'Unknown',
        Species: pet?.species || '',
        Owner: owner?.name || 'Unknown',
        Veterinarian: vet?.name || 'Unknown',
        Reason: apt.reason,
        Status: apt.status,
      };
    });
    handleExportCSV(data, 'appointments');
  };

  const exportMedicalRecords = () => {
    const data = filteredRecords.map(record => {
      const pet = petsStorage.getById(record.petId);
      const vet = usersStorage.getById(record.veterinarianId);
      return {
        Date: record.date,
        Pet: pet?.name || 'Unknown',
        Species: pet?.species || '',
        Veterinarian: vet?.name || 'Unknown',
        Diagnosis: record.diagnosis,
        Treatment: record.treatment,
        Prescription: record.prescription || '',
      };
    });
    handleExportCSV(data, 'medical_records');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">View clinic statistics and export reports</p>
        </div>
        
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
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
          <CardHeader className="pb-2">
            <CardDescription>Total Pets</CardDescription>
            <CardTitle className="text-3xl">{pets.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pet Owners</CardDescription>
            <CardTitle className="text-3xl">{owners.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Appointments ({dateRange === 'all' ? 'All Time' : dateRange})</CardDescription>
            <CardTitle className="text-3xl">{filteredAppointments.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Medical Records ({dateRange === 'all' ? 'All Time' : dateRange})</CardDescription>
            <CardTitle className="text-3xl">{filteredRecords.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="appointments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="activity">Vet Activity</TabsTrigger>
          <TabsTrigger value="pets">Pet Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Appointment Summary</CardTitle>
                <CardDescription>
                  Overview of appointment statuses
                </CardDescription>
              </div>
              <Button variant="outline" onClick={exportAppointments}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3 mb-6">
                <div className="rounded-lg bg-green-50 p-4">
                  <p className="text-sm text-green-600">Completed</p>
                  <p className="text-2xl font-bold text-green-700">{completedAppointments}</p>
                </div>
                <div className="rounded-lg bg-yellow-50 p-4">
                  <p className="text-sm text-yellow-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-700">{pendingAppointments}</p>
                </div>
                <div className="rounded-lg bg-red-50 p-4">
                  <p className="text-sm text-red-600">Cancelled</p>
                  <p className="text-2xl font-bold text-red-700">{cancelledAppointments}</p>
                </div>
              </div>

              {filteredAppointments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No appointments in the selected period
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Pet</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Veterinarian</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.slice(0, 10).map((apt) => {
                      const pet = petsStorage.getById(apt.petId);
                      const owner = usersStorage.getById(apt.ownerId);
                      const vet = usersStorage.getById(apt.veterinarianId);
                      return (
                        <TableRow key={apt.id}>
                          <TableCell>{format(new Date(apt.date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{pet?.name}</TableCell>
                          <TableCell>{owner?.name}</TableCell>
                          <TableCell>{vet?.name}</TableCell>
                          <TableCell className="max-w-32 truncate">{apt.reason}</TableCell>
                          <TableCell className="capitalize">{apt.status}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Veterinarian Activity</CardTitle>
              <CardDescription>
                Performance metrics by veterinarian
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veterinarian</TableHead>
                    <TableHead>Total Appointments</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Medical Records</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vetActivity.map(({ vet, appointments, completed, records }) => (
                    <TableRow key={vet.id}>
                      <TableCell className="font-medium">{vet.name}</TableCell>
                      <TableCell>{appointments}</TableCell>
                      <TableCell>{completed}</TableCell>
                      <TableCell>{records}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pets" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pets by Species</CardTitle>
                <CardDescription>
                  Distribution of registered pets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(speciesCount)
                    .sort((a, b) => b[1] - a[1])
                    .map(([species, count]) => (
                      <div key={species} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {species === 'dog' ? '🐕' : 
                             species === 'cat' ? '🐈' : 
                             species === 'bird' ? '🐦' : 
                             species === 'rabbit' ? '🐰' : 
                             species === 'fish' ? '🐠' : '🐾'}
                          </span>
                          <span className="capitalize font-medium">{species}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${(count / pets.length) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-8">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Vaccinations</CardTitle>
                  <CardDescription>
                    Vaccination records summary
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-4xl font-bold text-primary">{filteredVaccinations.length}</p>
                  <p className="text-muted-foreground mt-2">
                    Vaccinations administered {dateRange === 'all' ? 'total' : `this ${dateRange}`}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-2xl font-semibold">{vaccinations.filter(v => v.nextDueDate).length}</p>
                    <p className="text-xs text-muted-foreground">With Follow-up</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-2xl font-semibold">
                      {new Set(vaccinations.map(v => v.name)).size}
                    </p>
                    <p className="text-xs text-muted-foreground">Vaccine Types</p>
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
