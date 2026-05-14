<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PetController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Pet::with('owner');

        if ($user && $user->isOwner()) {
            $query->where('owner_id', $user->id);
        } elseif ($user && $user->isVetClinic()) {
            $vetIds = \App\Models\Veterinarian::where('clinicId', $user->id)->pluck('id');
            $query->whereHas('owner.appointmentsAsOwner', function ($q) use ($vetIds) {
                $q->whereIn('veterinarian_id', $vetIds);
            });
        } elseif ($user && ($linkedVetId = $user->linkedVeterinarianId())) {
            $query->whereHas('owner.appointmentsAsOwner', function ($q) use ($linkedVetId) {
                $q->where('veterinarian_id', $linkedVetId);
            });
        }

        if ($request->has('owner_id') && (!$user || !$user->isOwner())) {
            $query->where('owner_id', $request->owner_id);
        }

        if ($request->has('id')) {
            $query->where('id', $request->id);
        }

        if ($request->has('species')) {
            $query->where('species', $request->species);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('breed', 'like', "%{$search}%");
            });
        }

        $pets = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 20));

        return response()->json($pets);
    }

    public function show(Request $request, Pet $pet)
    {
        $user = $request->user();

        if ($user && $user->isOwner() && $pet->owner_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user && $user->isVetClinic()) {
            $vetIds = \App\Models\Veterinarian::where('clinicId', $user->id)->pluck('id');
            $hasAppointment = $pet->owner->appointmentsAsOwner()
                ->whereIn('veterinarian_id', $vetIds)
                ->exists();
            if (!$hasAppointment) {
                return response()->json(['message' => 'Unauthorized. No clinic appointments with this pet owner.'], 403);
            }
        } elseif ($user && ($linkedVetId = $user->linkedVeterinarianId())) {
            $hasAppointment = $pet->owner->appointmentsAsOwner()
                ->where('veterinarian_id', $linkedVetId)
                ->exists();
            if (!$hasAppointment) {
                return response()->json(['message' => 'Unauthorized. No veterinarian appointments with this pet owner.'], 403);
            }
        }

        return response()->json($pet->load([
            'owner',
            'appointments.veterinarian',
            'medicalRecords.veterinarian',
            'vaccinations.administeredByUser',
        ]));
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'owner_id' => [
                $user && $user->isOwner() ? 'nullable' : 'required',
                'integer',
                Rule::exists('users', 'id')->where('role', 'owner'),
            ],
            'name' => 'required|string|max:255',
            'species' => 'required|in:dog,cat,bird,rabbit,hamster,fish,reptile,other',
            'breed' => 'required|string|max:255',
            'age' => 'required|integer|min:0',
            'sex' => 'required|in:male,female',
            'weight' => 'nullable|numeric|min:0',
            'color' => 'nullable|string|max:100',
            'microchip_id' => 'nullable|string|max:50|unique:pets,microchip_id',
            'allergies' => 'nullable|array',
            'medical_notes' => 'nullable|string',
            'photo' => 'nullable|string',
        ]);

        if ($user && $user->isOwner()) {
            $validated['owner_id'] = $user->id;
        }

        $pet = Pet::create($validated);

        return response()->json($pet->load('owner'), 201);
    }

    public function update(Request $request, Pet $pet)
    {
        $user = $request->user();

        if ($user && $user->isOwner() && $pet->owner_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'species' => 'sometimes|in:dog,cat,bird,rabbit,hamster,fish,reptile,other',
            'breed' => 'sometimes|string|max:255',
            'age' => 'sometimes|integer|min:0',
            'sex' => 'sometimes|in:male,female',
            'weight' => 'nullable|numeric|min:0',
            'color' => 'nullable|string|max:100',
            'microchip_id' => 'nullable|string|max:50|unique:pets,microchip_id,' . $pet->id,
            'allergies' => 'nullable|array',
            'medical_notes' => 'nullable|string',
            'photo' => 'nullable|string',
        ]);

        $pet->update($validated);

        return response()->json($pet->load('owner'));
    }

    public function destroy(Request $request, Pet $pet)
    {
        $user = $request->user();

        if ($user && $user->isOwner() && $pet->owner_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $pet->delete();

        return response()->json(['message' => 'Pet deleted successfully']);
    }
}
