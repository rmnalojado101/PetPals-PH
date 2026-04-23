<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Veterinarian;
use Illuminate\Http\Request;

class VeterinarianController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Veterinarian::query();

        if ($user->role === 'vet_clinic') {
            $query->where('clinicId', $user->id);
        }

        return response()->json($query->get());
    }

    public function show(Request $request, Veterinarian $veterinarian)
    {
        $user = $request->user();

        if ($user->role === 'vet_clinic' && $veterinarian->clinicId !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($veterinarian->load('clinic'));
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'vet_clinic'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:veterinarians',
            'phone' => 'nullable|string|max:20',
            'specialty' => 'nullable|string|max:255',
            'background' => 'nullable|string',
        ]);

        $validated['clinicId'] = $user->id;

        $veterinarian = Veterinarian::create($validated);

        return response()->json($veterinarian, 201);
    }

    public function update(Request $request, Veterinarian $veterinarian)
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'vet_clinic']) || ($user->role === 'vet_clinic' && $veterinarian->clinicId !== $user->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:veterinarians,email,' . $veterinarian->id,
            'phone' => 'nullable|string|max:20',
            'specialty' => 'nullable|string|max:255',
            'background' => 'nullable|string',
        ]);

        $veterinarian->update($validated);

        return response()->json($veterinarian);
    }

    public function destroy(Request $request, Veterinarian $veterinarian)
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'vet_clinic']) || ($user->role === 'vet_clinic' && $veterinarian->clinicId !== $user->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $veterinarian->delete();

        return response()->json(['message' => 'Veterinarian deleted successfully']);
    }
}
