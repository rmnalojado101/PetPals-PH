<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Pet;
use App\Models\MedicalRecord;
use App\Models\User;
use App\Models\Vaccination;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ReportController extends Controller
{
    public function dashboard(Request $request)
    {
        $user = $request->user();

        $stats = [
            'totalPets' => Pet::count(),
            'totalOwners' => User::owners()->count(),
            'totalAppointments' => Appointment::count(),
            'todaysAppointments' => Appointment::today()->count(),
            'pendingAppointments' => Appointment::pending()->count(),
            'completedAppointments' => Appointment::completed()->count(),
            'totalVaccinations' => Vaccination::count(),
            'upcomingVaccinations' => Vaccination::dueSoon(30)->count(),
        ];

        if ($user->isVeterinarian()) {
            $stats['myAppointmentsToday'] = Appointment::today()
                ->where('veterinarian_id', $user->id)
                ->count();
            $stats['myTotalRecords'] = MedicalRecord::where('veterinarian_id', $user->id)->count();
        }

        if ($user->isOwner()) {
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

        $stats = Appointment::selectRaw('status, COUNT(*) as count')
            ->whereBetween('appointment_date', [$startDate, $endDate])
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status');

        $dailyStats = Appointment::selectRaw('DATE(appointment_date) as date, COUNT(*) as count')
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
        $distribution = Pet::selectRaw('species, COUNT(*) as count')
            ->groupBy('species')
            ->orderBy('count', 'desc')
            ->get();

        return response()->json($distribution);
    }

    public function veterinarianActivity(Request $request)
    {
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth());
        $endDate = $request->get('end_date', Carbon::now()->endOfMonth());

        $activity = User::veterinarians()
            ->withCount([
                'appointmentsAsVet as appointments_count' => function ($query) use ($startDate, $endDate) {
                    $query->whereBetween('appointment_date', [$startDate, $endDate]);
                },
                'medicalRecords as records_count' => function ($query) use ($startDate, $endDate) {
                    $query->whereBetween('record_date', [$startDate, $endDate]);
                },
            ])
            ->get();

        return response()->json($activity);
    }

    public function exportAppointments(Request $request)
    {
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth());
        $endDate = $request->get('end_date', Carbon::now()->endOfMonth());

        $appointments = Appointment::with(['pet', 'owner', 'veterinarian'])
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
}
