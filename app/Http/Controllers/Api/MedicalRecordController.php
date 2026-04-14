<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MedicalRecord;
use App\Models\Notification;
use Illuminate\Http\Request;
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
        } elseif ($user->isVeterinarian()) {
            $query->where('veterinarian_id', $user->id);
        }

        if ($request->has('pet_id')) {
            $query->where('pet_id', $request->pet_id);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('record_date', [$request->start_date, $request->end_date]);
        }

        $records = $query->orderBy('record_date', 'desc')->paginate(20);

        return response()->json($records);
    }

    public function show(Request $request, MedicalRecord $medicalRecord)
    {
        $user = $request->user();

        if ($user->isOwner() && $medicalRecord->pet->owner_id !== $user->id) {
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

        if (!$user->isVeterinarian() && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'appointment_id' => 'nullable|exists:appointments,id',
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

        $validated['veterinarian_id'] = $user->id;

        $record = MedicalRecord::create($validated);

        if ($record->appointment_id) {
            $record->appointment->update(['status' => 'completed']);
        }

        if ($validated['weight']) {
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

        if (!$user->isVeterinarian() && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'diagnosis' => 'sometimes|string',
            'treatment' => 'sometimes|string',
            'prescription' => 'nullable|string',
            'lab_results' => 'nullable|string',
            'notes' => 'nullable|string',
            'weight' => 'nullable|numeric|min:0',
            'temperature' => 'nullable|numeric|min:30|max:45',
            'follow_up_date' => 'nullable|date',
        ]);

        $medicalRecord->update($validated);

        return response()->json($medicalRecord->load(['pet.owner', 'veterinarian']));
    }

    public function destroy(Request $request, MedicalRecord $medicalRecord)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Only admins can delete medical records'], 403);
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

        $record = $medicalRecord->load(['pet.owner', 'veterinarian']);
        $pdf = Pdf::loadView('pdf.medical-record', compact('record'));

        return $pdf->download("medical-record-{$record->id}.pdf");
    }

    public function petHistory(Request $request, $petId)
    {
        $user = $request->user();

        $records = MedicalRecord::with(['veterinarian'])
            ->where('pet_id', $petId)
            ->orderBy('record_date', 'desc')
            ->get();

        if ($user->isOwner() && $records->isNotEmpty()) {
            if ($records->first()->pet->owner_id !== $user->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        return response()->json($records);
    }
}
