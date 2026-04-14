import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  appointmentsStorage, 
  petsStorage, 
  usersStorage,
  notificationsStorage 
} from '@/lib/storage';
import type { Appointment, Pet } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Plus, 
  Search,  
  Calendar as CalendarIcon,
  Clock,
  Check,
  X,
  Eye,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
];

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function AppointmentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingAppointment, setViewingAppointment] = useState<Appointment | null>(null);
  
  // Form state
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState({
    petId: '',
    veterinarianId: '',
    time: '',
    reason: '',
    notes: '',
  });

  useEffect(() => {
    loadAppointments();
  }, [user]);

  const loadAppointments = () => {
    if (!user) return;
    
    let data: Appointment[];
    if (user.role === 'owner') {
      data = appointmentsStorage.getByOwner(user.id);
    } else if (user.role === 'veterinarian') {
      data = appointmentsStorage.getByVet(user.id);
    } else {
      data = appointmentsStorage.getAll();
    }
    
    // Sort by date and time
    data.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.time.localeCompare(a.time);
    });
    
    setAppointments(data);
  };

  const resetForm = () => {
    setFormData({
      petId: '',
      veterinarianId: '',
      time: '',
      reason: '',
      notes: '',
    });
    setSelectedDate(undefined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !formData.petId || !formData.veterinarianId || !formData.time) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // Check for time conflict
    if (appointmentsStorage.checkConflict(formData.veterinarianId, dateStr, formData.time)) {
      toast({
        title: 'Time Conflict',
        description: 'This time slot is already booked. Please choose another.',
        variant: 'destructive',
      });
      return;
    }

    const pet = petsStorage.getById(formData.petId);
    
    appointmentsStorage.create({
      petId: formData.petId,
      ownerId: user?.role === 'owner' ? user.id : pet?.ownerId || '',
      veterinarianId: formData.veterinarianId,
      date: dateStr,
      time: formData.time,
      reason: formData.reason,
      status: user?.role === 'owner' ? 'pending' : 'approved',
      notes: formData.notes,
    });

    // Create notification for vet
    const vet = usersStorage.getById(formData.veterinarianId);
    if (vet) {
      notificationsStorage.create({
        userId: vet.id,
        title: 'New Appointment Request',
        message: `Appointment for ${pet?.name} on ${format(selectedDate, 'MMMM d, yyyy')} at ${formData.time}`,
        type: 'appointment',
      });
    }

    toast({
      title: 'Appointment Booked',
      description: user?.role === 'owner' 
        ? 'Your appointment request has been submitted for approval.'
        : 'Appointment has been scheduled.',
    });

    loadAppointments();
    setIsDialogOpen(false);
    resetForm();
  };

  const handleStatusChange = (appointmentId: string, newStatus: Appointment['status']) => {
    const apt = appointmentsStorage.getById(appointmentId);
    if (!apt) return;

    appointmentsStorage.update(appointmentId, { status: newStatus });

    // Notify owner
    notificationsStorage.create({
      userId: apt.ownerId,
      title: `Appointment ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
      message: `Your appointment on ${apt.date} at ${apt.time} has been ${newStatus}.`,
      type: 'appointment',
    });

    toast({
      title: 'Status Updated',
      description: `Appointment marked as ${newStatus}.`,
    });

    loadAppointments();
  };

  const vets = usersStorage.getByRole('veterinarian');
  const myPets = user?.role === 'owner' 
    ? petsStorage.getByOwner(user.id)
    : petsStorage.getAll();

  const filteredAppointments = appointments.filter(apt => {
    const pet = petsStorage.getById(apt.petId);
    const owner = usersStorage.getById(apt.ownerId);
    const matchesSearch = 
      pet?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingAppointments = filteredAppointments.filter(a => a.date >= todayStr);
  const pastAppointments = filteredAppointments.filter(a => a.date < todayStr);

  const renderAppointmentRow = (apt: Appointment) => {
    const pet = petsStorage.getById(apt.petId);
    const owner = usersStorage.getById(apt.ownerId);
    const vet = usersStorage.getById(apt.veterinarianId);

    return (
      <TableRow key={apt.id}>
        <TableCell>
          <div>
            <p className="font-medium">{format(new Date(apt.date), 'MMM d, yyyy')}</p>
            <p className="text-sm text-muted-foreground">{apt.time}</p>
          </div>
        </TableCell>
        <TableCell>
          <div>
            <p className="font-medium">{pet?.name || 'Unknown Pet'}</p>
            <p className="text-sm text-muted-foreground capitalize">{pet?.species}</p>
          </div>
        </TableCell>
        {user?.role !== 'owner' && (
          <TableCell>
            <div>
              <p className="font-medium">{owner?.name || 'Unknown'}</p>
              <p className="text-sm text-muted-foreground">{owner?.phone}</p>
            </div>
          </TableCell>
        )}
        {user?.role !== 'veterinarian' && (
          <TableCell>
            <p className="font-medium">{vet?.name || 'Not Assigned'}</p>
          </TableCell>
        )}
        <TableCell>
          <p className="line-clamp-2">{apt.reason}</p>
        </TableCell>
        <TableCell>
          <Badge className={cn(STATUS_COLORS[apt.status], 'capitalize')}>
            {apt.status}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewingAppointment(apt)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {apt.status === 'pending' && (user?.role === 'admin' || user?.role === 'receptionist' || user?.role === 'veterinarian') && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-green-600 hover:text-green-700"
                  onClick={() => handleStatusChange(apt.id, 'approved')}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleStatusChange(apt.id, 'cancelled')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
            {apt.status === 'approved' && user?.role === 'veterinarian' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusChange(apt.id, 'completed')}
              >
                Complete
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">Manage appointment schedules</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Book Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Book New Appointment</DialogTitle>
              <DialogDescription>
                Schedule an appointment for your pet
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Pet *</Label>
                  <Select
                    value={formData.petId}
                    onValueChange={(value) => setFormData({ ...formData, petId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pet" />
                    </SelectTrigger>
                    <SelectContent>
                      {myPets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id}>
                          {pet.name} ({pet.species})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Veterinarian *</Label>
                  <Select
                    value={formData.veterinarianId}
                    onValueChange={(value) => setFormData({ ...formData, veterinarianId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select veterinarian" />
                    </SelectTrigger>
                    <SelectContent>
                      {vets.map((vet) => (
                        <SelectItem key={vet.id} value={vet.id}>
                          {vet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !selectedDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Time *</Label>
                    <Select
                      value={formData.time}
                      onValueChange={(value) => setFormData({ ...formData, time: value })}
                    >
                      <SelectTrigger>
                        <Clock className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Reason for Visit *</Label>
                  <Input
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="e.g., Annual checkup, Vaccination, Illness"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional information..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Book Appointment</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* View Appointment Dialog */}
      <Dialog open={!!viewingAppointment} onOpenChange={() => setViewingAppointment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {viewingAppointment && (() => {
            const pet = petsStorage.getById(viewingAppointment.petId);
            const owner = usersStorage.getById(viewingAppointment.ownerId);
            const vet = usersStorage.getById(viewingAppointment.veterinarianId);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Date & Time</Label>
                    <p className="font-medium">
                      {format(new Date(viewingAppointment.date), 'MMMM d, yyyy')}
                    </p>
                    <p>{viewingAppointment.time}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <Badge className={cn(STATUS_COLORS[viewingAppointment.status], 'capitalize mt-1')}>
                      {viewingAppointment.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Pet</Label>
                  <p className="font-medium">{pet?.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{pet?.species} - {pet?.breed}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Owner</Label>
                  <p className="font-medium">{owner?.name}</p>
                  <p className="text-sm text-muted-foreground">{owner?.phone}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Veterinarian</Label>
                  <p className="font-medium">{vet?.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Reason</Label>
                  <p>{viewingAppointment.reason}</p>
                </div>
                {viewingAppointment.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p>{viewingAppointment.notes}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by pet, owner, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Tabs */}
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastAppointments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <Card>
            <CardContent className="p-0">
              {upcomingAppointments.length === 0 ? (
                <div className="py-16 text-center">
                  <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No upcoming appointments</h3>
                  <p className="text-muted-foreground mb-4">Book an appointment to get started</p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Book Appointment
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date/Time</TableHead>
                      <TableHead>Pet</TableHead>
                      {user?.role !== 'owner' && <TableHead>Owner</TableHead>}
                      {user?.role !== 'veterinarian' && <TableHead>Veterinarian</TableHead>}
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingAppointments.map(renderAppointmentRow)}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="past">
          <Card>
            <CardContent className="p-0">
              {pastAppointments.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <p>No past appointments</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date/Time</TableHead>
                      <TableHead>Pet</TableHead>
                      {user?.role !== 'owner' && <TableHead>Owner</TableHead>}
                      {user?.role !== 'veterinarian' && <TableHead>Veterinarian</TableHead>}
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastAppointments.map(renderAppointmentRow)}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
