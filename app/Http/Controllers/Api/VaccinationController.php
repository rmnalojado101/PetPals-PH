<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\VaccineInventory;
use App\Models\Vaccination;
use App\Models\Veterinarian;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class VaccinationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Vaccination::with(['pet.owner', 'administeredByUser']);

        if ($user->isOwner()) {
            $query->whereHas('pet', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        } elseif ($user->isVetClinic()) {
            $query->whereHas('administeredByUser', function ($q) use ($user) {
                $q->where('clinicId', $user->id);
            });
        } elseif ($linkedVetId = $user->linkedVeterinarianId()) {
            $query->where('administered_by', $linkedVetId);
        }

        if ($request->has('pet_id')) {
            $query->where('pet_id', $request->pet_id);
        }

        $vaccinations = $query->orderBy('date_administered', 'desc')
            ->paginate($request->integer('per_page', 20));

        return response()->json($vaccinations);
    }

    public function show(Request $request, Vaccination $vaccination)
    {
        $user = $request->user();

        if ($user->isOwner() && $vaccination->pet->owner_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user->isVetClinic() && optional($vaccination->administeredByUser)->clinicId !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (($linkedVetId = $user->linkedVeterinarianId()) && $vaccination->administered_by !== $linkedVetId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($vaccination->load(['pet.owner', 'administeredByUser']));
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
            'veterinarian_id' => [
                Rule::requiredIf(!$linkedVetId),
                'nullable',
                'exists:veterinarians,id',
            ],
            'name' => 'required|string|max:255',
            'date_administered' => 'required|date',
            'next_due_date' => 'nullable|date|after:date_administered',
            'batch_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        $validated['administered_by'] = $linkedVetId ?? $validated['veterinarian_id'];

        $vaccination = DB::transaction(function () use ($user, $validated) {
            $veterinarian = Veterinarian::findOrFail($validated['administered_by']);
            $inventory = $this->reserveInventoryForVaccination($user, $veterinarian, $validated['name']);
            $inventory->decrement('stock');

            return Vaccination::create($validated);
        });

        if ($vaccination->next_due_date) {
            Notification::create([
                'user_id' => $vaccination->pet->owner_id,
                'title' => 'Vaccination Recorded',
                'message' => "{$vaccination->name} vaccine administered for {$vaccination->pet->name}. Next due: {$vaccination->next_due_date->format('M d, Y')}",
                'type' => 'reminder',
            ]);
        }

        return response()->json($vaccination->load(['pet.owner', 'administeredByUser']), 201);
    }

    public function update(Request $request, Vaccination $vaccination)
    {
        $user = $request->user();

        if (
            !$user->isAdmin() &&
            !($user->isVetClinic() && optional($vaccination->administeredByUser)->clinicId === $user->id) &&
            $vaccination->administered_by !== $user->linkedVeterinarianId()
        ) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'veterinarian_id' => 'sometimes|exists:veterinarians,id',
            'name' => 'sometimes|string|max:255',
            'date_administered' => 'sometimes|date',
            'next_due_date' => 'nullable|date',
            'batch_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        if (isset($validated['veterinarian_id'])) {
            $veterinarian = Veterinarian::findOrFail($validated['veterinarian_id']);

            if ($user->isVetClinic() && (string) $veterinarian->clinicId !== (string) $user->id) {
                return response()->json(['message' => 'Selected veterinarian does not belong to your clinic'], 422);
            }

            if ($user->linkedVeterinarianId() && (int) $validated['veterinarian_id'] !== (int) $user->linkedVeterinarianId()) {
                return response()->json(['message' => 'You can only manage your own veterinarian profile'], 422);
            }

            $validated['administered_by'] = $validated['veterinarian_id'];
            unset($validated['veterinarian_id']);
        }

        $vaccination->update($validated);

        return response()->json($vaccination->load(['pet.owner', 'administeredByUser']));
    }

    public function destroy(Request $request, Vaccination $vaccination)
    {
        $user = $request->user();

        if (
            !$user->isAdmin() &&
            !($user->isVetClinic() && optional($vaccination->administeredByUser)->clinicId === $user->id) &&
            $vaccination->administered_by !== $user->linkedVeterinarianId()
        ) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $vaccination->delete();

        return response()->json(['message' => 'Vaccination record deleted successfully']);
    }

    public function dueSoon(Request $request)
    {
        $user = $request->user();
        $days = $request->get('days', 30);

        $query = Vaccination::with(['pet.owner', 'administeredByUser'])
            ->dueSoon($days);

        if ($user->isOwner()) {
            $query->whereHas('pet', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        } elseif ($user->isVetClinic()) {
            $query->whereHas('administeredByUser', function ($q) use ($user) {
                $q->where('clinicId', $user->id);
            });
        } elseif ($linkedVetId = $user->linkedVeterinarianId()) {
            $query->where('administered_by', $linkedVetId);
        }

        $vaccinations = $query->orderBy('next_due_date')->get();

        return response()->json($vaccinations);
    }

    public function overdue(Request $request)
    {
        $user = $request->user();
        $query = Vaccination::with(['pet.owner', 'administeredByUser'])
            ->overdue();

        if ($user->isOwner()) {
            $query->whereHas('pet', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        } elseif ($user->isVetClinic()) {
            $query->whereHas('administeredByUser', function ($q) use ($user) {
                $q->where('clinicId', $user->id);
            });
        } elseif ($linkedVetId = $user->linkedVeterinarianId()) {
            $query->where('administered_by', $linkedVetId);
        }

        $vaccinations = $query->orderBy('next_due_date')->get();

        return response()->json($vaccinations);
    }

    private function reserveInventoryForVaccination($user, Veterinarian $veterinarian, string $vaccineName): VaccineInventory
    {
        if ($user->isVetClinic() && (string) $veterinarian->clinicId !== (string) $user->id) {
            throw new HttpResponseException(
                response()->json(['message' => 'Selected veterinarian does not belong to your clinic'], 422)
            );
        }

        if (empty($veterinarian->clinicId)) {
            throw new HttpResponseException(
                response()->json(['message' => 'Selected veterinarian is not linked to a clinic inventory'], 422)
            );
        }

        $inventory = VaccineInventory::where('clinic_id', $veterinarian->clinicId)
            ->where('name', $vaccineName)
            ->lockForUpdate()
            ->first();

        if (!$inventory) {
            throw new HttpResponseException(
                response()->json(['message' => "No stock record found for {$vaccineName}"], 422)
            );
        }

        if ($inventory->stock <= 0) {
            throw new HttpResponseException(
                response()->json(['message' => "No stock left for {$vaccineName}"], 422)
            );
        }

        return $inventory;
    }
}
