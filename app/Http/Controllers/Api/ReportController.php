<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
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

        $stats = $this->globalDashboardStats();

        if ($user->isVetClinic()) {
            $vetIds = Veterinarian::where('clinicId', $user->id)->pluck('id');
            $ownerIds = Appointment::whereIn('veterinarian_id', $vetIds)->distinct()->pluck('owner_id');

            $stats = [
                'totalPets' => Pet::whereIn('owner_id', $ownerIds)->count(),
                'totalOwners' => $ownerIds->count(),
                'totalAppointments' => Appointment::whereIn('veterinarian_id', $vetIds)->count(),
                'todaysAppointments' => Appointment::today()->whereIn('veterinarian_id', $vetIds)->count(),
                'pendingAppointments' => Appointment::pending()->whereIn('veterinarian_id', $vetIds)->count(),
                'completedAppointments' => Appointment::completed()->whereIn('veterinarian_id', $vetIds)->count(),
                'totalVaccinations' => Vaccination::whereIn('administered_by', $vetIds)->count(),
                'upcomingVaccinations' => Vaccination::whereIn('administered_by', $vetIds)->dueSoon(30)->count(),
            ];
        } elseif ($linkedVetId = $user->linkedVeterinarianId()) {
            $ownerIds = Appointment::where('veterinarian_id', $linkedVetId)->distinct()->pluck('owner_id');

            $stats = [
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
            ];
        } elseif ($user->isOwner()) {
            $stats['myPets'] = Pet::where('owner_id', $user->id)->count();
            $stats['myUpcomingAppointments'] = Appointment::upcoming()
                ->where('owner_id', $user->id)
                ->count();
        }

        return response()->json($stats);
    }

    public function appointmentStats(Request $request)
    {
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth());
        $endDate = $request->get('end_date', Carbon::now()->endOfMonth());

        $stats = $this->appointmentQueryForUser($request)
            ->selectRaw('status, COUNT(*) as count')
            ->whereBetween('appointment_date', [$startDate, $endDate])
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status');

        $dailyStats = $this->appointmentQueryForUser($request)
            ->selectRaw('DATE(appointment_date) as date, COUNT(*) as count')
            ->whereBetween('appointment_date', [$startDate, $endDate])
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json([
            'byStatus' => $stats,
            'daily' => $dailyStats,
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
}
