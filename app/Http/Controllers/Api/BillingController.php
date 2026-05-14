<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Billing;
use App\Models\MedicalRecord;
use App\Models\Pet;
use App\Models\Vaccination;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class BillingController extends Controller
{
    private const BILLING_RELATIONS = [
        'pet',
        'owner',
        'medicalRecord.veterinarian.clinic',
        'vaccination.administeredByUser.clinic',
    ];

    public function index(Request $request)
    {
        $user = $request->user();
        $query = Billing::with(self::BILLING_RELATIONS);

        if ($user->isOwner()) {
            $query->where('owner_id', $user->id);
        } elseif ($user->isVetClinic()) {
            $vetIds = \App\Models\Veterinarian::where('clinicId', $user->id)->pluck('id');
            $query->whereHas('owner.appointmentsAsOwner', function ($q) use ($vetIds) {
                $q->whereIn('veterinarian_id', $vetIds);
            });
        } elseif ($linkedVetId = $user->linkedVeterinarianId()) {
            $query->whereHas('owner.appointmentsAsOwner', function ($q) use ($linkedVetId) {
                $q->where('veterinarian_id', $linkedVetId);
            });
        }

        if ($request->filled('pet_id')) {
            $query->where('pet_id', $request->pet_id);
        }

        if ($request->filled('owner_id')) {
            $query->where('owner_id', $request->owner_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('start_date')) {
            $query->whereDate('billing_date', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->whereDate('billing_date', '<=', $request->end_date);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('pet', function($pq) use ($search) {
                      $pq->where('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('owner', function($oq) use ($search) {
                      $oq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = $request->input('per_page', 15);
        $billings = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json($billings);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isVetClinic()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'owner_id' => [
                'required',
                Rule::exists('users', 'id')->where('role', 'owner'),
            ],
            'medical_record_id' => 'nullable|exists:medical_records,id',
            'vaccination_id' => 'nullable|exists:vaccinations,id',
            'total_amount' => 'required|numeric|min:0',
            'status' => 'required|in:pending,paid,partially_paid,cancelled',
            'payment_method' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0',
            'items.*.price' => 'required|numeric|min:0',
            'billing_date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        $pet = Pet::findOrFail($validated['pet_id']);

        if ((string) $pet->owner_id !== (string) $validated['owner_id']) {
            return response()->json([
                'message' => 'Selected pet does not belong to the selected owner',
            ], 422);
        }

        if ($relationError = $this->validateRelatedRecordPet($validated)) {
            return $relationError;
        }

        $validated['invoice_number'] = $this->generateInvoiceNumber();
        $billing = Billing::create($validated);

        return response()->json($billing->load(self::BILLING_RELATIONS), 201);
    }

    public function show(Request $request, $id)
    {
        $billing = Billing::find($id);
        if (!$billing) {
            return response()->json(['message' => 'Billing record not found'], 404);
        }

        if (!$this->canAccessBilling($request, $billing)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return $billing->load(self::BILLING_RELATIONS);
    }

    public function update(Request $request, $id)
    {
        $billing = Billing::find($id);
        if (!$billing) {
            return response()->json(['message' => 'Billing record not found'], 404);
        }

        $user = $request->user();

        if (!$this->canAccessBilling($request, $billing)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'pet_id' => 'sometimes|exists:pets,id',
            'owner_id' => [
                'sometimes',
                Rule::exists('users', 'id')->where('role', 'owner'),
            ],
            'medical_record_id' => 'nullable|exists:medical_records,id',
            'vaccination_id' => 'nullable|exists:vaccinations,id',
            'total_amount' => 'sometimes|numeric|min:0',
            'status' => 'sometimes|in:pending,paid,partially_paid,cancelled',
            'payment_method' => 'nullable|string',
            'items' => 'sometimes|array|min:1',
            'items.*.description' => 'required_with:items|string',
            'items.*.quantity' => 'required_with:items|numeric|min:0',
            'items.*.price' => 'required_with:items|numeric|min:0',
            'billing_date' => 'sometimes|date',
            'notes' => 'nullable|string',
            'proof_of_payment' => 'nullable|file|mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx|max:20480',
        ]);

        if ($user->isOwner()) {
            $ownerEditableFields = ['payment_method', 'proof_of_payment'];
            $disallowedFields = array_diff(array_keys($validated), $ownerEditableFields);

            if ($disallowedFields) {
                return response()->json([
                    'message' => 'Owners can only submit payment method and proof of payment',
                ], 403);
            }

            if (!in_array($billing->status, ['pending', 'partially_paid'], true)) {
                return response()->json(['message' => 'Only unpaid bills can receive payment proof'], 422);
            }

            $validated = array_intersect_key($validated, array_flip($ownerEditableFields));
        } else {
            $ownerId = $validated['owner_id'] ?? $billing->owner_id;
            $petId = $validated['pet_id'] ?? $billing->pet_id;
            $pet = Pet::findOrFail($petId);

            if ((string) $pet->owner_id !== (string) $ownerId) {
                return response()->json([
                    'message' => 'Selected pet does not belong to the selected owner',
                ], 422);
            }

            $relationData = [
                'pet_id' => $petId,
                'medical_record_id' => $validated['medical_record_id'] ?? $billing->medical_record_id,
                'vaccination_id' => $validated['vaccination_id'] ?? $billing->vaccination_id,
            ];

            if ($relationError = $this->validateRelatedRecordPet($relationData)) {
                return $relationError;
            }
        }

        if ($request->boolean('remove_proof')) {
            $validated['proof_of_payment_path'] = null;
            $validated['proof_of_payment_name'] = null;
            $validated['proof_of_payment_data'] = null;
        }

        if ($request->hasFile('proof_of_payment')) {
            $file = $request->file('proof_of_payment');
            $validated['proof_of_payment_name'] = $file->getClientOriginalName();
            $validated['proof_of_payment_data'] = 'data:' . $file->getMimeType() . ';base64,' . base64_encode(file_get_contents($file->getRealPath()));
            // Clear removal flag if a new file is actually uploaded
            unset($validated['remove_proof']);
        }

        unset($validated['proof_of_payment']);

        $billing->update($validated);

        return response()->json($billing->load(self::BILLING_RELATIONS));
    }

    public function downloadProof(Request $request, $id)
    {
        $billing = Billing::find($id);
        if (!$billing) {
            return response()->json(['message' => 'Billing record not found'], 404);
        }

        if (!$this->canAccessBilling($request, $billing)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($billing->proof_of_payment_data) {
            return $this->fileResponseFromDataUrl(
                $billing->proof_of_payment_data,
                $billing->proof_of_payment_name ?: 'proof-of-payment'
            );
        }

        return response()->json(['message' => 'No proof of payment found'], 404);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isVetClinic()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $billing = Billing::find($id);
        if (!$billing) {
            return response()->json(['message' => 'Billing record not found'], 404);
        }

        $billing->delete();

        return response()->json([
            'message' => 'Billing record deleted successfully'
        ]);
    }

    private function canAccessBilling(Request $request, Billing $billing): bool
    {
        $user = $request->user();

        if ($user->isOwner()) {
            return (string) $billing->owner_id === (string) $user->id;
        }

        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isVetClinic()) {
            $vetIds = \App\Models\Veterinarian::where('clinicId', $user->id)->pluck('id');
            return $billing->owner->appointmentsAsOwner()
                ->whereIn('veterinarian_id', $vetIds)
                ->exists();
        }

        if ($linkedVetId = $user->linkedVeterinarianId()) {
            return $billing->owner->appointmentsAsOwner()
                ->where('veterinarian_id', $linkedVetId)
                ->exists();
        }

        return false;
    }

    private function generateInvoiceNumber(): string
    {
        do {
            $invoiceNumber = 'INV-' . strtoupper(Str::random(8));
        } while (Billing::where('invoice_number', $invoiceNumber)->exists());

        return $invoiceNumber;
    }

    private function validateRelatedRecordPet(array $data)
    {
        if (!empty($data['medical_record_id'])) {
            $record = MedicalRecord::findOrFail($data['medical_record_id']);

            if ((string) $record->pet_id !== (string) $data['pet_id']) {
                return response()->json([
                    'message' => 'Selected consultation does not belong to the selected pet',
                ], 422);
            }
        }

        if (!empty($data['vaccination_id'])) {
            $vaccination = Vaccination::findOrFail($data['vaccination_id']);

            if ((string) $vaccination->pet_id !== (string) $data['pet_id']) {
                return response()->json([
                    'message' => 'Selected vaccination does not belong to the selected pet',
                ], 422);
            }
        }

        return null;
    }

    private function fileResponseFromDataUrl(string $dataUrl, string $fileName)
    {
        if (!preg_match('/^data:([^;]+);base64,(.*)$/s', $dataUrl, $matches)) {
            return response()->json(['message' => 'Stored proof of payment is invalid'], 422);
        }

        $content = base64_decode($matches[2], true);

        if ($content === false) {
            return response()->json(['message' => 'Stored proof of payment is invalid'], 422);
        }

        $safeName = str_replace(['"', "\r", "\n"], '', $fileName);

        return response($content)
            ->header('Content-Type', $matches[1])
            ->header('Content-Disposition', 'inline; filename="' . $safeName . '"');
    }
}
