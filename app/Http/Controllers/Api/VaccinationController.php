<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Vaccination;
use Illuminate\Http\Request;

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
        }

        if ($request->has('pet_id')) {
            $query->where('pet_id', $request->pet_id);
        }

        $vaccinations = $query->orderBy('date_administered', 'desc')->paginate(20);

        return response()->json($vaccinations);
    }

    public function show(Request $request, Vaccination $vaccination)
    {
        $user = $request->user();

        if ($user->isOwner() && $vaccination->pet->owner_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($vaccination->load(['pet.owner', 'administeredByUser']));
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'veterinarian', 'receptionist'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'pet_id' => 'required|exists:pets,id',
            'name' => 'required|string|max:255',
            'date_administered' => 'required|date',
            'next_due_date' => 'nullable|date|after:date_administered',
            'batch_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        $validated['administered_by'] = $user->id;
        $vaccination = Vaccination::create($validated);

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

        if (!in_array($user->role, ['admin', 'veterinarian'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'date_administered' => 'sometimes|date',
            'next_due_date' => 'nullable|date',
            'batch_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        $vaccination->update($validated);

        return response()->json($vaccination->load(['pet.owner', 'administeredByUser']));
    }

    public function destroy(Request $request, Vaccination $vaccination)
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'veterinarian'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $vaccination->delete();

        return response()->json(['message' => 'Vaccination record deleted successfully']);
    }

    public function dueSoon(Request $request)
    {
        $days = $request->get('days', 30);

        $vaccinations = Vaccination::with(['pet.owner'])
            ->dueSoon($days)
            ->orderBy('next_due_date')
            ->get();

        return response()->json($vaccinations);
    }

    public function overdue()
    {
        $vaccinations = Vaccination::with(['pet.owner'])
            ->overdue()
            ->orderBy('next_due_date')
            ->get();

        return response()->json($vaccinations);
    }
}
