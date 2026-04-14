import { useAuth } from '@/contexts/AuthContext';
import { 
  petsStorage, 
  appointmentsStorage, 
  usersStorage,
  vaccinationsStorage,
  medicalRecordsStorage 
} from '@/lib/storage';
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
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  // Get stats based on role
  const pets = petsStorage.getAll();
  const appointments = appointmentsStorage.getAll();
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(a => a.date === todayStr);
  const pendingAppointments = appointments.filter(a => a.status === 'pending');
  const dueVaccinations = vaccinationsStorage.getDue();

  // Role-specific data
  const getMyPets = () => user.role === 'owner' ? petsStorage.getByOwner(user.id) : pets;
  const getMyAppointments = () => {
    if (user.role === 'owner') return appointmentsStorage.getByOwner(user.id);
    if (user.role === 'veterinarian') return appointmentsStorage.getByVet(user.id);
    return appointments;
  };

  const myPets = getMyPets();
  const myAppointments = getMyAppointments();
  const upcomingAppointments = myAppointments
    .filter(a => a.date >= todayStr && a.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 5);

  const recentRecords = medicalRecordsStorage.getAll()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <WelcomeBanner />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Animals"
          value={user.role === 'owner' ? myPets.length : pets.length}
          icon={Heart}
          variant="pink"
          trend="up"
        />
        <StatCard
          title="Today's Appointments"
          value={user.role === 'owner' 
            ? myAppointments.filter(a => a.date === todayStr).length 
            : todayAppointments.length}
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
                acc + medicalRecordsStorage.getByPet(pet.id).length, 0)}
              icon={Stethoscope}
              variant="green"
              trend="up"
            />
            <StatCard
              title="Vaccinations"
              value={myPets.reduce((acc, pet) => 
                acc + vaccinationsStorage.getByPet(pet.id).length, 0)}
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
                  const pet = petsStorage.getById(apt.petId);
                  const vet = usersStorage.getById(apt.veterinarianId);
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
                            {format(new Date(apt.date), 'MMM d')} at {apt.time}
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
                        {vet && user.role !== 'veterinarian' && (
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
                    const pet = petsStorage.getById(record.petId);
                    const vet = usersStorage.getById(record.veterinarianId);
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
                          <p className="text-sm">{format(new Date(record.date), 'MMM d, yyyy')}</p>
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
