<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\MedicalRecord;
use App\Models\Notification;
use App\Models\Veterinarian;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Barryvdh\DomPDF\Facade\Pdf;

class MedicalRecordController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = MedicalRecord::with(['pet.owner', 'veterinarian', 'appointment']);

        if ($user->isOwner()) {
            $query->whereHas('pet', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        } elseif ($user->isVetClinic()) {
            $query->whereHas('veterinarian', function ($q) use ($user) {
                $q->where('clinicId', $user->id);
            });
        } elseif ($linkedVetId = $user->linkedVeterinarianId()) {
            $query->where('veterinarian_id', $linkedVetId);
        }

        if ($request->has('pet_id')) {
            $query->where('pet_id', $request->pet_id);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('record_date', [$request->start_date, $request->end_date]);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('diagnosis', 'like', "%{$search}%")
                    ->orWhere('treatment', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        $records = $query->orderBy('record_date', 'desc')
            ->paginate($request->integer('per_page', 20));

        return response()->json($records);
    }

    public function show(Request $request, MedicalRecord $medicalRecord)
    {
        $user = $request->user();

        if ($user->isOwner() && $medicalRecord->pet->owner_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user->isVetClinic() && optional($medicalRecord->veterinarian)->clinicId !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (($linkedVetId = $user->linkedVeterinarianId()) && $medicalRecord->veterinarian_id !== $linkedVetId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($medicalRecord->load([
            'pet.owner',
            'veterinarian',
            'appointment',
        ]));
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $linkedVetId = $user->linkedVeterinarianId();

        if (!$user->isAdmin() && !$user->isVetClinic() && !$linkedVetId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'appointment_id' => 'nullable|exists:appointments,id',
            'veterinarian_id' => [
                Rule::requiredIf(!$linkedVetId),
                'nullable',
                'exists:veterinarians,id',
            ],
            'record_date' => 'required|date',
            'diagnosis' => 'required|string',
            'treatment' => 'required|string',
            'prescription' => 'nullable|string',
            'lab_results' => 'nullable|string',
            'notes' => 'nullable|string',
            'weight' => 'nullable|numeric|min:0',
            'temperature' => 'nullable|numeric|min:30|max:45',
            'follow_up_date' => 'nullable|date|after:today',
        ]);

        $validated['veterinarian_id'] = $linkedVetId ?? $validated['veterinarian_id'];

        $veterinarian = Veterinarian::findOrFail($validated['veterinarian_id']);

        if ($user->isVetClinic() && (string) $veterinarian->clinicId !== (string) $user->id) {
            return response()->json(['message' => 'Selected veterinarian does not belong to your clinic'], 422);
        }

        if (!empty($validated['appointment_id'])) {
            $appointment = Appointment::findOrFail($validated['appointment_id']);

            if ((int) $appointment->pet_id !== (int) $validated['pet_id']) {
                return response()->json(['message' => 'Selected appointment does not belong to this pet'], 422);
            }

            if ((int) $appointment->veterinarian_id !== (int) $validated['veterinarian_id']) {
                return response()->json(['message' => 'Selected appointment does not match the chosen veterinarian'], 422);
            }
        }

        $record = MedicalRecord::create($validated);

        if ($record->appointment_id) {
            $record->appointment->update(['status' => 'completed']);
        }

        if (array_key_exists('weight', $validated)) {
            $record->pet->update(['weight' => $validated['weight']]);
        }

        Notification::create([
            'user_id' => $record->pet->owner_id,
            'title' => 'New Medical Record',
            'message' => "A new medical record has been added for {$record->pet->name}",
            'type' => 'medical',
        ]);

        return response()->json($record->load(['pet.owner', 'veterinarian']), 201);
    }

    public function update(Request $request, MedicalRecord $medicalRecord)
    {
        $user = $request->user();

        if (
            !$user->isAdmin() &&
            !($user->isVetClinic() && optional($medicalRecord->veterinarian)->clinicId === $user->id) &&
            $medicalRecord->veterinarian_id !== $user->linkedVeterinarianId()
        ) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'veterinarian_id' => 'sometimes|exists:veterinarians,id',
            'diagnosis' => 'sometimes|string',
            'treatment' => 'sometimes|string',
            'prescription' => 'nullable|string',
            'lab_results' => 'nullable|string',
            'notes' => 'nullable|string',
            'weight' => 'nullable|numeric|min:0',
            'temperature' => 'nullable|numeric|min:30|max:45',
            'follow_up_date' => 'nullable|date',
        ]);

        if (isset($validated['veterinarian_id'])) {
            $veterinarian = Veterinarian::findOrFail($validated['veterinarian_id']);

            if ($user->isVetClinic() && (string) $veterinarian->clinicId !== (string) $user->id) {
                return response()->json(['message' => 'Selected veterinarian does not belong to your clinic'], 422);
            }

            if ($user->linkedVeterinarianId() && (int) $validated['veterinarian_id'] !== (int) $user->linkedVeterinarianId()) {
                return response()->json(['message' => 'You can only manage your own veterinarian profile'], 422);
            }
        }

        $medicalRecord->update($validated);

        if (array_key_exists('weight', $validated)) {
            $medicalRecord->pet->update(['weight' => $validated['weight']]);
        }

        return response()->json($medicalRecord->load(['pet.owner', 'veterinarian']));
    }

    public function destroy(Request $request, MedicalRecord $medicalRecord)
    {
        $user = $request->user();

        if (
            !$user->isAdmin() &&
            !($user->isVetClinic() && optional($medicalRecord->veterinarian)->clinicId === $user->id)
        ) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $medicalRecord->delete();

        return response()->json(['message' => 'Medical record deleted successfully']);
    }

    public function exportPdf(Request $request, MedicalRecord $medicalRecord)
    {
        $user = $request->user();

        if ($user->isOwner() && $medicalRecord->pet->owner_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user->isVetClinic() && optional($medicalRecord->veterinarian)->clinicId !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (($linkedVetId = $user->linkedVeterinarianId()) && $medicalRecord->veterinarian_id !== $linkedVetId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $record = $medicalRecord->load(['pet.owner', 'veterinarian']);
        $pdf = Pdf::loadView('pdf.medical-record', compact('record'));

        return $pdf->download("medical-record-{$record->id}.pdf");
    }

    public function petHistory(Request $request, $petId)
    {
        $user = $request->user();

        $records = MedicalRecord::with(['pet.owner', 'veterinarian'])
            ->where('pet_id', $petId)
            ->orderBy('record_date', 'desc')
            ->get();

        if ($user->isOwner() && $records->isNotEmpty()) {
            if ($records->first()->pet->owner_id !== $user->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        if ($user->isVetClinic() && $records->isNotEmpty()) {
            $recordClinicId = optional($records->first()->veterinarian)->clinicId;

            if ((string) $recordClinicId !== (string) $user->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        return response()->json($records);
    }
}
