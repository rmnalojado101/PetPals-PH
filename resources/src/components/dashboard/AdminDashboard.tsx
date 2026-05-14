import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/StatCard';
import { 
  Users, 
  UserPlus, 
  Activity, 
  Database, 
  Server, 
  Zap, 
  AlertCircle,
  Building2,
  Stethoscope,
  Calendar,
  Syringe,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
interface AdminDashboardProps {
  data: any;
}

export function AdminDashboard({ data }: AdminDashboardProps) {
  const navigate = useNavigate();
  
  if (!data) return null;

  const userStats = data.userStats || { total: 0, clinics: 0, vets: 0, newUsersLast30Days: 0 };
  const engagement = data.engagement || { activeAppointments: 0, totalMedicalRecords: 0, totalVaccinations: 0 };
  const systemPerformance = data.systemPerformance || { databaseSize: '0', serverUptime: '0', responseTime: '0', errorRate: '0' };
  const recentEvents = data.recentEvents || [];
  const { paginatedData, currentPage, totalPages, nextPage, prevPage } = usePagination(recentEvents, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
        <p className="text-muted-foreground">Comprehensive overview of PetPals PH system metrics and engagement.</p>
      </div>

      {/* Primary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Registered Users"
          value={userStats.total}
          icon={Users}
          variant="blue"
          trend="up"
        />
        <StatCard
          title="Active Clinics"
          value={userStats.clinics}
          icon={Building2}
          variant="purple"
          trend="up"
        />
        <StatCard
          title="Total Veterinarians"
          value={userStats.vets}
          icon={UserCheck}
          variant="green"
          trend="neutral"
        />
        <StatCard
          title="New Users (30d)"
          value={userStats.newUsersLast30Days}
          icon={UserPlus}
          variant="pink"
          trend="up"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Engagement Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              User Engagement & Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Calendar className="h-4 w-4" />
                  Appointments
                </div>
                <p className="text-2xl font-bold">{engagement.activeAppointments}</p>
                <p className="text-xs text-muted-foreground">Active/Upcoming</p>
              </div>
              <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 space-y-2">
                <div className="flex items-center gap-2 text-green-600 font-semibold">
                  <Stethoscope className="h-4 w-4" />
                  Consultations
                </div>
                <p className="text-2xl font-bold">{engagement.totalMedicalRecords}</p>
                <p className="text-xs text-muted-foreground">Total records stored</p>
              </div>
              <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 space-y-2">
                <div className="flex items-center gap-2 text-orange-600 font-semibold">
                  <Syringe className="h-4 w-4" />
                  Vaccinations
                </div>
                <p className="text-2xl font-bold">{engagement.totalVaccinations}</p>
                <p className="text-xs text-muted-foreground">Total doses logged</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
              <Zap className="h-4 w-4" />
              System Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4 opacity-50" />
                <span>DB Size</span>
              </div>
              <Badge variant="outline">{systemPerformance.databaseSize}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm">
                <Server className="h-4 w-4 opacity-50" />
                <span>Uptime</span>
              </div>
              <span className="text-sm font-bold text-green-500">{systemPerformance.serverUptime}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 opacity-50" />
                <span>Response Time</span>
              </div>
              <span className="text-sm font-medium">{systemPerformance.responseTime}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 opacity-50" />
                <span>Error Rate</span>
              </div>
              <span className="text-sm font-medium text-orange-500">{systemPerformance.errorRate}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent System Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent System Activity</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/notifications')}>
            System Logs <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paginatedData.map((event: any) => (
              <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    event.type === 'appointment' ? 'bg-blue-100 text-blue-600' :
                    event.type === 'billing' ? 'bg-green-100 text-green-600' :
                    'bg-purple-100 text-purple-600'
                  }`}>
                    {event.type === 'appointment' ? <Calendar className="h-4 w-4" /> :
                     event.type === 'billing' ? <Zap className="h-4 w-4" /> :
                     <Activity className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {event.type === 'appointment' ? `New Appointment: ${event.reason}` :
                       event.type === 'billing' ? `New Payment: ${event.invoice_number}` :
                       `New ${event.type?.replace('_', ' ') || 'event'} recorded`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.created_at ? format(parseISO(event.created_at), 'MMM d, yyyy HH:mm') : 'Date unknown'}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {event.type ? event.type.replace('_', ' ') : 'Event'}
                </Badge>
              </div>
            ))}
          </div>
          {recentEvents.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onNext={nextPage}
                onPrev={prevPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
