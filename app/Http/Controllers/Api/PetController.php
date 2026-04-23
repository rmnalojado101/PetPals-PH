<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PetController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Pet::with('owner');

        if ($user->isOwner()) {
            $query->where('owner_id', $user->id);
        }

        if ($request->has('owner_id') && !$user->isOwner()) {
            $query->where('owner_id', $request->owner_id);
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

        if ($user->isOwner() && $pet->owner_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
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
                Rule::requiredIf(!$user->isOwner()),
                'nullable',
                'exists:users,id',
            ],
            'name' => 'required|string|max:255',
            'species' => 'required|in:dog,cat,bird,rabbit,hamster,fish,reptile,other',
            'breed' => 'required|string|max:255',
            'age' => 'required|integer|min:0',
            'sex' => 'required|in:male,female',
            'weight' => 'nullable|numeric|min:0',
            'color' => 'nullable|string|max:100',
            'microchip_id' => 'nullable|string|max:50|unique:pets',
            'allergies' => 'nullable|array',
            'medical_notes' => 'nullable|string',
            'photo' => 'nullable|string',
        ]);

        if ($user->isOwner()) {
            $validated['owner_id'] = $user->id;
        }

        $owner = User::owners()->find($validated['owner_id']);

        if (!$owner) {
            return response()->json(['message' => 'Selected owner is invalid'], 422);
        }

        $pet = Pet::create($validated);

        return response()->json($pet->load('owner'), 201);
    }

    public function update(Request $request, Pet $pet)
    {
        $user = $request->user();

        if ($user->isOwner() && $pet->owner_id !== $user->id) {
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

        if ($user->isOwner() && $pet->owner_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $pet->delete();

        return response()->json(['message' => 'Pet deleted successfully']);
    }
}
