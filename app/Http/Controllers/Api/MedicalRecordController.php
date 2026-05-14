<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\ClinicSettings;
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
        $query = MedicalRecord::with(['pet.owner', 'veterinarian.clinic', 'appointment']);

        if ($user->isOwner()) {
            $query->whereHas('pet', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        } elseif ($user->isVetClinic()) {
            $vetIds = Veterinarian::where('clinicId', $user->id)->pluck('id');
            $query->whereHas('pet.owner.appointmentsAsOwner', function ($q) use ($vetIds) {
                $q->whereIn('veterinarian_id', $vetIds);
            });
        } elseif ($linkedVetId = $user->linkedVeterinarianId()) {
            $query->whereHas('pet.owner.appointmentsAsOwner', function ($q) use ($linkedVetId) {
                $q->where('veterinarian_id', $linkedVetId);
            });
        }

        if ($request->has('pet_id')) {
            $query->where('pet_id', $request->pet_id);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('record_date', [$request->start_date, $request->end_date]);
        }

        if ($request->has('unbilled')) {
            $query->whereDoesntHave('billing', function($q) {
                $q->where('status', '!=', 'cancelled');
            });
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

        if ($user->isVetClinic()) {
            $vetIds = Veterinarian::where('clinicId', $user->id)->pluck('id');
            $hasAppointment = $medicalRecord->pet->owner->appointmentsAsOwner()
                ->whereIn('veterinarian_id', $vetIds)
                ->exists();
            if (!$hasAppointment) {
                return response()->json(['message' => 'Unauthorized. No clinic appointments with this owner.'], 403);
            }
        }

        if ($linkedVetId = $user->linkedVeterinarianId()) {
            $hasAppointment = $medicalRecord->pet->owner->appointmentsAsOwner()
                ->where('veterinarian_id', $linkedVetId)
                ->exists();
            if (!$hasAppointment) {
                return response()->json(['message' => 'Unauthorized. No veterinarian appointments with this owner.'], 403);
            }
        }

        return response()->json($medicalRecord->load([
            'pet.owner',
            'veterinarian.clinic',
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
            'diagnosis' => 'nullable|string',
            'treatment' => 'nullable|string',
            'prescription' => 'nullable|string',
            'lab_results' => 'nullable|string',
            'notes' => 'nullable|string',
            'weight' => 'nullable|numeric|min:0',
            'temperature' => 'nullable|numeric|min:30|max:45',
            'follow_up_date' => 'nullable|date|after:today',
            'attachment' => 'nullable|file|extensions:pdf,doc,docx,jpg,jpeg,png,webp,txt,jfif|max:20480', // 20MB max
            'attachment_name' => 'nullable|string|max:255',
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

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $validated['attachment_name'] = $file->getClientOriginalName();
            // Store content in database as base64 data URL
            $validated['attachment_data'] = 'data:' . $file->getMimeType() . ';base64,' . base64_encode(file_get_contents($file->getRealPath()));
            $validated['attachment_path'] = null;
        }

        $record = MedicalRecord::create($validated);

        // Removed automatic billing generation as requested by user
        /*
        \App\Models\Billing::create([
            'invoice_number' => 'INV-' . strtoupper(\Illuminate\Support\Str::random(8)),
            'pet_id' => $record->pet_id,
            'owner_id' => $record->pet->owner_id,
            'medical_record_id' => $record->id,
            'total_amount' => 0, // Placeholder
            'status' => 'pending',
            'billing_date' => $record->record_date,
            'items' => [
                [
                    'description' => "Medical Consultation" . ($record->diagnosis ? ": " . $record->diagnosis : ""),
                    'quantity' => 1,
                    'price' => 0
                ]
            ],
            'notes' => 'Automatically generated from medical record entry.'
        ]);
        */

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

        return response()->json($record->load(['pet.owner', 'veterinarian.clinic', 'appointment']), 201);
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
            'diagnosis' => 'nullable|string',
            'treatment' => 'nullable|string',
            'prescription' => 'nullable|string',
            'lab_results' => 'nullable|string',
            'notes' => 'nullable|string',
            'weight' => 'nullable|numeric|min:0',
            'temperature' => 'nullable|numeric|min:30|max:45',
            'follow_up_date' => 'nullable|date',
            'attachment' => 'nullable|file|extensions:pdf,doc,docx,jpg,jpeg,png,webp,txt,jfif|max:20480',
            'attachment_name' => 'nullable|string|max:255',
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

        if ($request->boolean('remove_attachment')) {
            if ($medicalRecord->attachment_path) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($medicalRecord->attachment_path);
            }
            $validated['attachment_path'] = null;
            $validated['attachment_name'] = null;
            $validated['attachment_data'] = null;
        }

        if ($request->hasFile('attachment')) {
            if ($medicalRecord->attachment_path) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($medicalRecord->attachment_path);
            }
            $file = $request->file('attachment');
            $validated['attachment_name'] = $file->getClientOriginalName();
            // Store content in database as base64 data URL
            $validated['attachment_data'] = 'data:' . $file->getMimeType() . ';base64,' . base64_encode(file_get_contents($file->getRealPath()));
            $validated['attachment_path'] = null;
        }

        $medicalRecord->update($validated);

        if (array_key_exists('weight', $validated)) {
            $medicalRecord->pet->update(['weight' => $validated['weight']]);
        }

        return response()->json($medicalRecord->load(['pet.owner', 'veterinarian.clinic', 'appointment']));
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

        if ($medicalRecord->attachment_path) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($medicalRecord->attachment_path);
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

        $record = $medicalRecord->load(['pet.owner', 'veterinarian.clinic', 'appointment']);
        $clinicId = optional($record->veterinarian)->clinicId;
        $clinic = ClinicSettings::getInstance($clinicId);
        $pdf = Pdf::loadView('pdf.medical-record', compact('record', 'clinic'))->setPaper('a4');

        return $pdf->download("medical-record-{$record->id}.pdf");
    }

    public function downloadAttachment(Request $request, MedicalRecord $medicalRecord)
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

        if ($medicalRecord->attachment_data) {
            return $this->fileResponseFromDataUrl(
                $medicalRecord->attachment_data,
                $medicalRecord->attachment_name ?: 'medical-attachment'
            );
        }

        // Fallback for physical file storage (legacy migration)
        if ($medicalRecord->attachment_path) {
            $path = storage_path('app/public/' . $medicalRecord->attachment_path);
            if (file_exists($path)) {
                $downloadName = $medicalRecord->attachment_name ?? basename($path);
                return response()->download($path, $downloadName);
            }
        }

        return response()->json(['message' => 'No attachment found for this record.'], 404);
    }

    private function fileResponseFromDataUrl(string $dataUrl, string $fileName)
    {
        if (!preg_match('/^data:([^;]+);base64,(.*)$/s', $dataUrl, $matches)) {
            // Fallback for raw base64 if someone stored it without the prefix
            $content = base64_decode($dataUrl, true);
            if ($content !== false) {
                return response($content)
                    ->header('Content-Type', $this->getMimeTypeFromFilename($fileName))
                    ->header('Content-Disposition', 'inline; filename="' . $fileName . '"');
            }
            return response()->json(['message' => 'Stored attachment is invalid'], 422);
        }

        $content = base64_decode($matches[2], true);

        if ($content === false) {
            return response()->json(['message' => 'Stored attachment is invalid'], 422);
        }

        $safeName = str_replace(['"', "\r", "\n"], '', $fileName);

        return response($content)
            ->header('Content-Type', $matches[1])
            ->header('Content-Disposition', 'inline; filename="' . $safeName . '"');
    }

    private function getMimeTypeFromFilename($filename)
    {
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        return match($extension) {
            'pdf' => 'application/pdf',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            default => 'application/octet-stream'
        };
    }

    public function petHistory(Request $request, $petId)
    {
        $user = $request->user();

        $query = MedicalRecord::with(['pet.owner', 'veterinarian.clinic', 'appointment'])
            ->where('pet_id', $petId);

        if ($request->has('unbilled')) {
            $query->whereDoesntHave('billing', function($q) {
                $q->where('status', '!=', 'cancelled');
            });
        }

        $records = $query->orderBy('record_date', 'desc')
            ->paginate($request->integer('per_page', 10));

        if ($user->isOwner() && $records->isNotEmpty()) {
            if ($records->first()->pet->owner_id !== $user->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        if ($user->isVetClinic() && $records->isNotEmpty()) {
            $vetIds = Veterinarian::where('clinicId', $user->id)->pluck('id');
            $hasAppointment = $records->first()->pet->owner->appointmentsAsOwner()
                ->whereIn('veterinarian_id', $vetIds)
                ->exists();

            if (!$hasAppointment) {
                return response()->json(['message' => 'Unauthorized. No clinic appointments with this pet owner.'], 403);
            }
        } elseif (($linkedVetId = $user->linkedVeterinarianId()) && $records->isNotEmpty()) {
            $hasAppointment = $records->first()->pet->owner->appointmentsAsOwner()
                ->where('veterinarian_id', $linkedVetId)
                ->exists();

            if (!$hasAppointment) {
                return response()->json(['message' => 'Unauthorized. No veterinarian appointments with this pet owner.'], 403);
            }
        }

        return response()->json($records);
    }
}
