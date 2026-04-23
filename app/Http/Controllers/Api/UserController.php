<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Veterinarian;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query();

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if (!$request->boolean('include_legacy_veterinarians')) {
            $query->whereIn('role', ['admin', 'vet_clinic', 'owner']);
        }

        $users = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 20));

        return response()->json($users);
    }

    public function show(User $user)
    {
        return response()->json($user->load(['pets']));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|in:admin,vet_clinic,owner',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
        ]);

        $user = User::create([
            ...$validated,
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json($user, 201);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $user->id,
            'role' => 'sometimes|in:admin,vet_clinic,owner',
            'password' => 'nullable|string|min:8',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return response()->json($user);
    }

    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Cannot delete your own account'], 403);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    public function veterinarians()
    {
        $vets = Veterinarian::with('clinic')->get();
        return response()->json($vets);
    }

    public function owners(Request $request)
    {
        $user = $request->user();
        $query = User::owners()->with('pets');

        if ($user->isVetClinic()) {
            $vetIds = Veterinarian::where('clinicId', $user->id)->pluck('id');
            $query->whereHas('appointmentsAsOwner', function ($q) use ($vetIds) {
                $q->whereIn('veterinarian_id', $vetIds);
            });
        } elseif ($linkedVetId = $user->linkedVeterinarianId()) {
            $query->whereHas('appointmentsAsOwner', function ($q) use ($linkedVetId) {
                $q->where('veterinarian_id', $linkedVetId);
            });
        }

        $owners = $query->orderBy('name')->get();
        return response()->json($owners);
    }
}
