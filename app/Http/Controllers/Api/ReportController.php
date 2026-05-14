<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Billing;
use App\Models\Pet;
use App\Models\MedicalRecord;
use App\Models\User;
use App\Models\Vaccination;
use App\Models\Veterinarian;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ReportController extends Controller
{
    public function dashboard(Request $request)
    {
        $user = $request->user();
 
        if ($user->isAdmin()) {
            $last30Days = Carbon::now()->subDays(30);
            
            return response()->json([
                'userStats' => [
                    'total' => User::count(),
                    'clinics' => User::where('role', 'vet_clinic')->count(),
                    'owners' => User::where('role', 'owner')->count(),
                    'vets' => Veterinarian::count(),
                    'newUsersLast30Days' => User::where('created_at', '>=', $last30Days)->count(),
                ],
                'engagement' => [
                    'activeAppointments' => Appointment::where('appointment_date', '>=', Carbon::today())->count(),
                    'totalMedicalRecords' => MedicalRecord::count(),
                    'totalVaccinations' => Vaccination::count(),
                ],
                'systemPerformance' => [
                    'databaseSize' => '24.5 MB', // Mocked
                    'serverUptime' => '99.9%', // Mocked
                    'responseTime' => '120ms', // Mocked
                    'errorRate' => '0.02%', // Mocked
                ],
                'recentEvents' => $this->globalActivity($request)->getData(true)
            ]);
        }

        if ($user->isVetClinic()) {
            $vetIds = Veterinarian::where('clinicId', $user->id)->pluck('id');
            $ownerIds = Appointment::whereIn('veterinarian_id', $vetIds)->distinct()->pluck('owner_id');

            return response()->json([
                'totalPets' => Pet::whereIn('owner_id', $ownerIds)->count(),
                'totalOwners' => $ownerIds->count(),
                'totalAppointments' => Appointment::whereIn('veterinarian_id', $vetIds)->count(),
                'todaysAppointments' => Appointment::today()->whereIn('veterinarian_id', $vetIds)->count(),
                'pendingAppointments' => Appointment::pending()->whereIn('veterinarian_id', $vetIds)->count(),
                'completedAppointments' => Appointment::completed()->whereIn('veterinarian_id', $vetIds)->count(),
                'totalVaccinations' => Vaccination::whereIn('administered_by', $vetIds)->count(),
                'upcomingVaccinations' => Vaccination::whereIn('administered_by', $vetIds)->dueSoon(30)->count(),
                'totalRecords' => MedicalRecord::whereIn('veterinarian_id', $vetIds)->count(),
                'totalRevenue' => $this->billingQueryForUser($request)->where('status', 'paid')->sum('total_amount'),
            ]);
        } elseif ($linkedVetId = $user->linkedVeterinarianId()) {
            $ownerIds = Appointment::where('veterinarian_id', $linkedVetId)->distinct()->pluck('owner_id');

            return response()->json([
                'totalPets' => Pet::whereIn('owner_id', $ownerIds)->count(),
                'totalOwners' => $ownerIds->count(),
                'totalAppointments' => Appointment::where('veterinarian_id', $linkedVetId)->count(),
                'todaysAppointments' => Appointment::today()->where('veterinarian_id', $linkedVetId)->count(),
                'pendingAppointments' => Appointment::pending()->where('veterinarian_id', $linkedVetId)->count(),
                'completedAppointments' => Appointment::completed()->where('veterinarian_id', $linkedVetId)->count(),
                'totalVaccinations' => Vaccination::where('administered_by', $linkedVetId)->count(),
                'upcomingVaccinations' => Vaccination::where('administered_by', $linkedVetId)->dueSoon(30)->count(),
                'myAppointmentsToday' => Appointment::today()->where('veterinarian_id', $linkedVetId)->count(),
                'myTotalRecords' => MedicalRecord::where('veterinarian_id', $linkedVetId)->count(),
                'totalRevenue' => $this->billingQueryForUser($request)->where('status', 'paid')->sum('total_amount'),
            ]);
        } elseif ($user->isOwner()) {
            return response()->json([
                'totalPets' => Pet::where('owner_id', $user->id)->count(),
                'myPets' => Pet::where('owner_id', $user->id)->count(),
                'totalAppointments' => Appointment::where('owner_id', $user->id)->count(),
                'myUpcomingAppointments' => Appointment::upcoming()->where('owner_id', $user->id)->count(),
                'pendingAppointments' => Appointment::pending()->where('owner_id', $user->id)->count(),
                'completedAppointments' => Appointment::completed()->where('owner_id', $user->id)->count(),
                'totalRecords' => MedicalRecord::whereHas('pet', function ($q) use ($user) {
                    $q->where('owner_id', $user->id);
                })->count(),
                'myTotalRecords' => MedicalRecord::whereHas('pet', function ($q) use ($user) {
                    $q->where('owner_id', $user->id);
                })->count(),
                'totalVaccinations' => Vaccination::whereHas('pet', function ($q) use ($user) {
                    $q->where('owner_id', $user->id);
                })->count(),
                'upcomingVaccinations' => Vaccination::whereHas('pet', function ($q) use ($user) {
                    $q->where('owner_id', $user->id);
                })->dueSoon(30)->count(),
                'totalRevenue' => $this->billingQueryForUser($request)->where('status', 'paid')->sum('total_amount'),
            ]);
        }

        return response()->json($this->globalDashboardStats());
    }

    public function appointmentStats(Request $request)
    {
        $startDate = $request->get('start_date');
        $endDate = $request->get('end_date');

        $baseQuery = $this->appointmentQueryForUser($request);
        if ($startDate && $endDate) {
            $baseQuery->whereBetween('appointment_date', [$startDate, $endDate]);
        }

        $byStatus = (clone $baseQuery)->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $daily = (clone $baseQuery)->selectRaw('DATE(appointment_date) as day, COUNT(*) as count')
            ->groupByRaw('DATE(appointment_date)')
            ->orderByRaw('DATE(appointment_date)')
            ->get()
            ->map(function($item) {
                return ['date' => $item->day, 'count' => $item->count];
            });

        return response()->json([
            'byStatus' => $byStatus,
            'daily' => $daily,
        ]);
    }

    public function speciesDistribution()
    {
        $distribution = $this->petQueryForUser(request())
            ->selectRaw('species, COUNT(*) as count')
            ->groupBy('species')
            ->orderBy('count', 'desc')
            ->get();

        return response()->json($distribution);
    }

    public function veterinarianActivity(Request $request)
    {
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth());
        $endDate = $request->get('end_date', Carbon::now()->endOfMonth());

        $activity = Veterinarian::query()
            ->withCount([
                'appointments as appointments_count' => function ($query) use ($startDate, $endDate) {
                    $query->whereBetween('appointment_date', [$startDate, $endDate]);
                },
                'medicalRecords as records_count' => function ($query) use ($startDate, $endDate) {
                    $query->whereBetween('record_date', [$startDate, $endDate]);
                },
            ])
            ->when($request->user()->isVetClinic(), function ($query) use ($request) {
                $query->where('clinicId', $request->user()->id);
            })
            ->when($request->user()->linkedVeterinarianId(), function ($query) use ($request) {
                $query->where('id', $request->user()->linkedVeterinarianId());
            })
            ->get();

        return response()->json($activity);
    }

    public function billingStats(Request $request)
    {
        $startDate = $request->get('start_date');
        $endDate = $request->get('end_date');

        $baseQuery = $this->billingQueryForUser($request);
        if ($startDate && $endDate) {
            $baseQuery->whereBetween('billing_date', [$startDate, $endDate]);
        }

        $byStatus = (clone $baseQuery)->selectRaw('status, SUM(total_amount) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->toArray();

        $daily = (clone $baseQuery)->selectRaw('DATE(billing_date) as day, SUM(total_amount) as revenue')
            ->where('status', 'paid')
            ->groupByRaw('DATE(billing_date)')
            ->orderByRaw('DATE(billing_date)')
            ->get()
            ->map(function($item) {
                return ['date' => $item->day, 'revenue' => (float)$item->revenue];
            });

        return response()->json([
            'byStatus' => $byStatus,
            'dailyRevenue' => $daily,
            'totalRevenue' => (float)(clone $baseQuery)->where('status', 'paid')->sum('total_amount'),
            'totalPending' => (float)(clone $baseQuery)->where('status', 'pending')->sum('total_amount'),
        ]);
    }

    public function vaccinationStats(Request $request)
    {
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth());
        $endDate = $request->get('end_date', Carbon::now()->endOfMonth());

        $query = Vaccination::query()
            ->whereBetween('date_administered', [$startDate, $endDate]);

        $byVaccine = (clone $query)->selectRaw('name, COUNT(*) as count')
            ->groupBy('name')
            ->orderBy('count', 'desc')
            ->get();

        $daily = (clone $query)->selectRaw('DATE(date_administered) as day, COUNT(*) as count')
            ->groupByRaw('DATE(date_administered)')
            ->orderByRaw('DATE(date_administered)')
            ->get()
            ->map(function($item) {
                return ['date' => $item->day, 'count' => $item->count];
            });

        return response()->json([
            'byVaccine' => $byVaccine,
            'daily' => $daily,
            'total' => (clone $query)->count(),
        ]);
    }

    public function medicalRecordStats(Request $request)
    {
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth());
        $endDate = $request->get('end_date', Carbon::now()->endOfMonth());

        $query = MedicalRecord::query()
            ->whereBetween('record_date', [$startDate, $endDate]);

        $daily = (clone $query)->selectRaw('DATE(record_date) as day, COUNT(*) as count')
            ->groupByRaw('DATE(record_date)')
            ->orderByRaw('DATE(record_date)')
            ->get()
            ->map(function($item) {
                return ['date' => $item->day, 'count' => $item->count];
            });

        return response()->json([
            'daily' => $daily,
            'total' => (clone $query)->count(),
        ]);
    }

    public function exportAppointments(Request $request)
    {
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth());
        $endDate = $request->get('end_date', Carbon::now()->endOfMonth());

        $appointments = $this->appointmentQueryForUser($request)
            ->with(['pet', 'owner', 'veterinarian'])
            ->whereBetween('appointment_date', [$startDate, $endDate])
            ->orderBy('appointment_date')
            ->get();

        $csv = "ID,Date,Time,Pet,Owner,Veterinarian,Reason,Status\n";

        foreach ($appointments as $apt) {
            $csv .= implode(',', [
                $apt->id,
                $apt->appointment_date->format('Y-m-d'),
                $apt->appointment_time->format('H:i'),
                '"' . $apt->pet->name . '"',
                '"' . $apt->owner->name . '"',
                '"' . $apt->veterinarian->name . '"',
                '"' . str_replace('"', '""', $apt->reason) . '"',
                $apt->status,
            ]) . "\n";
        }

        return response($csv)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="appointments.csv"');
    }

    public function summary(Request $request)
    {
        return response()->json([
            'dashboard' => $this->globalDashboardStats(),
            'appointments' => $this->appointmentStats($request)->original,
            'species' => $this->speciesDistribution()->original,
            'veterinarians' => $this->veterinarianActivity($request)->original,
            'billings' => $this->billingStats($request)->original,
            'vaccinations' => $this->vaccinationStats($request)->original,
            'medicalRecords' => $this->medicalRecordStats($request)->original,
            'activity' => $this->globalActivity($request)->original,
        ]);
    }

    public function globalActivity(Request $request)
    {
        $limit = $request->get('limit', 50);

        $appointments = Appointment::with(['pet', 'owner'])
            ->select('id', 'pet_id', 'owner_id', 'appointment_date as date', 'appointment_time as time', 'reason', 'status', 'created_at')
            ->latest()
            ->limit($limit)
            ->get()
            ->map(function ($item) {
                $item->type = 'appointment';
                return $item;
            });

        $vaccinations = Vaccination::with(['pet'])
            ->select('id', 'pet_id', 'name', 'date_administered', 'created_at')
            ->latest()
            ->limit($limit)
            ->get()
            ->map(function ($item) {
                $item->type = 'vaccination';
                return $item;
            });

        $records = MedicalRecord::with(['pet'])
            ->select('id', 'pet_id', 'diagnosis', 'record_date', 'created_at')
            ->latest()
            ->limit($limit)
            ->get()
            ->map(function ($item) {
                $item->type = 'medical_record';
                return $item;
            });

        $billings = $this->billingQueryForUser($request)
            ->with(['pet', 'owner'])
            ->select('id', 'pet_id', 'owner_id', 'invoice_number', 'total_amount', 'status', 'billing_date', 'created_at')
            ->latest()
            ->limit($limit)
            ->get()
            ->map(function ($item) {
                $item->type = 'billing';
                return $item;
            });

        $combined = $appointments->concat($vaccinations)
            ->concat($records)
            ->concat($billings)
            ->sortByDesc('created_at')
            ->values()
            ->take($limit);

        return response()->json($combined);
    }

    private function globalDashboardStats(): array
    {
        return [
            'totalPets' => Pet::count(),
            'totalOwners' => User::owners()->count(),
            'totalAppointments' => Appointment::count(),
            'todaysAppointments' => Appointment::today()->count(),
            'pendingAppointments' => Appointment::pending()->count(),
            'completedAppointments' => Appointment::completed()->count(),
            'totalVaccinations' => Vaccination::count(),
            'upcomingVaccinations' => Vaccination::dueSoon(30)->count(),
            'totalMedicalRecords' => MedicalRecord::count(),
            'totalRevenue' => Billing::where('status', 'paid')->sum('total_amount'),
        ];
    }

    private function appointmentQueryForUser(Request $request)
    {
        $user = $request->user();
        $query = Appointment::query();

        if ($user->isOwner()) {
            $query->where('owner_id', $user->id);
        } elseif ($user->isVetClinic()) {
            $vetIds = Veterinarian::where('clinicId', $user->id)->pluck('id');
            $query->whereIn('veterinarian_id', $vetIds);
        } elseif ($linkedVetId = $user->linkedVeterinarianId()) {
            $query->where('veterinarian_id', $linkedVetId);
        }

        return $query;
    }

    private function petQueryForUser(Request $request)
    {
        $user = $request->user();
        $query = Pet::query();

        if ($user->isOwner()) {
            $query->where('owner_id', $user->id);
        } elseif ($user->isVetClinic()) {
            $ownerIds = Appointment::whereIn(
                'veterinarian_id',
                Veterinarian::where('clinicId', $user->id)->pluck('id')
            )->distinct()->pluck('owner_id');

            $query->whereIn('owner_id', $ownerIds);
        } elseif ($linkedVetId = $user->linkedVeterinarianId()) {
            $ownerIds = Appointment::where('veterinarian_id', $linkedVetId)
                ->distinct()
                ->pluck('owner_id');

            $query->whereIn('owner_id', $ownerIds);
        }

        return $query;
    }

    private function billingQueryForUser(Request $request)
    {
        $user = $request->user();
        $query = Billing::query();

        if ($user->isOwner()) {
            $query->where('owner_id', $user->id);
        } elseif ($user->isVetClinic()) {
            $vetIds = Veterinarian::where('clinicId', $user->id)->pluck('id');
            $ownerIds = Appointment::whereIn('veterinarian_id', $vetIds)->distinct()->pluck('owner_id');

            $query->where(function ($q) use ($vetIds, $ownerIds) {
                $q->whereHas('medicalRecord', function ($recordQuery) use ($vetIds) {
                    $recordQuery->whereIn('veterinarian_id', $vetIds);
                })
                    ->orWhereHas('vaccination', function ($vaccinationQuery) use ($vetIds) {
                        $vaccinationQuery->whereIn('administered_by', $vetIds);
                    })
                    ->orWhereIn('owner_id', $ownerIds);
            });
        } elseif ($linkedVetId = $user->linkedVeterinarianId()) {
            $ownerIds = Appointment::where('veterinarian_id', $linkedVetId)->distinct()->pluck('owner_id');
            $query->where(function ($q) use ($linkedVetId, $ownerIds) {
                $q->whereHas('medicalRecord', function ($recordQuery) use ($linkedVetId) {
                    $recordQuery->where('veterinarian_id', $linkedVetId);
                })
                    ->orWhereHas('vaccination', function ($vaccinationQuery) use ($linkedVetId) {
                        $vaccinationQuery->where('administered_by', $linkedVetId);
                    })
                    ->orWhereIn('owner_id', $ownerIds);
            });
        }

        return $query;
    }
}
