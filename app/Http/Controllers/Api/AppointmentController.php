<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Notification;
use App\Models\Pet;
use App\Models\Veterinarian;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AppointmentController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Appointment::with(['pet', 'owner', 'veterinarian']);

        if ($user->isOwner()) {
            $query->where('owner_id', $user->id);
        } elseif ($user->isVetClinic()) {
            $query->whereHas('veterinarian', function ($q) use ($user) {
                $q->where('clinicId', $user->id);
            });
        } elseif ($linkedVetId = $user->linkedVeterinarianId()) {
            $query->where('veterinarian_id', $linkedVetId);
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
                              ->paginate($request->integer('per_page', 20));

        return response()->json($appointments);
    }

    public function show(Request $request, Appointment $appointment)
    {
        $user = $request->user();

        if ($user->isOwner() && $appointment->owner_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user->isVetClinic() && optional($appointment->veterinarian)->clinicId !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (($linkedVetId = $user->linkedVeterinarianId()) && $appointment->veterinarian_id !== $linkedVetId) {
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
            'owner_id' => [
                Rule::requiredIf(!$user->isOwner()),
                'nullable',
                'exists:users,id',
            ],
            'clinic_id' => 'nullable|exists:users,id',
            'veterinarian_id' => 'required|exists:veterinarians,id',
            'appointment_date' => 'required|date|after_or_equal:today',
            'appointment_time' => 'required|date_format:H:i',
            'reason' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        $veterinarian = Veterinarian::findOrFail($validated['veterinarian_id']);
        $ownerId = $user->isOwner() ? $user->id : (int) $validated['owner_id'];
        $pet = Pet::query()->findOrFail($validated['pet_id']);

        if ((int) $pet->owner_id !== $ownerId) {
            return response()->json([
                'message' => 'Selected pet does not belong to the selected owner',
            ], 422);
        }

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
            if (empty($veterinarian->clinicId)) {
                return response()->json([
                    'message' => 'Selected veterinarian is not linked to a clinic',
                ], 422);
            }

            if (!empty($validated['clinic_id']) && (string) $veterinarian->clinicId !== (string) $validated['clinic_id']) {
                return response()->json([
                    'message' => 'Selected veterinarian does not belong to the chosen clinic',
                ], 422);
            }

            $validated['owner_id'] = $user->id;
            $validated['status'] = 'pending';
        } elseif ($user->isVetClinic()) {
            if ((string) $veterinarian->clinicId !== (string) $user->id) {
                return response()->json([
                    'message' => 'Selected veterinarian does not belong to your clinic',
                ], 422);
            }

            $validated['owner_id'] = $ownerId;
            $validated['status'] = 'approved';
        } elseif ($linkedVetId = $user->linkedVeterinarianId()) {
            if ((int) $validated['veterinarian_id'] !== $linkedVetId) {
                return response()->json([
                    'message' => 'You can only create appointments under your veterinarian profile',
                ], 422);
            }

            $validated['owner_id'] = $ownerId;
            $validated['status'] = 'approved';
        } else {
            $validated['owner_id'] = $ownerId;
            $validated['status'] = 'approved';
        }

        unset($validated['clinic_id']);

        $appointment = Appointment::create($validated);
        $appointment->load(['pet', 'owner', 'veterinarian']);

        Notification::create([
            'user_id' => $appointment->owner_id,
            'title' => 'Appointment Scheduled',
            'message' => "Your appointment for {$appointment->pet->name} has been scheduled for {$appointment->appointment_date->format('M d, Y')} at {$appointment->appointment_time->format('h:i A')}",
            'type' => 'appointment',
        ]);

        if ($appointment->veterinarian && $appointment->veterinarian->clinicId) {
            Notification::create([
                'user_id' => $appointment->veterinarian->clinicId,
                'title' => 'New Appointment Request',
                'message' => "{$appointment->owner->name} booked {$appointment->pet->name} for {$appointment->appointment_date->format('M d, Y')} at {$appointment->appointment_time->format('h:i A')}",
                'type' => 'appointment',
            ]);
        }

        return response()->json($appointment, 201);
    }

    public function update(Request $request, Appointment $appointment)
    {
        $user = $request->user();

        if ($user->isOwner()) {
            if ($appointment->owner_id !== $user->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $validated = $request->validate([
                'status' => ['required', 'in:cancelled'],
            ]);

            if (!$appointment->isPending()) {
                return response()->json(['message' => 'Can only cancel pending appointments'], 422);
            }

            $appointment->update(['status' => $validated['status']]);

            Notification::create([
                'user_id' => $appointment->owner_id,
                'title' => 'Appointment Update',
                'message' => 'Your appointment has been cancelled',
                'type' => 'appointment',
            ]);

            return response()->json($appointment->load(['pet', 'owner', 'veterinarian']));
        }

        if ($user->isVetClinic() && optional($appointment->veterinarian)->clinicId !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (($linkedVetId = $user->linkedVeterinarianId()) && $appointment->veterinarian_id !== $linkedVetId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'veterinarian_id' => 'sometimes|exists:veterinarians,id',
            'appointment_date' => 'sometimes|date',
            'appointment_time' => 'sometimes|date_format:H:i',
            'reason' => 'sometimes|string',
            'status' => 'sometimes|in:pending,approved,completed,cancelled',
            'notes' => 'nullable|string',
        ]);

        if (isset($validated['veterinarian_id']) && $user->isVetClinic()) {
            $newVeterinarian = Veterinarian::findOrFail($validated['veterinarian_id']);

            if ((string) $newVeterinarian->clinicId !== (string) $user->id) {
                return response()->json(['message' => 'Selected veterinarian does not belong to your clinic'], 422);
            }
        }

        if ($linkedVetId && isset($validated['veterinarian_id']) && (int) $validated['veterinarian_id'] !== $linkedVetId) {
            return response()->json(['message' => 'You can only manage your own veterinarian profile'], 422);
        }

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

        if ($user->isVetClinic() && optional($appointment->veterinarian)->clinicId !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (($linkedVetId = $user->linkedVeterinarianId()) && $appointment->veterinarian_id !== $linkedVetId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $appointment->delete();

        return response()->json(['message' => 'Appointment deleted successfully']);
    }

    public function today(Request $request)
    {
        $user = $request->user();
        $query = Appointment::with(['pet', 'owner', 'veterinarian'])->today();

        if ($user->isVetClinic()) {
            $query->whereHas('veterinarian', function ($q) use ($user) {
                $q->where('clinicId', $user->id);
            });
        } elseif ($linkedVetId = $user->linkedVeterinarianId()) {
            $query->where('veterinarian_id', $linkedVetId);
        }

        $appointments = $query->orderBy('appointment_time')->get();

        return response()->json($appointments);
    }

    public function availability(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'veterinarian_id' => 'required|exists:veterinarians,id',
            'clinic_id' => 'nullable|exists:users,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $veterinarian = Veterinarian::findOrFail($validated['veterinarian_id']);

        if (!empty($validated['clinic_id']) && (string) $veterinarian->clinicId !== (string) $validated['clinic_id']) {
            return response()->json([
                'message' => 'Selected veterinarian does not belong to the chosen clinic',
            ], 422);
        }

        if ($user->isVetClinic() && (string) $veterinarian->clinicId !== (string) $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (($linkedVetId = $user->linkedVeterinarianId()) && (int) $veterinarian->id !== (int) $linkedVetId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $startDate = $validated['start_date'] ?? now()->toDateString();
        $endDate = $validated['end_date'] ?? now()->addMonths(12)->toDateString();

        $appointments = Appointment::query()
            ->select([
                'id',
                'veterinarian_id',
                'appointment_date',
                'appointment_time',
                'status',
            ])
            ->where('veterinarian_id', $veterinarian->id)
            ->whereBetween('appointment_date', [$startDate, $endDate])
            ->whereIn('status', ['pending', 'approved'])
            ->orderBy('appointment_date')
            ->orderBy('appointment_time')
            ->get();

        return response()->json($appointments);
    }

    public function upcoming(Request $request)
    {
        $user = $request->user();
        $query = Appointment::with(['pet', 'owner', 'veterinarian'])->upcoming();

        if ($user->isOwner()) {
            $query->where('owner_id', $user->id);
        } elseif ($user->isVetClinic()) {
            $query->whereHas('veterinarian', function ($q) use ($user) {
                $q->where('clinicId', $user->id);
            });
        } elseif ($linkedVetId = $user->linkedVeterinarianId()) {
            $query->where('veterinarian_id', $linkedVetId);
        }

        $appointments = $query->orderBy('appointment_date')
                              ->orderBy('appointment_time')
                              ->limit(10)
                              ->get();

        return response()->json($appointments);
    }
}
