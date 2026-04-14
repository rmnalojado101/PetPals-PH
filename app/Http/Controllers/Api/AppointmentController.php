<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Notification;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Appointment::with(['pet', 'owner', 'veterinarian']);

        if ($user->isOwner()) {
            $query->where('owner_id', $user->id);
        } elseif ($user->isVeterinarian()) {
            $query->where('veterinarian_id', $user->id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('date')) {
            $query->whereDate('appointment_date', $request->date);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('appointment_date', [$request->start_date, $request->end_date]);
        }

        $appointments = $query->orderBy('appointment_date', 'desc')
                              ->orderBy('appointment_time', 'asc')
                              ->paginate(20);

        return response()->json($appointments);
    }

    public function show(Request $request, Appointment $appointment)
    {
        $user = $request->user();

        if ($user->isOwner() && $appointment->owner_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($appointment->load([
            'pet',
            'owner',
            'veterinarian',
            'medicalRecord',
        ]));
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'veterinarian_id' => 'required|exists:users,id',
            'appointment_date' => 'required|date|after_or_equal:today',
            'appointment_time' => 'required|date_format:H:i',
            'reason' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        if (Appointment::hasConflict(
            $validated['veterinarian_id'],
            $validated['appointment_date'],
            $validated['appointment_time']
        )) {
            return response()->json([
                'message' => 'This time slot is already booked',
            ], 422);
        }

        if ($user->isOwner()) {
            $validated['owner_id'] = $user->id;
            $validated['status'] = 'pending';
        } else {
            $validated['owner_id'] = $request->owner_id;
            $validated['status'] = 'approved';
        }

        $appointment = Appointment::create($validated);

        Notification::create([
            'user_id' => $appointment->owner_id,
            'title' => 'Appointment Scheduled',
            'message' => "Your appointment for {$appointment->pet->name} has been scheduled for {$appointment->appointment_date->format('M d, Y')} at {$appointment->appointment_time->format('h:i A')}",
            'type' => 'appointment',
        ]);

        return response()->json($appointment->load(['pet', 'owner', 'veterinarian']), 201);
    }

    public function update(Request $request, Appointment $appointment)
    {
        $user = $request->user();

        if ($user->isOwner()) {
            if ($appointment->owner_id !== $user->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            if (!$appointment->isPending() && $request->status === 'cancelled') {
                return response()->json(['message' => 'Can only cancel pending appointments'], 422);
            }
        }

        $validated = $request->validate([
            'veterinarian_id' => 'sometimes|exists:users,id',
            'appointment_date' => 'sometimes|date',
            'appointment_time' => 'sometimes|date_format:H:i',
            'reason' => 'sometimes|string',
            'status' => 'sometimes|in:pending,approved,completed,cancelled',
            'notes' => 'nullable|string',
        ]);

        if (isset($validated['appointment_date']) || isset($validated['appointment_time'])) {
            $vetId = $validated['veterinarian_id'] ?? $appointment->veterinarian_id;
            $date = $validated['appointment_date'] ?? $appointment->appointment_date->format('Y-m-d');
            $time = $validated['appointment_time'] ?? $appointment->appointment_time->format('H:i');

            if (Appointment::hasConflict($vetId, $date, $time, $appointment->id)) {
                return response()->json([
                    'message' => 'This time slot is already booked',
                ], 422);
            }
        }

        $oldStatus = $appointment->status;
        $appointment->update($validated);

        if (isset($validated['status']) && $validated['status'] !== $oldStatus) {
            $statusMessages = [
                'approved' => 'Your appointment has been approved',
                'completed' => 'Your appointment has been completed',
                'cancelled' => 'Your appointment has been cancelled',
            ];

            if (isset($statusMessages[$validated['status']])) {
                Notification::create([
                    'user_id' => $appointment->owner_id,
                    'title' => 'Appointment Update',
                    'message' => $statusMessages[$validated['status']],
                    'type' => 'appointment',
                ]);
            }
        }

        return response()->json($appointment->load(['pet', 'owner', 'veterinarian']));
    }

    public function destroy(Request $request, Appointment $appointment)
    {
        $user = $request->user();

        if ($user->isOwner() && $appointment->owner_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $appointment->delete();

        return response()->json(['message' => 'Appointment deleted successfully']);
    }

    public function today(Request $request)
    {
        $user = $request->user();
        $query = Appointment::with(['pet', 'owner', 'veterinarian'])->today();

        if ($user->isVeterinarian()) {
            $query->where('veterinarian_id', $user->id);
        }

        $appointments = $query->orderBy('appointment_time')->get();

        return response()->json($appointments);
    }

    public function upcoming(Request $request)
    {
        $user = $request->user();
        $query = Appointment::with(['pet', 'owner', 'veterinarian'])->upcoming();

        if ($user->isOwner()) {
            $query->where('owner_id', $user->id);
        } elseif ($user->isVeterinarian()) {
            $query->where('veterinarian_id', $user->id);
        }

        $appointments = $query->orderBy('appointment_date')
                              ->orderBy('appointment_time')
                              ->limit(10)
                              ->get();

        return response()->json($appointments);
    }
}
