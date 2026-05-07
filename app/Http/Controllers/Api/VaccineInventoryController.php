<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VaccineInventory;
use Illuminate\Http\Request;

class VaccineInventoryController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        
        if (!in_array($user->role, ['admin', 'vet_clinic', 'veterinarian'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = VaccineInventory::query();
        
        if ($user->role === 'vet_clinic') {
            $query->where('clinic_id', $user->id);
        } elseif ($user->role === 'veterinarian') {
            $veterinarian = $user->linkedVeterinarian();

            if (!$veterinarian || empty($veterinarian->clinicId)) {
                return response()->json([]);
            }

            $query->where('clinic_id', $veterinarian->clinicId);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'vet_clinic') {
            return response()->json(['message' => 'Only clinics can manage inventory'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string',
            'batch_number' => 'nullable|string',
            'origin' => 'nullable|string',
            'expiration_date' => 'nullable|date',
            'description' => 'nullable|string',
            'stock' => 'required|integer',
        ]);

        $query = VaccineInventory::where('clinic_id', $user->id)
            ->where('name', $validated['name']);
            
        if (isset($validated['batch_number'])) {
            $query->where('batch_number', $validated['batch_number']);
        } else {
            $query->whereNull('batch_number');
        }
        
        $inventory = $query->first();

        if ($inventory) {
            $inventory->stock += $validated['stock'];
            if (isset($validated['origin'])) $inventory->origin = $validated['origin'];
            if (isset($validated['expiration_date'])) $inventory->expiration_date = $validated['expiration_date'];
            if (isset($validated['description'])) $inventory->description = $validated['description'];
            $inventory->save();
            return response()->json($inventory, 200);
        }

        $inventory = VaccineInventory::create(array_merge(
            $validated,
            ['clinic_id' => $user->id]
        ));

        return response()->json($inventory, 201);
    }

    public function upsert(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'vet_clinic') {
            return response()->json(['message' => 'Only clinics can manage inventory'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string',
            'stock_delta' => 'required|integer',
        ]);

        $inventory = VaccineInventory::firstOrCreate(
            ['clinic_id' => $user->id, 'name' => $validated['name']],
            ['stock' => 0]
        );

        $inventory->stock += $validated['stock_delta'];
        $inventory->save();

        return response()->json($inventory);
    }
    
    public function update(Request $request, VaccineInventory $vaccineInventory)
    {
        $user = $request->user();

        if ($user->role !== 'vet_clinic' || $vaccineInventory->clinic_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'batch_number' => 'nullable|string',
            'origin' => 'nullable|string',
            'expiration_date' => 'nullable|date',
            'description' => 'nullable|string',
            'stock' => 'nullable|integer',
        ]);

        $vaccineInventory->update($validated);

        return response()->json($vaccineInventory);
    }

    public function destroy(Request $request, VaccineInventory $vaccineInventory)
    {
        $user = $request->user();

        if ($user->role !== 'vet_clinic' || $vaccineInventory->clinic_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $vaccineInventory->delete();

        return response()->json(['message' => 'Inventory deleted successfully']);
    }
}
