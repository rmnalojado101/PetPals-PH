import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { Appointment, AppointmentAvailability, Pet, User, Veterinarian } from '@/types';
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
  Filter,
  Loader2
} from 'lucide-react';
import { addMonths, format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import type { PaginatedResponse } from '@/types';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00'
];

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

function getAppointmentDateString(appointment: Appointment): string {
  return appointment.appointmentDate || appointment.date || '';
}

function getAppointmentTimeString(appointment: Appointment): string {
  return appointment.appointmentTime || appointment.time || '';
}

function getAppointmentDateKey(appointment: Appointment): string {
  const value = getAppointmentDateString(appointment);
  return value ? value.slice(0, 10) : '';
}

function parseAppointmentDateKey(appointment: Appointment): Date | null {
  const value = getAppointmentDateKey(appointment);
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

function getAvailabilityDateKey(availability: AppointmentAvailability): string {
  return availability.appointmentDate ? availability.appointmentDate.slice(0, 10) : '';
}

function getAvailabilityTimeString(availability: AppointmentAvailability): string {
  return availability.appointmentTime || '';
}

function sameId(left: string | number | undefined, right: string | number | undefined): boolean {
  if (left === undefined || right === undefined) {
    return false;
  }

  return left.toString() === right.toString();
}

export default function AppointmentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<AppointmentAvailability[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [veterinarians, setVeterinarians] = useState<Veterinarian[]>([]);
  const [clinics, setClinics] = useState<User[]>([]);
  const [owners, setOwners] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [viewingAppointment, setViewingAppointment] = useState<Appointment | null>(null);
  
  // Form state
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState({
    clinicId: '',
    ownerId: '',
    petId: '',
    veterinarianId: '',
    time: '',
    reason: '',
    notes: '',
  });
  const activeClinicId = user?.role === 'vet_clinic' ? user.id?.toString() : formData.clinicId;
  const availableVets = activeClinicId
    ? veterinarians.filter(v => v.clinicId?.toString() === activeClinicId.toString())
    : [];

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsDataLoading(true);
    
    try {
      const petsParams = user.role === 'owner' ? { owner_id: user.id } : {};
      const [appointmentsResponse, petsResponse, vetsResponse, clinicsResponse, ownersResponse] = await Promise.all([
        api.getAppointments(),
        api.getPets(petsParams),
        api.getVeterinarians(),
        api.getUsers({ role: 'vet_clinic' }),
        user.role !== 'owner' ? api.getOwners() : Promise.resolve([])
      ]);
      
      setAppointments(Array.isArray(appointmentsResponse) ? appointmentsResponse : (appointmentsResponse as PaginatedResponse<Appointment>).data);
      setPets(Array.isArray(petsResponse) ? petsResponse : (petsResponse as PaginatedResponse<Pet>).data);
      setVeterinarians(vetsResponse);
      setClinics(Array.isArray(clinicsResponse) ? clinicsResponse : (clinicsResponse as PaginatedResponse<User>).data);
      if (user.role !== 'owner') {
        setOwners(ownersResponse);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setIsDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!isDialogOpen || !formData.veterinarianId) {
      setAvailabilitySlots([]);
      return;
    }

    const loadAvailability = async () => {
      try {
        const today = new Date();
        const availability = await api.getAppointmentAvailability({
          veterinarian_id: formData.veterinarianId,
          clinic_id: activeClinicId,
          start_date: format(today, 'yyyy-MM-dd'),
          end_date: format(addMonths(today, 12), 'yyyy-MM-dd'),
        });

        setAvailabilitySlots(availability);
      } catch (error) {
        console.error('Error loading appointment availability:', error);
        setAvailabilitySlots([]);
      }
    };

    loadAvailability();
  }, [isDialogOpen, formData.veterinarianId, activeClinicId]);

  const resetForm = () => {
    setFormData({
      clinicId: '',
      ownerId: '',
      petId: '',
      veterinarianId: '',
      time: '',
      reason: '',
      notes: '',
    });
    setSelectedDate(undefined);
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      await api.createAppointment({
        pet_id: formData.petId,
        clinic_id: (user?.role === 'vet_clinic' ? user.id : formData.clinicId) || undefined,
        owner_id: user?.role === 'owner' ? user.id : formData.ownerId,
        veterinarian_id: formData.veterinarianId,
        appointment_date: dateStr,
        appointment_time: formData.time,
        reason: formData.reason,
        notes: formData.notes,
      });

      toast({
        title: 'Appointment Booked',
        description: 'Successfully saved to database.',
      });

      void loadData();
      setIsDialogOpen(false);
      resetForm();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Time conflict or server error.';
      toast({
        title: 'Booking Failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const checkConflict = (vetId: string, dateStr: string, time: string) => {
    return availabilitySlots.some((availability) => {
      const aptDate = getAvailabilityDateKey(availability);
      const aptTime = getAvailabilityTimeString(availability);
      const aptVetId = availability.veterinarianId;
      return aptVetId?.toString() === vetId.toString() && 
             aptDate === dateStr && 
             aptTime === time && 
             availability.status !== 'cancelled';
    });
  };

  const handleStatusChange = async (appointmentId: string, newStatus: Appointment['status']) => {
    try {
      await api.updateAppointment(appointmentId, { status: newStatus });
      toast({
        title: 'Status Updated',
        description: `Appointment marked as ${newStatus}.`,
      });
      void loadData();
    } catch (error) {
       toast({
        title: 'Update Failed',
        description: 'Could not update status.',
        variant: 'destructive',
      });
    }
  };

  const allOwners = owners.filter(o => o.role === 'owner');
  
  const filteredAppointments = appointments.filter(apt => {
    const petName = apt.pet?.name || '';
    const ownerName = apt.owner?.name || '';
    const matchesSearch = 
      petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const upcomingAppointments = filteredAppointments.filter((appointment) => {
    const appointmentDateKey = getAppointmentDateKey(appointment);
    return appointmentDateKey ? appointmentDateKey >= todayKey : false;
  });
  const pastAppointments = filteredAppointments.filter((appointment) => {
    const appointmentDateKey = getAppointmentDateKey(appointment);
    return appointmentDateKey ? appointmentDateKey < todayKey : false;
  });

  const {
    paginatedData: paginatedUpcoming,
    currentPage: upcomingPage,
    totalPages: upcomingTotalPages,
    nextPage: upcomingNext,
    prevPage: upcomingPrev
  } = usePagination(upcomingAppointments, 10);

  const {
    paginatedData: paginatedPast,
    currentPage: pastPage,
    totalPages: pastTotalPages,
    nextPage: pastNext,
    prevPage: pastPrev
  } = usePagination(pastAppointments, 10);

  const renderAppointmentRow = (apt: Appointment) => {
    const petName = apt.pet?.name || 'Animal';
    const petSpecies = apt.pet?.species || '';
    const ownerName = apt.owner?.name || 'Unknown';
    const vetName = apt.veterinarian?.name || 'Not Assigned';
    const aDate = getAppointmentDateKey(apt);
    const aTime = getAppointmentTimeString(apt);

    return (
      <TableRow key={apt.id}>
        <TableCell>
          <div>
            <p className="font-medium">{aDate ? format(parseISO(aDate), 'MMM d, yyyy') : ''}</p>
            <p className="text-sm text-muted-foreground">{aTime}</p>
          </div>
        </TableCell>
        <TableCell>
          <div>
            <p className="font-medium">{petName}</p>
            <p className="text-sm text-muted-foreground capitalize">{petSpecies}</p>
          </div>
        </TableCell>
        {user?.role !== 'owner' && (
          <TableCell>
            <div>
              <p className="font-medium">{ownerName}</p>
              <p className="text-sm text-muted-foreground">{apt.owner?.phone}</p>
            </div>
          </TableCell>
        )}
        <TableCell>
          <p className="font-medium">{vetName}</p>
        </TableCell>
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
            {apt.status === 'pending' && (user?.role === 'admin' || user?.role === 'vet_clinic' || user?.role === 'veterinarian') && (
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
            {apt.status === 'approved' && (user?.role === 'admin' || user?.role === 'vet_clinic' || user?.role === 'veterinarian') && (
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

  if (isDataLoading && appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
        <p className="mt-4 text-muted-foreground">Loading Appointments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-tour="appointments-page">
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
          <DialogContent className={cn("transition-all duration-300", step === 1 ? "max-w-3xl" : "max-w-lg")}>
            <DialogHeader>
              <DialogTitle>Book New Appointment</DialogTitle>
              <DialogDescription>
                {step === 1 ? "Select an available date and time for your appointment." : "Provide the details for your appointment."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              {step === 1 ? (
                <div className="grid md:grid-cols-2 gap-6 py-4">
                  <div className="space-y-4">
                    {user?.role !== 'vet_clinic' && (
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">Select Clinic *</Label>
                        <Select
                          value={formData.clinicId}
                          onValueChange={(value) => setFormData({ ...formData, clinicId: value, veterinarianId: '', time: '' })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a clinic" />
                          </SelectTrigger>
                          <SelectContent>
                            {clinics.map(clinic => (
                              <SelectItem key={clinic.id} value={clinic.id.toString()}>
                                {clinic.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {activeClinicId && (
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">Select Veterinarian Doctor *</Label>
                        <Select
                          value={formData.veterinarianId}
                          onValueChange={(value) => setFormData({ ...formData, veterinarianId: value, time: '' })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a doctor" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableVets.map(vet => (
                              <SelectItem key={vet.id} value={vet.id.toString()}>
                                {vet.name} {vet.specialty ? `(${vet.specialty})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formData.veterinarianId && (() => {
                          const v = availableVets.find(x => x.id === formData.veterinarianId);
                          return v?.background ? <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{v.background}</p> : null;
                        })()}
                      </div>
                    )}

                    <div className="space-y-2">
                       <Label className="text-base font-semibold" style={{ opacity: formData.veterinarianId ? 1 : 0.5 }}>Select Date *</Label>
                       <div className={cn("border rounded-md p-4 inline-block w-full flex justify-center bg-card", !formData.veterinarianId && "opacity-50 pointer-events-none")}>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            setSelectedDate(date);
                            setFormData({ ...formData, time: '' });
                          }}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            if (date < today) return true;
                            if (formData.veterinarianId) {
                               const dateStr = format(date, 'yyyy-MM-dd');
                               const bookedSlots = TIME_SLOTS.filter(time => checkConflict(formData.veterinarianId, dateStr, time));
                               if (bookedSlots.length === TIME_SLOTS.length) return true; // Fully Booked
                            }
                            return false;
                          }}
                          components={{
                            DayContent: ({ date }) => {
                              let isFullyBooked = false;
                              if (formData.veterinarianId) {
                                 const today = new Date();
                                 today.setHours(0, 0, 0, 0);
                                 if (date >= today) {
                                   const dateStr = format(date, 'yyyy-MM-dd');
                                   const bookedSlots = TIME_SLOTS.filter(time => checkConflict(formData.veterinarianId, dateStr, time));
                                   isFullyBooked = bookedSlots.length === TIME_SLOTS.length;
                                 }
                              }
                              
                              return (
                                <div className="relative w-full h-full flex items-center justify-center">
                                  <span className={cn(isFullyBooked && "opacity-20 line-through")}>{date.getDate()}</span>
                                  {isFullyBooked && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible z-10 w-full scale-125">
                                       <span className="text-[7.5px] text-destructive leading-tight font-black border border-destructive bg-background/90 px-0.5 rounded shadow-sm text-center tracking-tighter whitespace-nowrap">
                                         FULLY<br/>BOOKED
                                       </span>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                          }}
                          initialFocus
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Available Times *</Label>
                    {selectedDate && formData.veterinarianId ? (
                      <div className="grid grid-cols-3 gap-2">
                        {TIME_SLOTS.map((time) => {
                          const dateStr = format(selectedDate, 'yyyy-MM-dd');
                          const isBooked = checkConflict(formData.veterinarianId, dateStr, time);
                          return (
                            <Button
                              key={time}
                              type="button"
                              variant={formData.time === time ? 'default' : 'outline'}
                              disabled={isBooked}
                              className={cn("w-full relative overflow-hidden transition-all", isBooked && "opacity-40 cursor-not-allowed line-through bg-muted")}
                              onClick={() => setFormData({ ...formData, time })}
                            >
                              <span className={cn(isBooked && "opacity-20")}>{time}</span>
                              {isBooked && (
                                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-destructive no-underline tracking-widest bg-background/50 drop-shadow-sm">
                                  RESERVED
                                </span>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex h-[300px] items-center justify-center border rounded-md bg-muted/20 text-muted-foreground text-sm flex-col gap-2 opacity-70">
                         <CalendarIcon className="h-8 w-8 mb-2" />
                         {formData.veterinarianId ? "Please select a date first" : "Please select a doctor to view their schedule"}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Selected Schedule</Label>
                    <div className="p-3 bg-muted rounded-md flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span className="font-medium">
                        {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''} at {formData.time}
                      </span>
                    </div>
                  </div>

                  {user?.role !== 'owner' && (
                    <div className="space-y-2">
                      <Label>Owner *</Label>
                      <Select
                        value={formData.ownerId}
                        onValueChange={(value) => setFormData({ ...formData, ownerId: value, petId: '' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select pet owner" />
                        </SelectTrigger>
                        <SelectContent>
                          {allOwners.map((owner) => (
                            <SelectItem key={owner.id} value={owner.id.toString()}>
                              {owner.name} ({owner.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Pet *</Label>
                    <Select
                      value={formData.petId}
                      onValueChange={(value) => setFormData({ ...formData, petId: value })}
                      disabled={user?.role !== 'owner' && !formData.ownerId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={user?.role !== 'owner' && !formData.ownerId ? "Select an owner first" : "Select pet"} />
                      </SelectTrigger>
                      <SelectContent>
                        {pets
                          .filter((pet) => user?.role === 'owner'
                            ? sameId(pet.ownerId, user.id)
                            : sameId(pet.ownerId, formData.ownerId))
                          .map((pet) => (
                          <SelectItem key={pet.id} value={pet.id.toString()}>
                            {pet.name} ({pet.species})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
              )}
              
              <DialogFooter>
                {step === 1 ? (
                  <>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => setStep(2)}
                      disabled={!selectedDate || !formData.time}
                    >
                      Next Step
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button type="submit">Book Appointment</Button>
                  </>
                )}
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
            const petName = viewingAppointment.pet?.name || 'Animal';
            const petSpecies = viewingAppointment.pet?.species || '';
            const ownerName = viewingAppointment.owner?.name || 'Unknown';
            const vetName = viewingAppointment.veterinarian?.name || 'Not Managed';
            const aDate = getAppointmentDateKey(viewingAppointment);
            const aTime = getAppointmentTimeString(viewingAppointment);

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Date & Time</Label>
                    <p className="font-medium">
                      {aDate ? format(parseISO(aDate), 'MMMM d, yyyy') : ''}
                    </p>
                    <p>{aTime}</p>
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
                  <p className="font-medium">{petName}</p>
                  <p className="text-sm text-muted-foreground capitalize">{petSpecies}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Owner</Label>
                  <p className="font-medium">{ownerName}</p>
                  <p className="text-sm text-muted-foreground">{viewingAppointment.owner?.phone}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Veterinarian</Label>
                  <p className="font-medium">{vetName}</p>
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
                      <TableHead>Veterinarian</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUpcoming.map(renderAppointmentRow)}
                  </TableBody>
                </Table>
              )}
              {upcomingAppointments.length > 0 && (
                <PaginationControls
                  currentPage={upcomingPage}
                  totalPages={upcomingTotalPages}
                  onNext={upcomingNext}
                  onPrev={upcomingPrev}
                />
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
                      <TableHead>Veterinarian</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPast.map(renderAppointmentRow)}
                  </TableBody>
                </Table>
              )}
              {pastAppointments.length > 0 && (
                <PaginationControls
                  currentPage={pastPage}
                  totalPages={pastTotalPages}
                  onNext={pastNext}
                  onPrev={pastPrev}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
