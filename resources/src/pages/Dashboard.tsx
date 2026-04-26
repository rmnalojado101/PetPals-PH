import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import type { Pet, Appointment, MedicalRecord, Vaccination, DashboardStats } from '@/types';
import { api } from '@/lib/api';
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner';
import { StatCard } from '@/components/dashboard/StatCard';
import { QuickActionCard } from '@/components/dashboard/QuickActionCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  Calendar, 
  DollarSign, 
  AlertTriangle,
  TrendingUp,
  Clock,
  Syringe,
  ArrowRight,
  Stethoscope,
  Plus,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [recentRecords, setRecentRecords] = useState<MedicalRecord[]>([]);
  const [dueVaccinations, setDueVaccinations] = useState<Vaccination[]>([]);
  const [myPetsList, setMyPetsList] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Get Summary Stats
      const statsData = await api.getDashboardData();
      setStats(statsData);

      // 2. Get Upcoming Appointments
      const appointmentsData = await api.getAppointmentsUpcoming();
      const appointmentsList = Array.isArray(appointmentsData)
        ? appointmentsData
        : (appointmentsData as any).data ?? [];
      setUpcomingAppointments(appointmentsList.slice(0, 5));

      // 3. Get Recent Consultations (staff) or Pet list (owner)
      if (user.role !== 'owner') {
        const recordsData = await api.getMedicalRecords({ per_page: 5 });
        setRecentRecords(Array.isArray(recordsData) ? recordsData : (recordsData as any).data ?? []);
        
        const dueVax = await api.getVaccinationsDueSoon();
        setDueVaccinations(dueVax);
      } else {
        const petsData = await api.getPets({ per_page: 5 });
        setMyPetsList(Array.isArray(petsData) ? petsData : (petsData as any).data ?? []);
      }
    } catch (error) {
      console.error('Dashboard API load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
        <p className="mt-4 text-muted-foreground">Syncing to MySQL Server...</p>
      </div>
    );
  }

  // Map stats for easier access
  const statCounts = {
    totalPets: stats?.myPets || stats?.totalPets || 0,
    todayAppointments: user.role === 'owner'
      ? stats?.myUpcomingAppointments || upcomingAppointments.length
      : stats?.todaysAppointments || 0,
    pendingApprovals: stats?.pendingAppointments || 0,
    dueVaccinations: stats?.upcomingVaccinations || dueVaccinations.length,
    medicalRecords: stats?.myTotalRecords || stats?.totalRecords || 0,
    totalVaccinations: stats?.totalVaccinations || 0
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <WelcomeBanner />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Animals"
          value={statCounts.totalPets}
          icon={Heart}
          variant="pink"
          trend="up"
        />
        <StatCard
          title={user.role === 'owner' ? 'Upcoming Appointments' : "Today's Appointments"}
          value={statCounts.todayAppointments}
          icon={Calendar}
          variant="blue"
          trend="neutral"
        />
        {user.role !== 'owner' && (
          <>
            <StatCard
              title="Pending Approvals"
              value={statCounts.pendingApprovals}
              icon={Clock}
              variant="green"
              trend="up"
            />
            <StatCard
              title="Due Vaccinations"
              value={statCounts.dueVaccinations}
              icon={AlertTriangle}
              variant="orange"
              trend="down"
            />
          </>
        )}
        {user.role === 'owner' && (
          <>
            <StatCard
              title="Medical Records"
              value={statCounts.medicalRecords}
              icon={Stethoscope}
              variant="green"
              trend="up"
            />
            <StatCard
              title="Vaccinations"
              value={statCounts.totalVaccinations}
              icon={Syringe}
              variant="orange"
              trend="up"
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickActionCard
          title="Recent Consultations"
          icon={TrendingUp}
          variant="purple"
          path="/medical-records"
        />
        <QuickActionCard
          title="Upcoming Appointments"
          icon={Clock}
          variant="teal"
          path="/appointments"
        />
        <QuickActionCard
          title="Vaccination Reminders"
          icon={Syringe}
          variant="amber"
          path="/vaccinations"
        />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Upcoming Appointments</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/appointments')}>
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming appointments</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => navigate('/appointments')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Book Appointment
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((apt) => {
                  const pet = (apt as any).pet;
                  const vet = (apt as any).veterinarian;
                  const aDate = apt.appointmentDate || apt.date;
                  const aTime = apt.appointmentTime || apt.time;
                  
                  return (
                    <div 
                      key={apt.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Heart className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{pet?.name || 'Unknown Pet'}</p>
                          <p className="text-sm text-muted-foreground">
                            {aDate ? format(parseISO(aDate), 'MMM d') : ''} at {aTime}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={
                          apt.status === 'approved' ? 'default' :
                          apt.status === 'pending' ? 'secondary' :
                          apt.status === 'completed' ? 'outline' : 'destructive'
                        }>
                          {apt.status}
                        </Badge>
                        {vet && (
                          <p className="text-xs text-muted-foreground mt-1">{vet.name}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Medical Records - Only for staff */}
        {user.role !== 'owner' ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Recent Consultations</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/medical-records')}>
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No medical records yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentRecords.map((record) => {
                    const pet = (record as any).pet;
                    const vet = (record as any).veterinarian;
                    const rDate = record.recordDate || record.date;
                    
                    return (
                      <div 
                        key={record.id}
                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-stat-green">
                            <Stethoscope className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{pet?.name || 'Unknown Pet'}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {record.diagnosis}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{rDate ? format(parseISO(rDate), 'MMM d, yyyy') : ''}</p>
                          <p className="text-xs text-muted-foreground">{vet?.name}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* My Pets - For pet owners */
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">My Pets</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/pets')}>
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {myPetsList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Heart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No pets registered yet</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => navigate('/pets')}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Pet
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myPetsList.map((pet) => (
                    <div 
                      key={pet.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/pets/${pet.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-stat-pink text-lg">
                          {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
                        </div>
                        <div>
                          <p className="font-medium">{pet.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {pet.breed} • {pet.age} {pet.age === 1 ? 'year' : 'years'} old
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {pet.species}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
