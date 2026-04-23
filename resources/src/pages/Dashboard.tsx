import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import type { Pet, Appointment, MedicalRecord, Vaccination, Veterinarian } from '@/types';
import { appointmentsStorage, medicalRecordsStorage, petsStorage, vaccinationsStorage, veterinariansStorage } from '@/lib/storage';
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

  const [pets, setPets] = useState<Pet[]>([]);
  const [rawAppointments, setAppointments] = useState<Appointment[]>([]);
  const [rawRecords, setAllRecords] = useState<MedicalRecord[]>([]);
  const [rawVaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [veterinarians, setVeterinarians] = useState<Veterinarian[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    try {
      setPets(petsStorage.getAll());
      setAppointments(appointmentsStorage.getAll());
      setAllRecords(medicalRecordsStorage.getAll());
      setVaccinations(vaccinationsStorage.getAll());
      setVeterinarians(veterinariansStorage.getAll());
    } catch (error) {
      console.error('Dashboard storage load error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
        <p className="mt-4 text-muted-foreground">Syncing to MySQL Server...</p>
      </div>
    );
  }

  // Safe fallback guarantees
  const safePets = Array.isArray(pets) ? pets : [];
  const safeAppointments = Array.isArray(rawAppointments) ? rawAppointments : [];
  const safeRecords = Array.isArray(rawRecords) ? rawRecords : [];
  const safeVaccinations = Array.isArray(rawVaccinations) ? rawVaccinations : [];
  const safeVeterinarians = Array.isArray(veterinarians) ? veterinarians : [];

  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeekStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const allPets = safePets;
  const allAppointments = safeAppointments;
  const allRecords = safeRecords;
  const allVaccinations = safeVaccinations;
  const allVeterinarians = safeVeterinarians;

  const myPets = user.role === 'owner'
    ? allPets.filter(p => String(p.ownerId) === String(user.id))
    : allPets;

  const clinicVetIds = user.role === 'vet_clinic'
    ? allVeterinarians.filter(v => String(v.clinicId) === String(user.id)).map(v => v.id)
    : [];

  const filteredAppointments = user.role === 'owner'
    ? allAppointments.filter(a => String(a.ownerId) === String(user.id))
    : user.role === 'vet_clinic'
      ? allAppointments.filter(a => clinicVetIds.includes(a.veterinarianId))
      : allAppointments;

  const filteredRecords = user.role === 'owner'
    ? allRecords.filter(r => myPets.some(p => p.id === r.petId))
    : user.role === 'vet_clinic'
      ? allRecords.filter(r => clinicVetIds.includes(r.veterinarianId))
      : allRecords;

  const dueVaccinations = allVaccinations.filter(v => {
    if (!v.nextDueDate) return false;
    if (user.role === 'owner') {
      return myPets.some(p => p.id === v.petId) && v.nextDueDate <= nextWeekStr;
    }
    if (user.role === 'vet_clinic') {
      return (v.administeredBy === user.id || clinicVetIds.includes(v.administeredBy)) && v.nextDueDate <= nextWeekStr;
    }
    return v.nextDueDate <= nextWeekStr;
  });

  const todayAppointments = filteredAppointments.filter(a => a.date === todayStr);
  const pendingAppointments = filteredAppointments.filter(a => a.status === 'pending');

  const myAppointments = filteredAppointments;

  const upcomingAppointments = myAppointments
    .filter(a => a.date >= todayStr && a.status !== 'cancelled')
    .sort((a, b) => {
      const aTime = a.time || '';
      const bTime = b.time || '';
      return String(a.date).localeCompare(String(b.date)) || String(aTime).localeCompare(String(bTime));
    })
    .slice(0, 5);

  const recentRecords = filteredRecords
    .sort((a, b) => {
      const aDate = a.recordDate || a.date;
      const bDate = b.recordDate || b.date;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    })
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <WelcomeBanner />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Animals"
          value={myPets.length}
          icon={Heart}
          variant="pink"
          trend="up"
        />
        <StatCard
          title="Today's Appointments"
          value={todayAppointments.length}
          icon={Calendar}
          variant="blue"
          trend="neutral"
        />
        {user.role !== 'owner' && (
          <>
            <StatCard
              title="Pending Approvals"
              value={pendingAppointments.length}
              icon={Clock}
              variant="green"
              trend="up"
            />
            <StatCard
              title="Due Vaccinations"
              value={dueVaccinations.length}
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
              value={myPets.reduce((acc, pet) => 
                acc + safeRecords.filter(r => r.petId === pet.id).length, 0)}
              icon={Stethoscope}
              variant="green"
              trend="up"
            />
            <StatCard
              title="Vaccinations"
              value={myPets.reduce((acc, pet) => 
                acc + safeVaccinations.filter(v => v.petId === pet.id).length, 0)}
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
                  const pet = safePets.find(p => p.id === apt.petId);
                  const vet = safeVeterinarians.find(v => v.id === apt.veterinarianId);
                  const aDate = apt.date;
                  const aTime = apt.time;
                  
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
                    const pet = safePets.find(p => p.id === record.petId);
                    const vet = safeVeterinarians.find(v => v.id === record.veterinarianId);
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
              {myPets.length === 0 ? (
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
                  {myPets.slice(0, 5).map((pet) => (
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
